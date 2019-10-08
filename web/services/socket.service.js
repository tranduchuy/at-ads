const NAMESPACES = {
	WEB_HOMEPAGE: 'WEB_HOMEPAGE'
};

let io = null;

const sendDashboardLog = (data) => {
	if (!io) {
		return;
	}

	console.log('SEND DATA HOMEPAGE', JSON.stringify(data));
	io.of(NAMESPACES.WEB_HOMEPAGE).emit('message', JSON.stringify(data));
};

const onConnection = () => {
	io.of('/' + NAMESPACES.WEB_HOMEPAGE)
		.on('connection', function (socket) {
			console.log('New connection', socket.nsp.name);
		});


	io.on('connection', function (socket) {
		console.log('New connection', socket.nsp.name);
	})
};

const init = (inputIO) => {
	io = inputIO;
	onConnection();
};

module.exports = {
	init,
	sendDashboardLog
};
