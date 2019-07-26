const Joi = require('@hapi/joi');
const CriterionIdOfDevice = require('../../../constants/criterionIdOfDevice.constant')

const setUpCampaignsByOneDeviceValidationSchema = Joi.object().keys({
    device: Joi.valid([CriterionIdOfDevice.computer, CriterionIdOfDevice.connectedTv, CriterionIdOfDevice.mobile, CriterionIdOfDevice.tablet]).required(),
    isEnable: Joi.boolean().required()
});

module.exports = {
    setUpCampaignsByOneDeviceValidationSchema
};