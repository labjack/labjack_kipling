var assert = require('chai').assert;

var path = require('path');

const PackageLoader = require('../lib/ljswitchboard-package_loader').PackageLoader;
const package_loader = new PackageLoader();

var testPackages = require('./test_packages').testPackages;
var testUtils = require('./test_utils');
var cleanExtractionPath = testUtils.cleanExtractionPath;
var testSinglePackageUpdate = testUtils.testSinglePackageUpdate;

var localFolder = 'test_extraction_folder';

var fs = require('fs');
var os = require('os');
var tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'labjack-test-'));
var directory = path.join(tmpDir, localFolder);

describe('basic', function() {
	it('load a library', async function () {
		await package_loader.loadPackage({
			'name': 'mocha',
			'loadMethod': 'require',
			'location': 'mocha'
		});

		assert.equal(true, package_loader.hasPackage('mocha'));
	});
	it('add a managed package', async function () {
		// add the staticFiles package to the packageManager
		package_loader.reset();
		await package_loader.loadPackage(testPackages.staticFiles);

		return new Promise(async (resolve) => {
			package_loader.on(package_loader.eventList.OVERWRITING_MANAGED_PACKAGE, function(info) {
				assert.strictEqual(info.name, 'ljswitchboard-static_files');
				assert.deepEqual(package_loader.getManagedPackages(), [
					'ljswitchboard-static_files',
					'ljswitchboard-core'
				]);
				resolve();
			});

			assert.deepEqual(package_loader.getDependencyList(), ['ljswitchboard-package_loader']);
			assert.deepEqual(package_loader.getManagedPackages(), ['ljswitchboard-static_files']);
			assert.deepEqual(Object.keys(package_loader.managedPackages), [testPackages.staticFiles.name]);

			await package_loader.loadPackage(testPackages.core);
			await package_loader.loadPackage(testPackages.staticFiles);
		});
	});
	it('run the package manager', function (done) {
		cleanExtractionPath(directory);
		package_loader.setExtractionPath(directory);
		package_loader.runPackageManager()
		.then(function(res) {
			// Make sure that both packages were included
			assert.strictEqual(Object.keys(res).length, 2);

			// Run a second time to make sure no packages get managed
			package_loader.runPackageManager()
			.then(function(res) {
				// Make sure that both packages were included
				assert.strictEqual(Object.keys(res).length, 0);

				done();
			});
		});
	});
	it('test basic inclusion of packages', function (done) {
		// Check global name space

		assert.deepEqual(Object.keys(package_loader._loadedPackages), [
			'mocha',
			'ljswitchboard-static_files',
			'ljswitchboard-core'
		]);

		// Check dependencies
		assert.deepEqual(package_loader.getDependencyList(), [
			'ljswitchboard-package_loader',
			'ljswitchboard-static_files',
			'ljswitchboard-core'
		]);

		// Check managed packages
		assert.deepEqual(package_loader.getManagedPackages(), [
			'ljswitchboard-static_files',
			'ljswitchboard-core'
		]);
		done();
	});
	it('test deleting packages', function (done) {
		// This shouldn't change anything
		package_loader.deleteManagedPackage('aa');
		assert.deepEqual(package_loader.getManagedPackages(), [
			'ljswitchboard-static_files',
			'ljswitchboard-core'
		]);

		// This is normally a REALLY bad idea.... but for testing putposes.
		package_loader.deleteManagedPackage('ljswitchboard-static_files');

		// Check global name space
		assert.deepEqual(Object.keys(package_loader._loadedPackages), [
			'mocha',
			'ljswitchboard-core'
		]);

		// Check dependencies
		assert.deepEqual(package_loader.getDependencyList(), [
			'ljswitchboard-package_loader',
			'ljswitchboard-core'
		]);

		// Check managed packages
		assert.deepEqual(package_loader.getManagedPackages(), [
			'ljswitchboard-core'
		]);

		// This method is just as frowned upon.
		package_loader.deleteAllManagedPackages();
		// Check global name space
		assert.deepEqual(Object.keys(package_loader._loadedPackages), [
			'mocha',
		]);

		// Check dependencies
		assert.deepEqual(package_loader.getDependencyList(), [
			'ljswitchboard-package_loader',
		]);

		// Check managed packages
		assert.deepEqual(package_loader.getManagedPackages(), [
		]);
		done();
	});
	it('run the package manager several times', async function () {
		cleanExtractionPath(directory);
		await package_loader.loadPackage(testPackages.core);
		await package_loader.loadPackage(testPackages.staticFiles);

		const res1 = await package_loader.runPackageManager();
		// Make sure that both packages were included
		var resKeys = Object.keys(res1);
		assert.strictEqual(resKeys.length, 2);

		var numSuccess = 0;
		resKeys.forEach(function(resKey) {
			if(res[resKey].overallResult) {
				numSuccess += 1;
			}
		});
		assert.strictEqual(numSuccess, 1);

		// Check global name space
		assert.deepEqual(Object.keys(package_loader._loadedPackages), [
			'mocha',
			'ljswitchboard-static_files'
		]);

		// Run a second time to make sure no packages get managed
		const res2 = await package_loader.runPackageManager();
		// Make sure that both packages were included
		assert.strictEqual(Object.keys(res2).length, 1);

		// Check global name space
		assert.deepEqual(Object.keys(package_loader._loadedPackages), [
			'mocha',
			'ljswitchboard-static_files',
			'ljswitchboard-core'
		]);
		// Run a second time to make sure no packages get managed
		const res = await package_loader.runPackageManager();
		// Make sure that both packages were included
		assert.strictEqual(Object.keys(res).length, 0);

		// Check global name space
		assert.deepEqual(Object.keys(package_loader._loadedPackages), [
			'mocha',
			'ljswitchboard-static_files',
			'ljswitchboard-core'
		]);
	});
});
