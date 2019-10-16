const express = require('express');
const router = express.Router({});
const AdminWebsiteCtrl = require('./admin-website.controller');
const UserConstant = require('../../modules/user/user.constant');
const CheckToken = require('../../middlewares/check-token');
const CheckRole = require('../../middlewares/check-custom-role');

const checkRoleAdminAndMasterMiddleware = CheckRole([UserConstant.role.admin, UserConstant.role.master]);

router.get('/', [CheckToken, checkRoleAdminAndMasterMiddleware], AdminWebsiteCtrl.getWebsitesListForAdminPage);
router.put('/:code/recheck-tracking-code', [CheckToken, checkRoleAdminAndMasterMiddleware], AdminWebsiteCtrl.checkAttachTrackingScript);

module.exports = router;