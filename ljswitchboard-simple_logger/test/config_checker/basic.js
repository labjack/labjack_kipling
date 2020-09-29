var assert = require('chai').assert;

var path = require('path');

var config_checker;
var cwd = process.cwd();
var logger_config_files_dir = path.join(cwd, 'test', 'logger_config_files');

var testFiles = [{
	'name': 'Invalid .json file',
	'file_name': 'invalid_json_file.json',
	'pass': false,
	'partial_err_str': 'Invalid .json file',
}, {
	'name': 'Missing Core Keys',
	'file_name': 'missing_core_keys.json',
	'pass': false,
	'partial_err_str': 'Missing keys: ',
}, {
	'name': 'Undefined data groups',
	'file_name': 'undefined_data_groups.json',
	'pass': false,
	'partial_err_str': 'Missing defined data_groups',
}, {
	'name': 'Undefined view',
	'file_name': 'undefined_views.json',
	'pass': false,
	'partial_err_str': 'Missing defined views',
}, {
	'name': 'Passing test/basic_config',
	'file_name': 'basic_config.json',
	'pass': true,
}];

describe('basic_test', function() {
	it('Require config_checker', function (done) {
		try {
			config_checker = require('../../lib/config_checker');
			assert.isOk(true);
		} catch(err) {
			assert.isOk(false, 'error loading config_checker');
		}
		done();
	});

	function createConfigCheckerTest (options) {
		it(options.name, function (done) {
			var filePath = path.join(logger_config_files_dir, options.file_name);
			config_checker.verifyConfigFile(filePath)
			.then(function(results) {
				if(options.pass) {
					assert.isOk(true, 'Test is supposed to pass');
				} else {
					assert.isOk(false, 'Test should have failed: ' + options.name);
				}
				done();
			}, function(error) {

				assert.equals(error.isValid, false, 'isValid should be false: ' + options.name);
				if(options.pass) {
					assert.isOk(false, 'Test is supposed to fail: ' + options.name);
				} else {
					assert.isOk(true, 'Test is supposed to fail');
					var searchRes = error.message.indexOf(options.partial_err_str);
					if(searchRes >= 0) {
						assert.isOk(true, 'Partial error string was found');
					} else {
						assert.isOk(false, 'Partial error string was not found: ' + JSON.stringify(error.message, null, 2));
					}
				}
				done();
			});
		});
	}
	testFiles.forEach(createConfigCheckerTest);
});
