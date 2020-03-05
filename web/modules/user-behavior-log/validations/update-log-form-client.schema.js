const Joi = require('@hapi/joi');

const updateLogFromClientValidationSchema = Joi.object().keys({
  uuid: Joi.string().required(),
  gclid: Joi.string().required(),
  browserResolution: Joi.object().allow(),
  screenResolution: Joi.object().allow(),
  referrer: Joi.string().allow(''),
  href: Joi.string(),
  isPrivateBrowsing: Joi.boolean(),
});

module.exports = {
  updateLogFromClientValidationSchema
};
