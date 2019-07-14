const Joi = require('@hapi/joi');

const AddDomainForAccountAdsValidationSchema = Joi.object().keys({
    domain: Joi.string().required(),
    accountId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
  }
);

module.exports = {
  AddDomainForAccountAdsValidationSchema
};
