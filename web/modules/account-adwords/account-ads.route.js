const express = require('express');
const router = express.Router({});
const AccountAdsController = require('./account-ads.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');

router.post('/account-adwords', CheckTokenMiddleware, AccountAdsController.addAccountAds);
router.get('/account-adwords/:userId', CheckTokenMiddleware, AccountAdsController.getAccountsAds);

module.exports = router;
