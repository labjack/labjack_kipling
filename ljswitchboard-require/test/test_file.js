// console.log('   - ljswitchboard-require.js test-file, test-file.js');

var localRequire = require('../lib/ljswitchboard-require');

exports.testVar = 'test-file.js';
exports.tFunc = function() {
	var isFound = false;
	try {
		require('mocha');
		isFound = true;
	} catch (err) {

	}
	return isFound;
};
exports.req = localRequire;
