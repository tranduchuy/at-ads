function removeQueryStringFromPath(pathWithQuery) {
    if (pathWithQuery.indexOf('?') === -1) {
        return pathWithQuery;
    }

    return pathWithQuery.split('?')[0];
}

function getQueryStringFromPath(pathWithQuery) {
    if (pathWithQuery.indexOf('?') === -1) {
        return '';
    }

    return pathWithQuery.split('?')[1];
}

/**
 * @description Determind a value is null or undefined
 * @param value
 * @return {boolean}
 */
const isUndefinedOrNull = (value) => {
    return value === undefined || value === null;
};

/**
 * @description Check if has type number
 * @param value
 */
const _isNaN = (value) => {
    return isNaN(parseFloat(value));
};

module.exports = {
    removeQueryStringFromPath,
    getQueryStringFromPath,
    isUndefinedOrNull,
    isNaN: _isNaN
};