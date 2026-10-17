# Local database backups

`server/backups.cjs` creates a complete SQLite snapshot immediately when its scheduler starts, then once per day by default. It retains seven successful snapshots. A snapshot includes users, password hashes, sessions, invitations, memberships, and all saved workspaces. Keep the directory private. These are local backups; they do not protect against loss of the computer or its disk.

The shared server starts the scheduler automatically after opening and initializing the database, and stops it before closing the connection. Backups go in a private `backups/` directory beside the database. In-memory test databases are skipped. It is not part of the browser-only demo. The integration uses:

```js
const {startBackups} = require('./backups.cjs');
const backups = startBackups(db, backupDirectory, {
  intervalMs: 86400000,
  retain: 7,
  onError: error => console.error('PortalFlow backup failed:', error.message)
});
// During server shutdown, before closing the SQLite connection:
backups.stop();
```

`createBackup(db, backupDirectory, {retain: 7})` also creates a snapshot on demand and returns its absolute path. Errors throw for this direct API; the scheduler reports errors through `onError` and retries at its next interval. The scheduler does not keep a stopped application running. No snapshots are created while the server is off.

The backup directory uses owner-only permissions (`0700`), and snapshot files use `0600`. Use a directory reserved for PortalFlow backups because existing directory permissions are tightened too. SQLite writes a consistent snapshot using a bound `VACUUM INTO` filename. The module checks database integrity, syncs the file, then renames it from `.partial` to `.sqlite`. Failed attempts clean up their partial file; a process or power interruption may leave a `.partial` file that must never be restored. The scheduler prunes only regular files matching its full generated snapshot filename; unrelated files and symlinks are preserved. Retention runs only after a successful snapshot. Snapshot creation is synchronous and can briefly delay requests for larger databases.

## Restore safely to a new database

1. Stop PortalFlow. Keep the current database and its `-wal` / `-shm` files together and unchanged.
2. Choose a completed snapshot whose name starts with `portalflow-backup-` and ends with `.sqlite`. Never choose a `.partial` file.
3. Copy it to a **new, unused** database path in a private directory. Do not overwrite the current database or copy a live `.sqlite` file by itself. A completed backup is self-contained.
4. Use Node 24 to open the copied file, check its integrity, and revoke restored sessions and invitations before serving it. This forces people to sign in again and requires generating fresh invitations:

```js
const {DatabaseSync} = require('node:sqlite');
const db = new DatabaseSync('/absolute/private/path/restored.sqlite');
try {
  const results = db.prepare('PRAGMA integrity_check').all();
  if (results.length !== 1 || results[0].integrity_check !== 'ok') {
    throw new Error('Restore failed integrity check. Keep the original database unchanged.');
  }
  db.exec('BEGIN; DELETE FROM sessions; DELETE FROM invitations; COMMIT;');
} finally {
  db.close();
}
```

5. Start PortalFlow with `DATABASE_PATH` pointing to that new absolute path. Sign in and check the expected clients, projects, and approval history before making further changes. Keep the original database until the restored copy is verified.

The scheduler does not restore data or replace a running database automatically. Copying a snapshot onto an active database can corrupt data and is not supported. Passwords and workspace permissions return to the state captured in the snapshot; later changes must be reapplied as needed.

## Verification

Run `node --test tests/backups.cjs` with Node 24. Tests use disposable real SQLite databases in WAL mode. They check restored users and workspace content, integrity, file permissions, uniqueness, retention, unrelated-file and symlink preservation, transaction failure cleanup, invalid configuration, repeated scheduling, error reporting, and stopping the scheduler.

SQLite documents the consistency and interruption behavior of [VACUUM INTO](https://www.sqlite.org/lang_vacuum.html#vacuum_with_an_into_clause).
