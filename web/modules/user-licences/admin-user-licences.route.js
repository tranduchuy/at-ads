const express = require('express');
const router = express.Router({});
const AdminUserLicencesController = require('./admin-user-licences.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckRoleMiddleWare = require('../../middlewares/check-user-admin');

router.put('/', CheckTokenMiddleware, CheckRoleMiddleWare, AdminUserLicencesController.updatePackageForUser);

module.exports = router;
