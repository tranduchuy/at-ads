const log4js = require('log4js');
const logger = log4js.getLogger('Controllers');
const SystemModel = require('../../models/SystemModel');
const SaleModel = require('../../models/SaleModel');
const BuyModel = require('../../models/BuyModel');
const NewsModel = require('../../models/NewsModel');
const ProjectModel = require('../../models/ProjectModel');
const HttpCode = require('../../config/http-code');

const needBuyId = 400;
const needRentId = 401;
const saleId = 38;
const rentId = 49;


const getStatisticInfo = async (req, res, next) => {
    logger.info('SystemController::getStatisticInfo is called');

    try {
        const config = await SystemModel.findOne({});
        const countCrawledSale = await SaleModel.countDocuments({createdByType: global.CREATED_BY.CRAWL, formality: saleId});
        const countCrawledRent = await SaleModel.countDocuments({createdByType: global.CREATED_BY.CRAWL, formality: rentId});
        const countCrawledNeedBuy = await BuyModel.countDocuments({createdByType: global.CREATED_BY.CRAWL, formality: needBuyId});
        const countCrawledNeedRent = await BuyModel.countDocuments({createdByType: global.CREATED_BY.CRAWL, formality: needRentId});
        const countCrawledNews = await NewsModel.countDocuments({createdByType: global.CREATED_BY.CRAWL});
        const countCrawledProject = await ProjectModel.countDocuments({createdByType: global.CREATED_BY.CRAWL});

        return res.json({
            status: HttpCode.SUCCESS,
            message: '',
            data: {
                crawl: {
                    sale: {
                        total: config.crawler.sale,
                        finished: countCrawledSale
                    },
                    rent: {
                        total: config.crawler.rent,
                        finished: countCrawledRent
                    },
                    needBuy: {
                        total: config.crawler.needBuy,
                        finished: countCrawledNeedBuy
                    },
                    needRent: {
                        total: config.crawler.needRent,
                        finished: countCrawledNeedRent
                    },
                    news: {
                        total: config.crawler.news,
                        finished: countCrawledNews
                    },
                    project: {
                        total: config.crawler.project,
                        finished: countCrawledProject
                    }
                }
            }
        });

    } catch (e) {
        logger.error('SystemController::getStatisticInfo::error', e);
        return next(e);
    }
};

const updateConfig = async (req, res, next) => {
    logger.info('SystemController::updateConfig is called');

    try {
        const { crawl } = req.body;
        const admin = req.user;

        if ([global.USER_ROLE_MASTER, global.USER_ROLE_ADMIN].indexOf(admin.role) === -1) {
            return next(new Error('Permission denied'));
        }

        if (!crawl) {
            return res.json({
                status: HttpCode.BAD_REQUEST,
                message: ['Nothing to update'],
                data: {}
            });
        }

        const config = await SystemModel.findOne();
        Object.assign(config.crawl, crawl);

        await config.save();

        return res.json({
            status: HttpCode.SUCCESS,
            message: 'Success',
            data: {}
        });
    } catch (e) {
        logger.error('SystemController::updateConfig::error', e);
        return next(e);
    }
};

const getDefaultSystemConfig = async (req, res, next) => {
    logger.info('SystemController::getDefaultSystemConfig is called');

    try {
        const config = await SystemModel.findOne().lean();
        return res.json({
            status: HttpCode.SUCCESS,
            message: '',
            data: {
                entry: [config],
                meta: {}
            }
        });
    } catch (e) {
        logger.error('SystemController::getDefaultSystemConfig::error', e);
        return next(e);
    }
};

module.exports = {
    getDefaultSystemConfig,
    updateConfig,
    getStatisticInfo
};
