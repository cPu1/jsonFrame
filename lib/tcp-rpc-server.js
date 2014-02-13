var jFrame = require('./json-frame'),
net = require('net'),
JsonRpcServer = require('./rpc-server'),
fn;

function TcpJsonRpcServer(options) {
	if(!(this instanceof TcpJsonRpcServer)) {
		return new TcpJsonRpcServer(options);
	}
	JsonRpcServer.call(this, options.object);
	this.init(options);
	
}

fn = TcpJsonRpcServer.prototype = Object.create(JsonRpcServer.prototype);

fn.init = function(options) {
	var jsonFrame = jFrame({lengthPrefix: options.lengthPrefix || 2}),
	jsonTransformer = jsonFrame.jsonTransformer();
	self = this;

	this._rpcServer = net.createServer(function (socket) {
		socket.pipe(jsonTransformer);
		
		socket.on('error', function (err) {
			//push?
		});
		
		jsonTransformer.on('data', function (json) {
			//Received a parsed json
			var response = self._handleRpc(json);
			/**
			 *if response is batch or simple and not notification
			 *0 should not be a valid value for id 
			 * */
			if(Array.isArray(response) && response.length || response.id) {
				socket.write(jsonFrame.build(response));
			}
		}).on('parse error', function (err) {
			var parseError = self._buildError('parse');
			socket.write(jsonFrame.build(parseError));
		});
	});
}

fn.listen = function (port) {
	this._rpcServer.listen(port);
}

module.exports = TcpJsonRpcServer;
