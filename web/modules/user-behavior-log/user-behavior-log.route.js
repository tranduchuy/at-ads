const express = require('express');
const router = express.Router({});
const UserBehaviorLogController = require('./user-behavior-log.controller');

router.post('/log', UserBehaviorLogController.logTrackingBehavior);
router.get('/log', UserBehaviorLogController.getlogTrackingBehavior);
router.get('/log/intro-page', UserBehaviorLogController.getLogForIntroPage);


module.exports = router;
