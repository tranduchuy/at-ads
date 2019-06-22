import Joi from '@hapi/joi';

const UpdateOrderItemQuantityValidationSchema = Joi.object().keys({
      quantity: Joi.number().min(1).required(),
    }
);

export default UpdateOrderItemQuantityValidationSchema;