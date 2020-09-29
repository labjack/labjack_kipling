var assert = require('chai').assert;
// Just to make sure that the package.json is created properly, navigate to one
// folder above this packages directory.
var ljs_req = require('../../ljswitchboard-require');
var req = ljs_req.require;
var path = require('path');

var rootDirectory = process.cwd().split(path.sep).join('/');
var testDirectory = rootDirectory + '/test';
var expectedDirectories = ['', '.', testDirectory];

var expectedTestObjKeys = ['testVar', 'tFunc', 'req'];

describe('basic_test', function () {

	it('add a directory', function (done) {
		expectedDirectories.push(rootDirectory);
		ljs_req.addDirectory(rootDirectory);

		// Test the directory addition
		var msg = 'ljs-req search directories var is invalid';
		assert.deepEqual(ljs_req.getDirectories(), expectedDirectories, msg);
		done();
	});

	it('add multiple directories', function (done) {
		var directories = ['dir_a','dir_b'];
		for(var i = 0; i < directories.length; i++) {
			directories[i] = testDirectory + '/' + directories[i];
		}
		expectedDirectories.push.apply(expectedDirectories, directories);

		ljs_req.addDirectories(directories);

		// Test the addition of directories
		var msg = 'ljs-req search directories var is invalid';
		assert.deepEqual(ljs_req.getDirectories(), expectedDirectories, msg);
		done();
	});

	it('require "test-module"', function (done) {
		try {
			var test_module = req('test-module');

			var msgs = [
				'Required object has invalid keys',
				'Required object returned an invalid result'
			];
			var foundKeys = Object.keys(test_module);
			assert.deepEqual(foundKeys, expectedTestObjKeys, msgs[0]);
			var expectedTestVar = 'test-module: index.js';
			assert.strictEqual(test_module.testVar, expectedTestVar, msgs[1]);
			assert.isOk(true);
		} catch (err) {
			console.log('ERROR',err);
			assert.isOk(false);
		}
		done();
	});

	it('require "sub_test.js"', function (done) {
		try {
			var test_module = req('sub_test.js');

			var msgs = [
				'Required object has invalid keys',
				'Required object returned an invalid result'
			];
			var foundKeys = Object.keys(test_module);
			assert.deepEqual(foundKeys, expectedTestObjKeys, msgs[0]);
			var expectedTestVar = 'sub_test.js';
			assert.strictEqual(test_module.testVar, expectedTestVar, msgs[1]);
			assert.isOk(true);
		} catch (err) {
			console.log('ERROR',err);
			assert.isOk(false);
		}
		done();
	});

	it('require "test_file.js"', function (done) {
		try {
			var test_module = req('test_file.js');
			var msgs = [
				'Required object has invalid keys',
				'Required object returned an invalid result'
			];
			var foundKeys = Object.keys(test_module);
			assert.deepEqual(foundKeys, expectedTestObjKeys, msgs[0]);
			var expectedTestVar = 'test-file.js';
			assert.strictEqual(test_module.testVar, expectedTestVar, msgs[1]);
			assert.isOk(true);
		} catch (err) {
			console.log('ERROR',err);
			assert.isOk(false);
		}
		done();
	});

	it('require an invalid module', function (done) {
		try {
			var test_module = req('test-modulea');
			console.log('Module some how found', test_module);
			assert.isOk(false);
		} catch (err) {
			var expectedMessage = "Can not find module 'test-modulea'";
			var msgs = [
				'Invalid err.message returned',
				'Invalid err.code returned'
			];

			assert.strictEqual(err.message, expectedMessage, msgs[0]);
			assert.strictEqual(err.code, 'MODULE_NOT_FOUND', msgs[1]);
			assert.isOk(true);
		}
		done();
	});

});
