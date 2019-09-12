const bcrypt = require('bcrypt');
const UserModel = require('../../modules/user/user.model');
const UserConstant = require('../../modules/user/user.constant');
const StatusConstant = require('../../constants/status');

async function findOrCreateMaster() {
	try {
		let master = await UserModel.findOne({email: 'master@gmail.com'});
		if (!master) {
			const passwordPlanText = '!master2019';
			const salt = bcrypt.genSaltSync(UserConstant.saltLength);
			master = new UserModel({
				name: 'master',
				email: 'master@gmail.com',
				passwordHash: bcrypt.hashSync(passwordPlanText, salt),
				passwordSalt: salt,
				role: UserConstant.role.master,
				status: StatusConstant.Status.ACTIVE
			});

			await master.save();
			console.log(`Create Master Successfully. Email ${master.email}`);
		}
	} catch (e) {
		console.error('Cannot create master', e);
	}
}

async function findOrCreateAdmin() {
	try {
		let admin = await UserModel.findOne({email: 'admin@gmail.com'});
		if (!admin) {
			const passwordPlanText = '!master2019';
			const salt = bcrypt.genSaltSync(UserConstant.saltLength);
			admin = new UserModel({
				name: 'Admin',
				email: 'admin@gmail.com',
				passwordHash: bcrypt.hashSync(passwordPlanText, salt),
				passwordSalt: salt,
				role: UserConstant.role.admin,
				status: StatusConstant.Status.ACTIVE
			});

			await admin.save();
			console.log(`Create Admin Successfully. Email ${admin.email}`);
		}
	} catch (e) {
		console.error('Cannot create master', e);
	}
}


module.exports = async () => {
	// user: MASTER
	await findOrCreateMaster();

	// user: ADMIN
	await findOrCreateAdmin();
};
