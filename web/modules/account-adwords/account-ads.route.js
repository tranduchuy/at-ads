const express = require('express');
const router = express.Router({});
const AccountAdsController = require('./account-ads.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');

router.post('/', CheckTokenMiddleware, AccountAdsController.addAccountAds);

module.exports = router;
