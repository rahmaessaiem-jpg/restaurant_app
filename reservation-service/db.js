'use strict';

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'reservations.db');
let db;

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
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
  const stmt   = db.prepare('SELECT * FROM reservations WHERE id = ?');
  const result = stmt.getAsObject([id]);
  stmt.free();
  return Object.keys(result).length === 0 ? null : result;
}

function findReservationsByUser(userId) {
  const stmt    = db.prepare('SELECT * FROM reservations WHERE userId = ?');
  const results = [];
  stmt.bind([userId]);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function cancelReservation(id) {
  db.run("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [id]);
  saveDb();
}

module.exports = { initDb, createReservation, findReservationById, findReservationsByUser, cancelReservation };