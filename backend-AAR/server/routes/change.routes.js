// These routes expose the change request lifecycle for SRD holders and admins.
const router = require('express').Router();
const controller = require('../controllers/change.controller');
const { requireAuth, requirePermission } = require('../middlewares/auth.middleware');

router.get(
  '/mine',
  requireAuth,
  requirePermission('request.view_own'),
  controller.listMine,
);

router.get(
  '/',
  requireAuth,
  requirePermission('request.view_all'),
  controller.listAll,
);

router.post(
  '/',
  requireAuth,
  requirePermission('change_request.submit'),
  controller.create,
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('change_request.edit_own_draft'),
  controller.updateRejected,
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('change_request.submit'),
  controller.deleteOwn,
);

router.delete(
  '/:id/admin',
  requireAuth,
  requirePermission('request.review'),
  controller.deleteForAdmin,
);

router.post(
  '/:id/approve',
  requireAuth,
  requirePermission('request.approve'),
  controller.approve,
);

router.post(
  '/:id/reject',
  requireAuth,
  requirePermission('request.reject'),
  controller.reject,
);

router.post(
  '/:id/process',
  requireAuth,
  requirePermission('request.process_approved'),
  controller.process,
);

module.exports = router;
