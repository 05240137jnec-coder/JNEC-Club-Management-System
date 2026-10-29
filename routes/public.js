const router = require('express').Router();
const L = require('../logic');
const { handle } = require('../middleware/validate');

router.get('/state', handle((req) => L.buildState(req.user)));

router.isV3 = true;
module.exports = router;