const log4js = require('log4js');
const urlSlug = require('url-slug');
const UrlParamModel = require('../models/UrlParamModel');
const logger = log4js.getLogger('Services');
const TitleService = require('./TitleService');
const CityModel = require('../models/CityModel');
const DistrictModel = require('../models/DistrictModel');

const MIN_TARGETS_CONST = {
    CITY: 'CITY',
    DISTRICT: 'DISTRICT',
    WARD: 'WARD'
};

/**
 * Detect minTarget of a query
 * @param query
 * @return string minTargets
 */
const detectMinTarget = (query) => {
    // query = {formality, type, city, district, ward}
    query = query || {};

    if (query['ward'] || query['district']) {
        return MIN_TARGETS_CONST.WARD;
    }

    if (query['city']) {
        return MIN_TARGETS_CONST.DISTRICT;
    }

    if (query['type'] || query['formality']) {
        return MIN_TARGETS_CONST.CITY;
    }

    return '';
};

/**
 * Generate query object of urlParam | sale | buy
 * @param urlParam
 * @return Object query{formality, type, city, district, ward}
 */
const getQueryObject = (targetObj) => {
    const query = {};

    ['formality', 'type', 'city', 'district', 'ward'].forEach(field => {
        if (targetObj[field] !== null && targetObj[field] !== undefined) {
            query[field] = targetObj[field];
        }
    });

    return query;
};

/**
 * Generate queries case MIN_TARGET is city
 * @param rootQuery
 * @return {Array}
 */
const generateQueriesCaseCity = async (rootQuery) => {
    try {
        const cities = await CityModel.find({}).lean();

        return cities.map(city => {
            return Object.assign({}, rootQuery, {
                city: city.code,
                district: null,
                ward: null,
                textLink: city.name
            });
        });
    } catch (e) {
        logger.warn('UrlParamService::generateQueriesCaseCity::error', e);
        return [];
    }
};

/**
 * Generate queries case MIN_TARGET is district
 * @param rootQuery
 * @return {Array}
 */
const generateQueriesCaseDistrict = async (rootQuery) => {
    try {
        const city = await CityModel
            .findOne({code: rootQuery.city})
            .lean();

        if (!city) {
            logger.warn('UrlParamService::generateQueriesCaseDistrict City not found, query by city code' + rootQuery.city);
            return [];
        }

        const districts = await DistrictModel
            .find({city: city._id})
            .lean();

        return districts.map(d => {
            return Object.assign({}, rootQuery, {
                district: d.id,
                ward: null,
                textLink: `${d.pre} ${d.name}`.trim()
            });
        });
    } catch (e) {
        logger.warn('UrlParamService::generateQueriesCaseDistrict::error', e);
    }

    return [];
};


/**
 * Generate queries case MIN_TARGET is ward
 * @param rootQuery
 * @return {Array}
 */
const generateQueriesCaseWard = async (rootQuery) => {
    try {
        const city = await CityModel
            .findOne({code: rootQuery.city})
            .lean();

        if (!city) {
            logger.warn('UrlParamService::generateQueriesCaseWard City not found, query by city code' + rootQuery.city);
            return [];
        }

        const district = await DistrictModel
            .findOne({id: rootQuery.district})
            .lean();

        if (!district) {
            logger.warn('UrlParamService::generateQueriesCaseWard District not found, query by district id' + rootQuery.district);
            return [];
        }

        return district.wards.map(w => {
            return Object.assign({}, rootQuery, {
                ward: w.id,
                textLink: `${w.pre} ${w.name}`.trim()
            });
        });
    } catch (e) {
        logger.warn('UrlParamService::generateQueriesCaseWard::error', e);
    }

    return [];
};

/**
 * Generate related queries from rootQuery base on MIN_TARGET
 * @param rootQuery object query {formality?, type?, city?, district?, ward?}
 * @param minTarget
 * @return object[] array of object queries
 */
