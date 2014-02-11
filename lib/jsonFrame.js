var TcpJsonRpcServer = require('./tcp-rpc-server'),
TcpJsonRpcClient = require('./tcp-rpc-client'),
jsonrpc = require('./jsonrpc');

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
jsonFrame.jsonrpc = jsonrpc;

module.exports = jsonFrame;