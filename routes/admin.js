const router = require('express').Router();
const L = require('../logic');
const { needAdmin } = require('../middleware/auth');
const { handle } = require('../middleware/validate');

router.use(needAdmin);
router.get('/backup', handle(() => L.backup()));
router.post('/restore', handle((req) => { L.restore(req.body); }));

router.isV3 = true;
module.exports = router;