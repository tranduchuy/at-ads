const NewsModel = require('../../models/NewsModel');
const PostModel = require('../../models/PostModel');
const UrlParamModel = require('../../models/UrlParamModel');
const urlSlug = require('url-slug');
const ImageService = require('../../services/ImageService');
const HttpCode = require('../../config/http-code');
const mongoose = require('mongoose');
const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');

const NewsController = {
    catList: async (req, res, next) => {
        logger.info('Admin/NewsController::catList::called');

        try {
            const admin = req.user;
            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
                return next(new Error('Permission denied'));
            }

            const cats = await UrlParamModel.find({postType: global.POST_TYPE_NEWS});
            const results = cats.map(cat => {
                return {
                    text: cat.text,
                    id: cat.type,
                    url: cat.param,
                    extra: cat.extra
                };
            });

            return res.json({
                status: HttpCode.SUCCESS,
                data: results,
                message: 'Success'
            });
        } catch (e) {
            logger.error('Admin/NewsController::catList::error', e);
            return next(e);
        }
    },

    update: async (req, res, next) => {
        logger.info('Admin/NewsController::update is called');

        try {
            const admin = req.user;
            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
                return next(new Error('Permission denied'));
            }

            let id = req.params.id;

            if (!id || id.length === 0) {
                logger.error('Admin/NewsController::update::error. Invalid post id: ', id);
                return next(new Error('Invalid post id'));
            }

            let post = await PostModel.findOne({_id: id});
            if (!post) {
                return next(new Error('Post not found'));
            }

            const queryNews = {
                _id: post.contentId,
                status: {
                    $in: [
                        global.STATUS.ACTIVE,
                        global.STATUS.BLOCKED
                    ]
                }
            };
            let news = await NewsModel.findOne(queryNews);

            if (!news) {
                logger.error('Admin/NewsController::update::error. News not found: ' + JSON.stringify(queryNews));
                return next(new Error('News not found'));
            }

            const {
                title, content, cate, image, status,
                description, metaTitle, metaDescription,
                metaType, metaUrl, metaImage, canonical,
                textEndPage, url
            } = req.body;

            ImageService.putUpdateImage([news.image], [image]);
            news.title = title || news.title;
            news.content = content || news.content;
            news.type = cate || news.type;
            news.image = image || news.image;
            news.description = description || news.description;
            news.status = status || news.status;
            news.admin = (news.admin || []).push(new mongoose.Types.ObjectId(admin._id));
            news = await news.save();

            post.status = news.status;
            post.textEndPage = textEndPage || post.textEndPage;
            post.metaTitle = metaTitle || post.metaTitle;
            post.metaDescription = metaDescription || post.metaDescription;
            post.metaType = metaType || post.metaType;
            post.metaUrl = metaUrl || post.metaUrl;
            post.metaImage = metaImage || post.metaImage;
            post.canonical = canonical || post.canonical;

            if (title && news.title !== title) {
                let _url = urlSlug(title);
                const count = await PostModel.find({url: new RegExp('^' + _url)});
                if (count > 0) {
                    _url = `${_url}-${count}`;
                }

                post.url = _url;
            }

            const customUrl = url;
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

                // post.url = url; // url property should NOT be changed, it is original
                post.customUrl = customUrl;
            }

            await post.save();

            logger.info('Admin/NewsController::update::success. Update news successfully.');
            return res.json({
                status: HttpCode.SUCCESS,
                data: news,
                message: 'Success'
            });
        } catch (e) {
            logger.error('Admin/NewsController::update::error', e);
            return next(e);
        }
    },

    add: async (req, res, next) => {
        logger.info('Admin/NewsController::add is called');

        try {
            const admin = req.user;
            if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
                return next(new Error('Permission denied'));
            }

            const {
                title, content, cate, image, description,
                metaTitle, metaDescription, metaType, metaUrl,
                metaImage, canonical, textEndPage, createdByType
            } = req.body;
            let news = new NewsModel();

            if (createdByType) {
                const duplicateTitle = await NewsModel.findOne({title: req.body.title});
                if (duplicateTitle) {
                    logger.warn('Admin/NewsController::add::error. Crawling duplicate title');
                    return next('Crawling duplicate title');
                }
            }

            news.title = title;
            news.content = content;
            news.type = cate;
            news.image = image;
            news.description = description;
            news.status = global.STATUS.ACTIVE;
            news.admin = [new mongoose.Types.ObjectId(admin._id)];
            news.createdByType = createdByType || global.CREATED_BY.HAND;
            ImageService.postConfirmImage([image]);
            news = await news.save();

            const post = new PostModel();
            post.postType = global.POST_TYPE_NEWS;
            post.type = news.type;
            post.status = global.STATUS.ACTIVE;
            post.paymentStatus = global.STATUS.PAYMENT_FREE;
            post.contentId = news._id;
            let url = urlSlug(title);
            const count = await PostModel.find({url: new RegExp('^' + url)});
            if (count > 0) {
                url += ('-' + count);
            }

            post.url = url;
            post.metaTitle = metaTitle;
            post.metaDescription = metaDescription;
            post.metaType = metaType;
            post.metaUrl = metaUrl;
            post.metaImage = metaImage;
            post.canonical = canonical;
            post.textEndPage = textEndPage;
            await post.save();

            logger.info('Admin/NewsController::add::success. Add news successfully.');
            return res.json({
                status: HttpCode.SUCCESS,
                data: post,
                message: 'Success'
            });
        } catch (e) {
            logger.error('Admin/NewsController::add::error', e);
            return next(e);
        }
    }
};

module.exports = NewsController;
