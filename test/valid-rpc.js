var jFrame = require('../lib/jsonFrame'),
jsonFrame = jFrame({lengthPrefix: 2}),
jsonTransformer = jsonFrame.jsonTransformer(),
net = require('net'),
options = {host: 'localhost', port: 3000},
rpcServer = jsonFrame.server(options),
should = require('should'),
assert = require('assert'),


socket = net.connect(options);
socket.pipe(jsonTransformer);

describe('JsonRpc validation', function () {
  var malformedRequests = [ {
    asdf: 'what'
  }, {
    params: []
  },
  {
    params: [1]
  }, {
    id: 420
  }
    ];
    
  
  it('should keep receiving errors', function (done) {
    var noOfRequests = 0;
    jsonTransformer.on('data', function (json) {
      json.should.have.properties('error', 'id');
      json.error.should.have.properties('code', 'message');
      json.error.code.should.equal(-32600);
      json.error.message.should.equal('Invalid Request');
      assert.equal(json.id, null);
      if(++noOfRequests >= malformedRequests.length) done();
    });
  });
  
  malformedRequests.forEach(function (req) {
      socket.write(jsonFrame.build(req));
  });
});
