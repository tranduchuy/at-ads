const Joi = require('@hapi/joi');

const LogTrackingBehaviorValidationSchema = Joi.object().keys({
  ip: Joi.string().required(),
  key: Joi.string().required(),
  uuid: Joi.string().required(),
  href: Joi.string().required(),
  userAgent: Joi.string().required(),
  referrer: Joi.string().allow('').optional(),
  isPrivateBrowsing: Joi.boolean().required(),
  location: Joi.object(),
  screenResolution: Joi.object(),
  browserResolution: Joi.object()
  }
);

module.exports = {
  LogTrackingBehaviorValidationSchema
};
