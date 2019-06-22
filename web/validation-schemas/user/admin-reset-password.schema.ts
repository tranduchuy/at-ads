import Joi from '@hapi/joi';

const AdminResetPasswordValidationSchema = Joi.object().keys({
      userId: Joi.string().required(),
      password: Joi.string().required().min(6).regex(/^[a-zA-Z0-9]*$/),
      confirmedPassword: Joi.string().required().min(6).regex(/^[a-zA-Z0-9]*$/)
    }
);

export default AdminResetPasswordValidationSchema;