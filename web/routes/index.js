const express = require('express');
const router = express.Router({});

router.use('/users', require('../modules/user/user.route'));
router.use('/admin/users', require('../modules/user/admin-user.route'));

module.exports = router;
