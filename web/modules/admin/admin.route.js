const express = require('express');
const router = express.Router({});
const AdminController = require('./admin.controller');
const CheckTokenMidlewares = require('../../middlewares/check-token');
const CheckAdminMidlewares = require('../../middlewares/check-user-admin');

router.get('/statistic', CheckTokenMidlewares, CheckAdminMidlewares, AdminController.statistic);

module.exports = router;
