const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
  const db = new SQL.Database(fs.readFileSync('reservations.db'));
  const id = '7c48011d-15b5-4735-9f74-7c456fa0fc85';
  const r1 = db.exec("SELECT * FROM reservations WHERE id = '" + id + "'");
  console.log('Result:', JSON.stringify(r1));
});