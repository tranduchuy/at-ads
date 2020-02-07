const PackagesConstant = require('./packages.constant');
const log4js = require('log4js');
const logger = log4js.getLogger('Services');
const HttpStatus = require('http-status-codes');

const initPackages = async (packagesModel) => {
  const packageTypes = [
    PackagesConstant.packageTypes.FREE,
    PackagesConstant.packageTypes.VIP1,
    PackagesConstant.packageTypes.CUSTOM
  ];

  const config = {
    [PackagesConstant.packageTypes.FREE]: {
      name: 'Miễn phí',
      price: 0,
      type: PackagesConstant.packageTypes.FREE,
      numOfMonths: 1,
      interests: [
        'Chặn click ảo theo tần suất.',
        'Chặn click ảo theo nhà mạng (3G/4G).',
        'Chặn click ảo tự động ít hơn 5 giây.',
        'Tùy chỉnh danh sách IP cần chặn.',
        'Báo cáo quản trị IP click.',
      ]
    },
    [PackagesConstant.packageTypes.VIP1]: {
      name: 'Vip1',
      price: 1e6,
      numOfMonths: 1,
      type: PackagesConstant.packageTypes.VIP1,
      interests: [
        'Chặn click ảo theo tần suất.',
        'Chặn click ảo theo nhà mạng (3G/4G).',
        'Chặn click ảo tự động ít hơn 5 giây.',
        'Tùy chỉnh danh sách IP cần chặn.',
        'Báo cáo quản trị IP click.',
        'Chặn click ảo theo hành vi người dùng.',
        'Chặn click ảo theo nhắm chọn vị trí.',
        'Hỗ trợ gửi bồi hoàn phí từ Google.',
      ]
    },
    [PackagesConstant.packageTypes.CUSTOM]: {
      name: 'Đối tác',
      price: 1e6,
      numOfMonths: 1,
      type: PackagesConstant.packageTypes.CUSTOM,
      interests: [
        'Chặn click ảo theo tần suất.',
        'Chặn click ảo theo nhà mạng (3G/4G).',
        'Chặn click ảo tự động ít hơn 5 giây.',
        'Tùy chỉnh danh sách IP cần chặn.',
        'Báo cáo quản trị IP click.',
        'Chặn click ảo theo hành vi người dùng.',
        'Chặn click ảo theo nhắm chọn vị trí.',
        'Hỗ trợ gửi bồi hoàn phí từ Google.',
        'Có 1 nhân viên hỗ trợ riêng.'
      ]
    }
  };

  await Promise.all(
    packageTypes.map(async type => {
      const pack = await packagesModel.findOne({ type }).lean();
      if (!pack) {
        const newPack = new packagesModel(config[type]);
        await newPack.save();
      }
    })
  );
};

const filterDataUpdatePackage = async (req, package) => {
  try{
    logger.info('packagesServices::filterDataUpdatePackage::is called');
    const price = req.body.price;
    const name = req.body.name;
    const interests = req.body.interests;
    const isContactPrice = req.body.isContactPrice;
    const discountMonths = req.body.discountMonths;
    
    if(price || price == 0)
    {
      if(package.type == PackagesConstant.packageTypes.FREE)
      {
        logger.info('packagesServices::filterDataUpdatePackage::package type is free');
        return { 
          status: HttpStatus.BAD_REQUEST,
          info: { 
            messages: ['Không thể điều chỉnh giá cho gói này.']
          }
        };
      }

      package.price = price;
    }

    if(name){
      package.name = name;
    }

    if(interests){
      package.interests = interests;
    }

    if(isContactPrice == true || isContactPrice == false)
    {
      package.isContactPrice = isContactPrice;
    }

    if(discountMonths)
    {
      package.discountMonths = discountMonths;
    }

    logger.info('packagesServices::filterDataUpdatePackage::success');
    await package.save();
    return { 
      status: HttpStatus.OK,
      info: { 
        messages: ['Thành công'],
        data: {
          package
        }
      }
    };
  }catch(e){
    logger.error('packagesServices::filterDataUpdatePackage::error', e);
    throw new Error(e);
  }
};

module.exports = {
  initPackages,
  filterDataUpdatePackage
};
