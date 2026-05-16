'use strict';

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'users.db');
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
    CREATE TABLE IF NOT EXISTS users (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      email     TEXT UNIQUE NOT NULL,
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
  const allUsers = db.exec('SELECT email FROM users');
  console.log('All users in DB:', JSON.stringify(allUsers));
  
  const results = db.exec("SELECT * FROM users WHERE email = '" + email.trim() + "'");
  console.log('Search result:', JSON.stringify(results));
  
  if (!results || results.length === 0 || results[0].values.length === 0) return null;

  const cols = results[0].columns;
  const vals = results[0].values[0];
  const user = {};
  cols.forEach((col, i) => user[col] = vals[i]);
  return user;
}

function findUserById(id) {
  const results = db.exec('SELECT * FROM users WHERE id = "' + id + '"');
  if (!results || results.length === 0 || results[0].values.length === 0) return null;

  const cols = results[0].columns;
  const vals = results[0].values[0];
  const user = {};
  cols.forEach((col, i) => user[col] = vals[i]);
  return user;
}

module.exports = { initDb, createUser, findUserByEmail, findUserById };