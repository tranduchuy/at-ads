const express              = require('express');
const router               = express.Router({});
const AdminPackagesControllers  = require('./admin-packages.controller');
const CheckTokenMidlewares = require('../../middlewares/check-token');
const CheckAdminMidlewares = require('../../middlewares/check-user-admin');

router.get('/', CheckTokenMidlewares, CheckAdminMidlewares, AdminPackagesControllers.getListPackages);
router.put('/:packageId', CheckTokenMidlewares, CheckAdminMidlewares, AdminPackagesControllers.updateElementOfPackage);

module.exports = router;
