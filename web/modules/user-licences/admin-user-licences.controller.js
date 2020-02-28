const mongoose = require('mongoose');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const Joi = require('@hapi/joi');
const moment = require('moment');

const requestUtil = require('../../utils/RequestUtil');
const UserLicencesModel = require('./user-licences.model');
const PackageModel = require('../packages/packages.model');
const OrderService = require('../order/order.service');
const OrderModel = require('../order/order.model');
const OrderConstant = require('../order/order.constant');
const AdminUserLicencesService = require('./admin-user-licences.service');
const PackageConstant = require('../packages/packages.constant');
const AdsAccountModel = require('../account-adwords/account-ads.model');

const {
  UpdatePackageForUserValidationSchema
} = require('./validations/update-package-for-user.schema');

const updatePackageForUser = async (req, res, next) => {
  logger.info(
    'AdminUserLicencesController::updatePackageForUserLicence::Is called',
    { packageId: req.body.packageId, userId: req.body.userId }
  );
  try {
    const { error } = Joi.validate(
      req.body,
      UpdatePackageForUserValidationSchema
    );

    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { userId, packageId } = req.body;
    const expiredAtOfUserLicence = Number(req.body.expiredAt)
      ? moment(Number(req.body.expiredAt)).endOf('day')
      : null;

    if (expiredAtOfUserLicence && expiredAtOfUserLicence.isBefore(moment())) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        messages: [
          `Ngày gửi lên: ${expiredAtOfUserLicence.format(
            'DD-MM-YYYY'
          )} đang nhỏ hơn ngày hiện tại: ${moment().format('DD-MM-YYYY')}`
        ]
      });
    }

    const userLicences = await UserLicencesModel.findOne({
      userId: mongoose.Types.ObjectId(userId)
    }).populate('packageId');

    if (!userLicences) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy user.']
      });
    }

    const package = await PackageModel.findOne({
      _id: mongoose.Types.ObjectId(packageId)
    });

    if (!package) {
      return res.status(HttpStatus.NOT_FOUND).json({
        messages: ['Không tìm thấy package.']
      });
    }

    let history = userLicences.histories || [];
    history.push({
      packageId: package._id,
      name: package.name,
      type: package.type,
      price: package.price,
      createdAt: new Date()
    });
    const accounts = await AdsAccountModel.find({'user': userLicences.userId});
    const accountEnabled = accounts.filter(account => !account.isDisabled);

    if(package.type == PackageConstant.packageTypes.FREE)
    {
      userLicences.expiredAt = null;

      if(userLicence.packageId.type == PackageConstant.packageTypes.VIP1 || userLicence.packageId.type == PackageConstant.packageTypes.FREE)
      {
        if(accountEnabled.length != 1)
        {
          await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': true}});
        }
      }
      else
      {
        await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': true}});
      }
    }
    else
    {
      const expiredAt = AdminUserLicencesService.filterExpiredAt({
        userLicences,
        package,
        expiredAtOfUserLicence
      });
      userLicences.expiredAt = expiredAt;

      if(package.type == PackageConstant.packageTypes.VIP1)
      {
        if(userLicence.packageId.type == PackageConstant.packageTypes.FREE || userLicence.packageId.type == PackageConstant.packageTypes.VIP1)
        {
          if(accountEnabled.length != 1){
            await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': true}});
          }
        }
        else
        {
          if(accounts.length > 1 )
          {
            await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': true}});
          }
          else
          {
            await AdsAccountModel.updateMany({'user': userLicence.userId},{'$set': {'isDisabled': false}});
          }
        }
      }
      else
      {
        await AdsAccountModel.updateMany({'user': userLicences.userId},{'$set': {isDisabled: false}});
      }
    }

    userLicences.histories = history;
    userLicences.packageId = package._id;

    await userLicences.save();
    const code = await OrderService.createCode();
    const newOrder = new OrderModel({
      userId,
      packageId: package._id,
      code,
      status: OrderConstant.status.SUCCESS
    });
    await newOrder.save();

    return res.status(HttpStatus.OK).json({
      messages: ['Cập nhật thành công'],
      data: userLicences
    });
  } catch (e) {
    logger.error(
      'AdminUserLicencesController::updatePackageForUserLicence::Error',
      e
    );
    next(e);
  }
};

module.exports = {
  updatePackageForUser
};
