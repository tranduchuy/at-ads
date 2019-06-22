import Joi from '@hapi/joi';
import { Status } from '../../constant/status';

const AdminUserChangeStatus = Joi.object().keys(
  {
    userId: Joi.string().required(),
    status: Joi.number().valid([Status.ACTIVE, Status.BLOCKED]).required(),
  }
);

export default AdminUserChangeStatus;