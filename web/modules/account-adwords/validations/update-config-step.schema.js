const Joi = require('@hapi/joi');
const AdAccountConstant = require('../account-ads.constant');

const updateConfigStepValidationSchema = Joi.object().keys({
    step: Joi.number().valid([ 
      AdAccountConstant.configStep.CONNECT_GOOGLE_ADS,
      AdAccountConstant.configStep.ADD_CAMPAIGN,
      AdAccountConstant.configStep.ADD_WEBSITE,
      AdAccountConstant.configStep.ADD_TRACKING_FOR_WEBSITE,
      AdAccountConstant.configStep.SUCCESS
    ]).required(),
});

module.exports = {
  updateConfigStepValidationSchema
};