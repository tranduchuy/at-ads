const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const HTTP_CODE = require('../../config/http-code');
const RuleAlertLeadModel = require('../../models/RuleAlertLeadModel');
const {extractPaginationCondition} = require('../../utils/RequestUtil');

const register = async (req, res, next) => {
  logger.info('RuleAlertLeadController::register::called');

  try {
    const {city, district, project, formality, type} = req.body;

    const rule = new RuleAlertLeadModel();
    rule.userId = req.user.id;
    rule.formality = formality;
    rule.type = type;
    rule.city = city;
    rule.district = district;
    rule.project = project;
    rule.createdAt = new Date();
    rule.updatedAt = new Date();
    await rule.save();
    logger.info('RuleAlertLeadController::register::success');

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Add rule successfully',
      data: rule
    });
  } catch (e) {
    logger.error('RuleAlertLeadController::register::error', e);
    return next(e);
  }
};

const list = async (req, res, next) => {
  logger.info('RuleAlertLeadController::list::called');

  try {
    const paginationCond = extractPaginationCondition(req);
    const stages = [
      {
        $match: {
          userId: req.user.id,
          status: {
            $ne: global.STATUS.DELETE
          }
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
      {
        $sort: {
          updatedAt: -1
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
      const projectInfo = item.projectInfo.length > 0 ? item.projectInfo[0] : null;
      const _item = {
        _id: item._id,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
        userId: item.userId,
        city: item.city || null,
        formality: item.formality || null,
        type: item.type || null,
        district: item.district || null,
        project: null
      };

      if (projectInfo) {
        _item.project = {
          _id: projectInfo._id,
          title: projectInfo.title
        };
      }

      return _item;
    });

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: {
        totalItems: result[0].meta.length > 0 ? result[0].meta[0].totalItems : 0,
        entries: entries
      }
    });
  } catch (e) {
    logger.error('RuleAlertLeadController::list::error', e);
    return next(e);
  }
};

const update = async (req, res, next) => {
  logger.info('RuleAlertLeadController::list::called');
  try {
    const {ruleId, city, district, project, formality, type} = req.body;
    const rule = await RuleAlertLeadModel.findOne({_id: ruleId});
    if (!rule) {
      return next(new Error('Rule not found'));
    }

    if (rule.userId !== req.user.id) {
      return next(new Error('Permission denied for updating'));
    }

    rule.formality = formality;
    rule.type = type;
    rule.city = city;
    rule.district = district;
    rule.project = project;
    rule.updatedAt = new Date();
    await rule.save();

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: rule
    })
  } catch (e) {
    logger.error('RuleAlertLeadController::list::error', e);
    return next(e);
  }
};

const remove = async (req, res, next) => {
  logger.info('RuleAlertLeadController::list::called');
  try {
    const ruleId = req.params.ruleId;
    const rule = await RuleAlertLeadModel.findOne({_id: ruleId});
    if (!rule) {
      return next(new Error('Rule not found'));
    }

    if (rule.userId !== req.user.id) {
      return next(new Error('Permission denied for updating'));
    }

    rule.status = global.STATUS.DELETE;
    await rule.save();

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Remove rules successfully',
      data: {}
    })
  } catch (e) {
    logger.error('RuleAlertLeadController::list::error', e);
    return next(e);
  }
};

const detailById = async (req, res, next) => {
  logger.info('RuleAlertLeadController::detailById::called');

  try {
    const rule = await RuleAlertLeadModel
      .findOne({_id: req.params.id})
      .populate('project')
      .lean();

    if (!rule) {
      return next(new Error('Rule not found'));
    }

    if (rule.userId !== req.user.id) {
      return next(new Error('Permission denied'));
    }

    delete rule.__v;
    if (rule.project) {
      rule.project = {
        _id: rule.project._id,
        title: rule.project.title
      };
    } else {
      rule.project = null;
    }

    return res.json({
      status: HTTP_CODE.SUCCESS,
      message: 'Success',
      data: rule
    });
  } catch (e) {
    logger.error('RuleAlertLeadController::list::error', e);
    return next(e);
  }
};

module.exports = {
  register,
  list,
  detailById,
  update,
  remove
};
