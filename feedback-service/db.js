'use strict';

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'feedbacks.db');
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
  const results = db.exec('SELECT * FROM feedbacks WHERE orderId = "' + orderId + '"');
  if (!results || results.length === 0) return [];

  const cols = results[0].columns;
  return results[0].values.map(vals => {
    const row = {};
    cols.forEach((col, i) => row[col] = vals[i]);
    return row;
  });
}

module.exports = { initDb, createFeedback, findFeedbacksByOrder };