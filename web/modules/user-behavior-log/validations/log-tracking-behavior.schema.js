const Joi = require('@hapi/joi');

const LogTrackingBehaviorValidationSchema = Joi.object().keys({
  ip: Joi.string().ip({version: ['ipv4']}).required(),
  key: Joi.string().required(),
  uuid: Joi.string().required(),
  href: Joi.string().required(),
  userAgent: Joi.string().required(),
  referrer: Joi.string().allow('').optional(),
  isPrivateBrowsing: Joi.boolean().required(),
  location: Joi.object(),
  screenResolution: Joi.object(),
  browserResolution: Joi.object(),
  createdAt: Joi.number().required(),
  msisdn: Joi.string(),
  }
);

module.exports = {
  LogTrackingBehaviorValidationSchema
};
