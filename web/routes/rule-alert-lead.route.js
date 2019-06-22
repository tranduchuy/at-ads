const express = require('express');
const router = express.Router();
const RALController = require('../controller/user/RuleAlertLeadController');

router.get('/', RALController.list);
router.get('/:id', RALController.detailById);
router.post('/', RALController.register);
router.put('/', RALController.update);
router.delete('/:ruleId', RALController.remove);

module.exports = router;
