const express = require('express');
const router = express.Router({});

router.use('/users', require('../modules/user/user.route'));
router.use('/user-behaviors', require('../modules/user-behavior-log/user-behavior-log.route'));
router.use('/account-adwords', require('../modules/account-adwords/account-ads.route'));
router.use('/websites', require('../modules/website/website.route'));
router.use('/fire-base-tokens', require('../modules/fire-base-tokens/fire-base-tokens.route'));
router.use('/reports', require('../modules/report/report.route'));
router.use('/packages', require('../modules/packages/packages.route'));
router.use('/google-ad-errors', require('../modules/google-ads-error/google-ads-error.route'));
router.use('/admin/websites', require('../modules/website/admin-website.route'));
router.use('/admin/users', require('../modules/user/admin-user.route'));
router.use('/admin/account-ads', require('../modules/account-adwords/admin-account-ads.route'));
router.use('/admin/user-licences', require('../modules/user-licences/admin-user-licences.route'));
router.use('/admin', require('../modules/admin/admin.route'));
router.use('/admin/order', require('../modules/order/admin.route'));
router.use('/admin/packages', require('../modules/packages/admin.route'));
router.use('/customer-infomation', require('../modules/customer-infomation/customer-infomation.route'));

module.exports = router;
