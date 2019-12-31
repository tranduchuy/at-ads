const express = require('express');
const router = express.Router({});
const CustomerInfomationControllers = require('./customer-infomation.controller');

router.post('/:uuid', CustomerInfomationControllers.addCustomerInfomation);

module.exports = router;