const generateQueries = async (rootQuery, minTarget) => {
    switch (minTarget) {
        case MIN_TARGETS_CONST.CITY:
            return await generateQueriesCaseCity(rootQuery);
        case MIN_TARGETS_CONST.DISTRICT:
            return await generateQueriesCaseDistrict(rootQuery);
        case MIN_TARGETS_CONST.WARD:
            return await generateQueriesCaseWard(rootQuery);
        default:
            return [];
    }
};

/**
 *
 * @param queries Object query include: formality, type, city, district, ward
 * @return {Promise<Array>}
 */
const findOrCreateUrlParamByQuery = async (queries) => {
    return await Promise.all(queries.map(async (query) => {
        const saveTextLink = query.textLink;
        delete query.textLink;

        const urlParam = await UrlParamModel.findOne(query).lean();

        if (urlParam) {
            return Object.assign({textLink: saveTextLink}, urlParam);
        }

        const postType = TitleService.getPostType(query.formality);
        let url = TitleService.getTitle(query) + ' ' +
            TitleService.getLocationTitle(query);

        url = urlSlug(url.trim());
        let countDuplicate = await UrlParamModel.countDocuments({param: url});
        if (countDuplicate > 0) {
            url += `-${countDuplicate}`;
        }

        const newUrlParam = new UrlParamModel({
            formality: query.formality,
            type: query.type || null,
            status: global.STATUS.ACTIVE,
            param: url,
            customParam: '',
            postType,
            city: query.city || null,
            district: query.district || null,
            ward: query.ward || null,
            street: null,
            area: null,
            price: null,
            bedroomCount: null,
            updatedBy: [],
            project: null
        });

        await newUrlParam.save();
        return Object.assign({textLink: saveTextLink}, JSON.parse(JSON.stringify(newUrlParam)));
    }));
};

/**
 * Description: Get related urlParams (related categories) of a urlParam by select (maybe should create new), query{formality, type, city, district, ward}
 * Input: urlParamId
 * Output: <url, customUrl, _id>[]
 *
 * @param rootQuery object
 * @param options object
 * @return Object[] <param, customParam, _id>[]
 */
const getRelatedUrlParams = async (rootQuery, options) => {
    logger.info(`UrlParamService::getRelatedUrlParams is called with query object: ${JSON.stringify(rootQuery)}`);
    try {
        options = options || {};
        /*
        * Note, steps:
        * 1. Get object query of urlParam
        * 2. Detect min target to generate
        * 3. Generate queries for each value of min target: ex 63 cities, each city include many districts,...
        * 4. Loop query of queries for find in UrlParamModel. Result of this
        *   4.1 If not exists create one, return the object. Result of this step is related urlParams
        *   4.2 If exists then return the object
        * 5. Map to expected output from related urlParams
        * */

        // Step 1: Get object query of urlParam
        // const rootQuery = getQueryObjOfUrlParam(urlParam);

        // Step 2: Detect min target to generate
        const minTarget = detectMinTarget(rootQuery);

        // Step 3: Generate queries for each value of min target: ex 63 cities, each city include many districts,...
        const queries = await generateQueries(rootQuery, minTarget);

        // Step 4;
        const urlParams = await findOrCreateUrlParamByQuery(queries);

        // Step 5:
        const relatedUrlParams = urlParams
            .map(urlParam => {
                return {
                    _id: urlParam._id,
                    param: urlParam.param,
                    customParam: urlParam.customParam,
                    textLink: urlParam.textLink
                }
            });

        relatedUrlParams.sort(function (a, b) {
            const textA = a.textLink.toUpperCase();
            const textB = b.textLink.toUpperCase();
            return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });

        logger.info('UrlParamService::getRelatedUrlParams::success. Related urlParams length: ' + relatedUrlParams.length);
        return relatedUrlParams.slice(0, 20);

    } catch (e) {
        logger.error('UrlParamService::getRelatedUrlParams::error', e);
        return [];
    }
};

module.exports = {
    getQueryObject,
    getRelatedUrlParams
};
