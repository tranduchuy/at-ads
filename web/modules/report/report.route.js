const express = require('express');
const router = express.Router({});
const ReportController = require('./report.controller');

const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckAccountIdMiddleWare = require('../../middlewares/check-account-id');


router.get('/:accountId/ip-clicks', CheckTokenMiddleware, CheckAccountIdMiddleWare, ReportController.statisticUser);


module.exports = router;
