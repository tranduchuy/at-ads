const express = require('express');
const router = express.Router({});
const WebsiteController = require('./website.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckUserAdminMiddleware = require('../../middlewares/check-user-admin');

router.post('/', CheckTokenMiddleware, WebsiteController.addDomainForAccountAds);
router.get('/', CheckTokenMiddleware, WebsiteController.getWebsitesByAccountId);
router.put('/:websiteId', CheckTokenMiddleware, WebsiteController.editDomain);
router.delete('/:code', CheckTokenMiddleware, WebsiteController.deleteDomain);
router.post('/:code', CheckTokenMiddleware, CheckUserAdminMiddleware, WebsiteController.checkWebsiteByCode);

module.exports = router;
