const UrlParamModel = require('../../models/UrlParamModel');
const _ = require('lodash');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const HttpCode = require('../../config/http-code');

const CategoryController = {

    update: async (req, res, next) => {
        logger.info('Admin/CategoryController::update is called');
        try {
            const admin = req.user;
            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
                return next(new Error('Permission denied'));
            }

            let id = req.params.id;

            if (!id) {
                return next(new Error('Invalid id'));
            }

            const category = await UrlParamModel.findOne({_id: id});
            if (!category) {
                return next(new Error('Category not found'));
            }

            const cateProperties = ['metaTitle', 'metaDescription', 'metaType', 'metaUrl', 'metaImage', 'canonical', 'textEndPage'];

            cateProperties.forEach(p => {
                if (req.body[p]) {
                    category[p] = req.body[p];
                }
            });

            let {url, status} = req.body;

            if (url && url.length > 0) {
                const countDuplicate = await UrlParamModel.count({
                    $or: [
                        {param: url},
                        {customParam: url}
                    ],
                    _id: {$ne: id}
                });

                if (countDuplicate > 0) {
                    return next(new Error('Duplicate url: ' + url));
                }

                category.customParam = url;
            }

            if (status === global.STATUS.ACTIVE ||
                status === global.STATUS.DELETE ||
                status === global.STATUS.DELETE) {
                category.status = status;
            }

            category.updatedBy = (category.updatedBy || {}).push(admin._id);
            await category.save();

            return res.json({
                status: HttpCode.SUCCESS,
                data: category,
                message: 'Success'
            });
        } catch (e) {
            logger.error('Admin/CategoryController::update::error', e);
            return next(e);
        }
    },

    list: async function (req, res, next) {
        logger.info('Admin/CategoryController::list is called');

        try {
            const admin = req.user;
            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
                return next(new Error('Permission denied'));
            }

            let {page, url} = req.query;

            if (!page || page < 1) {
                page = 1;
            }

            const query = {status: {$ne: global.STATUS.DELETE}};

            if (url) {
                query['$or'] = [
                    {param: {"$regex": url, "$options": "i"}},
                    {customParam: {"$regex": url, "$options": "i"}}
                ];
            }

            let categories = await
                UrlParamModel.find(query)
                    .sort({date: -1})
                    .skip((page - 1) * global.PAGE_SIZE)
                    .limit(global.PAGE_SIZE);

            let results = categories.map(category => {
                return {
                    id: category._id,
                    url: category.param,
                    customUrl: category.customParam,
                    metaTitle: category.metaTitle,
                    metaDescription: category.metaDescription,
                    metaType: category.metaType,
                    metaUrl: category.metaUrl,
                    metaImage: category.metaImage,
                    canonical: category.canonical,
                    textEndPage: category.textEndPage,
                }
            });
            let count = await UrlParamModel.count(query);

            return res.json({
                status: HttpCode.SUCCESS,
                data: {
                    items: results,
                    page: page,
                    total: _.ceil(count / global.PAGE_SIZE)
                },
                message: 'Success'
            });
        } catch (e) {
            logger.error('Admin/CategoryController::list::error', e);
            return next(e);
        }
    },

    detail: async function (req, res, next) {
        logger.info('Admin/CategoryController::detail is called');
        try {
            const admin = req.user;
            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
                return next(new Error('Permission denied'));
            }

            let id = req.params.id;
            if (!id) {
                return next(new Error('Invalid id'));
            }

            let category = await UrlParamModel.findOne({
                _id: id,
                status: {$ne: global.STATUS.DELETE}
            });

            if (!category) {
                return next(new Error('Category not found'));
            }

            return res.json({
                status: HttpCode.SUCCESS,
                data: Object.assign({}, category.toObject(), {id: category._id}),
                message: 'Success'
            });
        } catch (e) {
            logger.error('Admin/CategoryController::detail::error', e);
            return next(e);
        }
    }
};

module.exports = CategoryController;
