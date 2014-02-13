var JsonRpcClient = require('./rpc-client'),
net = require('net'),
jFrame = require('./json-frame');

function TcpJsonRpcClient(options) {
	if(!(this instanceof TcpJsonRpcClient)) {
		return new TcpJsonRpcClient(options);
	}
	JsonRpcClient.call(this);
	this._fnQueue = {};
	this.init(options);
	
	
}
var fn = TcpJsonRpcClient.prototype = Object.create(JsonRpcClient.prototype, {constructor: {value: TcpJsonRpcClient}});

fn.init = function (options) {
	var lengthPrefix = options? options.lengthPrefix || 2 : 2,
	jsonFrame = this.jsonFrame = jFrame({lengthPrefix: lengthPrefix}),
	jsonTransformer = jsonFrame.jsonTransformer();
	this.socket = net.connect(options);
	this.socket.pipe(jsonTransformer);
	jsonTransformer.on('data', this._handleResponse.bind(this))
		.on('parse error', console.log);
}

/**
* invoke(method, params, fn)
* invoke(method, fn) //no params
* invoke(method, objectArgs, fn)
* invoke(method, arrayArgs, fn)
* invoke(batch, batchFn)
*/
fn.invoke = function (method, params, fn) {
	var isBatch = typeof method === 'function',
	request,
	id;

	if(isBatch && typeof params !== 'function') throw Error('Batch request must have a second argument as a callback for result');
	//for batch requests and method with no arguments, params must be a function
	if(typeof params === 'function') {
		fn = params;
		params = null;
	}
	else if(!Array.isArray(params) && typeof params !== 'object' && typeof fn !== 'function') {
		throw 'Either params must be an array or fn must be a function';
	}
	//wht if the first object is a notification, find first non-notification request
	//let them be hoisted? no
	request = this.buildRequest(method, params);
	id = isBatch? this.lastBatchId : request.id;
	
	if(id == null) {
		//request is a notification, invoke the callback with no arguments
		process.nextTick(fn);
	}
	else {
		this._fnQueue[id] = fn;
	}
	this.socket.write(this.jsonFrame.build(request));
	
};

/**
 * Assumption: When a batch request was sent, fn was assigned to the first request object's
 * id in batch. Since we're sorting response objects by batchIds, the first response object's
 * id should be present in fnQueue. Otherwise the entire batch response will be discarded
 *  
 *  Must be an arrow function
 * */
fn._handleResponse = function (rpcResponse) {
	var response = this.buildResponse(rpcResponse),
	fnQueue = this._fnQueue,
	isBatch = Array.isArray(response),
	id = isBatch? response[0].id : response.id,
	fn = fnQueue[id];
	
	delete fnQueue[id];

	//fn = fn || noop;
	/**
	 * Allow the batch callback to receive each response object as a separate argument
	 * Do not include an argument for notifications. Remember the order!
	 * rpcClient.invoke(batchWith4Requests, function (globalErr, res1, res2, res3, res4) {
	 *   if(!res1.err)
	 * });
	 * */
	if(isBatch) {
		return fn.apply(null, response);
	}
	fn.call(null, response.error || null, response.response || null);
	
};

fn.notify = function (method, params) {
	var notification = {method: method};
	if(params != null && !Array.isArray(params)) throw 'params must either be absent or an array';
	this.socket.write(jsonFrame.build(notification));
}

module.exports = TcpJsonRpcClient;