const express = require('express');
const router = express.Router({});
const AdminUserController = require('./admin-user.controller');

router.get('/list', AdminUserController.list);
router.post('/update/:id', AdminUserController.update);
router.post('/login', AdminUserController.login);
module.exports = router;
