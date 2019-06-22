import Joi from '@hapi/joi';

const UpdateOneValidationSchema = Joi.object().keys({
      title: Joi.string().min(3),
      images: Joi.array(),
      sku: Joi.string().min(3).regex(/^[a-zA-Z0-9]*$/),
      description: Joi.string().min(3).max(3000),
      topic: Joi.number(),
      originalPrice: Joi.number().min(0),
      salePrice: Joi.number().min(0),
      saleActive: Joi.boolean(),
      startDate: Joi.date(),
      endDate: Joi.date(),
      design: Joi.number(),
      specialOccasion: Joi.number(),
      floret: Joi.number(),
      city: Joi.string(),
      district: Joi.number(),
      color: Joi.number(),
      keywordList: Joi.array(),
      seoUrl: Joi.string(),
      seoDescription: Joi.string(),
      seoImage: Joi.string(),
      status: Joi.number()
    }
);

export default UpdateOneValidationSchema;