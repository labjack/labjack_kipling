
var packageLoader = require('../lib/ljswitchboard-package_loader');

exports.tests = {
	'load a library': function(test) {
		test.strictEqual(typeof(global.ljswitchboardData), 'object');

		var keys = Object.keys(global.ljswitchboardData);
		test.deepEqual(keys, []);
		// console.log('Global Scope', global.ljswitchboardData);
		packageLoader.loadPackage('nodeunit');

		keys = Object.keys(global.ljswitchboardData);
		test.deepEqual(keys, ['nodeunit']);
		// console.log('Global Scope', global.ljswitchboardData);
		test.done();
	},
	'change namespace': function(test) {
		var keys = Object.keys(global.ljswitchboardData);
		test.deepEqual(keys, ['nodeunit']);

		// Change the global namespace being used
		packageLoader.setNameSpace('ljswitchboard');

		test.strictEqual(typeof(global.ljswitchboardData), 'undefined');
		test.strictEqual(typeof(global.ljswitchboard), 'object');
		keys = Object.keys(global.ljswitchboard);
		test.deepEqual(keys, ['nodeunit']);
		test.done();
	}
};