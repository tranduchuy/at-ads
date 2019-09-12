const Joi = require('@hapi/joi');

const updateDomainToVipValidationsSchema = Joi.object().keys({
    packageId: Joi.string().required(),
    code: Joi.string().required()
  }
);

module.exports = {
    updateDomainToVipValidationsSchema
};
