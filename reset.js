// Deletes ALL data and restores the starting data (8 clubs + the admin account).
// Stop the server first (Ctrl+C), then run:   npm run reset -- --yes
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const store = require('./db');

if (!process.argv.includes('--yes')) {
  console.log('\nThis DELETES every user, event, registration and announcement,');
  console.log('and restores the starting data (8 clubs + the admin account).');
  console.log('If you are sure, run:   npm run reset -- --yes\n');
  process.exit(0);
}

(async () => {
  await store.init();
  store.clearAll();
  store.load(JSON.parse(fs.readFileSync(path.join(__dirname, 'seed.json'), 'utf8')));
  await store.flush();
  console.log('\nDone. Data reset. Admin login: admin@jnec.edu.bt / Admin@123\n');
  process.exit(0);
})().catch((e) => { console.error('Reset failed: ' + e.message); process.exit(1); });