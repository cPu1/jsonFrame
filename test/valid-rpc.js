var jFrame = require('../lib/jsonFrame'),
jsonFrame = jFrame({lengthPrefix: 2}),
jsonTransformer = jsonFrame.jsonTransformer(),
net = require('net'),
options = {host: 'localhost', port: 3000},
rpcServer = jsonFrame.server(options),
should = require('../../should'),
assert = require('assert'),

socket = net.connect(options);
rpcServer.listen(3000);
socket.pipe(jsonTransformer);
socket.write(jsonFrame.build({what: 'nothing'}))

/*jsonTransformer.on('data', function (json) {
  console.log(json)
})*/

describe('async JsonRpc validation', function () {
  var malformedRequests = [ {
    asdf: 'what'
  }, {
    params: []
  }, {
    params: [1]
  }, {
    id: 420
  }
    ];
    
  
  it.skip('should keep receiving errors', function (done) {
    var noOfRequests = 0;
    jsonTransformer.on('data', function (json) {
      console.log(json)
      json.should.have.properties('error', 'id');
      json.error.should.have.properties('code', 'message');
      json.error.code.should.equal(-32600);
      json.error.message.should.equal('Invalid Request');
      assert.equal(json.id, null);
      console.log(noOfRequests)
      if(++noOfRequests >= malformedRequests.length) done();
    });
  });
  
  malformedRequests.forEach(function (req) {
      socket.write(jsonFrame.build(req));
  });
});

describe('JsonRpcServer validation', function () {
  var isValid = rpcServer.isValidRpc;
  it('should report all requests as valid', function () {
    assert(isValid({method: 'blah', jsonrpc: '2.0'}));
    assert(isValid({method: 'blah', params: [], jsonrpc: '2.0'}));
    assert(isValid({method: 'blah', params: [1, 2], jsonrpc: '2.0'}));
    assert(isValid({method: 'blah', params: {name: 'test'}, jsonrpc: '2.0'}));
    assert(isValid({method: 'blah', params: [], id: 420, jsonrpc: '2.0'}));
    
    //batch
    assert(isValid([{method: 'some'}, {method: 'asdf'}, {method: 'what', id: 44}]));
    
  });
  
  it('should report all requests as invalid', function () {
    assert(!isValid({params: [], id: 420, jsonrpc: '2.0'}));
    assert(!isValid({id: 420, jsonrpc: '2.0'}));
    assert(!isValid({params: 22, id: 420, jsonrpc: '2.0'}));
    assert(!isValid({params: 'what', id: 420, jsonrpc: '2.0'}));
    assert(!isValid({method: 'blah', params: [], id: '', jsonrpc: '2.0'}));
    assert(!isValid({method: 'blah', params: [], id: '123', jsonrpc: '2.0'}));
    assert(!isValid({params: 'what'}));
    assert(!isValid({}));
    assert(!isValid({method: ''}));
    assert(!isValid({method: 420}));
    assert(!isValid({method: [420]}));
    
    assert(isValid([{method: 'some'}, {method: ''}, {method: 'what', id: 44}]));
  });
});

