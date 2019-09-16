const express = require('express');
const router = express.Router({});
const ReportController = require('./report.controller');

const CheckTokenMiddleware = require('../../middlewares/check-token');
const CheckAccountIdMiddleWare = require('../../middlewares/check-account-id');

router.get('/:accountId/clicks/:ip', CheckTokenMiddleware, CheckAccountIdMiddleWare, ReportController.getIPClicks);
router.get('/:accountId/clicks/:ip/detail', CheckTokenMiddleware, CheckAccountIdMiddleWare, ReportController.getDetailIPClick);
router.get('/:accountId/statistic/traffic-source', CheckTokenMiddleware, CheckAccountIdMiddleWare, ReportController.getTrafficSourceStatisticByDay);
router.get('/:accountId/sessions', CheckTokenMiddleware, CheckAccountIdMiddleWare, ReportController.getTrafficSourceLogs);
router.get('/:accountId/blocked-ips', CheckTokenMiddleware, CheckAccountIdMiddleWare, ReportController.getIpsInAutoBlackListOfAccount);

module.exports = router;