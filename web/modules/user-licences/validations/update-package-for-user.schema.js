const Joi = require('@hapi/joi');

const UpdatePackageForUserValidationSchema = Joi.object().keys({
  userId: Joi.string().required(),
  packageId: Joi.string().required()
});

module.exports = {
  UpdatePackageForUserValidationSchema
};
