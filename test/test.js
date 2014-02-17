var TcpJsonRpcClient = require('../lib/tcp-rpc-client'),
TcpJsonRpcServer = require('../lib/tcp-rpc-server'),
object = require('./methods'),
should = require('../../should'),
assert = require('assert'),
jFrame = require('../lib/jsonFrame'),
jsonFrame = jFrame({lengthPrefix: 2}),
rpcServer = jsonFrame.server(object),
rpcClient = jsonFrame.client({host: 'localhost', port: 3000})
/*rpcServer = new TcpJsonRpcServer({object: object}),
rpcClient = new TcpJsonRpcClient({host: 'localhost', port: 3000});*/


rpcServer.listen(3000);

console.log(rpcClient.constructor)


describe('RpcClient', function () {
	it('should receive a response', function (done) {
		rpcClient.invoke('what', [1], function (err, res) {
			console.log('cllbck', arguments[0], arguments[1])
			res.should.equal('nothing');
			res.should.not.have.properties('jsonrpc', 'id');
			assert.equal(err, null);
			done();
		});
	});
	
	it('should receive 4', function (done) {
		rpcClient.invoke('add', [2, 2], function (err, res) {
			res.should.equal(4);
			assert.equal(err, null);
			done();
		});
	});
	
	it('should handle zero-args', function(done) {
		rpcClient.invoke('what', done);
	});
	it('should receive a no method error with and without arguments', function(done) {
		invokeError = function (err, res) {
			assert.equal(res, undefined);
			err.should.have.properties('code', 'message');
			err.code.should.equal(-32601);
			done();
		};
		rpcClient.invoke('nonExistingMethod', ['test'], invokeError);
		
		//rpcClient.invoke('nonExistingMethod', invokeError);
	});
	//obsolete method
	it.skip('should handle batch', function (done) {
		var batchFn = function(res1, res2, res3, res4) {
			console.log('btch cllbck invoked with', res1, res2, res3, res4)
			//assert.equal(null, err);
			res1.error.should.have.properties('code', 'message');
			res1.error.message.should.equal('Method not found');
			res2.response.should.equal(44);
			res3.response.should.be.an.instanceOf(Object);
			res3.response.should.have.properties('a', 'b');
			var vowels = res4.response;
			['e', 'o', 'u'].forEach(function (vowel, i) {
				assert.equal(vowel, vowels[i]);
			});
			done();
		};
		rpcClient.
			invoke([{method: 'nonExistingMethod', params: ['whattheheck']},
			        {method: 'add', params: [22,22]}, 
		        {method: 'addProperties', params: ['a', 'b']},
		        {method: 'notify', notification: true},
		        {method: 'findVowels', params: [['d', 'e', 'o', 'ddee', 'u']]}
		        ]
				, batchFn);
	});

	function batchFn(batch) {
		batch
		.add('what')
		.add('nonExistingMethod', ['not'])
		.notify('nonExistingMethod', ['not'])
		.add('findVowels', [['d', 'e', 'o', 'ddee', 'u']])
		.add('add', [21, 21]);

	}
	function result (done, res1, res2, res3, res4) {
			console.log('fin', arguments)
			res1.response.should.equal('nothing');
			res2.error.message.should.equal('Method not found');
			res2.should.not.have.property('response');
			res3.should.have.property('response');
			res3.response.should.be.an.instanceOf(Array);
			res4.response.should.equal(42);
			//done(); cnt hve it here, JS uses lexicl scoping s opposed to dynmic scoping
			done();
	}

	it('should build a batch using callbck', function (done) {
		rpcClient.invoke(batchFn, result.bind(null, done));
	});

	it('should repeat btch', function (done) {
		rpcClient.invoke(batchFn, result.bind(null, done));
	});
});

describe('TcpJsonRpcClient', function () {
	it('should receive no arguments for batch notifications', function(done) {
		rpcClient.invoke(function (batch) {
			batch
			.notify('this').notify('is', ['a']).notify('batch', ['batch']).notify('batch').notify('notification');
		}, function() {
			assert.equal(0, arguments.length);
			arguments.should.be.empty;
			done();
		});
	});

	it('should receive all error arguments', function (done) {
		rpcClient.invoke(function(batch) {
			batch.add('nonExistingMethod').add('asdfasdf', [22]).add('whateasdf', ['no']);
		}, function () {
			Array.prototype.slice.call(arguments).forEach(function (response) {
				var error = response.error;
				response.should.have.property('error');
				error.should.have.properties('message', 'code');
				error.message.should.equal('Method not found');
				error.code.should.equal(-32601);
			});
			done();
		})
	});

	it('should handle missing parameters', function (done) {
		rpcClient.invoke('what', function(err, response) {
			assert.equal(err, null);
			response.should.equal('nothing');
			done();
		});
	});

	it('should handle invoke a method which throws an error, and receive an error message', function (done) {
		rpcClient.invoke('findVowels', ['c', 'o', 'n', 's', 'o', 'n', 'a', 'n', 't'], function(err, response) {
			err.should.be.an.instanceOf(Object);
			err.should.have.properties('message', 'code', 'data');
			assert.equal(response, null);
			return done();
		});
	});

	it('should be ok with array arguments', function (done) {
		rpcClient.invoke('findVowels', [['c', 'o', 'n', 's', 'o', 'n', 'a', 'n', 't']], function(err, response) {
			assert.equal(err, null);
			response.should.be.an.instanceOf(Array);
			response.length.should.be.ok;
			response.length.should.equal(3);
			response.should.containDeep(['o', 'o', 'a']);
			done();
		});
	});

	it('should invoke callback for batch requests with at least one non-notification request', function (done) {
		rpcClient.invoke(function (batch) {
			batch.notify('mocha', ['handles', 'async', 'tests']).notify('yes', ['it', 'does']).add('I', ['am','real']);
		}, function(res1) {
			res1.error.message.should.equal('Method not found'), done();
		});
	});

	it('should throw an error if no requests/notifications are added to batch', function () {
		assert.throws(function () {
			console.log('batchIds', rpcClient.batchIds);
			rpcClient.invoke(function (batch) {
				//I will not add anything to batch
			}, function () {
				assert.fail('I shouldn\'t be invoked');
			});

			//or
			rpcClient.invoke(function (batch) {}, function () {}).should.throw();
		});
	});

	it('should work for object arguments', function (done) {
		rpcClient.invoke('create', {name: 'jsonrpc', age: 2}, function (err, user) {
			assert(!err);
			user.should.have.properties('age', 'username');
			user.username.should.equal('JSONRPC');
			user.age.should.equal(4);
			done();
		});
	});

	it.skip('should receive rpc response objects in the order in which they were sent', function (done) {

	});

});
