import Joi from '@hapi/joi';

const GetInfoByIdsValidationSchema = Joi.object().keys({
      productIds: Joi.string().required()
}
);

export default GetInfoByIdsValidationSchema;