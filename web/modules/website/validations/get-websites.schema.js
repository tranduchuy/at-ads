const Joi = require('@hapi/joi');

const GetWebsitesValidationSchema = Joi.object().keys({
    accountId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/)
  }
);

module.exports = {
  GetWebsitesValidationSchema
};
