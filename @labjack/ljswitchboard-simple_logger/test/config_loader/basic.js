
var path = require('path');


var config_loader;
var cwd = process.cwd();
var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');


exports.tests = {
	'Require config_loader': function(test) {
		try {
			config_loader = require('../../lib/config_loader');
			test.ok(true);
		} catch(err) {
			test.ok(false, 'error loading config_loader');
		}
		test.done();
	},
	'load a non .json file': function(test) {
		var bad_file_path = path.join(cwd, 'fake_file.js');
		config_loader.loadConfigFile(bad_file_path)
		.then(function(result) {
			test.ok(false, 'Should have failed to load the file.');
			test.done();
		}, function(error) {
			test.ok(true);
			test.equal(error.isError, true);
			test.done();
		});
	},
	'load missing file': function(test) {
		var bad_file_path = path.join(cwd, 'fake_file.json');
		config_loader.loadConfigFile(bad_file_path)
		.then(function(result) {
			test.ok(false, 'Should have failed to load the file.');
			test.done();
		}, function(error) {
			test.ok(true);
			test.equal(error.isError, true);
			test.done();
		});
	},
	'load a file that exists': function(test) {
		var good_file_path = path.join(logger_config_files_dir, 'basic_config.json');
		config_loader.loadConfigFile(good_file_path)
		.then(function(result) {
			test.ok(true);
			test.done();
		}, function(error) {
			test.ok(false, 'Should loaded the file');
			test.done();
		});
	},
};