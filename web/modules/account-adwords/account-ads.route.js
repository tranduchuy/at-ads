const express = require('express');
const router = express.Router({});
const AccountAdsController = require('./account-ads.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckAccountIdMiddleWare = require('../../middlewares/check-account-id');
const CheckEmptyCampaignMiddleWare = require('../../middlewares/check-empty-campaign');

router.post('/', CheckTokenMiddleware, AccountAdsController.addAccountAds);
router.post('/:accountId/ips', CheckTokenMiddleware, CheckAccountIdMiddleWare, CheckEmptyCampaignMiddleWare, AccountAdsController.handleManipulationGoogleAds);
router.post('/:accountId/auto-blocking-ip', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.autoBlockIp);
router.post('/:accountId/auto-blocking-3g4g', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.autoBlocking3g4g);
router.get('/', CheckTokenMiddleware, AccountAdsController.getAccountsAds);

module.exports = router;
