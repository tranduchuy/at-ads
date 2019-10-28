const express              = require('express');
const router               = express.Router({});
const AdminUserController  = require('./admin-user.controller');
const UserLicencesController = require('../user-licences/user-licences.controller');
const CheckTokenMidlewares = require('../../middlewares/check-token');
const CheckAdminMidlewares = require('../../middlewares/check-user-admin');
const ReportController     = require('../report/report.controller');

router.get('/list', AdminUserController.list);
router.post('/update/:id', AdminUserController.update);
router.post('/login', AdminUserController.login);
router.get('/', CheckTokenMidlewares, CheckAdminMidlewares, AdminUserController.getUsersListForAdminPage);
router.get('/accounts', CheckTokenMidlewares, CheckAdminMidlewares, AdminUserController.getAccountsListForAdminPage);
router.get('/websites', CheckTokenMidlewares, CheckAdminMidlewares, AdminUserController.getWebsitesListForAdminPage);
router.get('/report/google-statistic', CheckTokenMidlewares, CheckAdminMidlewares, ReportController.statisticsOfGoogleErrorsAndNumberOfRequests);
router.put('/limit-google-ad', CheckTokenMidlewares, CheckAdminMidlewares, UserLicencesController.updateLimitGoogleAd);

module.exports = router;
