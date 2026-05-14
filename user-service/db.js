'use strict';

const initSqlJs = require('sql.js');
const fs = require('fs');
const path= require('path');

const DB_PATH = path.join(__dirname, 'users.db');
let db;

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  saveDb();
  console.log('User DB initialized');
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function createUser({ id, name, email, password, createdAt }) {
  db.run(
    'INSERT INTO users (id, name, email, password, createdAt) VALUES (?, ?, ?, ?, ?)',
    [id, name, email, password, createdAt]
  );
  saveDb();
}

function findUserByEmail(email) {
  const stmt   = db.prepare('SELECT * FROM users WHERE email = ?');
  const result = stmt.getAsObject([email]);
  stmt.free();
  return Object.keys(result).length === 0 ? null : result;
}

function findUserById(id) {
  const stmt   = db.prepare('SELECT * FROM users WHERE id = ?');
  const result = stmt.getAsObject([id]);
  stmt.free();
  return Object.keys(result).length === 0 ? null : result;
}

module.exports = { initDb, createUser, findUserByEmail, findUserById };