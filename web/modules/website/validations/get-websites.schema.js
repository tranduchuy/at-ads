const Joi = require('@hapi/joi');
const StatusConstant = require('../../../constants/status');

const GetWebsitesValidationSchema = Joi.object().keys({
    accountId: Joi.string().required().regex(/^[0-9a-fA-F]{24}$/),
    domain: Joi.string().regex(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/),
    status: Joi.number().valid([StatusConstant.Status.ACTIVE, StatusConstant.Status.BLOCKED])
  }
);

module.exports = {
  GetWebsitesValidationSchema
};
