const RequestUtils = require('../utils/RequestUtil');
const moment = require('moment');
const selector = require('../config/selector.js');

const convertValueAreaToID = (value) => {
    for (let i = 0; i < selector.areaListValue.length; i++) {
        const areaConfig = selector.areaListValue[i];
        if (areaConfig.min === null && areaConfig.max === null) {
            continue;
        }

        if (areaConfig.min && areaConfig.max) {
            if (value >= areaConfig.min && value < areaConfig.max) {
                return areaConfig.value;
            }
        } else if (areaConfig.min) {
            if (value >= areaConfig.min) {
                return areaConfig.value;
            }
        } else if (areaConfig.max) {
            if (value < areaConfig.max) {
                return areaConfig.value;
            }
        }
    }

    return -1; // Default: Chưa xác định
};

const convertValueSalePriceToID = (value, formality) => {
    const formalityDetail = selector.cateList.find(f => f.id.toString() === formality.toString());
    if (!formalityDetail) {
        return -1;
    }

    const priceList = formalityDetail.priceLevelValue || [];

    for (let i = 0; i < priceList.length; i++) {
        const priceConfig = priceList[i];
        if (priceConfig.min === null && priceConfig.max === null) {
            continue;
        }

        if (priceConfig.min && priceConfig.max) {
            if (value >= priceConfig.min && value < priceConfig.max) {
                return priceConfig.value;
            }
        } else if (priceConfig.min) {
            if (value >= priceConfig.min) {
                return priceConfig.value;
            }
        } else if (priceConfig.max) {
            if (value < priceConfig.max) {
                return priceConfig.value;
            }
        }
    }

    return -1; // Default: Thỏa thuận
};

const generateStageQueryPostNews = (req) => {
    const {
        createdByType, status, id, dateFrom, dateTo, title,
        sortBy, sortDirection
    } = req.query;
    const pageCond = RequestUtils.extractPaginationCondition(req);

    const stages = [
        {
            $match: {
                "postType": global.POST_TYPE_NEWS,
            }
        },
        {
            $lookup: {
                from: "News",
                localField: "contentId",
                foreignField: "_id",
                as: "newsInfo"
            }
        },
        {
            $unwind: "$newsInfo"
        }
    ];

    // filter
    const stageFilter = {};

    if (createdByType && createdByType !== '0') {
        stageFilter["newsInfo.createdByType"] = parseInt(createdByType);
    }

    if (status) {
        stageFilter["newsInfo.status"] = parseInt(status);
    }

    if (id) {
        stageFilter["newsInfo._id"] = id;
    }

    if (title) {
        stageFilter['newsInfo.title'] = {
            $regex: title,
            $options: 'i'
        }
    }

    // filter date by query dateFrom and dateTo
    if (dateFrom || dateTo) {
        const dateFilterObj = {};

        if (dateFrom && dateFrom.toString().length === 10) {
            const fromObj = moment(dateFrom, 'YYYY-MM-DD').toDate();
            dateFilterObj['$gte'] = fromObj.getTime()
        }

        if (dateTo && dateTo.toString().length === 10) {
            const toObj = moment(dateTo, 'YYYY-MM-DD').toDate();
            dateFilterObj['$lte'] = toObj.getTime();
        }

        if (Object.keys(dateFilterObj).length !== 0) {
            stageFilter['date'] = dateFilterObj;
        }
    }

    if (Object.keys(stageFilter).length !== 0) {
        stages.push({
            $match: stageFilter
        });
    }

    // sort
    let stageSort = {
        $sort: {}
    };

    if (sortBy) {
        stageSort.$sort[sortBy] = sortDirection === 'ASC' ? 1 : -1
    } else {
        stageSort.$sort['date'] = -1; // default sort by date descending
    }

    stages.push(stageSort);

    // pagination
    stages.push({
        $facet: {
            entries: [
                {$skip: (pageCond.page - 1) * pageCond.limit},
                {$limit: pageCond.limit},
            ],
            meta: [
                {$group: {_id: null, totalItems: {$sum: 1}}},
            ],
        },
    });

    return stages;
};

