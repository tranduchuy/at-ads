const Joi = require('@hapi/joi');

const UpdatePriceForPackageValidationSchema = Joi.object().keys({
      packageId: Joi.string().required(),
      price: Joi.number().required()
    }
);

module.exports = {
  UpdatePriceForPackageValidationSchema
};
