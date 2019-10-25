const express = require('express');
const router = express.Router({});
const UserBehaviorLogController = require('./user-behavior-log.controller');

router.put('/log/:id/time-unload', UserBehaviorLogController.updateTimeOutOfPage);
router.put('/log/:id/scroll-percentage', UserBehaviorLogController.scrollPercentage);
router.post('/log', UserBehaviorLogController.logTrackingBehavior);
router.get('/log', UserBehaviorLogController.getlogTrackingBehavior);
router.get('/log/intro-page', UserBehaviorLogController.getLogForIntroPage);


module.exports = router;
