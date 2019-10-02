const express = require('express');
const router = express.Router({});
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckAdminMiddleware = require('../../middlewares/check-user-admin');
const googleAdsErrorCtrl = require('./google-ads-error.controller');

router.get('/', CheckTokenMiddleware, CheckAdminMiddleware, googleAdsErrorCtrl.getErrorListForAdminPage);
router.get('/statistic', CheckTokenMiddleware, CheckAdminMiddleware, googleAdsErrorCtrl.getErrorStatistic);

module.exports = router;
