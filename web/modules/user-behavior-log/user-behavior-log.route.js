const express = require('express');
const router = express.Router({});
const UserBehaviorLogController = require('./user-behavior-log.controller');
const cors = require('cors');

router.post('/log', UserBehaviorLogController.logTrackingBehavior);

router.get('/log', UserBehaviorLogController.getlogTrackingBehavior);


module.exports = router;