const generateStageQueryPostProject = (req) => {
    const {createdByType, status, id, title, city, type} = req.query;
    const pageCond = RequestUtils.extractPaginationCondition(req);

    const stages = [
        {
            $match: {
                "postType": global.POST_TYPE_PROJECT,
            }
        },
        {
            $lookup: {
                from: "Projects",
                localField: "contentId",
                foreignField: "_id",
                as: "projectInfo"
            }
        },
        {
            $unwind: "$projectInfo"
        }
    ];

    // filter
    const stageFilter = {};

    if (createdByType && createdByType !== '0') {
        stageFilter["projectInfo.createdByType"] = parseInt(createdByType);
    }

    if (status) {
        stageFilter["projectInfo.status"] = parseInt(status);
    }

    if (id) {
        stageFilter["projectInfo._id"] = id;
    }

    if (city) {
        stageFilter["projectInfo.city"] = city;
    }

    if (type) {
        stageFilter["projectInfo.type"] = type;
    }

    if (title) {
        stageFilter['projectInfo.title'] = {
            $regex: title,
            $options: 'i'
        }
    }

    if (Object.keys(stageFilter).length !== 0) {
        stages.push({
            $match: stageFilter
        });
    }

    // pagination
    stages.push({
        $facet: {
            entries: [
                {$skip: (pageCond.page - 1) * pageCond.limit},
                {$limit: pageCond.limit},
            ],
            meta: [
                {$group: {_id: null, totalItems: {$sum: 1}}},
            ],
        },
    });

    return stages;
};

const generateStageQueryPostBuy = (req) => {
    const {createdByType, status, id, title, sortBy, sortDirection, dateFrom, dateTo} = req.query;
    const pageCond = RequestUtils.extractPaginationCondition(req);

    const stages = [
        {
            $match: {
                "postType": global.POST_TYPE_BUY,
            }
        },
        {
            $lookup: {
                from: "Buys",
                localField: "contentId",
                foreignField: "_id",
                as: "buyInfo"
            }
        },
        {
            $unwind: "$buyInfo"
        }
    ];

    // filter
    const stageFilter = {};

    if (createdByType && createdByType !== '0') {
        stageFilter["buyInfo.createdByType"] = parseInt(createdByType);
    }

    if (status) {
        stageFilter["buyInfo.status"] = parseInt(status);
    }

    if (id) {
        stageFilter["buyInfo._id"] = id;
    }

    if (title) {
        stageFilter['saleInfo.title'] = {
            $regex: title,
            $options: 'i'
        }
    }

    // filter date by query dateFrom and dateTo
    if (dateFrom || dateTo) {
        const dateFilterObj = {};

        if (dateFrom && dateFrom.toString().length === 10) {
            const fromObj = moment(dateFrom, 'YYYY-MM-DD').toDate();
            dateFilterObj['$gte'] = fromObj.getTime()
        }

        if (dateTo && dateTo.toString().length === 10) {
            const toObj = moment(dateTo, 'YYYY-MM-DD').toDate();
            dateFilterObj['$lte'] = toObj.getTime();
        }

        if (Object.keys(dateFilterObj).length !== 0) {
            stageFilter['date'] = dateFilterObj;
        }
    }

    if (Object.keys(stageFilter).length !== 0) {
        stages.push({
            $match: stageFilter
        });
    }

    // stage sort
    let stageSort = {
        $sort: {}
    };

    if (sortBy) {
        stageSort.$sort[sortBy] = sortDirection === 'ASC' ? 1 : -1
    } else {
        stageSort.$sort['date'] = -1; // default sort by date descending
    }

    stages.push(stageSort);

    // pagination
    stages.push({
        $facet: {
            entries: [
                {$skip: (pageCond.page - 1) * pageCond.limit},
                {$limit: pageCond.limit},
            ],
            meta: [
                {$group: {_id: null, totalItems: {$sum: 1}}},
            ],
        },
    });

    return stages;
};

