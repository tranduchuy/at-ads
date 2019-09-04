const express = require('express');
const router = express.Router({});
const UserController = require('./user.controller');
const UserActionHistoryController = require('../user-action-history/user-action-history.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const multer = require('multer');

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

module.exports = router;
