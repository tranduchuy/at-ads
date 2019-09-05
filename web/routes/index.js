const express = require('express');
const router = express.Router({});

router.use('/users', require('../modules/user/user.route'));
router.use('/admin/users', require('../modules/user/admin-user.route'));
router.use('/user-behaviors', require('../modules/user-behavior-log/user-behavior-log.route'));
router.use('/account-adwords', require('../modules/account-adwords/account-ads.route'));
router.use('/websites', require('../modules/website/website.route'));
router.use('/fire-base-tokens', require('../modules/fire-base-tokens/fire-base-tokens.route'));
router.use('/reports', require('../modules/report/report.route'));

module.exports = router;
