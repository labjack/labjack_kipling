
var packageLoader = require('../lib/ljswitchboard-package_loader');

exports.tests = {
	'load a library': function(test) {
		test.strictEqual(typeof(global.ljswitchboard), 'object');

		var keys = Object.keys(global.ljswitchboard);
		test.deepEqual(keys, []);
		// console.log('Global Scope', global.ljswitchboardData);
		packageLoader.loadPackage({
			'name': 'nodeunit',
			'loadMethod': 'require',
			'location': 'nodeunit'
		});

		keys = Object.keys(global.ljswitchboard);
		test.deepEqual(keys, ['nodeunit']);
		// console.log('Global Scope', global.ljswitchboardData);
		test.done();
	},
	'change namespace': function(test) {
		var keys = Object.keys(global.ljswitchboard);
		test.deepEqual(keys, ['nodeunit']);

		// Change the global namespace being used
		packageLoader.setNameSpace('ljswitchboardData');

		test.strictEqual(typeof(global.ljswitchboard), 'undefined');
		test.strictEqual(typeof(global.ljswitchboardData), 'object');
		keys = Object.keys(global.ljswitchboardData);
		test.deepEqual(keys, ['nodeunit']);
		test.done();
	},
	'check version number parser': function(test) {
		var versions = [
			['0.0.1','0.0'],
			['0.0', '0.0.1']
		];

		var results = [
			true,
			false
		];

		versions.forEach(function(version, i) {
			console.log('res', packageLoader.satisfiesVersionCheck(
					version[0],
					version[1]))
			test.strictEqual(
				packageLoader.satisfiesVersionCheck(
					version[0],
					version[1]),
				results[i]);
		});
		test.done();
	}
};