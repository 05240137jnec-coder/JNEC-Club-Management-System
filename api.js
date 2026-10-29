const router = require('express').Router();

function load(file) {
  let m;
  try { m = require(file); } catch (e) {
    throw new Error(`${file.slice(2)} is the OLD version or broken (${String(e.message).split('\n')[0]}). Replace the whole file with the new code`);
  }
  if (!m || m.isV3 !== true) throw new Error(`${file.slice(2)} is the OLD version. Replace the whole file with the new code`);
  return m;
}

const { viewer } = load('./middleware/auth');
const { notFound } = load('./middleware/validate');

router.use(viewer);
router.use('/auth', load('./routes/auth'));
router.use('/admin', load('./routes/admin'));
router.use(load('./routes/public'));
router.use(load('./routes/member'));
router.use(load('./routes/management'));
router.use(notFound);

module.exports = router;