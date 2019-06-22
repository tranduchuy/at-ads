const extractPaginationCondition = (req) => {
  const cond = {
    page: 1,
    limit: global.PAGE_SIZE
  };

  if (req.query.page && !isNaN(req.query.page) && parseInt(req.query.page, 0) > 1) {
    cond.page = parseInt(req.query.page);
  }

  if (req.query.limit && !isNaN(req.query.limit) && parseInt(req.query.limit, 0) > 0) {
    cond.limit = parseInt(req.query.limit, 0);
  }

  return cond;
};

const extractUserAgent = (userAgent) => {
  // TODO: extract user agent
  console.log(userAgent);
  return {};
};

module.exports = {
  extractPaginationCondition,
  extractUserAgent
};