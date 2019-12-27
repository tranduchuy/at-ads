const Joi = require('@hapi/joi');

const CheckWebsiteByDomainValidateSchema = Joi.object().keys({
    key: Joi.string().required(),
    domain: Joi.string().required(),
  }
);

module.exports = {
  CheckWebsiteByDomainValidateSchema
};
