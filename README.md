jsonFrame
=========

A **[jsonrpc 2.0]** implementation supporting both TCP and HTTP transports. The TCP implementation frames each jsonrpc request/response object with a length prefix, which specifies the length in bytes of the actual message; hence the name **jsonFrame**.
Both the client and server must agree on a length prefix.

## Package
* JSON-RPC TCP server and client
* Connect middleware for HTTP `application/json-rpc` POST requests
* TODO: jQuery function plugin for HTTP transport
* jsonTransformer: A node.js [streams2 Transform] implementation that reads length-prefixed messages built using jsonFrame.build


##Usage

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
  });
  
```

##Batch requests
  A batch invoke operation receives a batch callback. Request objects are added to batch using `add` and `notify`.
  The batch builder received in callback is chainable and has a fluent interface allowing calls of the form:
  ```
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
      .notify('notification', ['I won\'t receive a response'])
      .add('method3');
    }, function (res1, res2, res3) {
       //three response objects: one for each non-notification request in the order methods were added to batch
       if(!res1.error) console.log(res1.response);
       if(!res2.error) console.log(res2.response);
  });
```

##jsonTransformer
A streams 2 Transform implementation that can be `pipe`d to any `stream.Readable` stream . You'd never have to explicitly use it for serving jsonrpc clients. It can be used for applications that want to process a stream of JSON-encoded objects with each object prefixed with a length, in bytes, of the JSON object.

For each JSON-encoded string, jsonTransformer emits a `data` event with the parsed JSON. Malformed JSON strings that are not valid according to the JSON grammar receive a `parse error` event.

#Example

```javascript
  
  var jsonTransformer = jsonFrame({lengthPrefix: 2}).jsonTransformer();
  someReadable.pipe(jsonTransformer);
  jsonTransformer
    .on('data', function (json) {
      //json is now a JavaScript object/array
    })
    .on('parse error', console.log);
  
```

[jsonrpc 2.0]: www.jsonrpc.org
[streams2 Transform]: http://nodejs.org/api/stream.html#stream_class_stream_transform_1
