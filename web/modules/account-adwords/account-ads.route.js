const express = require('express');
const router = express.Router({});
const AccountAdsController = require('./account-ads.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckAccountIdMiddleWare = require('../../middlewares/check-account-id');
const CheckEmptyCampaignMiddleWare = require('../../middlewares/check-empty-campaign');

router.post('/', CheckTokenMiddleware, AccountAdsController.addAccountAds);
router.get('/:accountId/original-campaigns', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.getListOriginalCampaigns);
router.post('/:accountId/ips', CheckTokenMiddleware, CheckAccountIdMiddleWare, CheckEmptyCampaignMiddleWare, AccountAdsController.handleManipulationGoogleAds);
router.get('/:accountId/ips', CheckTokenMiddleware, CheckAccountIdMiddleWare, CheckEmptyCampaignMiddleWare, AccountAdsController.getIpsInCustomBlackList);
router.post('/:accountId/auto-blocking-ip', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.autoBlockIp);
router.post('/:accountId/auto-blocking-range-ip', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.autoBlockingRangeIp);
router.post('/:accountId/auto-blocking-3g4g', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.autoBlocking3g4g);
router.post('/:accountId/campaigns', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.addCampaignsForAAccountAds);
router.get('/:accountId/campaigns', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.getCampaignsInDB);
router.get('/', CheckTokenMiddleware, AccountAdsController.getAccountsAds);
router.post('/connection-confirmation', CheckTokenMiddleware, AccountAdsController.connectionConfirmation);
router.get('/:accountId/report/device', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.getReportOnDevice);
router.put('/:accountId/report/device',CheckTokenMiddleware , CheckAccountIdMiddleWare, AccountAdsController.setUpCampaignsByOneDevice);
router.post('/:accountId/block-sample-ip', CheckTokenMiddleware, CheckAccountIdMiddleWare, CheckEmptyCampaignMiddleWare, AccountAdsController.blockSampleIp);
router.get('/:accountId/block-sample-ip', CheckTokenMiddleware, CheckAccountIdMiddleWare, CheckEmptyCampaignMiddleWare, AccountAdsController.getIpInSampleBlockIp);
router.post('/:accountId/unblock-sample-ip', CheckTokenMiddleware, CheckAccountIdMiddleWare, CheckEmptyCampaignMiddleWare, AccountAdsController.unblockSampleIp);
router.get('/:accountId/verify-acctached-code-domains', CheckTokenMiddleware, CheckAccountIdMiddleWare, CheckEmptyCampaignMiddleWare, AccountAdsController.verifyAcctachedCodeDomains);
router.get('/:accountId/report', CheckTokenMiddleware, CheckAccountIdMiddleWare, AccountAdsController.getReportForAccount);

module.exports = router;
