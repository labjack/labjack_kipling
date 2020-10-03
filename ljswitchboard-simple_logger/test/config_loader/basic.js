var assert = require('chai').assert;

var path = require('path');

var config_loader;
var cwd = process.cwd();

var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');

describe('basic', function() {
	it('Require config_loader', function (done) {
		try {
			config_loader = require('../../lib/config_loader');
			assert.isOk(true);
		} catch(err) {
			assert.isOk(false, 'error loading config_loader');
		}
		done();
	});
	it('load a non .json file', function (done) {
		var bad_file_path = path.join(cwd, 'fake_file.js');
		config_loader.loadConfigFile(bad_file_path)
		.then(function(result) {
			assert.isOk(false, 'Should have failed to load the file.');
			done();
		}, function(error) {
			assert.isOk(true);
			assert.equal(error.isError, true);
			done();
		});
	});
	it('load missing file', function (done) {
		var bad_file_path = path.join(cwd, 'fake_file.json');
		config_loader.loadConfigFile(bad_file_path)
		.then(function(result) {
			assert.isOk(false, 'Should have failed to load the file.');
			done();
		}, function(error) {
			assert.isOk(true);
			assert.equal(error.isError, true);
			done();
		});
	});
	it('load a file that exists', function (done) {
		var good_file_path = path.join(logger_config_files_dir, 'basic_config.json');
		config_loader.loadConfigFile(good_file_path)
		.then(function(result) {
			assert.isOk(true);
			done();
		}, function(error) {
			assert.isOk(false, 'Should loaded the file');
			done();
		});
	});
});
