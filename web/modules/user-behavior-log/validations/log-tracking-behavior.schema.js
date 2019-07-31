const Joi = require('@hapi/joi');

const LogTrackingBehaviorValidationSchema = Joi.object().keys({
  ip: Joi.string().required(),
  uuid: Joi.string().required(),
  accountKey: Joi.string().required(),
  href: Joi.string().required(),
  userAgent: Joi.string().required(),
  referrer: Joi.string().allow('').optional(),
  accountKey: Joi.string().required(),
  isPrivateBrowsing: Joi.boolean().required()
  }
);

module.exports = {
  LogTrackingBehaviorValidationSchema
};
