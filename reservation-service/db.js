'use strict';

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'reservations.db');
let db;

async function initDb() {
  const SQL = await initSqlJs();
  db = new SQL.Database();

  if (fs.existsSync(DB_PATH)) {
    try {
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } catch(e) {
      console.warn('Could not load existing DB, starting fresh');
      db = new SQL.Database();
    }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      userId  TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      guests INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  saveDb();
  console.log('Reservation DB initialized');
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function createReservation({ id, userId, type, date, time, guests, notes, createdAt }) {
  db.run(
    `INSERT INTO reservations (id, userId, type, date, time, guests, status, notes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
    [id, userId, type, date, time, guests, notes || '', createdAt]
  );
  saveDb();
}

function findReservationById(id) {
  const cleanId = id.trim();
  const results = db.exec("SELECT * FROM reservations WHERE id = '" + cleanId + "'");
  if (!results || results.length === 0 || results[0].values.length === 0) return null;

  const cols = results[0].columns;
  const vals = results[0].values[0];
  const row  = {};
  cols.forEach((col, i) => row[col] = vals[i]);
  return row;
}
function findReservationsByUser(userId) {
  const cleanId = userId.trim();
  const results = db.exec("SELECT * FROM reservations WHERE userId = '" + cleanId + "'");
  if (!results || results.length === 0) return [];

  const cols = results[0].columns;
  return results[0].values.map(vals => {
    const row = {};
    cols.forEach((col, i) => row[col] = vals[i]);
    return row;
  });
}

function cancelReservation(id) {
  db.run("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [id]);
  saveDb();
}

module.exports = { initDb, createReservation, findReservationById, findReservationsByUser, cancelReservation };