var JsonRpcServer = require('./rpc-server');

module.exports = function jsonrpc (methods) {
	var jsonRpcServer = new JsonRpcServer(methods);
	return function(req, res, next) {
		var rpcResponse,
		rpcRequest = req.body,
		contentType = req.headers['content-type'];

		if(req.method === 'POST' && ~contentType.indexOf('application/json')) {
			rpcResponse = jsonRpcServer._handleRpc(rpcRequest);
			if(Array.isArray(rpcResponse) && rpcResponse.length || rpcResponse.id) {
				rpcResponse = JSON.stringify(rpcResponse);
				res.writeHead(200, {
					'Content-Length': String(Buffer.byteLength(rpcResponse)),
					'Content-Type': contentType
				});
				res.end(rpcResponse);
			}
			else {
				res.end();
			}
		}
		else next();
	};
};
