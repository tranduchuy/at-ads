import Joi from '@hapi/joi';
import { General } from '../../constant/generals';
import Genders = General.Genders;

const genderValues = Object.keys(Genders).map(key => {
  return Genders[key];
});

const UpdateUserValidationSchema = Joi.object().keys({
    password: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
    newPassword: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
    confirmedPassword: Joi.string().min(6).regex(/^[a-zA-Z0-9]*$/),
    avatar: Joi.object(),
    phone: Joi.string().min(10).max(11).regex(/^[0-9]*$/),
    address: Joi.string().min(6).max(200),
    city: Joi.string(),
    birthday: Joi.date(),
    district: Joi.number(),
    ward: Joi.number(),
    gender: Joi.number().valid(genderValues),
    name: Joi.string().min(3)
  }
);

export default UpdateUserValidationSchema;

