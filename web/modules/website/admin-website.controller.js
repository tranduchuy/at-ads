const getListWebsites = require('./validations/get-website-for-admin-page.schema');
const Joi = require('@hapi/joi');
const requestUtil = require('../../utils/RequestUtil');
const HttpStatus = require('http-status-codes');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const WebsiteService = require('./website.service');
const { Paging } = require('../account-adwords/account-ads.constant');

const getWebsitesListForAdminPage = async (req, res, next) => {
  logger.info('Admin/UserController::getWebsiteListForAdminPage::is Called', {
    userId: req.user._id
  });
  try {
    const { error } = Joi.validate(req.query, getListWebsites);
    if (error) {
      return requestUtil.joiValidationResponse(error, res);
    }

    const { adsId, email } = req.query;
    let limit = parseInt(req.query.limit || Paging.LIMIT);
    let page = parseInt(req.query.page || Paging.PAGE);
    const result = await WebsiteService.getWebsiteInfoforAdminPage(
      adsId,
      email,
      page,
      limit
    );

    logger.info('Admin/UserController::getWebsiteListForAdminPage::success\n');
    res.status(HttpStatus.OK).json({
      messages: ['Lấy dữ liệu thành công.'],
      data: {
        entries: result.entries,
        totalItems: result.totalItems
      }
    });
  } catch (e) {
    logger.error(
      'Admin/UserController::getWebsiteListForAdminPage::error\n',
      e
    );
    return next(e);
  }
};

const checkAttachTrackingScript = async (req, res, next) => {
  try {
  } catch (e) {}
};

module.exports = {
  getWebsitesListForAdminPage,
  checkAttachTrackingScript
};
