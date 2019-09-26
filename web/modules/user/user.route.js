const express = require('express');
const router = express.Router({});
const UserController = require('./user.controller');
const UserActionHistoryController = require('../user-action-history/user-action-history.controller');
const websiteController = require('../website/website.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckUserAdminMidddleware = require('../../middlewares/check-user-admin');
const multer = require('multer');

/**
 * @swagger
 * /users/check:
 *    post:
 *      description: Check weather email is valid or not
*      tags: [Users]
 */
router.post('/check', UserController.check);

/**
 * @swagger
 * /users/login:
 *    post:
 *      description: Login
 *      tags: [Users]
 */
router.post('/login', UserController.login);

/**
 * @swagger
 * /users/login-by-google:
 *    post:
 *      description: Login by google
 *      tags: [UsersForAdmin]
 */
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
router.put('/website', CheckTokenMiddleware, CheckUserAdminMidddleware, websiteController.updateDomainToVip);

module.exports = router;
