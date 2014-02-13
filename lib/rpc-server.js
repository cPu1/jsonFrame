function JsonRpcServer(object) {
	this._serverProxy = Object.create(object);
	// this._serverProxy = object;
}

var fn = JsonRpcServer.prototype;
fn.isValidRpc = function (rpc) {
	//or params must be absent, an array or object
	var params = rpc.params;
	//isNaN shouldn't be used for rpc.id
	return (rpc.jsonrpc === '2.0' && typeof rpc.method ==='string' && (!rpc.hasOwnProperty('id') || typeof rpc.id === 'number')
		&& (!params || Array.isArray(params) || typeof params === 'object'))
		|| (Array.isArray(rpc) && rpc.length > 0); //last check is redundant for simple requests
};

fn._handleRpc = function (rpcRequest) {
	var serverProxy = this._serverProxy,
	isBatch = Array.isArray(rpcRequest),
	response;
	
	//not needed anymore
	//if(!this.isValidRpc(rpcRequest)) return this._buildError('request');
	/**
	 * Do not include notifications in batch response
	 * */
	 if (isBatch) {
		response = this._invokeBatch(rpcRequest);
	} else {
		try {
			response = this._invokeRpc(rpcRequest);
		} catch (err) {
			response = this._buildError(err.message);
		}
	}
	return response;
	
	// return isBatch? this._invokeBatch(rpcRequest) : this._invokeRpc(rpcRequest);
}

fn._invokeBatch = function(batchRequest) {
	var self = this,
	invokeRpc = this._invokeRpc.bind(this),
	batchResponse;
	/**
	 * Discard undefined responses(notifications) from batchResponse
	 * Array.prototype.map doesn't filter undefined values. jQuery.map does :-(
	 * Filter the resulting mapped response by discarding undefined values
	 * */
	/*batchResponse = batchRequest.map(function (req) {
		return invokeRpc.call(self, req);
	}).filter(Boolean);*/
	//high-order functions to the rescue
	try {
		batchResponse = batchRequest
				.map(invokeRpc)
				.filter(Boolean);
	} catch(err) {
		batchResponse = this._buildError(err.message);
	}
	
	return batchResponse;
}

//TODO: Bind this function to always execute in a set context, or in CoffeeScript-lingo, make this a fat arrow function?
/**
* 
*/
fn._invokeRpc = function invokeRpc(rpc) {
	var object = this._serverProxy,
	method = rpc.method,
	args = rpc.params,
	//invocation = Array.isArray(args)? 'apply' : 'call', //the method invocation pattern to use
	id = rpc.id,
	result,
	response;
	
	if(!this.isValidRpc(rpc)) throw Error('request');
	
	if (typeof object[method] === 'function') {
		try {
			/*if method doesn't return a value(undefined), set response to null
			or if(typeof args === 'object') args = [args]
			result = object[method].apply(object, args);
			result = object[method][invocation](object, args);*/
			if(!Array.isArray(args)) args = [args]; //for Function.prototype.apply
			result = object[method].apply(object, args);
			
			if(typeof result === 'undefined') result = null;
			response = {
				response : result,
				id : id
			};
		} catch (err) {
			//if err instanceof InvalidParams
			//replace err.stack with e.stack and you'll receive "Cannot call method 'call' of undefined". Strange!
			response = this._buildError('params', id);
			response.error.data = err.stack;
			/*response = {
				error: {message: err.message, code: 0, data: err.stack},
				id: id
			};*/
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
