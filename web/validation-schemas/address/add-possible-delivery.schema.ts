import Joi from '@hapi/joi';

const AddAddressValidationSchema = Joi.object().keys({
      city: Joi.string().required(),
      district: Joi.number().required()
    }
);

export default AddAddressValidationSchema;