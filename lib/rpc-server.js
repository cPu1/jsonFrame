function JsonRpcServer(object) {
	this._serverProxy = Object.create(object);
	// this._serverProxy = object;
}

var fn = JsonRpcServer.prototype;
fn.isValidRpc = function (rpc) {
	//or params must be absent, an array or object
	return (rpc.jsonrpc == '2.0' && rpc.method && !isNaN(rpc.id)) || (Array.isArray(rpc) && rpc.length > 0);
};

fn._handleRpc = function(rpcRequest) {
	// console.log('Invoking rpc', rpcRequest, this._serverProxy);
	var serverProxy = this._serverProxy,
	isBatch = Array.isArray(rpcRequest),
	jsonrpc = this.jsonrpc,
	response;
	if(!this.isValidRpc(rpcRequest)) return this._buildError('request');
	/**
	 * Do not include notifications in batch response
	 * */
	if (isBatch) {
		response = this._invokeBatch(rpcRequest);
	} else {
		response = this._invokeRpc(rpcRequest);
	}
	return response;

}

fn._invokeBatch = function(batchRequest) {
	var self = this,
	invokeRpc = this._invokeRpc,
	batchResponse;
	/**
	 * Discard undefined responses(notifications) from batchResponse
	 * Array.prototype.map doesn't filter undefined values. jQuery.map does :-(
	 * Filter the resulting mapped response by discarding undefined values
	 * */
	batchResponse = batchRequest.map(function (req) {
		return invokeRpc.call(self, req);
	}).filter(Boolean);

	return batchResponse;
}

fn._invokeRpc = function invokeRpc(rpc) {
	var object = this._serverProxy,
	method = rpc.method,
	args = rpc.params,
	id = rpc.id,
	result,
	response;
	if (typeof object[method] === 'function') {
		try {
			//if method doesn't return a value(undefined), set response to null
			result = object[method].apply(object, args);
			if(typeof result === 'undefined') result = null;
			response = {
				response : result,
				id : id
			};
		} catch (err) {
			//if err instanceof InvalidParams
			//replace err.stack with e.stack and you'll receive "Cannot call method 'call' of undefined". Strange!
			response = {
				error: {message: err.message, code: 0, data: err.stack},
				id: id
			};
		}
	} else {
		/*error = {
			code : -32601,
			message : 'NoSuchMethodException. Method "' + method
					+ '" not found'
		};*/
		response = this._buildError('method', id);
		
	}
	response.jsonrpc = '2.0';
	/**
	 * undefined responses shouldn't exist in batch response as they're notifications
	 * */
	if (id) return response;// not a notification
}

/*Given an error message, build an error with the corresponding error code
  Renme it to errorFor
*/
fn._buildError = function (errMessage, id) {
	error = this.errors[errMessage];
	return {error: error, id: id || null};
};

fn.errors = {
	'parse': {message: 'Parse error', code: -32700},
	'request': {message: 'Invalid Request', code: -32600},
	'method': {message: 'Method not found', code: -32601},
	'params': {message: 'Invalid params', code: -32602}
};

module.exports = JsonRpcServer;