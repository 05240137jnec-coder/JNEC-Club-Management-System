const router = require('express').Router();
const L = require('../logic');
const { needLogin } = require('../middleware/auth');
const { handle } = require('../middleware/validate');

router.post('/c/:coll/delete-many', needLogin, handle((req) => ({ deleted: L.deleteItems(req.user, req.params.coll, req.body.ids) })));
router.post('/c/:coll', needLogin, handle((req) => ({ item: L.createItem(req.user, req.params.coll, req.body) }), 201));
router.patch('/c/:coll/:id', needLogin, handle((req) => ({ item: L.updateItem(req.user, req.params.coll, req.params.id, req.body) })));
router.delete('/c/:coll/:id', needLogin, handle((req) => ({ deleted: L.deleteItems(req.user, req.params.coll, [req.params.id]) })));

router.isV3 = true;
module.exports = router;