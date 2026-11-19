const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const L = require('../logic');
const { needLogin } = require('../middleware/auth');
const { handle } = require('../middleware/validate');

const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, message: { error: 'Too many attempts. Try again in a few minutes.' } });
const signupLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: { error: 'Too many sign-ups. Try again later.' } });

router.post('/login', loginLimit, handle((req) => L.login(req.body.identifier, req.body.password)));
router.post('/register', signupLimit, handle((req) => L.register(req.body || {})));
router.get('/check', handle((req) => L.available(req.query.email, req.query.studentId)));
router.post('/forgot', handle((req) => { L.forgot(req.body.email); }));
router.post('/password', needLogin, handle((req) => { L.changePassword(req.user, req.body.currentPassword, req.body.newPassword); }));

router.isV3 = true;
module.exports = router;