const Joi = require('@hapi/joi');

const AddDomainForAccountAdsValidationSchema = Joi.object().keys({
    domain: Joi.string().required().regex(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/),
    accountId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
  }
);

module.exports = {
  AddDomainForAccountAdsValidationSchema
};
