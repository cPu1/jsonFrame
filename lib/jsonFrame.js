var TcpJsonRpcServer = require('./tcp-rpc-server'),
TcpJsonRpcClient = require('./tcp-rpc-client');

jsonFrame = function (options) {

	return {
		server: function (methods) {
			options.object = methods;
			console.log(options)
			return new TcpJsonRpcServer(options);
		},
		client: function (options) {
			return new TcpJsonRpcClient(options);
		}
	}
}

module.exports = jsonFrame;