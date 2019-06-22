import Joi from '@hapi/joi';

const CheckAddressValidationSchema = Joi.object().keys({
      addressText: Joi.string().required()
    }
);

export default CheckAddressValidationSchema;