const express = require('express');
const router = express.Router({});
const WebsiteController = require('./website.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');

router.post('/', CheckTokenMiddleware, WebsiteController.addDomainForAccountAds);

module.exports = router;
