function JsonRpcClient() {
	if(!(this instanceof JsonRpcClient)) {
		return new JsonRpcClient();
	}
	this.batchIds = []; //To sort batch responses in the order in which they were sent
	this.batchBuilder.rpc = this;
}

var fn = JsonRpcClient.prototype;

fn.buildRequest = function (method, params) {
	var id = Math.ceil(Math.random() * 1000), //do not generate a zero
	rpcRequest,
	isBatch = typeof method === 'function',
	batchBuilder = this.batchBuilder,
	batchIds = this.batchIds; //TODO: clean up batchIds

	if(typeof method !== 'string' && !isBatch) throw Error('First argument must be a method name or batch callback');
	if(params != null && typeof params !== 'object' && !Array.isArray(params)) throw Error('Params must be absent, an array of positional parameters or a structured object');

	/**
	 * Batch Request Augment each jsonrpc request in the array by adding id If
	 * response is an array, inspect batchRequests
	 * Invoke the batch callback with a batch builder
	 */
	if (isBatch) {
		// batchBuilder.rpc = this;
		method(batchBuilder);
		rpcRequest = batchBuilder.build();
		//No elements were added to batch
		if(!rpcRequest.length) throw Error('Requests must be added to batch using add or notify');
		batchIds.push.apply(batchIds, batchBuilder._batchIds); //or this.batchIds.concat...
		this.lastBatchId = batchBuilder.batchId();
		batchBuilder.clear();
	} else {
		rpcRequest = {method: method, id: id, jsonrpc: '2.0'};
		//if params is not null or undefined
		if(params != null) rpcRequest.params = params;
	}
	return rpcRequest;
}

/**
Not reusable, should be cleared after every invocation
*/
fn.batchBuilder = {
	_batch: [],
	_batchIds: [],
	add: function (method, params) {
		var request = this.rpc.buildRequest.call(this.rpc, method, params);
		//batchId is the first non-notification request in a batch request
		if(!this.lastBatchId) this.lastBatchId = request.id;
		// if(!this._batch.length) this.lastBatchId = request.id;
		this._batch.push(request);
		this._batchIds.push(request.id);
		return this;
	},
	notify: function(method, params) {
		this._batch.push(this.rpc._buildNotification.call(this.rpc, method, params));
		return this;
	},
	clear: function () {
		this._batch = [];
		this._batchIds = [];
		delete this.lastBatchId;
	},
	build: function () {
		return this._batch;
	},
	batchId: function() {
		return this.lastBatchId;
	}
}

/*******************************************************************************
 * Build the response by deleting jsonrpc-specific properties: id, jsonrpc sort
 * the response by the order in which reuest objects were sent
 * If this isn't a batch response, return rpcResponse unchanged
 */
fn.buildResponse = function (rpcResponse) {
	var isBatch = Array.isArray(rpcResponse),
	batchIds = this.batchIds,
	startAt;

	// shield the client from knowing the existence of jsonrpc-specific
	// properties
	/*function deleteRpc(rpc) {
		delete rpc.id;
		delete rpc.jsonrpc;
		return rpc;
	}*/

	if (isBatch) {
		/**
		 * sort this array by batchIds and splice batchIds starting at
		 * rpcResponse.length
		 */
		rpcResponse.sort(function (res1, res2) {
			var compareTo = batchIds.indexOf(res1.id)
					- batchIds.indexOf(res2.id);
			/*
			 * delete res1.jsonrpc; delete res1.id; delete res2.id; delete
			 * res2.jsonrpc;
			 */
			return compareTo;
		});
		/**
		 * Remove rpcResponse.length batchIds from this.batchIds
		 * Find the first id from rpcResponse in batchIds and remove rpcResponse.length
		 * elements from batchIds
		*/
		startAt = batchIds.indexOf(rpcResponse[0].id);
		//In case id isn't present in batchIds, don't do anything
		if(~startAt) batchIds.splice(startAt, rpcResponse.length);
		
		
		/**
		 * Remove properties id and jsonrpc from each element in rpcResponse
		 */
		//rpcResponse = rpcResponse.map(deleteRpc);

		/**
		 * * A batch response never receives an error object as first argument.
		 * The errors. if any, are located inside * the individual response
		 * objects in the returned array
		 */

	} /*else {
		//rpcResponse = deleteRpc(rpcResponse);
	}*/
	return rpcResponse;
}

//Not used anymore
fn._handleResponse = function (rpcResponse) {
	var response = rpcResponse,
	id = response.id,
	isBatch = Array.isArray(rpcResponse),
	batchIds = this.batchIds,
	fnQueue = this._fnQueue, batchFn = noop;

	if (isBatch) {
		/**
		 * sort this array by batchIds and splice batchIds starting at
		 * rpcResponse.length
		 */
		var ids = Object.keys(fnQueue);
		rpcResponse.forEach(function(res) {
			id = String(res.id);
			if (~ids.indexOf(id)) {
				batchFn = fnQueue[id];
				return false; // if returning false could break from the loop
			}
		});

		rpcResponse.sort(function(res1, res2) {
			var compareTo = batchIds.indexOf(res1.id)
					- batchIds.indexOf(res2.id);
			/*
			 * delete res1.jsonrpc; delete res1.id; delete res2.id; delete
			 * res2.jsonrpc;
			 */
			return compareTo;
		});
		/**
		 * Remove properties id and jsonrpc from each element in rpcResponse
		 */
		rpcResponse = rpcResponse.map(function(res) {
			delete res.jsonrpc;
			delete res.id;
			return res;
		});
		/**
		 * * A batch response never receives an error object as first argument.
		 * The errors. if any, are located inside * the individual response
		 * objects in the returned array
		 */
		batchFn(rpcResponse);

	} else if (typeof fnQueue[id] === 'function') {
		fnQueue[id](response.error || null, response.response);
		// delete fnQueue[id];
	}
	/**
	 * If this is a server push
	 */
	else if (response.push) {
		this.emit('push', response.response);
	} else {
		console.log('Server parse error. Failed to understand the response');
	}
}

/**

*/
fn._buildNotification = function (method, params) {
	// TODO: batch notifications
	if(typeof method !== 'string' && params != null && !Array.isArray(params) && typeof params !== 'object')
		throw 'Method must be a string and params must either be an array or absent';
	var request = {method: method, jsonrpc: '2.0'};
	if(params != null)	request.params = params;
	return request;
}

// onerror: malformed json, invalid response

/** noop -> console.log 'noop invoked', arguments[0] */
function noop() {
	console.log('noop invoked', arguments[0]);
}

module.exports = JsonRpcClient;
