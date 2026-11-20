const store = require('../db');
const L = require('../logic');

const handle = (fn, status = 200) => async (req, res, next) => {
  try {
    const out = fn(req, res) ?? { ok: true };
    await store.flush();
    res.status(status).json(out);
  } catch (e) {
    if (!(e instanceof L.HttpError)) await store.recover();
    next(e);
  }
};

const notFound = (_req, res) => res.status(404).json({ error: 'Endpoint not found.' });

const errorHandler = (err, _req, res, _next) => {
  if (err instanceof L.HttpError) return res.status(err.code).json({ error: err.message, fields: err.fields });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'That file is too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
};

module.exports = { handle, notFound, errorHandler, isV3: true };