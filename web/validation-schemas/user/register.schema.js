const Joi = require('@hapi/joi');
const {General}  = require ('../../constants/generals');
const Genders = General.Genders;
const genderValues = Object.keys(Genders).map(key => {
  return Genders[key];
});

const RegisterValidationSchema = Joi.object().keys({
    email: Joi.string().required().max(100).email(),
    password: Joi.string().required().min(6).regex(/^[a-zA-Z0-9]*$/),
    confirmedPassword: Joi.string().required().min(6).regex(/^[a-zA-Z0-9]*$/),
    phone: Joi.string().required().min(10).max(11).regex(/^[0-9]*$/),
    address: Joi.string().min(6).max(200),
    city: Joi.string(),
    district: Joi.number(),
    ward: Joi.number(),
    gender: Joi.number().required().valid(genderValues),
    name: Joi.string().required().min(3)
  }
);

module.exports = {
    RegisterValidationSchema
};

