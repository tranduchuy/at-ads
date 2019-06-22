const SaleModel = require('../../models/SaleModel');
const PostModel = require('../../models/PostModel');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const HttpCode = require('../../config/http-code');

const SaleController = {
    update: async function (req, res, next) {
        logger.info('AdminSaleController::update is called');

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

            if (!post || post.postType !== global.POST_TYPE_SALE) {
                logger.error('AdminSaleController::update::error. Post not found');
                return next(new Error('Post not found'));
            }

            const sale = await SaleModel.findOne({_id: post.contentId});

            if (!sale) {
                logger.error('AdminSaleController::update::error. Sale not found');
                return next(new Error('Post not found'));
            }

            const status = req.body.status;
            sale.admin = (sale.admin || []).push(admin._id);

            if (status === global.STATUS.ACTIVE || status === global.STATUS.BLOCKED || status === global.STATUS.DELETE) {
                sale.status = status;
                post.status = status;
            }

            await sale.save();
            await post.save();

            return res.json({
                status: HttpCode.SUCCESS,
                data: sale,
                message: 'Success'
            });
        } catch (e) {
            logger.error('AdminSaleController::update::error', e);
            return next(e);
        }
    }
};

module.exports = SaleController;
