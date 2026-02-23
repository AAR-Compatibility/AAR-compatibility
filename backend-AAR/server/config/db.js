// server/config/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

async function waitForDb() {
  let connected = false;
  while (!connected) {
    try {
      await pool.query('SELECT 1');
      connected = true;
      console.log('DB connected!');
    } catch {
      console.log('Waiting for DB...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

waitForDb();

module.exports = pool;
