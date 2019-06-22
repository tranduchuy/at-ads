var express = require('express');
var router = express.Router();
var NotifyController = require('../controller/user/NotifyController');

router.get('/count-unread', NotifyController.countUnRead);
router.get('', NotifyController.getListNotifies);
router.put('/:notifyId', NotifyController.updateNotify);
router.get('/return-lead', NotifyController.returnLead);

module.exports = router;
