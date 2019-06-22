import Joi from '@hapi/joi';
import { Status } from '../../constant/status';

const AddNewValidationSchema = Joi.object().keys({
      title: Joi.string().required().min(3),
      images: Joi.array().required(),
      sku: Joi.string().required().min(3).regex(/^[a-zA-Z0-9]*$/),
      description: Joi.string().required().min(3).max(3000),
      topic: Joi.number().required(),
      originalPrice: Joi.number().required().min(0),
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
      seoUrl: Joi.string(),
      seoDescription: Joi.string(),
      seoImage: Joi.string(),
      keywordList: Joi.array(),
      status: Joi.number().valid([Status.ACTIVE, Status.PRODUCT_HIDDEN])
    }
);

export default AddNewValidationSchema;