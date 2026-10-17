'use strict';
const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { isDeepStrictEqual: equal } = require('node:util');
const validation = require('./validate.cjs');
const {startBackups} = require('./backups.cjs');
const MAX_BODY = 12 * 1024 * 1024;
const SESSION_MS = 7 * 86400000;
const CLIENT_CONTENT_LIMIT = 256 * 1024;
const WORKSPACE_CONTENT_LIMIT = 4 * 1024 * 1024;
const RECENT_ACTIVITY_LIMIT = 1000;
const CLIENT_GROWTH_MAX_WORKSPACE_BYTES = MAX_BODY - 1024 * 1024;
const GROWTH_ACTIONS = new Set(['request','message','comment','reply']);
const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const now = () => new Date().toISOString();
function fail(status, message, code) { throw Object.assign(new Error(message), { status, code }); }
function object(value) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Expected a JSON object.'); return value; }
function text(value, max = 12000, required = true) { if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(400, 'Invalid or missing text.'); return value.trim(); }
function email(value) { const result = text(value, 254).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail(400, 'Enter a valid email address.'); return result; }
function password(value) { if (typeof value !== 'string' || value.length < 12 || value.length > 256) fail(400, 'Use a password between 12 and 256 characters.'); return value; }
function passwordHash(value) { const salt = randomBytes(16).toString('hex'); return salt + ':' + scryptSync(value, salt, 64).toString('hex'); }
function passwordMatches(value, stored) { if (typeof value !== 'string' || value.length > 256) return false; const [salt, encoded] = stored.split(':'); const actual = scryptSync(value, salt, 64); const expected = Buffer.from(encoded, 'hex'); return actual.length === expected.length && timingSafeEqual(actual, expected); }
function validate(data) { try { return validation.validate(data); } catch (error) { fail(400, error.message || 'Invalid workspace data.'); } return data; }
function same(actual, expected, message = 'Review history and existing work cannot be rewritten.') { if (!equal(actual, expected)) fail(403, message, 'IMMUTABLE_HISTORY'); }
function preserved(oldRows, rows, label) { for (const old of oldRows) same(rows.find(x => x.id === old.id), old, label); }
function preservedPrefix(oldRows, rows, message) { if (rows.length < oldRows.length) fail(403, message); oldRows.forEach((old, i) => same(rows[i], old, message)); }
function enforceAgencySave(old, next, actorEmail = 'Agency') {
  same(next.approvals, old.approvals, 'Only authenticated clients can record decisions.');
  const oldProjects = new Map(old.projects.map(x => [x.id, x]));
  for (const project of old.projects) {
    const nextProject = next.projects.find(p => p.id === project.id);
    if (nextProject) same(nextProject.clientId, project.clientId, 'Existing projects cannot be reassigned to another client.');
  }
  for (const d of old.deliverables) {
    const updated = next.deliverables.find(x => x.id === d.id);
    if (!updated) fail(403, 'Version history cannot be deleted.');
    same(updated.projectId, d.projectId);
    preservedPrefix(d.versions, updated.versions, 'Existing version contents and decisions are immutable. Submit a new version.');
    if (d.versions.some(v => v.status === 'approved')) same(updated.title, d.title, 'Approved work titles are immutable.');
    const oldProject = oldProjects.get(d.projectId), newProject = next.projects.find(x => x.id === d.projectId);
    if (!newProject) fail(403, 'Projects with version history cannot be deleted.');
    same(newProject.clientId, oldProject.clientId, 'Existing review work cannot be reassigned to another client.');
  }
  for (const d of next.deliverables) {
    const previous = old.deliverables.find(x => x.id === d.id);
    for (const v of d.versions.slice(previous?.versions.length || 0)) if (v.status !== 'pending') fail(403, 'New versions must await client review.');
  }
  const ow = old.workspace, nw = next.workspace;
  preserved(ow.assets, nw.assets, 'File snapshots cannot be changed or deleted.');
  for (const asset of nw.assets.filter(a => !ow.assets.some(x => x.id === a.id))) {
    if (asset.versionId) { const d = next.deliverables.find(d => d.id === asset.deliverableId); if (d.versions.at(-1).id !== asset.versionId || d.versions.at(-1).status !== 'pending') fail(403, 'Attach files only to the latest pending version.'); }
  }
  preserved(old.requests, next.requests, 'Client request history cannot be changed or deleted.');
  preserved(ow.messages, nw.messages, 'Conversation history cannot be changed or deleted.');
  for (const m of nw.messages.filter(m => !ow.messages.some(x => x.id === m.id))) if (m.actor !== 'Agency') fail(403, 'Only authenticated clients can send client messages.');
  preservedPrefix(ow.activity, nw.activity, 'Activity history cannot be changed or deleted.');
  for (const c of ow.comments) {
    const n = nw.comments.find(x => x.id === c.id); if (!n) fail(403, 'Comment history cannot be deleted.');
    const { replies: oldReplies, resolved: oldResolved, ...oldContent } = c;
    const { replies, resolved, ...newContent } = n;
    same(newContent, oldContent, 'Comment contents are immutable.');
    preservedPrefix(oldReplies, replies, 'Replies cannot be rewritten.');
  }
  for (const m of nw.messages.filter(m => !ow.messages.some(x => x.id === m.id))) m.actorEmail = actorEmail;
  for (const c of nw.comments) {
    const previous = ow.comments.find(x => x.id === c.id);
    if (!previous) { c.author = actorEmail; for (const r of c.replies) r.author = actorEmail; }
    else for (const r of c.replies.slice(previous.replies.length)) r.author = actorEmail;
  }
  for (const d of nw.documents) {
    const previous = ow.documents.find(x => x.id === d.id);
    if (previous?.status === 'acknowledged') same(d, previous, 'Acknowledged documents are immutable. Create a new draft.');
    else if (d.status !== 'draft') fail(403, 'Only authenticated clients can acknowledge documents.');
  }
  for (const d of ow.documents.filter(d => d.status === 'acknowledged')) same(nw.documents.find(x => x.id === d.id), d, 'Acknowledged documents cannot be deleted.');
}
// Explicit allowlists keep unknown agency metadata out of client responses.
function pick(row, keys) { return Object.fromEntries(keys.filter(k => Object.hasOwn(row, k)).map(k => [k, row[k]])); }
function projectClient(data, clientId) {
  const projected = validation.empty(data.workspace.brand.name);
  projected.clients = data.clients.filter(c => c.id === clientId).map(c => pick(c, ['id','name','email']));
  projected.projects = data.projects.filter(p => p.clientId === clientId).map(p => pick(p, ['id','clientId','name','brief','due','payment']));
  const pids = new Set(projected.projects.map(p => p.id));
  projected.deliverables = data.deliverables.filter(d => pids.has(d.projectId)).map(d => ({...pick(d, ['id','projectId','title']),versions:d.versions.map(v => pick(v,['id','number','url','note','status','createdAt']))}));
  const dids = new Set(projected.deliverables.map(d => d.id));
  projected.approvals = data.approvals.filter(a => dids.has(a.deliverableId)).map(a => pick(a,['id','deliverableId','versionId','number','status','note','actor','createdAt']));
  projected.requests = data.requests.filter(r => r.clientId === clientId).map(r => pick(r,['id','clientId','title','note','createdAt']));
  const w = projected.workspace, source = data.workspace;
  w.brand = pick(source.brand,['name','accent','welcome']);
  w.messages = source.messages.filter(m => m.clientId === clientId).map(m => pick(m,['id','clientId','body','actor','actorEmail','createdAt']));
  w.onboarding = source.onboarding.filter(m => m.clientId === clientId).map(m => pick(m,['id','clientId','title','done']));
  w.documents = source.documents.filter(d => d.clientId === clientId).map(d => pick(d,['id','clientId','title','kind','body','status','createdAt','acknowledgedAt','acknowledgedBy']));
  w.invoices = source.invoices.filter(i => pids.has(i.projectId) && i.status !== 'draft').map(i => ({...pick(i,['id','projectId','number','currency','taxPercent','status','due','paymentUrl','createdAt']),items:i.items.map(item => pick(item,['description','quantity','rate']))}));
  w.comments = source.comments.filter(c => dids.has(c.deliverableId)).map(c => ({...pick(c,['id','deliverableId','versionId','body','author','anchor','resolved','createdAt']),replies:c.replies.map(r => pick(r,['id','body','author','createdAt']))}));
  w.assets = source.assets.filter(a => pids.has(a.projectId)).map(a => pick(a,['id','projectId','deliverableId','versionId','name','mime','data','size','createdAt']));
  w.resources = source.resources.filter(r => r.clientId === clientId).map(r => pick(r,['id','clientId','title','url']));
  return validate(projected);
}
// Charge complete stored records, including replies and metadata, so small-record
// flooding cannot evade a body-only quota. Scope comments via their project owner.
function enforceClientContentQuota(data, clientId) {
  const w = data.workspace;
  const bytes = rows => Buffer.byteLength(JSON.stringify(rows));
  const globalBytes = bytes(data.requests) + bytes(w.messages) + bytes(w.comments);
  const ownProjects = new Set(data.projects.filter(p => p.clientId === clientId).map(p => p.id));
  const ownDeliverables = new Set(data.deliverables.filter(d => ownProjects.has(d.projectId)).map(d => d.id));
  const ownBytes = bytes(data.requests.filter(r => r.clientId === clientId))
    + bytes(w.messages.filter(m => m.clientId === clientId))
    + bytes(w.comments.filter(c => ownDeliverables.has(c.deliverableId)));
  if (ownBytes > CLIENT_CONTENT_LIMIT) fail(429, 'This client has reached its conversation and request storage limit. Contact your studio; reviews and approvals remain available.', 'CLIENT_CONTENT_QUOTA');
  if (globalBytes > WORKSPACE_CONTENT_LIMIT) fail(429, 'This workspace has reached its conversation and request storage limit. Reviews and approvals remain available.', 'WORKSPACE_CONTENT_QUOTA');
}
function clientAction(data, user, type, payload) {
  const p = object(payload), w = data.workspace, clientId = user.client_id;
  const ownDeliverable = id => { const d = data.deliverables.find(d => d.id === id); if (!d || !data.projects.some(pr => pr.id === d.projectId && pr.clientId === clientId)) fail(404, 'Review work not found.'); return d; };
  const ownComment = id => { const c = w.comments.find(c => c.id === id); if (!c) fail(404, 'Comment not found.'); ownDeliverable(c.deliverableId); return c; };
  const id = randomUUID(), createdAt = now();
  switch (type) {
    case 'decision': { const d = ownDeliverable(p.deliverableId), v = d.versions.at(-1); if (v.id !== p.versionId || v.status !== 'pending' || data.approvals.some(a => a.versionId === v.id)) fail(409, 'This version changed or already has a decision.', 'STALE_DECISION'); if (!['approved','changes'].includes(p.status)) fail(400, 'Invalid decision.'); const note = text(p.note,12000,p.status === 'changes'); v.status = p.status; data.approvals.push({id,deliverableId:d.id,versionId:v.id,number:v.number,status:p.status,note,actor:user.email,createdAt}); break; }
    case 'request': data.requests.push({id,clientId,title:text(p.title,500),note:text(p.note,4000),createdAt}); break;
    case 'message': w.messages.push({id,clientId,body:text(p.body,4000),actor:'Client preview',actorEmail:user.email,createdAt}); break;
    case 'comment': { const d = ownDeliverable(p.deliverableId); if (!d.versions.some(v => v.id === p.versionId)) fail(404, 'Version not found.'); w.comments.push({id,deliverableId:d.id,versionId:p.versionId,body:text(p.body,4000),author:user.email,anchor:text(p.anchor ?? '',500,false),resolved:false,replies:[],createdAt}); break; }
    case 'reply': ownComment(p.commentId).replies.push({id,body:text(p.body,4000),author:user.email,createdAt}); break;
    case 'resolve': { const c = ownComment(p.commentId); if (typeof p.resolved !== 'boolean') fail(400, 'Invalid comment status.'); c.resolved = p.resolved; break; }
    case 'acknowledge': { const d = w.documents.find(d => d.id === p.documentId && d.clientId === clientId); if (!d) fail(404, 'Document not found.'); if (d.status !== 'draft' || (p.body !== undefined && p.body !== d.body)) fail(409, 'Document changed or already acknowledged. Read it again.', 'STALE_DOCUMENT'); d.status = 'acknowledged'; d.acknowledgedAt = createdAt; d.acknowledgedBy = user.email; break; }
    case 'onboarding': { const item = w.onboarding.find(x => x.id === p.id && x.clientId === clientId); if (!item) fail(404, 'Onboarding item not found.'); if (typeof p.done !== 'boolean') fail(400, 'Invalid onboarding status.'); item.done = p.done; break; }
    default: fail(400, 'Unsupported client action.');
  }
  if (GROWTH_ACTIONS.has(type)) {
    enforceClientContentQuota(data, clientId);
  }
  w.activity.push({id:randomUUID(),type:'client-'+type,text:'Client '+user.email+' recorded '+type,projectId:'',clientId,createdAt});
}
function createServer(options = {}) {
  const databasePath = options.databasePath || process.env.DATABASE_PATH || path.join(__dirname, '..', '.portalflow-data', 'portalflow.sqlite');
  const staticDir = path.resolve(options.staticDir || path.join(__dirname, '..', 'dist'));
  const publicUrl = options.publicUrl ?? process.env.PUBLIC_URL ?? '';
  const publicOrigin = publicUrl ? new URL(publicUrl).origin : '';
  if (publicUrl && !['http:','https:'].includes(new URL(publicUrl).protocol)) throw Error('PUBLIC_URL must use HTTP or HTTPS.');
  const secure = publicOrigin.startsWith('https://');
  if (databasePath !== ':memory:') { fs.mkdirSync(path.dirname(databasePath), {recursive:true,mode:0o700}); if (!fs.existsSync(databasePath)) fs.closeSync(fs.openSync(databasePath,'wx',0o600)); fs.chmodSync(databasePath,0o600); }
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=DELETE;');
  db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,studio_name TEXT NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS memberships(user_id TEXT PRIMARY KEY REFERENCES users(id),workspace_id TEXT NOT NULL REFERENCES workspaces(id),role TEXT NOT NULL CHECK(role IN ('agency','client')),client_id TEXT NOT NULL DEFAULT '',CHECK((role='agency' AND client_id='') OR (role='client' AND client_id<>'')));
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS invitations(token_hash TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id),client_id TEXT NOT NULL,email TEXT NOT NULL,expires_at INTEGER NOT NULL,used_at INTEGER);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);`);
  const sql = (query, ...args) => db.prepare(query).get(...args);
  const run = (query, ...args) => db.prepare(query).run(...args);
  const transaction = fn => { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } };
  const rates = new Map();
  function rate(key, limit, period = 900000) { const time = Date.now(); let r = rates.get(key); if (!r || r.end < time) { r = {count:0,end:time+period}; rates.set(key,r); } if (rates.size > 10000) { for (const [k,v] of rates) if (v.end < time) rates.delete(k); if (rates.size > 10000) rates.delete(rates.keys().next().value); } if (++r.count > limit) fail(429,'Too many attempts. Try again later.','RATE_LIMITED'); }
  function sessionUser(req) {
    const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('pf_session='))?.slice(11);
    if (!raw || !/^[\w-]{43}$/.test(raw)) fail(401,'Sign in to continue.');
    const u = sql(`SELECT u.id,u.email,m.workspace_id,m.role,m.client_id FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id WHERE s.token_hash=? AND s.expires_at>?`,hash(raw),Date.now());
    if (!u) fail(401,'Your session expired. Sign in again.'); return u;
  }
  const sessionView = u => ({user:{id:u.id,email:u.email,role:u.role},workspaceId:u.workspace_id,clientId:u.client_id});
  function issueSession(userId, res) { const raw = token(); run('DELETE FROM sessions WHERE expires_at<=?', Date.now()); run('INSERT INTO sessions VALUES(?,?,?)', hash(raw),userId,Date.now()+SESSION_MS); res.setHeader('Set-Cookie', `pf_session=${raw}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS/1000}${secure?'; Secure':''}`); }
  function workspace(user) { const row = sql('SELECT * FROM workspaces WHERE id=?',user.workspace_id); if (!row) fail(404,'Workspace not found.'); return row; }
  function snapshot(user, row = workspace(user)) { const data = JSON.parse(row.data); return {workspaceId:user.workspace_id,data:user.role === 'agency'?data:projectClient(data,user.client_id),revision:row.revision,role:user.role,clientId:user.client_id}; }
  function mutate(user, revision, change, reserveReviewSpace = false) { if (!Number.isSafeInteger(revision) || revision < 0) fail(400,'Supply a valid workspace revision.'); return transaction(() => { const row = workspace(user); if (row.revision !== revision) fail(409,'Workspace changed. Refresh and try again.','REVISION_CONFLICT'); const data = JSON.parse(row.data), updated = change(data) || data; updated.workspace.activity = updated.workspace.activity.slice(-RECENT_ACTIVITY_LIMIT); validate(updated); const encoded = JSON.stringify(updated); if (reserveReviewSpace && Buffer.byteLength(encoded)>CLIENT_GROWTH_MAX_WORKSPACE_BYTES) fail(user.role==='client'?429:400, 'Workspace capacity reached. Keep the remaining storage reserved for reviews and approvals.', 'WORKSPACE_REVIEW_RESERVE'); if (Buffer.byteLength(encoded)>MAX_BODY-1024) fail(400,'Workspace is too large.'); const result = run('UPDATE workspaces SET data=?,studio_name=?,revision=revision+1 WHERE id=? AND revision=?',encoded,updated.workspace.brand.name,user.workspace_id,revision); if (result.changes !== 1) fail(409,'Workspace changed. Refresh and try again.','REVISION_CONFLICT'); return snapshot(user,{data:encoded,revision:revision+1}); }); }
  function csrf(req) {
    const host = req.headers.host;
    if (!host || /[\s,\\/]/.test(host)) fail(403,'Invalid request host.');
    let expected;
    if (publicOrigin) { expected = publicOrigin; if (host !== new URL(publicOrigin).host) fail(403,'Invalid request host.'); }
    else { let name; try { name = new URL('http://'+host).hostname; } catch { fail(403,'Invalid request host.'); } const configured = options.host || process.env.HOST || '127.0.0.1'; if (!['127.0.0.1','localhost','[::1]',configured].includes(name) || ['0.0.0.0','::'].includes(name)) fail(403,'Set PUBLIC_URL for access through this host.'); expected = 'http://'+host; }
    if (req.headers.origin !== expected) fail(403,'This action requires a same-origin request.','CSRF');
    if (req.headers['sec-fetch-site'] && !['same-origin','none'].includes(req.headers['sec-fetch-site'])) fail(403,'Cross-site requests are not allowed.','CSRF');
  }
  async function readBody(req) { if ((req.headers['content-type'] || '').split(';')[0].trim().toLowerCase() !== 'application/json') fail(400,'Use application/json.'); let size=0, chunks=[]; for await (const chunk of req) { size+=chunk.length; if (size>MAX_BODY) fail(413,'Request body is too large.'); chunks.push(chunk); } try { return object(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { if (error.status) throw error; fail(400,'Invalid JSON body.'); } }
  const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'};
  async function handle(req,res) {
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','same-origin'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Cache-Control','no-store');
    if (secure) res.setHeader('Strict-Transport-Security','max-age=31536000');
    const json = (value,status=200) => { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(value)); };
    try {
      const url = new URL(req.url,'http://localhost'), route = url.pathname;
      if (!route.startsWith('/api/')) {
        if (!['GET','HEAD'].includes(req.method)) fail(405,'Method not allowed.');
        let pathname; try { pathname=decodeURIComponent(route); } catch { fail(404,'File not found.'); }
        const relative = pathname === '/'?'index.html':pathname.slice(1);
        // Serve public dist assets only, never dotfiles, source maps, databases or server files.
        if (!relative || relative.split('/').some(x => !x || x.startsWith('.') || !/^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/.test(x)) || !mime[path.extname(relative)]) fail(404,'File not found.');
        const file = path.resolve(staticDir,relative); if (!file.startsWith(staticDir+path.sep)) fail(404,'File not found.');
        let real; try { real=fs.realpathSync(file); } catch { fail(404,'File not found.'); } if (!real.startsWith(fs.realpathSync(staticDir)+path.sep) || !fs.statSync(real).isFile()) fail(404,'File not found.');
        res.writeHead(200,{'Content-Type':mime[path.extname(relative)]}); res.end(req.method==='HEAD'?undefined:fs.readFileSync(real)); return;
      }
      if (req.method === 'GET' && route === '/api/status') return json({backend:'portalflow-sqlite',version:1});
      const mutation = !['GET','HEAD','OPTIONS'].includes(req.method);
      let body;
      if (mutation) { csrf(req); rate('write:'+req.socket.remoteAddress,300,60000); body = await readBody(req); }
      const authRoutes = ['/api/auth/signup','/api/auth/login','/api/auth/accept-invite'];
      if (req.method==='POST' && authRoutes.includes(route)) {
        rate('auth:'+req.socket.remoteAddress,30);
        if (route === '/api/auth/signup') {
          const address=email(body.email), pw=password(body.password), name=text(body.studioName,100);
          rate('email:'+address,12);
          const user = transaction(() => { if (sql('SELECT id FROM users WHERE email=?',address)) fail(409,'An account already exists. Sign in instead.'); const uid=randomUUID(), wid=randomUUID(), data=validate(validation.empty(name)); run('INSERT INTO users VALUES(?,?,?)',uid,address,passwordHash(pw)); run('INSERT INTO workspaces(id,studio_name,data) VALUES(?,?,?)',wid,name,JSON.stringify(data)); run('INSERT INTO memberships VALUES(?,?,?,?)',uid,wid,'agency',''); return {id:uid,email:address,workspace_id:wid,role:'agency',client_id:''}; });
          issueSession(user.id,res); return json(sessionView(user),201);
        }
        if (route === '/api/auth/login') {
          const address=email(body.email); rate('email:'+address,12);
          const row=sql('SELECT * FROM users WHERE email=?',address);
          // Dummy work keeps nonexistent-account failures in the same cost class.
          const valid = row ? passwordMatches(body.password,row.password_hash) : passwordMatches(body.password,'00000000000000000000000000000000:'+ '00'.repeat(64));
          if (!valid) fail(401,'Email or password is incorrect.');
          const membership=sql('SELECT * FROM memberships WHERE user_id=?',row.id); if (!membership) fail(401,'Account membership is unavailable.');
          issueSession(row.id,res); return json(sessionView({...row,...membership}));
        }
        const raw=text(body.token,200), pw=password(body.password);
        const user=transaction(() => { const invite=sql('SELECT * FROM invitations WHERE token_hash=?',hash(raw)); if (!invite || invite.used_at || invite.expires_at<=Date.now()) fail(404,'Invitation is unavailable or expired.'); const ws=sql('SELECT data FROM workspaces WHERE id=?',invite.workspace_id); if (!ws || !JSON.parse(ws.data).clients.some(c => c.id===invite.client_id)) fail(404,'Invitation client is unavailable.');
          let u=sql('SELECT * FROM users WHERE email=?',invite.email);
          if (u) { if (!passwordMatches(pw,u.password_hash)) fail(401,'Use the existing account password.'); const member=sql('SELECT * FROM memberships WHERE user_id=?',u.id); if (member && (member.role!=='client' || member.workspace_id!==invite.workspace_id || member.client_id!==invite.client_id)) fail(409,'This account already has a different membership.'); }
          else { u={id:randomUUID(),email:invite.email}; run('INSERT INTO users VALUES(?,?,?)',u.id,u.email,passwordHash(pw)); }
          run('INSERT OR IGNORE INTO memberships VALUES(?,?,?,?)',u.id,invite.workspace_id,'client',invite.client_id);
          const result=run('UPDATE invitations SET used_at=? WHERE token_hash=? AND used_at IS NULL AND expires_at>?',Date.now(),hash(raw),Date.now()); if(result.changes!==1) fail(409,'Invitation was already used.');
          return {...u,workspace_id:invite.workspace_id,role:'client',client_id:invite.client_id}; });
        issueSession(user.id,res); return json(sessionView(user),201);
      }
      if (req.method==='GET' && route.startsWith('/api/invitations/')) { rate('invite-read:'+req.socket.remoteAddress,60); const raw=route.slice('/api/invitations/'.length); if (!/^[\w-]{43}$/.test(raw)) fail(404,'Invitation is unavailable or expired.'); const invite=sql('SELECT i.email,i.expires_at,w.studio_name FROM invitations i JOIN workspaces w ON w.id=i.workspace_id WHERE i.token_hash=? AND i.used_at IS NULL AND i.expires_at>?',hash(raw),Date.now()); if (!invite) fail(404,'Invitation is unavailable or expired.'); return json({email:invite.email,studioName:invite.studio_name,expiresAt:new Date(invite.expires_at).toISOString()}); }
      const user=sessionUser(req);
      if (mutation && (req.headers['x-portalflow-user'] !== user.id || req.headers['x-portalflow-workspace'] !== user.workspace_id)) fail(403, 'Your signed-in account changed in another tab. Sign in or refresh this tab before continuing.', 'SESSION_MISMATCH');
      if(req.method==='GET' && route==='/api/session') return json(sessionView(user));
      if(req.method==='POST' && route==='/api/auth/logout') { const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('pf_session='))?.slice(11); run('DELETE FROM sessions WHERE token_hash=?',hash(raw)); res.setHeader('Set-Cookie',`pf_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`); return json({ok:true}); }
      if(req.method==='GET' && route==='/api/workspace') return json(snapshot(user));
      if(req.method==='PUT' && route==='/api/workspace') { if(user.role!=='agency') fail(403,'Only agency accounts can save a workspace.'); const next=validate(body.data); return json(mutate(user,body.revision,old=>{enforceAgencySave(old,next,user.email);return next;},true)); }
      if(req.method==='POST' && route==='/api/invitations') { if(user.role!=='agency') fail(403,'Only agency accounts can invite clients.'); rate('invites:'+user.id,30,3600000); const address=email(body.email), clientId=text(body.clientId,200), raw=token(), expires=Date.now()+7*86400000; transaction(()=>{const data=JSON.parse(workspace(user).data); if(!data.clients.some(c=>c.id===clientId)) fail(404,'Client not found.'); run('INSERT INTO invitations VALUES(?,?,?,?,?,NULL)',hash(raw),user.workspace_id,clientId,address,expires);}); return json({token:raw,expiresAt:new Date(expires).toISOString()},201); }
      if(req.method==='POST' && route==='/api/client-action') { if(user.role!=='client') fail(403,'Client actions require an authenticated client account.'); return json(mutate(user,body.revision,data=>{clientAction(data,user,body.type,body.payload);},GROWTH_ACTIONS.has(body.type))); }
      fail(404,'Endpoint not found.');
    } catch(error) { if (res.headersSent) { res.end(); return; } const status=error.status||500; json({error:status===500?'The server could not complete this request.':error.message,...(error.code && error.status?{code:error.code}:{})},status); if(status===500 && options.onError) options.onError(error); }
  }
  const server=http.createServer((req,res)=>{handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});});
  server.requestTimeout=30000; server.headersTimeout=15000; server.maxHeadersCount=100;
  const backups = databasePath === ':memory:' ? null : startBackups(db,path.join(path.dirname(databasePath),'backups'));
  server.on('close',()=>{backups?.stop();db.close();});
  return server;
}
if(require.main===module) { const host=process.env.HOST||'127.0.0.1', port=Number(process.env.PORT||3000); if(!Number.isInteger(port)||port<1||port>65535) throw Error('PORT must be between 1 and 65535.'); const server=createServer({host}); server.listen(port,host,()=>console.log(`PortalFlow shared workspace listening on ${host}:${port}`)); }
module.exports={createServer,projectClient,enforceAgencySave};
