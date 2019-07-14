const express = require('express');
const router = express.Router({});
const WebsiteController = require('./website.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');

router.post('/', CheckTokenMiddleware, WebsiteController.addDomainForAccountAds);
router.get('/', CheckTokenMiddleware, WebsiteController.getWebsitesByAccountId);
router.put('/:websiteId', CheckTokenMiddleware, WebsiteController.editDomain);

module.exports = router;
