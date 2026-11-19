const router = require('express').Router();
const L = require('../logic');
const { needLogin } = require('../middleware/auth');
const { handle } = require('../middleware/validate');

router.post('/logs', needLogin, handle((req) => { L.addLog(req.user, req.body.action); }));
router.post('/reads', needLogin, handle((req) => { L.markRead(req.user, req.body.ids); }));

router.isV3 = true;
module.exports = router;