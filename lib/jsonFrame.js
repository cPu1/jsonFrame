var TcpJsonRpcServer = require('./tcp-rpc-server'),
TcpJsonRpcClient = require('./tcp-rpc-client'),
jFrame = require('./json-frame'),
jsonrpc = require('./jsonrpc');

jsonFrame = function (options) {
	var jsonFrameBuilder = jFrame(options);
	return {
		server: function (methods) {
			options.object = methods;
			return new TcpJsonRpcServer(options);
		},
		client: function (options) {
			return new TcpJsonRpcClient(options);
		},
		jsonTransformer: function () {
			return jsonFrameBuilder.jsonTransformer();
		},
		build: function () {
			return jsonFrameBuilder.build.apply(jsonFrameBuilder, arguments);
		}
	}
}
jsonFrame.jsonrpc = jsonrpc;

module.exports = jsonFrame;