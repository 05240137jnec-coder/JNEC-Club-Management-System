// FILE LOCATION: jnec-backend/server.js
// Loads a package or file; if it is missing, prints a clear message instead of a long error.
function load(name) {
  try { return require(name); } catch (e) {
    console.error('\n==================================================');
    console.error('The server could not start. Something is missing.');
    console.error('Problem: ' + String(e.message).split('\n')[0]);
    console.error(e.code === 'MODULE_NOT_FOUND'
      ? 'Fix: run  npm install  (if a package is missing), and make sure these are all in the jnec-backend folder:\n     server.js, api.js, db.js, logic.js, seed.json, routes/ (5 files), middleware/ (2 files)'
      : 'Fix: make sure every file was replaced with the newest version.');
    console.error('==================================================\n');
    process.exit(1);
  }
}

load('dotenv').config();
const express = load('express');
const cors = load('cors');
const helmet = load('helmet');
const path = require('path');
const fs = require('fs');
const store = load('./db');
const { errorHandler } = load('./middleware/validate');
const apiRoutes = load('./api');

if (!process.env.JWT_SECRET) console.warn('WARNING: set JWT_SECRET in .env before going live.');

const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '8mb' })); // club logos are sent as images inside the JSON

app.use('/api', apiRoutes);

// Serve the website from the same server
const front = path.resolve(__dirname, process.env.FRONTEND_DIR || '../public');
if (fs.existsSync(front)) app.use(express.static(front));
else console.warn('Frontend folder not found:', front, '\nSet FRONTEND_DIR=../public in your .env file.');

app.use(errorHandler);

const port = process.env.PORT || 3000;
store.init()
  .then(() => app.listen(port, () => console.log(`\nJNEC Clubs running on http://localhost:${port}\n`)))
  .catch((e) => { console.error('\nCould not start: ' + e.message + '\n'); process.exit(1); });