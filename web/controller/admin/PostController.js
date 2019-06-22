const SaleModel = require('../../models/SaleModel');
const BuyModel = require('../../models/BuyModel');
const PostModel = require('../../models/PostModel');
const NewsModel = require('../../models/NewsModel');
const ProjectModel = require('../../models/ProjectModel');
const _ = require('lodash');
const urlSlug = require('url-slug');
const HttpCode = require('../../config/http-code');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const PostService = require('../../services/PostService');
const RoleService = require('../../services/RoleService');

const PostController = {
    updateUrl: async function (req, res, next) {
        const admin = req.user;

        if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
            logger.error('PostController::updateUrl::error. Permission denied');
            return next(new Error('Permission denied'));
        }

        let id = req.params.id;

        if (!id) {
            logger.error('PostController::updateUrl::error. Id is required');
            return next(new Error('Id is required'));
        }

        const post = await PostModel.findOne({_id: id});
        if (!post) {
            logger.error('PostController::updateUrl::error. Post not found');
            return next(new Error('Post not found'));
        }

        const properties = ['metaTitle', 'metaDescription', 'metaType', 'metaUrl', 'metaImage', 'canonical', 'textEndPage'];
        let customUrl = req.body.url;

        if (customUrl && customUrl !== post.customUrl) {
            const queryCountDuplicate = {
                _id: {$ne: id},
                $or: [
                    {url: customUrl},
                    {customUrl}
                ]
            };

            if (await PostModel.countDocuments(queryCountDuplicate) > 0) {
                logger.error('PostController::updateUrl::error. Duplicate url or customUrl', customUrl);
                return next(new Error('Duplicate url or customUrl. Url: ' + customUrl))
            }

            // post.url = url; // url property should not be changed, it is original
            post.customUrl = customUrl;
        }

        properties.forEach(p => {
            if (req.body[p]) {
                post[p] = req.body[p];
            }
        });

        await post.save();

        return res.json({
            status: HttpCode.SUCCESS,
            data: post,
            message: 'Success'
        });
    },

    list2: async (req, res, next) => {
        logger.info('Admin/PostController::list2 is called');

        try {
            if (!RoleService.isAdmin(req.user)) {
                return next(new Error('Permission denied'));
            }

            let {postType} = req.query;
            postType = parseInt(postType || '-999999', 0);

            let stages = [];
            switch (postType) {
                case global.POST_TYPE_SALE:
                    stages = PostService.generateStageQueryPostSale(req);
                    break;
                case global.POST_TYPE_BUY:
                    stages = PostService.generateStageQueryPostBuy(req);
                    break;
                case global.POST_TYPE_PROJECT:
                    stages = PostService.generateStageQueryPostProject(req);
                    break;
                case global.POST_TYPE_NEWS:
                    stages = PostService.generateStageQueryPostNews(req);
                    break;
                default:
                    stages = PostService.generateStageQueryPost(req);
                    break;
            }

            logger.info('Admin/PostController::list2. Aggregate stages: ', JSON.stringify(stages));

            const results = await PostModel.aggregate(stages);
            return res.json({
                status: HttpCode.SUCCESS,
                data: {
                    entries: results[0].entries,
                    meta: {
                        totalItems: results[0].entries.length > 0 ? results[0].meta[0].totalItems : 0
                    }
                },
                message: 'Success'
            });
        } catch (e) {
            logger.error('Admin/PostController::list2::error', e);
            return next(e);
        }
    },

    detail: async function (req, res, next) {
        logger.info('PostController::detail is called');
        try {
            const admin = req.user;

            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
                logger.error('PostController::updateUrl::error. Permission denied');
                return next(new Error('Permission denied'));
            }

            let id = req.params.id;

            if (!id) {
                return next(new Error('Post id is required'));
            }

            let post = await PostModel.findOne({_id: id});

            if (!post) {
                logger.error('PostController::detail::error. Post not found', id);
                return next(new Error('Post not found'));
            }

            // NOTE: can edit data when status=DELETE
            // else if (post.status === global.STATUS.DELETE) {
            //     logger.error('PostController::detail::error. Post is deleted', id);
            //     return next(new Error('Post is deleted'));
            // }

            let model = SaleModel;
            switch (post.postType) {
                case global.POST_TYPE_SALE:
                    model = SaleModel;
                    break;
                case global.POST_TYPE_BUY:
                    model = BuyModel;
                    break;
                case global.POST_TYPE_NEWS:
                    model = NewsModel;
                    break;
                case global.POST_TYPE_PROJECT:
                    model = ProjectModel;
                    break;
            }

            let content = await model.findOne({_id: post.contentId});
            if (!content) {
                logger.error('PostController::detail::error. ContentId not found detail', post.contentId);
                return next(new Error('ContentId not found detail: ' + post.contentId));
            }

            return res.json({
                status: HttpCode.SUCCESS,
                data: Object.assign({}, post.toObject(), content.toObject(), {id: post._id}),
                message: 'Success'
            });
        } catch (e) {
            logger.error('PostController::detail::error', e);
            return next(e);
        }
    }
};

module.exports = PostController;
