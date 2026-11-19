const router = require('express').Router();
const L = require('../logic');
const store = require('../db');
const { handle } = require('../middleware/validate');

router.get('/state', handle((req) => L.buildState(req.user)));

router.get('/health', handle(() => ({ ok: true, database: store.getMode(), users: store.all('users').length })));

router.isV3 = true;
module.exports = router;