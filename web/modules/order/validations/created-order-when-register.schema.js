const Joi = require('@hapi/joi');
const PackageType = require('../../packages/packages.constant');

const CreatedOrderWhenRegisterPackageValidationSchema = Joi.object().keys({
  packageType: Joi.valid([
    PackageType.packageTypes.CUSTOM,
    PackageType.packageTypes.FREE,
    PackageType.packageTypes.VIP1
  ]).required(),
  numOfMonths: Joi.number()
    .min(1)
    .required()
});

module.exports = {
  CreatedOrderWhenRegisterPackageValidationSchema
};
