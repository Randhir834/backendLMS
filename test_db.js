require('dotenv').config();
const { query } = require('./src/config/database');
async function test() {
  try {
    const res = await query('SELECT $1::text as val', [undefined]);
    console.log('SUCCESS:', res.rows);
  } catch (err) {
    console.error('ERROR:', err.message);
  }
  process.exit(0);
}
test();
