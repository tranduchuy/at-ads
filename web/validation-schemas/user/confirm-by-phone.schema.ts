import Joi from '@hapi/joi';

const ConfirmByPhoneValidationSchema = Joi.object().keys({
      phone: Joi.string().required().min(10).max(11).regex(/^[0-9]*$/),
      id: Joi.string().required()
    }
);

export default ConfirmByPhoneValidationSchema;