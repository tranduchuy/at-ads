const Joi = require('@hapi/joi');

const VerifyAcctachedCodeDomainsValidationSchema = Joi.object().keys({
  accountId: Joi.string().required()
  }
);

module.exports = {
  VerifyAcctachedCodeDomainsValidationSchema
};
