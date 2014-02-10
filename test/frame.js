var jFrame = require('../lib/json-frame'),
assert = require('assert');
describe('jsonFrame', function () {
	var jsonFrame;
	it('should throw an error when frameSize/lengthPrefix is not one of 1, 2, 4', function () {
		[0, 3, 5, 6, 2000].forEach(function (length) {
			assert.throws(function () {
				jsonFrame = jFrame({lengthPrefix: length});
			});
		});
	});

	it('should throw an error if message > lengthPrefix bytes', function () {
		jsonFrame = jFrame({lengthPrefix: 2});
		jsonFrame.build();
	});
});