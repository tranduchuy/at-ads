const express              = require('express');
const router               = express.Router({});
const AdminOrderController  = require('./admin-order.controller');
const CheckTokenMidlewares = require('../../middlewares/check-token');
const CheckAdminMidlewares = require('../../middlewares/check-user-admin');

router.get('/', CheckTokenMidlewares, CheckAdminMidlewares, AdminOrderController.getOrderList);
router.put('/:code', CheckTokenMidlewares, CheckAdminMidlewares, AdminOrderController.updateOrder);

module.exports = router;
