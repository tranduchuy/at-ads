// modules
const _ = require('lodash');
const log4js = require('log4js');
const urlSlug = require('url-slug');

const SaleModel = require('../../models/SaleModel');
const BuyModel = require('../../models/BuyModel');
const PostModel = require('../../models/PostModel');
const TagModel = require('../../models/TagModel');
const UrlParamModel = require('../../models/UrlParamModel');
const HttpCode = require('../../config/http-code');
const logger = log4js.getLogger('Controllers');
const UrlParamService = require('../../services/UrlParamService');

const highlight = async (req, res, next) => {
    logger.info('TagController::highlight is called');
    try {
        const tags = await TagModel
            .find({
                status: global.STATUS.ACTIVE
            })
            .sort({refresh: -1})
            .limit(10)
            .lean();

        return res.json({
            status: HttpCode.SUCCESS,
            data: tags,
            message: 'Success'
        });
    } catch (e) {
        logger.error('TagController::highlight::error', e);
        return next(e);
    }
};

const list = async (req, res, next) => {
    logger.info('TagController::list is called');
    try {
        let page = req.query.page;

        if (!page || Number(page) < 1) {
            page = 1;
        }

        const queryObj = {status: global.STATUS.ACTIVE};
        const tags = await TagModel
            .find(queryObj)
            .sort({refresh: -1})
            .skip((page - 1) * global.PAGE_SIZE)
            .limit(global.PAGE_SIZE)
            .lean();
        const count = await TagModel.countDocuments(queryObj);

        return res.json({
            status: HttpCode.SUCCESS,
            data: {
                items: tags,
                page: page,
                total: _.ceil(count / global.PAGE_SIZE)
            },
            message: 'Success'
        });
    } catch (e) {
        logger.error('TagController::list::error', e);
        return next(e);
    }
};

const query = async (req, res, next) => {
    logger.info('TagController::query is called');
    try {
        let relatedCates = [];
        let relatedTags = [];
        let {page, slug} = req.query;

        if (!slug) {
            logger.error('TagController::query::error. Invalid slug');
            return next(new Error('Invalid slug'));
        }

        if (!page || page < 1) {
            page = 1;
        }

        const tag = await TagModel.findOne({slug}).lean();

        if (!tag) {
            return res.json({
                status: HttpCode.SUCCESS,
                data: {
                    items: [],
                    page: page,
                    total: 0
                },
                message: 'Success'
            });
        }

        const queryObj = {
            tags: tag._id,
            status: global.STATUS.ACTIVE
        };
        const posts = await PostModel
            .find(queryObj)
            .skip((page - 1) * global.PAGE_SIZE)
            .limit(global.PAGE_SIZE)
            .lean();
        const count = await PostModel.countDocuments(queryObj);
        const results = await Promise.all(posts.map(async post => {
            if (post.postType === global.POST_TYPE_SALE) {
                let sale = await SaleModel.findOne({_id: post.contentId}).lean();
                let keys = (sale.keywordList || []).map(key => {
                    return {
                        keyword: key,
                        slug: urlSlug(key)
                    }
                });

                relatedTags = relatedTags.concat(keys);

                return Object.assign({}, post, sale, {
                    postId: post._id,
                    url: post.url,
                    keywordList: keys,
                    id: sale._id,
                });
            } else {
                let buy = await BuyModel.findOne({_id: post.contentId}).lean();
                let keys = (buy.keywordList || []).map(key => {
                    return {
                        keyword: key,
                        slug: urlSlug(key)
                    }
                });

                return Object.assign({}, post, buy, {
                    postId: post._id,
                    url: post.url,
                    id: buy._id,
                    keywordList: keys
                });
            }
        }));
    
        relatedTags = relatedTags.slice(0, 10);

        // Note: Get query object from sale or buy. First item in results array.
        const rootQueryRelated = UrlParamService.getQueryObject(results[0]);
        relatedCates = await UrlParamService.getRelatedUrlParams(rootQueryRelated);

        const redirectUrl = tag.customSlug !== tag.slug ? tag.customSlug : null;
        return res.json({
            status: HttpCode.SUCCESS,
            data: {
                url: redirectUrl,
                itemCount: count,
                keyword: tag.keyword,
                items: results,
                page,
                total: _.ceil(count / global.PAGE_SIZE),
                relatedCates,
                relatedTags
            },
            message: 'Success'
        });

    } catch (e) {
        logger.error('TagController::query::error', e);
        return next(e);
    }
};

const getRelated = async (req, res, next) => {
    logger.info('TagController::getRelated is called');

    try {
        const {slug} = req.query;

        if (!slug) {
            logger.error('TagController::getRelated::error. Invalid slug tag');
            return next(new Error('Invalid slug tag'));
        }

        const tag = await TagModel.findOne({
            $or: [
                {slug},
                {customSlug: slug}
            ]
        });

        if (!tag) {
            logger.error('TagController::getRelated::error Tag not found');
            return next(new Error('Tag not found'));
        }

        const posts = await PostModel.find({
            tags: tag._id
        }).lean();

        let tagIds = [];
        posts.forEach(post => {
            const tags = post.tags || [];
            tagIds = tagIds.concat(
                tags.filter(tagId => tagId.toString() !== tag._id.toString())
            );
        });

        // limit related 20 tag => use slice
        const relatedTags = await TagModel.find({_id: {$in: tagIds.slice(20)}})
            .select({
                slug: 1,
                customSlug: 1,
                keyword: 1
            })
            .lean();

        return res.json({
            status: HttpCode.SUCCESS,
            message: ['Success'],
            data: {
                entries: relatedTags
            }
        });
    } catch (e) {
        logger.error('TagController::getRelated::error', e);
        return next(e);
    }
};

module.exports = {
    highlight,
    list,
    query,
    getRelated
};
