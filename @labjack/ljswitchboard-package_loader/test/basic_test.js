
var path = require('path');
var package_loader = require('../lib/ljswitchboard-package_loader');
var testPackages = require('./test_packages').testPackages;
var testUtils = require('./test_utils');
var cleanExtractionPath = testUtils.cleanExtractionPath;
var testSinglePackageUpdate = testUtils.testSinglePackageUpdate;

var gns = 'ljswitchboardData';
var localFolder = 'test_extraction_folder';
var directory = path.join(process.cwd(), localFolder);
exports.tests = {
	'load a library': function(test) {
		test.strictEqual(typeof(global.ljswitchboard), 'object');

		var keys = Object.keys(global.ljswitchboard);
		test.deepEqual(keys, []);
		// console.log('Global Scope', global.ljswitchboardData);
		package_loader.loadPackage({
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
		package_loader.setNameSpace(gns);

		test.strictEqual(typeof(global.ljswitchboard), 'undefined');
		test.strictEqual(typeof(global.ljswitchboardData), 'object');
		keys = Object.keys(global.ljswitchboardData);
		test.deepEqual(keys, ['nodeunit']);
		test.done();
	},
	'add a managed package': function(test) {
		// add the staticFiles package to the packageManager
		package_loader.loadPackage(testPackages.staticFiles);
		package_loader.on(package_loader.eventList.OVERWRITING_MANAGED_PACKAGE, function(info) {
			test.strictEqual(info.name, '@labjack/ljswitchboard-static_files');
			test.deepEqual(package_loader.getManagedPackages(), [
				'@labjack/ljswitchboard-static_files',
				'@labjack/ljswitchboard-core'
				]);
			test.done();
		});

		test.deepEqual(package_loader.getDependencyList(), ['@labjack/ljswitchboard-package_loader']);
		test.deepEqual(package_loader.getManagedPackages(), ['@labjack/ljswitchboard-static_files']);
		test.deepEqual(Object.keys(global[gns]), ['nodeunit']);

		package_loader.loadPackage(testPackages.core);
		package_loader.loadPackage(testPackages.staticFiles);
	},
	'run the package manager': function(test) {

		
		cleanExtractionPath(test, directory);
		package_loader.setExtractionPath(directory);
		package_loader.runPackageManager()
		.then(function(res) {
			// Make sure that both packages were included
			test.strictEqual(Object.keys(res).length, 2);

			// Run a second time to make sure no packages get managed
			package_loader.runPackageManager()
			.then(function(res) {
				// Make sure that both packages were included
				test.strictEqual(Object.keys(res).length, 0);
				
				test.done();
			});
		});
	},
	'test basic inclusion of packages': function(test) {
		// Check global name space
		test.deepEqual(Object.keys(global[gns]), [
			'nodeunit',
			'@labjack/ljswitchboard-static_files',
			'@labjack/ljswitchboard-core'
		]);

		// Check dependencies
		test.deepEqual(package_loader.getDependencyList(), [
			'@labjack/ljswitchboard-package_loader',
			'@labjack/ljswitchboard-static_files',
			'@labjack/ljswitchboard-core'
		]);

		// Check managed packages
		test.deepEqual(package_loader.getManagedPackages(), [
			'@labjack/ljswitchboard-static_files',
			'@labjack/ljswitchboard-core'
		]);
		test.done();
	},
	'test deleting packages': function(test) {
		// This shouldn't change anything
		package_loader.deleteManagedPackage('aa');
		test.deepEqual(package_loader.getManagedPackages(), [
			'@labjack/ljswitchboard-static_files',
			'@labjack/ljswitchboard-core'
		]);

		// This is normally a REALLY bad idea.... but for testing putposes.
		package_loader.deleteManagedPackage('@labjack/ljswitchboard-static_files');
	
		// Check global name space
		test.deepEqual(Object.keys(global[gns]), [
			'nodeunit',
			'@labjack/ljswitchboard-core'
		]);

		// Check dependencies
		test.deepEqual(package_loader.getDependencyList(), [
			'@labjack/ljswitchboard-package_loader',
			'@labjack/ljswitchboard-core'
		]);

		// Check managed packages
		test.deepEqual(package_loader.getManagedPackages(), [
			'@labjack/ljswitchboard-core'
		]);

		// This method is just as frowned upon.
		package_loader.deleteAllManagedPackages();
		// Check global name space
		test.deepEqual(Object.keys(global[gns]), [
			'nodeunit',
		]);

		// Check dependencies
		test.deepEqual(package_loader.getDependencyList(), [
			'@labjack/ljswitchboard-package_loader',
		]);

		// Check managed packages
		test.deepEqual(package_loader.getManagedPackages(), [
		]);
		test.done();
	},
	'run the package manager several times': function(test) {
		cleanExtractionPath(test, directory);
		package_loader.loadPackage(testPackages.core);
		package_loader.loadPackage(testPackages.staticFiles);
		package_loader.runPackageManager()
		.then(function(res) {
			// Make sure that both packages were included
			var resKeys = Object.keys(res);
			test.strictEqual(resKeys.length, 2);

			var numSuccess = 0;
			resKeys.forEach(function(resKey) {
				if(res[resKey].overallResult) {
					numSuccess += 1;
				}
			});
			test.strictEqual(numSuccess, 1);

			// Check global name space
			test.deepEqual(Object.keys(global[gns]), [
				'nodeunit',
				'@labjack/ljswitchboard-static_files'
			]);

			// Run a second time to make sure no packages get managed
			package_loader.runPackageManager()
			.then(function(res) {
				// Make sure that both packages were included
				test.strictEqual(Object.keys(res).length, 1);
				
				// Check global name space
				test.deepEqual(Object.keys(global[gns]), [
					'nodeunit',
					'@labjack/ljswitchboard-static_files',
					'@labjack/ljswitchboard-core'
				]);
				// Run a second time to make sure no packages get managed
				package_loader.runPackageManager()
				.then(function(res) {
					// Make sure that both packages were included
					test.strictEqual(Object.keys(res).length, 0);
					
					// Check global name space
					test.deepEqual(Object.keys(global[gns]), [
						'nodeunit',
						'@labjack/ljswitchboard-static_files',
						'@labjack/ljswitchboard-core'
					]);
					test.done();
				});
			});
		});
	} 
};