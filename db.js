// FILE LOCATION: jnec-backend/db.js
// MySQL storage (with an automatic fallback to a local file when MySQL is not running).
// - Every kind of record has its own MySQL table (users, clubs, events, ...), with the important
//   fields as real columns and the complete record also kept in the `data` column.
// - All records are loaded into memory when the server starts, so reads are instant. Every change is
//   written to MySQL (in one transaction per request) before the server answers the browser.
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const cut = (v, n) => (v === undefined || v === null || v === '' ? null : String(v).slice(0, n));

// table name, extra columns: [column, SQL type, how to read it from a record]
const SCHEMA = {
  users:         { table: 'users',         cols: [['email', 'VARCHAR(190) NOT NULL UNIQUE', (r) => cut(r.email, 190)], ['student_id', 'VARCHAR(40) NULL', (r) => cut(r.studentId, 40)], ['role', 'VARCHAR(20) NOT NULL', (r) => cut(r.role, 20)], ['club_id', 'VARCHAR(40) NULL', (r) => cut(r.clubId, 40)], ['status', 'VARCHAR(20) NOT NULL', (r) => cut(r.status, 20)]] },
  clubs:         { table: 'clubs',         cols: [['name', 'VARCHAR(190) NOT NULL', (r) => cut(r.name, 190)], ['category', 'VARCHAR(60) NULL', (r) => cut(r.category, 60)], ['status', 'VARCHAR(20) NOT NULL', (r) => cut(r.status, 20)], ['secretary_id', 'VARCHAR(40) NULL', (r) => cut(r.secretaryId, 40)]] },
  memberships:   { table: 'memberships',   cols: [['user_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.userId, 40)], ['club_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.clubId, 40)], ['status', 'VARCHAR(20) NOT NULL', (r) => cut(r.status, 20)]] },
  events:        { table: 'events',        cols: [['club_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.clubId, 40)], ['title', 'VARCHAR(255) NOT NULL', (r) => cut(r.title, 255)], ['event_date', 'VARCHAR(10) NOT NULL', (r) => cut(r.date, 10)], ['capacity', 'INT NOT NULL DEFAULT 0', (r) => Number(r.capacity) || 0]] },
  registrations: { table: 'registrations', cols: [['event_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.eventId, 40)], ['user_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.userId, 40)]] },
  attendance:    { table: 'attendance',    cols: [['event_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.eventId, 40)], ['user_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.userId, 40)], ['status', 'VARCHAR(20) NOT NULL', (r) => cut(r.status, 20)]] },
  announcements: { table: 'announcements', cols: [['club_id', 'VARCHAR(40) NULL', (r) => cut(r.clubId, 40)], ['author_id', 'VARCHAR(40) NULL', (r) => cut(r.authorId, 40)], ['post_date', 'VARCHAR(10) NULL', (r) => cut(r.date, 10)], ['title', 'VARCHAR(255) NULL', (r) => cut(r.title, 255)]] },
  feedback:      { table: 'feedback',      cols: [['user_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.userId, 40)], ['club_id', 'VARCHAR(40) NULL', (r) => cut(r.clubId, 40)], ['event_id', 'VARCHAR(40) NULL', (r) => cut(r.eventId, 40)]] },
  resetRequests: { table: 'reset_requests', cols: [['user_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.userId, 40)]] },
  logs:          { table: 'logs',          cols: [['user_id', 'VARCHAR(40) NULL', (r) => cut(r.userId, 40)], ['log_date', 'VARCHAR(10) NULL', (r) => cut(r.date, 10)], ['action', 'VARCHAR(255) NULL', (r) => cut(r.action, 255)]] },
  reads:         { table: 'announcement_reads', cols: [['user_id', 'VARCHAR(40) NOT NULL', (r) => cut(r.id, 40)]] },
};
const NAMES = Object.keys(SCHEMA);

const createSql = (s) =>
  `CREATE TABLE IF NOT EXISTS \`${s.table}\` (\n  seq BIGINT NOT NULL AUTO_INCREMENT UNIQUE,\n  id VARCHAR(40) NOT NULL PRIMARY KEY,\n` +
  s.cols.map(([c, t]) => `  \`${c}\` ${t},`).join('\n') +
  `\n  data LONGTEXT NOT NULL\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

let pool = null;
let mode = 'mysql';        // 'mysql' or 'file' (file = MySQL not running; data saved in data/store.json)
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'store.json');
const mem = {};            // collection -> Map(id -> JSON text)
let pending = [];          // changes waiting to be written to MySQL
let chain = Promise.resolve();
NAMES.forEach((n) => { mem[n] = new Map(); });

/* ---------- Reading (from memory) ---------- */
const all = (c) => [...mem[c].values()].map((j) => JSON.parse(j));
const get = (c, id) => { const j = mem[c].get(String(id)); return j ? JSON.parse(j) : null; };

/* ---------- Writing (memory now, MySQL when flush() runs) ---------- */
function put(c, item) {
  const s = SCHEMA[c]; const id = String(item.id);
  mem[c].set(id, JSON.stringify(item));
  const names = s.cols.map(([n]) => `\`${n}\``);
  pending.push([
    `INSERT INTO \`${s.table}\` (id, ${names.join(', ')}, data) VALUES (?, ${names.map(() => '?').join(', ')}, ?) ` +
    `ON DUPLICATE KEY UPDATE ${names.map((n) => `${n}=VALUES(${n})`).join(', ')}, data=VALUES(data)`,
    [id, ...s.cols.map(([, , read]) => read(item)), JSON.stringify(item)],
  ]);
  return item;
}
function remove(c, id) {
  const had = mem[c].delete(String(id));
  if (had) pending.push([`DELETE FROM \`${SCHEMA[c].table}\` WHERE id = ?`, [String(id)]]);
  return had ? 1 : 0;
}
const removeWhere = (c, fn) => { let n = 0; all(c).forEach((i) => { if (fn(i)) n += remove(c, i.id); }); return n; };
function clearAll() { NAMES.forEach((c) => { mem[c].clear(); pending.push([`DELETE FROM \`${SCHEMA[c].table}\``, []]); }); }
const tx = (fn) => fn();
const newId = (prefix) => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function saveFile() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const out = {}; NAMES.forEach((c) => { out[c] = all(c); });
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(out));
  fs.renameSync(tmp, DATA_FILE);
}
function loadFile() {
  NAMES.forEach((c) => mem[c].clear());
  if (!fs.existsSync(DATA_FILE)) return;
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  NAMES.forEach((c) => (data[c] || []).forEach((i) => mem[c].set(String(i.id), JSON.stringify(i))));
}

// Save all waiting changes: to MySQL in ONE transaction (all or nothing), or to the local file
function flush() {
  const ops = pending; pending = [];
  if (!ops.length) return chain;
  if (mode === 'file') { saveFile(); return chain; }
  const run = async () => {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const [sql, params] of ops) await conn.query(sql, params);
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  };
  const p = chain.then(run);
  chain = p.catch(() => {});
  return p;
}

async function loadFromMysql() {
  for (const c of NAMES) {
    mem[c].clear();
    const [rows] = await pool.query(`SELECT id, data FROM \`${SCHEMA[c].table}\` ORDER BY seq`);
    rows.forEach((r) => mem[c].set(r.id, r.data));
  }
}
// After a failed save, forget unsaved changes and re-read what MySQL really contains
async function recover() { pending = []; try { await chain; } catch {} try { if (mode === 'file') loadFile(); else await loadFromMysql(); } catch (e) { console.error('Could not reload data:', e.message); } }

// Plain-text passwords (seed file / old backups) are hashed on the way in
function load(data) {
  for (const [coll, rows] of Object.entries(data)) {
    if (!SCHEMA[coll]) continue;
    if (coll === 'reads' && !Array.isArray(rows)) { Object.entries(rows).forEach(([uid, ids]) => put('reads', { id: uid, ids })); continue; }
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      const item = { ...r };
      if (coll === 'users') { if (item.password) item.passwordHash = bcrypt.hashSync(item.password, 10); delete item.password; }
      if (!item.id) item.id = newId(coll.slice(0, 2));
      put(coll, item);
    }
  }
}

