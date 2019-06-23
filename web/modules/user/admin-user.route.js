const express = require('express');
const router = express.Router({});
const AdminUserController = require('./admin-user.controller');

router.get('/users/list', AdminUserController.list);
router.post('/users/update/:id', AdminUserController.update);
module.exports = router;
