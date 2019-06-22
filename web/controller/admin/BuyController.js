const PostModel = require('../../models/PostModel');
const BuyModel = require('../../models/BuyModel');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const HttpCode = require('../../config/http-code');

const BuyController = {
    update: async function (req, res, next) {
        logger.info('AdminBuyController::update::error');

        try {
            const admin = req.user;

            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
                return next(new Error('Permission denied'));
            }

            let id = req.params.id;

            if (!id) {
                return next(new Error('Invalid id'));
            }

            let post = await PostModel.findOne({_id: id});

            if (!post || post.postType !== global.POST_TYPE_BUY) {
                logger.error('AdminBuyController::update::error. Post not found');
                return next(new Error('Post not found'));
            }

            const buy = await BuyModel.findOne({_id: post.contentId});

            if (!buy) {
                logger.error('AdminBuyController::update::error. Buy not found');
                return next(new Error('Post not found'));
            }

            const status = req.body.status;
            buy.admin = (buy.admin || []).push(admin._id);

            if (status === global.STATUS.ACTIVE || status === global.STATUS.BLOCKED || status === global.STATUS.DELETE) {
                post.status = status;
                buy.status = status;
            }

            await buy.save();
            await post.save();

            return res.json({
                status: HttpCode.SUCCESS,
                data: {},
                message: 'Success'
            });
        } catch (e) {
            logger.error('AdminBuyController::update::error', e);
            return next(e);
        }
    }
};

module.exports = BuyController;
