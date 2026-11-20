const L = require('../logic');

const token = (req) => (req.headers.authorization || '').replace(/^Bearer /, '');
const viewer = (req, _res, next) => { req.user = L.userFromToken(token(req)); next(); };
const needLogin = (req, res, next) =>
  req.user ? next() : res.status(401).json({ error: 'Please log in to continue.' });
const needAdmin = (req, res, next) =>
  req.user && req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Administrator only.' });

module.exports = { viewer, needLogin, needAdmin, isV3: true };