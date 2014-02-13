jsonFrame
=========

A **[jsonrpc 2.0]** implementation supporting both TCP and HTTP transports. The TCP implementation uses persistent connections and frames each **jsonrpc** request/response object with a length prefix, which specifies the length in bytes of the actual message; hence the name **jsonFrame**.
Both the client and server must agree on a length prefix.

##Why length-prefixing?
TCP is a stream-oriented protocol as opposed to a message-oriented protocol like HTTP. Data is treated as a continuous flow of data and there are no self-delimiting patterns to determine where one message ends and another starts. 
A few solutions exist to approach this problem:
* Process a stream of JSON-encoded strings by reading each character, counting and matching `}`, and eventually parsing using `JSON.parse`. Writing a hand-coded JSON parser is ought to be slower than the native `JSON.parse` method.
* Using a delimiter like `\n` to delimit each JSON-encoded message. However, one must also deal with the delimiter appearing in the message itself. For e.g., `{"method":"sendMessage","params":["Hello, \n jsonrpc"],"jsonrpc":"2.0"}\n`
* In Length-prefixing, each message is sent by prefixing it with the number of bytes contained in the message. This allows an application to receive a message by first reading the length-prefix and then reading as many bytes as the value of length-prefix. It requires the client and server to agree on a length-prefix.

## Package
* JSON-RPC TCP server and client
* Connect middleware for HTTP `application/json-*` POST requests
* jQuery function plugin for HTTP transport
* `jsonTransformer`: A node.js [streams2 Transform] implementation that reads length-prefixed messages built using `jsonFrame.build(message)`


##Usage

```javascript
var methods = {
  add: function () {
    return Array.prototype.slice.call(arguments).reduce(function (sum, i) {
      return sum + i;
    });
  }
}

var jFrame = require('jsonFrame'),
jsonFrame = jFrame({lengthPrefix: 2}),
rpcServer = jsonFrame.server(methods), //TcpJsonRpcServer
rpcClient = jsonFrame.client({host: 'localhost', port: 3000}); //TcpJsonRpcClient

rpcServer.listen(3000);

```

##Simple requests

```javascript
  rpcClient.invoke('add', [21, 21], function (err, res) {
    if(!err) console.log(res); //42
  });
  
  //Parameters for methods taking arrays as arguments
  rpcClient.invoke('findVowels', [['c', 'o', 'n', 's', 'o', 'n', 'a', 'n', 't']], function (err, res) {
    // 
  });
  
  //Error handling with appropriate jsonrpc 2.0 error codes and messages
  rpcClient.invoke('nonExistentMethod', function (err, res) {
    if(err) console.log('Error invoking method', err.code, err.message);
  });
  
  //Method with no parameters
  rpcClient.invoke('status', function (err, res) {
    //
  });
  
  rpcClient.invoke('currentJsonRpcVersion', function (err, res) {
    err || assert.equal(res, '2.0');
  });
  
```

##Batch requests
  A batch invoke operation receives a batch callback. Request objects are added to batch using `add` and `notify`.
  The batch builder received in callback is chainable and has a fluent interface allowing calls of the form:
  ``` javascript
  batch
    .add('someMethod', [4,2])
    .notify('someMethod', [4,2])
    .add('someMethod', [4,2])
  
  ```
  
  Response handler is invoked with as many arguments as the no. of non-notification requests, in the order in which they   were `add`ed to batch. Each of the response object has either a response property or an error property for failed       requests.

```javascript
  
  rpcClient.invoke(function (batch) {
    batch
      .add('method1', [1, 2, 3])
      .add('method2', ['params 2'])
      .notify('notification', ['I won\'t receive a corresponding response object'])
      .add('method3');
    }, function (res1, res2, res3) {
       //three response objects: one for each non-notification request in the order methods were added to batch
       if(!res1.error) console.log(res1.response);
       if(!res2.error) console.log(res2.response);
       res3.error || console.log(res3.response);
  });
```


##Notifications
[JSON-RPC notifications] signify the client's lack of interest in the corresponding response object. As such, they do not receive a response object and an invocation must not pass a callback.

```javascript

  rpcClient.invoke('updateStatus', {from: 'jsonrpc', to: 'jsonrpc2'});
  
  rpcClient.invoke('updateJsonRpcVersion', {from: '1', to: '2.0'});
  
  rpcClient.invoke('updateJsonRpcVersion', [1, '2.0']);

```

##JSON-RPC Connect Middleware
A [Connect Middleware] for handling JSON-RPC requests. The middleware must be configured with an object containing the methods you wish to invoke. The middleware depends on `bodyParser` middleware and must be configured after it.

##Example

```javascript
   var jsonFrame = require('jsonFrame');
//... other middlewares
  app.use(connect.bodyParser()); //or express.bodyParser() using express
  app.use(jsonFrame.jsonrpc(methods));

```

##jsonTransformer
A streams 2 Transform implementation that can be `pipe`d to any `stream.Readable` stream . You'd never have to explicitly use it for serving jsonrpc clients. It can be used for applications that want to process a stream of JSON-encoded strings with each string prefixed with a length, in bytes, of the JSON message.

For each JSON-encoded string, jsonTransformer emits a `data` event with the parsed JSON. Malformed JSON strings that are not valid according to the [JSON grammar] receive a `parse error` event.

#Example

```javascript
  
  var jsonFrame = jsonFrame({lengthPrefix: 2}),
  jsonTransformer = jsonFrame.jsonTransformer();
  someReadable.pipe(jsonTransformer);
  jsonTransformer
    .on('data', function (json) {
      //json is now a JavaScript object/array
    })
    .on('parse error', console.log);
    
  
  var socket = net.connect(options);
  socket.pipe(jsonTransformer);
  jsonTransformer.on('data', handleResponse);
  
  net.createServer(function (socket) {
    socket.pipe(jsonTransformer);
    jsonTransformer
      .on('data', function (json) {
        var response = buildResponse(json),
        lengthPrefixedJson = jsonFrame.build(response);
        socket.write(lengthPrefixedJson);
        
      })
      .on('parse error', notifyError);
  });
  
```

###jQuery JSON-RPC Function Plugin
HTTP counterpart of `TcpJsonRpcClient`; supports the same methods: `invoke`, `notify`


```javascript

  var $jsonrpc = $.jsonrpc({url: 'path/to/jsonrpc/'});
  
  $jsonrpc.invoke('findUser', {userId: 42}, function (err, res) {
    if(err) return console.log('Error finding user');
    console.log('User found: ', res);
  });
  
  $jsonrpc.notify('updateUser', { userId: 42, tags: ['jsonrpc2'] });
  
  
  $jsonrpc.invoke(function (batch) {
    batch
      .notify('updateUser', [42, {tags: 'jsonrpc2'}])
      .notify('updateUser', {userId: 420, npmPackages: 'jsonFrame'})
      .notify('deleteUser', {username: 'dubitableUser'});
    }, function () {
    //all notifications, response handler will be called immediately
    });

```

[jsonrpc 2.0]: www.jsonrpc.org
[streams2 Transform]: http://nodejs.org/api/stream.html#stream_class_stream_transform_1
[JSON-RPC notifications]: http://www.jsonrpc.org/specification#notification
[Connect Middleware]: http://www.senchalabs.org/connect/
[JSON grammar]: http://www.json.org/
