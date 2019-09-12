const express = require('express');
const router = express.Router({});
const PackageController = require('./packages.controller');
const CheckTokenMiddleware = require('../../middlewares/check-token');

router.get('/', [CheckTokenMiddleware], PackageController.getListPackages);

module.exports = router;