async function connectMysql() {
  const cfg = {
    host: process.env.MYSQL_HOST || 'localhost', port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root', password: process.env.MYSQL_PASSWORD || '', connectTimeout: 4000,
  };
  const dbName = (process.env.MYSQL_DATABASE || 'jnec_clubs').replace(/[^A-Za-z0-9_]/g, '');
  try {
    const first = await mysql.createConnection(cfg);
    try { await first.query('SET GLOBAL max_allowed_packet = 67108864'); } catch (e) { /* needs admin rights; optional */ }
    await first.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await first.end();
    pool = mysql.createPool({ ...cfg, database: dbName, waitForConnections: true, connectionLimit: 5, charset: 'utf8mb4' });
    for (const c of NAMES) await pool.query(createSql(SCHEMA[c]));
  } catch (e) {
    pool = null;
    if (e.code === 'ER_ACCESS_DENIED_ERROR') throw new Error('MySQL refused the user name or password. Check MYSQL_USER and MYSQL_PASSWORD in your .env file.');
    throw new Error(`Cannot reach MySQL at ${cfg.host}:${cfg.port} (${e.code || e.message}). Start MySQL first (XAMPP -> Start next to MySQL).`);
  }
  return dbName;
}

// DB_MODE in .env:  auto (default: try MySQL, otherwise use a file)  |  mysql (MySQL only)  |  file (never use MySQL)
async function init() {
  const wanted = (process.env.DB_MODE || 'auto').toLowerCase();
  let dbName = null;
  if (wanted !== 'file') {
    try { dbName = await connectMysql(); } catch (e) {
      if (wanted === 'mysql') throw e;
      console.warn('\nNOTE: ' + e.message);
      console.warn('      Running WITHOUT MySQL for now: your data is saved in the file data/store.json instead.');
      console.warn('      That is fine for testing. When MySQL is running, restart the server and it switches to MySQL.\n');
    }
  }
  mode = dbName ? 'mysql' : 'file';
  if (mode === 'mysql') await loadFromMysql(); else loadFile();

  if (mem.users.size) { console.log(mode === 'mysql' ? `Connected to MySQL database "${dbName}".` : 'Loaded saved data from data/store.json.'); return; }
  if (mode === 'mysql' && fs.existsSync(DATA_FILE)) {          // move test data made without MySQL into MySQL
    load(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    await flush();
    console.log(`MySQL database "${dbName}" created and your saved data from data/store.json was moved into it.`);
    return;
  }
  load(JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8')));
  await flush();
  console.log((mode === 'mysql' ? `MySQL database "${dbName}" created.` : 'Starting data created.') + ' Admin login: admin@jnec.edu.bt / Admin@123 (you must change it at first login)');
}

const getMode = () => mode;

module.exports = { init, getMode, flush, recover, all, get, put, remove, removeWhere, clearAll, tx, newId, load, SCHEMA, NAMES, createSql };