const generateStageQueryPostSale = (req) => {
    const {createdByType, status, id, title, sortBy, sortDirection, dateFrom, dateTo} = req.query;
    const pageCond = RequestUtils.extractPaginationCondition(req);

    const stages = [
        {
            $match: {
                "postType": global.POST_TYPE_SALE,
            }
        },
        {
            $lookup: {
                from: "Sales",
                localField: "contentId",
                foreignField: "_id",
                as: "saleInfo"
            }
        },
        {
            $unwind: "$saleInfo"
        }
    ];

    // filter
    const stageFilter = {};

    if (createdByType && createdByType !== '0') {
        stageFilter["saleInfo.createdByType"] = parseInt(createdByType);
    }

    if (status) {
        stageFilter["saleInfo.status"] = parseInt(status);
    }

    if (id) {
        stageFilter["saleInfo._id"] = id;
    }

    if (title) {
        stageFilter['saleInfo.title'] = {
            $regex: title,
            $options: 'i'
        }
    }

    // filter date by query dateFrom and dateTo
    if (dateFrom || dateTo) {
        const dateFilterObj = {};

        if (dateFrom && dateFrom.toString().length === 10) {
            const fromObj = moment(dateFrom, 'YYYY-MM-DD').toDate();
            dateFilterObj['$gte'] = fromObj.getTime()
        }

        if (dateTo && dateTo.toString().length === 10) {
            const toObj = moment(dateTo, 'YYYY-MM-DD').toDate();
            dateFilterObj['$lte'] = toObj.getTime();
        }

        if (Object.keys(dateFilterObj).length !== 0) {
            stageFilter['date'] = dateFilterObj;
        }
    }

    if (Object.keys(stageFilter).length !== 0) {
        stages.push({
            $match: stageFilter
        });
    }

    // stage sort
    let stageSort = {
        $sort: {}
    };

    if (sortBy) {
        stageSort.$sort[sortBy] = sortDirection === 'ASC' ? 1 : -1
    } else {
        stageSort.$sort['date'] = -1; // default sort by date descending
    }

    stages.push(stageSort);

    // pagination
    stages.push({
        $facet: {
            entries: [
                {$skip: (pageCond.page - 1) * pageCond.limit},
                {$limit: pageCond.limit},
            ],
            meta: [
                {$group: {_id: null, totalItems: {$sum: 1}}},
            ],
        },
    });

    return stages;
};

/**
 * Can be filtered by:
 * ++ status: number
 * ++ formality: number
 * ++ type: number
 * ++ url: string like
 * ++ customUrl: string like
 * ++ from: string date -> should convert to number by getTime()
 * ++ to: string date -> should convert to number by getTime()
 */
const generateStageQueryPost = (req) => {
    const {status, formality, type, url, customUrl, from, to} = req.query;
    const pageCond = RequestUtils.extractPaginationCondition(req);
    const stages = [];

    // filter
    const stageFilter = {};
    if (status && !isNaN(status)) {
        stageFilter['status'] = parseInt(status);
    }

    if (formality && !isNaN(formality)) {
        stageFilter['formality'] = parseInt(formality);
    }

    if (type && !isNaN(type)) {
        stageFilter['type'] = parseInt(type);
    }

    if (url && url.toString().trim() !== '') {
        stageFilter['url'] = {
            $regex: url,
            $options: 'i'
        }
    }

    if (customUrl && customUrl.toString().trim() !== '') {
        stageFilter['customUrl'] = {
            $regex: customUrl,
            $options: 'i'
        }
    }

    if (from && from.length === 10) {
        const fromObj = moment(from, 'YYYY-MM-DD').toDate();
        stageFilter['from'] = {
            $gte: fromObj.getTime()
        }
    }

    if (to && to.length === 10) {
        const toObj = moment(to, 'YYYY-MM-DD').toDate();
        stageFilter['to'] = {
            $lte: toObj.getTime()
        }
    }

    if (Object.keys(stageFilter).length !== 0) {
        stages.push({
            $match: stageFilter
        });
    }

    // pagination
    stages.push({
        $facet: {
            entries: [
                {$skip: (pageCond.page - 1) * pageCond.limit},
                {$limit: pageCond.limit},
            ],
            meta: [
                {$group: {_id: null, totalItems: {$sum: 1}}},
            ],
        },
    });

    return stages;
};

module.exports = {
    generateStageQueryPostNews,
    generateStageQueryPostProject,
    generateStageQueryPostBuy,
    generateStageQueryPostSale,
    generateStageQueryPost,
    convertValueAreaToID,
    convertValueSalePriceToID
};