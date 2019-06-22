const express = require('express');
const router = express.Router({});
const SystemController = require('../controller/user/SystemController');
const CheckToken = require('../middlewares/CheckToken');
const CheckRoleAdmin = require('../middlewares/CheckRoleAdmin');

router['get']('/', SystemController.getDefaultSystemConfig);
router['get']('/statistic', SystemController.getStatisticInfo);
router['put']('/', [CheckToken, CheckRoleAdmin],  SystemController.updateConfig);

module.exports = router;
