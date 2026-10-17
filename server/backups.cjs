'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {randomUUID} = require('node:crypto');
const {DatabaseSync} = require('node:sqlite');
const DAY_MS = 24 * 60 * 60 * 1000;
const OWN_SNAPSHOT = /^portalflow-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.sqlite$/;
let lastTimestamp = 0;
function retention(value = 7) {
  if (!Number.isInteger(value) || value < 1 || value > 1000) throw new TypeError('Backup retain must be an integer between 1 and 1000.');
  return value;
}
function createBackup(db, directory, {retain = 7} = {}) {
  retention(retain);
  if (!db || typeof db.prepare !== 'function') throw new TypeError('An open SQLite database is required.');
  if (typeof directory !== 'string' || !directory.trim()) throw new TypeError('A backup directory is required.');
  const resolved = path.resolve(directory);
  fs.mkdirSync(resolved, {recursive:true, mode:0o700});
  const directoryStat = fs.lstatSync(resolved);
  if (directoryStat.isSymbolicLink()) throw new Error('Backup directory cannot be a symbolic link.');
  if (!directoryStat.isDirectory()) throw new Error('Backup directory must be a directory.');
  fs.chmodSync(resolved, 0o700);
  // Monotonic timestamps keep consecutive snapshots sortable within this process.
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
  const stamp = new Date(lastTimestamp).toISOString().replace(/[:.]/g, '-');
  const target = path.join(resolved, `portalflow-backup-${stamp}-${randomUUID()}.sqlite`);
  const partial = target + '.partial';
  let descriptor;
  try {
    descriptor = fs.openSync(partial, 'wx', 0o600);
    // Bind the filename: apostrophes and other path characters never become SQL.
    db.prepare('VACUUM INTO ?').run(partial);
    const snapshot = new DatabaseSync(partial, {readOnly:true});
    try {
      const result = snapshot.prepare('PRAGMA integrity_check').all();
      if (result.length !== 1 || result[0].integrity_check !== 'ok') throw new Error('Backup integrity check failed.');
    } finally { snapshot.close(); }
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor); descriptor = undefined;
    fs.renameSync(partial, target);
  } catch (error) {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try { fs.unlinkSync(partial); } catch (cleanupError) { if (cleanupError.code !== 'ENOENT') error.cleanupError = cleanupError; }
    throw error;
  }
  // Never prune unknown files, incomplete outputs, symlinks, or directories.
  const previous = fs.readdirSync(resolved, {withFileTypes:true})
    .filter(entry => entry.isFile() && OWN_SNAPSHOT.test(entry.name) && entry.name !== path.basename(target))
    .map(entry => entry.name).sort().reverse();
  for (const name of previous.slice(retain - 1)) fs.unlinkSync(path.join(resolved, name));
  return target;
}
function startBackups(db, directory, {intervalMs = DAY_MS, retain = 7, onError = error => console.error('PortalFlow backup failed:', error.message)} = {}) {
  retention(retain);
  if (!Number.isInteger(intervalMs) || intervalMs < 1 || intervalMs > 2147483647) throw new TypeError('Backup intervalMs must be an integer between 1 and 2147483647.');
  if (typeof onError !== 'function') throw new TypeError('Backup onError must be a function.');
  const run = () => {
    try { createBackup(db, directory, {retain}); }
    catch (error) {
      try { onError(error); }
      catch (reportError) { console.error('PortalFlow backup error reporter failed:', reportError.message); }
    }
  };
  run();
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return {stop() { clearInterval(timer); }};
}
module.exports = {createBackup, startBackups};
