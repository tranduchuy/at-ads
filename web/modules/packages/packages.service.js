const PackagesConstant = require('./packages.constant');

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
      numOfMonths: 1
    },
    [PackagesConstant.packageTypes.VIP1]: {
      name: 'Vip1',
      price: 5e5,
      numOfMonths: 1,
      type: PackagesConstant.packageTypes.VIP1
    },
    [PackagesConstant.packageTypes.CUSTOM]: {
      name: 'Đối tác',
      price: 1e6,
      numOfMonths: 1,
      type: PackagesConstant.packageTypes.CUSTOM
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

module.exports = {
  initPackages
};
