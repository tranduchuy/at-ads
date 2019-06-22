const NotifyModel = require('../../../models/Notify');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const httpCode = require('../../../config/http-code');
const requestUtil = require('../../../utils/RequestUtil');
const NotifyType = require('../../../config/notify-type');
const {post, del, put, get, convertObjectToQueryString} = require('../../../utils/Request');
const CDP_APIS = require('../../../config/cdp-url-api.constant');
/**
 *
 * @param {*} status
 * @return {Boolean}
 */
const isValidStatusForUpdating = (status) => {
  // TODO: will update this list when new status of notify appeared
  return [
    global.STATUS.NOTIFY_NONE,
    global.STATUS.NOTIFY_READ
  ].indexOf(status) !== -1;
};
/**
 * Api get list notify
 * @param {*} req body: {status, title, content}, params: {notifyId}
 * @param {*} res
 * @param {*} next
 */
const getListReturnLeadNotifies = async (req, res, next) => {
  logger.info('NotifyController::getListReturnLeadNotifies is called');
  try {
    const {page, limit} = requestUtil.extractPaginationCondition(req);
    const query = {
      type: NotifyType.USER_WANT_TO_RETURN_LEAD,
      'params.lead.approve': undefined
    };

    const total = await NotifyModel.countDocuments(query);

    let notifies = await NotifyModel
      .find(query)
      .sort({createdTime: -1})
      .skip((page - 1) * limit)
      .limit(limit);

    const userIds = notifies
      .filter(n => n.fromUser)
      .map(n => n.fromUser);

    // get detail of list userId
    const urlGetListUser = `${CDP_APIS.USER.LIST_USER_FOR_NOTIFY}?ids=${userIds.join(',')}`;
    get(urlGetListUser, req.user.token)
      .then((response) => {
        const userObj = {};
        response.data.entries.forEach(u => {
          userObj[u.id] = u;
        });

        notifies = JSON.parse(JSON.stringify(notifies));
        notifies.forEach(n => {
          n.fromUser = userObj[n.fromUser] || null;
        });

        return res.json({
          status: httpCode.SUCCESS,
          message: [],
          data: {
            meta: {
              totalItems: total,
              page: page,
              limit: limit,
              sortBy: 'createdTime'
            },
            entries: notifies
          }
        })
      })
      .catch(e => {
        logger.error('NotifyController::getListReturnLeadNotifies::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('NotifyController::getListReturnLeadNotifies::error', e);
    return next(e);
  }
};

const getUnReadCountOfUser = (userId, cb) => {
  const query = {
    toUser: userId,
    status: global.STATUS.NOTIFY_NONE
  };

  NotifyModel.countDocuments(query, cb);
};

const countUnRead = async (req, res, next) => {
  logger.info('NotifyController::countUnRead is called');

  try {
    getUnReadCountOfUser(req.user._id, (err, count) => {
      if (err) {
        logger.error('NotifyController::countUnRead::error', e);
        return next(err);
      }

      return res.json({
        status: httpCode.SUCCESS,
        message: '',
        data: {
          entry: [],
          meta: {
            unread: count
          }
        }
      })
    });
  } catch (e) {
    logger.error('NotifyController::countUnRead::error', e);
    return next(e);
  }
};

module.exports = {
  countUnRead,
  getListReturnLeadNotifies
};
