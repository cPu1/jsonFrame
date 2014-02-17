//requires rpc-client.js. Use browserify
(function($) {
  var defaults = {
      contentType: 'application/json',
      dataType: 'json',
      type: 'POST'
  },
  jsonRpcClient = new JsonRpcClient(),
  invokeRpc = function (request, fn, immediate) {
    fn = fn || $.noop;
    defaults.data = JSON.stringify(request);
    var $deferred = $.ajax(defaults);
    if(immediate) return setTimeout(fn, 1);
    $deferred.done(function (res) {
      fn(res.error || null, res.response || null);
    }).fail(fn);
  };
  $.jsonrpc = function (options) {
    if(!options.url) throw Error('URL is required in options configuration');
    $.extend(defaults, options);
    return {
      invoke: function (method, params, fn) {
        var isBatch = typeof method === 'function',
        rpcRequest;

        if(isBatch && typeof params !== 'function') throw Error('Batch request must have a second argument as a callback for result');
        //for batch requests and method with no arguments, params must be a function
        if(typeof params === 'function') {
          fn = params;
          params = null;
        }
        else if(!Array.isArray(params) || typeof fn !== 'function') {
          throw 'Either params must be an array or fn must be a function';
        }
        //wht if the first object is a notification, find first non-notification request
        //let them be hoisted? no
        rpcRequest = jsonRpcClient.buildRequest(method, params);
        /**
         * If all requests in batch are notifications, invoke the callback
         * */
        var allNotifications = isBatch && jsonRpcClient.lastBatchId == null;
        invokeRpc(rpcRequest, fn, allNotifications);
      },
      notify: function (method, params) {
        var notification = {method: method};
        if(params != null && !Array.isArray(params)) throw 'params must either be absent or an array';
        invokeRpc(notification);
      }
    };
};