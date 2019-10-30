const express = require('express');
const router = express.Router({});
const UserController = require('./user.controller');
const UserActionHistoryController = require('../user-action-history/user-action-history.controller');
const websiteController = require('../website/website.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckUserAdminMidddleware = require('../../middlewares/check-user-admin');
// const multer = require('multer');

router.post('/check', UserController.check);
router.post('/login', UserController.login);
router.post('/login-by-google', UserController.loginByGoogle);
router.post('/register', UserController.register);
router.post('/confirm', UserController.confirm);
router.post('/confirm/resend', UserController.resendConfirm);
// router.post('/update', CheckTokenMiddleware, upload.single('avatar'), UserController.update);
router.put('/', CheckTokenMiddleware, UserController.update);
router.post('/forget-password', UserController.forgetPassword);
router.post('/reset-password', UserController.resetPassword);
router.get('/info', CheckTokenMiddleware, UserController.getLoggedInInfo);
router.get('/actions-history', CheckTokenMiddleware, UserActionHistoryController.getActionsHistory);
router.get('/check-refresh-token', CheckTokenMiddleware, UserController.checkRefreshToken);
router.put('/refresh-token-access-token', CheckTokenMiddleware, UserController.updateRefreshTokenAndAccessToken);

module.exports = router;
