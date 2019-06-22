const NotifyModel = require('../../models/Notify');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const httpCode = require('../../config/http-code');
const requestUtil = require('../../utils/RequestUtil');
const NotifyType = require('../../config/notify-type');
const {post, del, put, get, convertObjectToQueryString} = require('../../utils/Request');
const {extractPaginationCondition} = require('../../utils/RequestUtil');
const CDP_APIS = require('../../config/cdp-url-api.constant');
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
 * @description Create a notify from fromUser to toUser
 * @param {*} _params {fromUserId, toUserId, title, content}
 * @return {Object}
 */
const createNotify = async (_params) => {
  const params = {..._params};
  logger.info('NotifyController::createNotify is called', params);
  const newNotify = await new NotifyModel();
  newNotify.fromUser = params.fromUserId || null;
  newNotify.toUser = params.toUserId || null;
  // TODO: refactor should check all place use this function
  // Note: not use _id of mongodb any more
  // newNotify.fromUser = params.fromUserId ? new mongoose.Types.ObjectId(params.fromUserId) : null;
  // newNotify.toUser = new mongoose.Types.ObjectId(params.toUserId);
  newNotify.status = global.STATUS.NOTIFY_NONE;
  newNotify.title = params.title.toString().trim();
  newNotify.content = params.content.toString().trim();
  newNotify.createdTime = new Date();
  newNotify.updatedTime = new Date();
  newNotify.type = params.type;
  newNotify.params = params.params;
  await newNotify.save();

  return newNotify;
};

const createNotifySession = async (_params, session) => {
  const params = {..._params};
  logger.info('NotifyController::createNotify is called', params);
  // const newNotify = await NotifyModel(); 
  const newNotify = await NotifyModel.create([{
    fromUser: params.fromUserId || null,
    toUser: params.toUserId || null,
    status: global.STATUS.NOTIFY_NONE,
    title: params.title.toString().trim(),
    content: params.content.toString().trim(),
    createdTime: new Date(),
    updatedTime: new Date(),
    type: params.type,
    params: params.params,
  }], {session});
  // newNotify.$session();
  // await newNotify.save();

  return newNotify;
};

/**
 *
 * @param {*} req body: {status, title, content}, params: {notifyId}
 * @param {*} res
 * @param {*} next
 */
const updateNotify = async (req, res, next) => {
  logger.info('NotifyController::updateNotify is called');

  try {
    const notify = await NotifyModel.findOne({_id: req.params['notifyId']});

    let {title, content, status} = req.body;
    if (isNaN(status)) {
      return res.json({
        status: httpCode.BAD_REQUEST,
        message: ['Status is not a number'],
        data: {}
      });
    } else {
      status = parseInt(status);
    }

    if (notify == null) {
      return res.json({
        status: httpCode.ERROR,
        message: ['Notify not found'],
        data: {}
      });
    }

    if (title) {
      notify.title = title.toString().trim();
    }

    if (content) {
      notify.content = content.toString().trim();
    }

    if (status && isValidStatusForUpdating(status)) {
      notify.status = status;
    }

    notify.updatedTime = new Date();
    await notify.save();

    return res.json({
      status: httpCode.SUCCESS,
      message: ['Update notify successfully'],
      data: {}
    });

  } catch (e) {
    logger.error('NotifyController::updateNotify:error', e);
    return next(e);
  }
};

/**
 * Api get list notify
 * @param {*} req body: {status, title, content}, params: {notifyId}
 * @param {*} res
 * @param {*} next
 */
const getListNotifies = async (req, res, next) => {
  logger.info('NotifyController::getListNotifies is called');
  try {
    const {page, limit} = requestUtil.extractPaginationCondition(req);
    const query = {
      toUser: req.user.id
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

        const requestTypes = [
          NotifyType.PARENT_CHILD.REQUEST,
          NotifyType.PARENT_CHILD.RESPONSE,
          NotifyType.PARENT_CHILD.REMOVE,
        ];
        notifies = JSON.parse(JSON.stringify(notifies));
        notifies.forEach(n => {
          n.fromUser = userObj[n.fromUser] || null;
        });
        const results = [];

        // get relation detail
        const requestIdsNeedRelationInfo = notifies
          .filter(n => requestTypes.indexOf(n.type) !== -1)
          .map(n => n.params.requestId);

        const urlGetRelationDetail = `${CDP_APIS.RELATION_SHIP.DETAIL_BY_IDS}?ids=${requestIdsNeedRelationInfo.join(',')}`;
        get(urlGetRelationDetail, req.user.token)
          .then(response => {
            const relationDetailObj = {};
            response.data.entries.forEach(re => {
              relationDetailObj[re.id] = re;
            });

            notifies.forEach((n) => {
              if (requestTypes.indexOf(n.type) !== -1) {
                n.params.request = relationDetailObj[n.params.requestId];
              }

              results.push(n);
            });

            return res.json({
              status: httpCode.SUCCESS,
              message: [],
              data: {
                meta: {
                  total,
                  page,
                  limit,
                  sortBy: 'createdTime'
                },
                entry: results
              }
            })
          })
          .catch(e => {
            logger.error('NotifyController::getListNotifies::error', e);
            return next(e);
          });
      })
      .catch(e => {
        logger.error('NotifyController::getListNotifies::error', e);
        return next(e);
      });
  } catch (e) {
    logger.error('NotifyController::getListNotifies::error', e);
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

const returnLead = async (req, res, next) => {
  logger.info('NotifyController::returnLead::called');
  try {
    const paginationCond = extractPaginationCondition(req);
    let type = req.query.type;
    if (!type || isNaN(type)) {
      return next(new Error('Thông số không hợp lệ'));
    }

    type = parseInt(type, 0);
    if ([NotifyType.RETURN_LEAD_SUCCESSFULLY, NotifyType.RETURN_LEAD_FAIL].indexOf(type) === -1) {
      return next(new Error('Thông số không hợp lệ'));
    }

    const stages = generateStageGetNotifyLeadWhenReturn(req.user.id, paginationCond, type);
    logger.info('NotifyController::returnLead::stages', JSON.stringify(stages));
    const result = await NotifyModel.aggregate(stages);
    const totalItems = result[0].meta.length > 0 ? result[0].meta[0].totalItems : 0;
    logger.info('NotifyController::returnLead::success');

    return res.json({
      status: httpCode.SUCCESS,
      message: 'Success',
      data: {
        meta: {
          totalItems,
          current: result[0].entries,
          ...paginationCond
        },
        entries: result[0].entries
      }
    })
  } catch (e) {
    logger.error('NotifyController::returnLead::error', e);
    return next(e);
  }
};

/**
 * @param {number} userId
 * @param {{page: number, limit: number}} paginationCond
 * @param {number} notifyType
 */
const generateStageGetNotifyLeadWhenReturn = (userId, paginationCond, notifyType) => {
  return [
    {
      $match: {
        type: notifyType,
        toUser: userId,
      },
    },
    {
      $sort: {
        createdTime: -1
      }
    },
    {
      $facet: {
        entries: [
          {$skip: (paginationCond.page - 1) * paginationCond.limit},
          {$limit: paginationCond.limit}
        ],
        meta: [
          {$group: {_id: null, totalItems: {$sum: 1}}},
        ],
      }
    }
  ];
};

module.exports = {
  createNotify,
  createNotifySession,
  updateNotify,
  getListNotifies,
  countUnRead,
  returnLead
};
