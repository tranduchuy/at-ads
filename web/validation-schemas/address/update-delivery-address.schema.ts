import Joi from '@hapi/joi';

const AddAddressValidationSchema = Joi.object().keys({
      name: Joi.string().min(3),
      phone: Joi.string().min(10).max(11).regex(/^[0-9]*$/),
      address: Joi.string(),
      longitude: Joi.number().required(),
      latitude: Joi.number().required()
    }
);

export default AddAddressValidationSchema;