const TagModel = require('../../models/TagModel');
const _ = require('lodash');
const TokenModel = require('../../models/TokenModel');
const UserModel = require('../../models/UserModel');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const HttpCode = require('../../config/http-code');

const TagController = {

    update: async function (req, res, next) {
        logger.info('Admin/TagController::update is called');
        try {
            const admin = req.user;

            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.status) === -1) {
                return next(new Error('Permission denied'));
            }

            let id = req.params.id;

            if (!id) {
                return next(new Error('Invalid id'));
            }

            const tag = await TagModel.findOne({_id: id, status: {$ne: global.STATUS.DELETE}});
            if (!tag) {
                return next(new Error('Tag not found'));
            }
            const {slug, metaTitle, metaDescription, metaType, metaUrl, metaImage, canonical, textEndPage, status} = req.body;

            if (slug && slug !== tag.customSlug) {
                const queryCount = {
                    $or: [
                        {slug},
                        {customSlug: slug}
                    ],
                    _id: {$ne: id}
                };
                const countDuplicate = await TagModel.countDocuments(queryCount);
                if (countDuplicate > 0) {
                    return next(new Error('Duplicate slug'));
                }

                // tag.slug = slug;
                tag.customSlug = slug;
            }

            if (status === global.STATUS.ACTIVE ||
                status === global.STATUS.DELETE ||
                status === global.STATUS.DELETE) {
                tag.status = status;
            }

            tag.metaTitle = metaTitle;
            tag.metaDescription = metaDescription;
            tag.metaType = metaType;
            tag.metaUrl = metaUrl;
            tag.metaImage = metaImage;
            tag.canonical = canonical;
            tag.textEndPage = textEndPage;
            tag.updatedBy = (tag.updatedBy || []).push(admin._id);
            await tag.save();

            return res.json({
                status: HttpCode.SUCCESS,
                data: tag,
                message: 'Success'
            });
        } catch (e) {
            logger.error('Admin/TagController::update::error', e);
            return next(e);
        }
    },

    list: async function (req, res, next) {
        try {
            var page = req.query.page;
            var slug = req.query.slug;
            var keyword = req.query.keyword;


            if (!page || page < 1) {
                page = 1;
            }

            var query = {status: {$ne: global.STATUS.DELETE}};

            if (slug) {
                query.slug = {"$regex": slug, "$options": "i"};
            }

            if (keyword) {
                query.keyword = {"$regex": keyword, "$options": "i"};
            }


            let tags = await
                TagModel
                    .find(query)
                    .sort({date: -1})
                    .skip((page - 1) * global.PAGE_SIZE)
                    .limit(global.PAGE_SIZE)
                    .lean();
            let results = tags.map(tag => {
                return {
                    ...tag,
                    id: tag._id
                }
            });
            let count = await TagModel.countDocuments(query);

            return res.json({
                status: 1,
                data: {
                    items: results,
                    page: page,
                    total: _.ceil(count / global.PAGE_SIZE)
                },
                message: 'request success '
            });

        }

        catch
            (e) {
            return res.json({
                status: 0,
                data: {},
                message: 'unknown error : ' + e.message
            });
        }


    }

    ,


    detail: async function (req, res, next) {

        try {

            var token = req.headers.accesstoken;
            var accessToken = await TokenModel.findOne({token: token});

            if (!accessToken) {
                return res.json({
                    status: 0,
                    data: {},
                    message: 'access token invalid'
                });

            }

            var admin = await
                UserModel.findOne({
                    _id: accessToken.user,
                    status: global.STATUS.ACTIVE,
                    role: {$in: [global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN]}
                });

            if (!admin) {
                return res.json({
                    status: 0,
                    data: {},
                    message: 'admin not found or blocked'
                });

            }

            let id = req.params.id;

            if (!id || id.length == 0) {
                return res.json({
                    status: 0,
                    data: {},
                    message: 'id null error'
                });

            }

            let tag = await TagModel
                .findOne({_id: id, status: {$ne: global.STATUS.DELETE}})
                .lean();

            if (!tag) {
                return res.json({
                    status: 0,
                    data: {},
                    message: 'tag not exist'
                });
            }

            return res.json({
                status: 1,
                data: {
                    ...tag,
                    id: tag._id
                },
                message: 'success'
            });
        } catch (e) {
            logger.error('Admin/TagController::detail::error', e);
            return next(e);
        }
    }
};

module.exports = TagController;
