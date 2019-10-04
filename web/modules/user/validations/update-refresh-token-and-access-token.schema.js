const Joi = require('@hapi/joi');

const updateRefreshTokenAndAccessTokenValidationSchema = Joi.object().keys({
      accessToken : Joi.string().required(),
      refreshToken: Joi.string().required()
    }
);

module.exports = {
    updateRefreshTokenAndAccessTokenValidationSchema
};
