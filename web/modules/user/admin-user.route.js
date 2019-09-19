const express = require('express');
const router = express.Router({});
const AdminUserController = require('./admin-user.controller');
const CheckTokenMidlewares = require('../../middlewares/check-token');
const CheckAdminMidlewares = require('../../middlewares/check-user-admin');

router.get('/list', AdminUserController.list);
router.post('/update/:id', AdminUserController.update);
router.post('/login', AdminUserController.login);
router.get('/', CheckTokenMidlewares, CheckAdminMidlewares, AdminUserController.getUsersListForAdminPage);
router.get('/accounts', CheckTokenMidlewares, CheckAdminMidlewares, AdminUserController.getAccountsListForAdminPage);
router.get('/error-google-ads', CheckTokenMidlewares, CheckAdminMidlewares, AdminUserController.getErrorListForAdminPage);
router.get('/websites', CheckTokenMidlewares, CheckAdminMidlewares, AdminUserController.getWebsitesListForAdminPage);

module.exports = router;
