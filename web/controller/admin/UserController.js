const UserModel = require('../../models/UserModel');
const _ = require('lodash');
const TokenModel = require('../../models/TokenModel');
const ChildModel = require('../../models/ChildModel');
const AccountModel = require('../../models/AccountModel');
const RuleAlertLeadModel = require('../../models/RuleAlertLeadModel');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const HTTP_CODE = require('../../config/http-code');
const CDP_URL_APIS = require('../../config/cdp-url-api.constant');
const {get, post, put, del, convertObjectToQueryString} = require('../../utils/Request');
const {extractPaginationCondition} = require('../../utils/RequestUtil');

const changeUserType = async (req, res, next) => {
  const newType = req.body.type;
  logger.info('AdminUserController::changeUserType is called');

  try {
    const postData = {
      type: newType
    };
    const url = CDP_URL_APIS.USER.UPDATE_USER_INFO.replace(':id', req.params.id);
    put(url, postData, req.user.token)
      .then(response => {
        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: '',
          data: {}
        })
      })
      .catch(e => {
        logger.error('AdminUserController::changeUserType something error: ', e);
        return next(e);
      });
  } catch (e) {
    logger.error('AdminUserController::changeUserType something error: ', e);
    return next(e);
  }
};

const list = async (req, res, next) => {
  logger.info('UserController::list::called');

  try {
    const queryStr = convertObjectToQueryString(req.query);
    const url = `${CDP_URL_APIS.USER.LIST_USER}?${queryStr}&role=3`;
    const limit = parseInt(req.query.limit || 10, 0);
    get(url, req.user.token)
      .then(r => {
        logger.info('UserController::list::success');
        const users = r.data.entries;
        users.forEach(user => {
          user.balance.main = user.balance.main1;
          user.expirationDate = user.balance.expiredAt;
          if (user.type === global.USER_TYPE_COMPANY) {
            user.balance.creditTransferred = user.sharedCredit;
          } else if (user.type === global.USER_TYPE_PERSONAL) {
            user.balance.creditUsed = user.balance.usedCredit;
          }
        });

        return res.json({
          status: HTTP_CODE.SUCCESS,
          message: '',
          data: {
            items: r.data.entries,
            page: req.query.page,
            total: _.ceil(r.data.meta.totalItems / limit),
            totalItems: r.data.meta.totalItems
          }
        });
      })
      .catch(err => {
        logger.error('UserController::list:error', err);
        return next(err);
      });

    /*var page = req.query.page;
    var username = req.query.username;
    var email = req.query.email;
    var limit = req.query.limit;
    var type = req.query.type;


    if (!page || page < 0) {
      page = 0;
    }
    else {
      page = page * 1;
    }

    if (!limit || limit < 0) {
      limit = global.PAGE_SIZE;
    }
    else {
      limit = limit * 1;
    }

    var query = {role: {$nin: [global.USER_ROLE_ADMIN, global.USER_ROLE_MASTER]}};

    if (type == global.USER_TYPE_COMPANY || type == global.USER_TYPE_PERSONAL) {
      query.type = type;
    }

    if (username) {
      query.username = new RegExp(username, "i");

    }

    if (email) {
      query.email = new RegExp(email, "i");
    }

    var users = await UserModel.find(query).sort({date: -1}).skip((page - 1) * limit).limit(limit);
    let results = await Promise.all(users.map(async user => {

      var account = await AccountModel.findOne({owner: user._id});


      if (!account) {
        account = new AccountModel({owner: user._id});
        account = await account.save();
      }

      var accountInfo = {
        main: account.main,
        promo: account.promo

      };

      if (user.type == global.USER_TYPE_COMPANY) {
        var creditTransferred = 0;

        var children = await ChildModel.find({companyId: user._id});

        if (children && children.length > 0) {
          children.forEach(child => {
            creditTransferred += (child.credit - child.creditUsed);
          });
        }

        accountInfo.creditTransferred = creditTransferred;
      }

      if (user.type == global.USER_TYPE_PERSONAL) {

        var child = await ChildModel.find({personalId: user._id, status: global.STATUS.CHILD_ACCEPTED});

        if (child) {
          accountInfo.credit = child.credit;
          accountInfo.creditUsed = child.creditUsed;
        }

      }


      return {

        id: user._id,
        email: user.email,
        username: user.username,
        status: user.status,
        phone: user.phone,
        name: user.name,
        birthday: user.birthday,
        gender: user.gender,
        city: user.city,
        avatar: user.avatar,
        district: user.district,
        ward: user.ward,
        type: user.type,

        expirationDate: user.expirationDate,

        balance: accountInfo
      };


    }));


    let count = await UserModel.count(query);

    return res.json({
      status: 1,
      data: {
        items: results,
        page: page,
        total: _.ceil(count / limit)
      },
      message: 'request success '
    });*/

  }
  catch (e) {
    logger.error('UserController::list::error', e);
    return next(e);
  }
};

const update = async (req, res, next) => {
  logger.info('Admin/UserController::update::called');

  try {
    const urlApi = CDP_URL_APIS.USER.UPDATE_USER_INFO.replace(':id', req.params.id);
    let {name, phone, birthday, gender, city, district, ward, type, avatar, status, expirationDate} = req.body;
    const postData = {name, phone, birthday, gender, city, district, ward, type, avatar, status, expirationDate};

    put(urlApi, postData, req.user.token)
      .then(r => {
        logger.info('Admin/UserController::update::success');

        return res.json({
          status: HTTP_CODE.SUCCESS,
          data: {},
          message: 'Success'
        });
      })
      .catch(e => {
        logger.error('Admin/UserController::update::error', e);

        return next(e);
      });
  } catch (e) {
    logger.error('Admin/UserController::update::error', e);
    return next(e);
  }
};

const ruleGetInfoLead = async (req, res, next) => {
  logger.info('Admin/UserController::ruleGetInfoLead::called');

  try {
    const paginationCond = extractPaginationCondition(req);
    const stages = [
      {
        $match: {
          userId: parseInt(req.query.userId, 0)
        }
      },
      {
        '$lookup': {
          'from': 'Projects',
          'localField': 'project',
          'foreignField': '_id',
          'as': 'projectInfo'
        }
      },
      {'$unwind': {'path': '$projectInfo'}},
      {
        $sort: {
          updatedAt: 1
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

    const result = await RuleAlertLeadModel.aggregate(stages);
    const entries = result[0].entries.map(item => {
      return {
        _id: item._id,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
        userId: item.userId,
        city: item.city | null,
        formality: item.formality || null,
        type: item.type || null,
        district: item.district || null,
        project: {
          _id: item.projectInfo._id,
          title: item.projectInfo.title
        }
      }
    });
    logger.info('Admin/UserController::ruleGetInfoLead::success');

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: {
        totalItems: result[0].meta.length > 0 ? result[0].meta[0].totalItems : 0,
        entries
      }
    });
  } catch (e) {
    logger.error('Admin/UserController::ruleGetInfoLead::error', e);
    return next(e);
  }
};

const UserController = {
  list,
  update,
  changeUserType,
  ruleGetInfoLead
};

module.exports = UserController;
