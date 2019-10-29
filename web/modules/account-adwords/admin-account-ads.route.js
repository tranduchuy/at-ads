const express = require('express');
const router = express.Router({});
const AdminAccountAdsController = require('./admin-account-ads.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckRoleIdMiddleWare = require('../../middlewares/check-user-admin');

router.put(
  '/limit-website',
  CheckTokenMiddleware,
  CheckRoleIdMiddleWare,
  AdminAccountAdsController.updateLimitWebsite
);

module.exports = router;
