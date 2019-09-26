const express = require('express');
const router = express.Router({});
const UserController = require('./user.controller');
const UserActionHistoryController = require('../user-action-history/user-action-history.controller');
const websiteController = require('../website/website.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckUserAdminMiddleware = require('../../middlewares/check-user-admin');
const multer = require('multer');

router.post('/check', UserController.check);

/**
 * @swagger api login:
 * path:
 *  /users/login:
 *   post:
 *    tags: [Users]
 *    description: Login by email and password
 *    consumes:
 *    - application/json
 *    produces:
 *    - application/json
 *    parameters:
 *    - in: body
 *      name: Ahihi
 *      schema:
 *       $ref: '#/definitions/LoginBody'
 *    responses:
 *     200:
 *      description: Login by email/password successfully
 *      schema:
 *       $ref: '#/definitions/LoginResponse'
 */
router.post('/login', UserController.login);

/**
 * @swagger api login by google:
 * /users/login-by-google:
 *  post:
 *   tags: [Users]
 *   description: Login by google
 *   parameters:
 *   - in: body
 *     name: Ahihi
 *     schema:
 *      $ref: 'param-body.yaml#LoginByGoogle'
 *   responses:
 *    200:
 *     description: Login google success
 *     schema:
 *      $ref: '#/definitions/LoginResponse'
 */
router.post('/login-by-google', UserController.loginByGoogle);
router.post('/register', UserController.register);
router.post('/confirm', UserController.confirm);
router.post('/confirm/resend', UserController.resendConfirm);
// router.post('/update', CheckTokenMiddleware, upload.single('avatar'), UserController.update);
router.put('/', CheckTokenMiddleware, UserController.update);
router.post('/forget-password', UserController.forgetPassword);
router.post('/reset-password', UserController.resetPassword);
/**
 *
 */
router.get('/info', CheckTokenMiddleware, UserController.getLoggedInInfo);
router.get('/actions-history', CheckTokenMiddleware, UserActionHistoryController.getActionsHistory);
router.put('/website', CheckTokenMiddleware, CheckUserAdminMiddleware, websiteController.updateDomainToVip);

module.exports = router;


/**
 * @swagger Definitions LoginBody:
 * definitions:
 *  LoginBody:
 *   type: object
 *   required:
 *   - email
 *   - password
 *   properties:
 *    email:
 *     type: string
 *     example: appnetwamanager2@gmail.com
 *    password:
 *     type: string
 *     example: "123456"
 */

/**
 * @swagger Definition LoginResponse:
 * definitions:
 *  LoginResponse:
 *   type: object
 *   properties:
 *    messages:
 *     type: array
 *     items:
 *      type: string
 *    data:
 *     type: object
 *     properties:
 *      meta:
 *       type: object
 *       properties:
 *        token:
 *         type: string
 *      user:
 *       type: object
 *       properties:
 *        _id:
 *         type: string
 *        name:
 *         type: string
 *        email:
 *         type: string
 *        status:
 *         type: number
 *        phone:
 *         type: string
 *        avatar:
 *         type: string
 *        registerBy:
 *         type: number
 *        usePassword:
 *         type: boolean
 *
 */
