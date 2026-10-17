'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {createBackup, startBackups} = require('../server/backups.cjs');
const {createServer} = require('../server/server.cjs');
test('shared server starts automatic backups of its actual schema', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portalflow-server-backups-'));
  const server = createServer({databasePath:path.join(root,'live.sqlite')});
  t.after(() => {server.emit('close');fs.rmSync(root,{recursive:true,force:true});});
  const directory=path.join(root,'backups');
  assert.equal(fs.existsSync(directory),true);
  const names=fs.readdirSync(directory);
  assert.equal(names.length,1);
  const copy=new DatabaseSync(path.join(directory,names[0]),{readOnly:true});
  try {assert.equal(copy.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name IN ('users','memberships','workspaces','sessions','invitations')").get().n,5);} finally {copy.close();}
});
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portalflow-backups-'));
  const db = new DatabaseSync(path.join(root, 'live.sqlite'));
  db.exec("PRAGMA journal_mode=WAL; CREATE TABLE users(id TEXT PRIMARY KEY, email TEXT); CREATE TABLE workspaces(id TEXT PRIMARY KEY, data TEXT); INSERT INTO users VALUES('u1','agency@example.com'); INSERT INTO workspaces VALUES('w1','{\"projects\":[{\"name\":\"Brand refresh\"}]}');");
  t.after(() => { db.close(); fs.rmSync(root, {recursive:true, force:true}); });
  return {db, root, directory:path.join(root, "private ' snapshots")};
}
test('snapshot preserves committed WAL data and is a private, independently readable SQLite file', t => {
  const {db, directory} = fixture(t);
  const first = createBackup(db, directory);
  db.exec("INSERT INTO users VALUES('u2','client@example.com')");
  const second = createBackup(db, directory);
  assert.notEqual(first, second);
  const copy = new DatabaseSync(first, {readOnly:true});
  try {
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(copy.prepare('SELECT count(*) AS n FROM users').get().n, 1);
    assert.equal(JSON.parse(copy.prepare('SELECT data FROM workspaces').get().data).projects[0].name, 'Brand refresh');
  } finally { copy.close(); }
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n, 2);
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(directory).mode & 0o777, 0o700);
    assert.equal(fs.statSync(first).mode & 0o777, 0o600);
  }
});
test('retention removes only owned completed snapshots and preserves unrelated files and symlinks', t => {
  const {db, root, directory} = fixture(t);
  fs.mkdirSync(directory);
  fs.writeFileSync(path.join(directory,'important.sqlite'), 'keep');
  fs.writeFileSync(path.join(directory,'portalflow-backup-incomplete.sqlite'), 'keep');
  fs.symlinkSync(path.join(root,'live.sqlite'),path.join(directory,'portalflow-backup-2000-01-01T00-00-00-000Z-00000000-0000-4000-8000-000000000000.sqlite'));
  const first=createBackup(db,directory,{retain:2});
  createBackup(db,directory,{retain:2});
  const latest=createBackup(db,directory,{retain:2});
  assert.equal(fs.existsSync(first), false);
  assert.equal(fs.existsSync(latest), true);
  assert.equal(fs.readFileSync(path.join(directory,'important.sqlite'),'utf8'),'keep');
  assert.equal(fs.readdirSync(directory).length,5);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,1);
});
test('failed snapshot leaves no incomplete file and retains previous successful backup', t => {
  const {db,directory}=fixture(t);
  const previous=createBackup(db,directory);
  db.exec('BEGIN;');
  assert.throws(()=>createBackup(db,directory), /transaction/i);
  db.exec('ROLLBACK;');
  assert.deepEqual(fs.readdirSync(directory),[path.basename(previous)]);
});
test('configuration rejects invalid retention, intervals, and symlink directories before backup', t => {
  const {db,root,directory}=fixture(t);
  for(const retain of [0,-1,1.2,'7',1001]) assert.throws(()=>createBackup(db,directory,{retain}), /retain/i);
  for(const intervalMs of [0,-1,1.2,'1000',2147483648]) assert.throws(()=>startBackups(db,directory,{intervalMs}), /interval/i);
  assert.throws(()=>startBackups(db,directory,{onError:'bad'}),/onError/i);
  fs.mkdirSync(directory); fs.symlinkSync(directory,path.join(root,'linked'));
  assert.throws(()=>createBackup(db,path.join(root,'linked')), /symbolic|symlink/i);
  assert.deepEqual(fs.readdirSync(directory),[]);
});
test('scheduler snapshots immediately, repeats, reports failures and stops cleanly', async t => {
  const {db,directory}=fixture(t);
  const errors=[];
  const controller=startBackups(db,directory,{intervalMs:25,retain:3,onError:error=>errors.push(error)});
  assert.equal(fs.readdirSync(directory).length,1);
  db.exec('BEGIN;');
  await new Promise(resolve=>setTimeout(resolve,65));
  assert.ok(errors.length>=1);
  db.exec('ROLLBACK;');
  await new Promise(resolve=>setTimeout(resolve,40));
  controller.stop(); controller.stop();
  const names=fs.readdirSync(directory);
  assert.ok(names.length>=2 && names.length<=3);
  await new Promise(resolve=>setTimeout(resolve,60));
  assert.deepEqual(fs.readdirSync(directory),names);
});
