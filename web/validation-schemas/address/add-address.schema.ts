import Joi from '@hapi/joi';

const AddAddressValidationSchema = Joi.object().keys({
      name: Joi.string().required().min(3),
      phone: Joi.string().required().min(10).max(11).regex(/^[0-9]*$/),
      address: Joi.string().required(),
      longitude: Joi.number().required(),
      latitude: Joi.number().required()
    }
);

export default AddAddressValidationSchema;