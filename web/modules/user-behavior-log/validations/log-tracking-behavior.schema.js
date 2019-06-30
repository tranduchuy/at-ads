const Joi = require('@hapi/joi');

const LogTrackingBehaviorValidationSchema = Joi.object().keys({
  ip: Joi.string().required(),
  href: Joi.string().required(),
  userAgent: Joi.string().required(),
  referrer: Joi.string().required()
  }
);

module.exports = {
  LogTrackingBehaviorValidationSchema
};
