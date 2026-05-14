'use strict';

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'feedbacks.db');
let db;

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      orderId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  saveDb();
  console.log('Feedback DB initialized');
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function createFeedback({ id, userId, orderId, rating, comment, createdAt }) {
  db.run(
    'INSERT INTO feedbacks (id, userId, orderId, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userId, orderId, rating, comment || '', createdAt]
  );
  saveDb();
}

function findFeedbacksByOrder(orderId) {
  const stmt= db.prepare('SELECT * FROM feedbacks WHERE orderId = ?');
  const results = [];
  stmt.bind([orderId]);
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

module.exports = { initDb, createFeedback, findFeedbacksByOrder };