// Require npm modules
var q = require('q');
var fs = require('fs');
var path = require('path');
var async = require('async');

// master_process object
var mp;
var mpEventEmitter;

var DEBUG_TEST = false;
var print = function(argA, argB) {
    if(DEBUG_TEST) {
        var msg = 'AT:';
        if(argA) {
            if(argB) {
                console.log(msg, argA, argB);
            } else {
                console.log(msg, argA);
            }
        } else {
            console.log(msg);
        }
    }
};

var binariesDir = 'node_binaries';
var nodejsVersions = ['0_10_33', '0_11_13', '0_11_14'];
exports.tests = {
	'check for binaries': function(test) {
		var platform = process.platform;
		var exeName = {
			'win32': 'node.exe'
		}[platform];
		var arch = process.arch;
		var rootDir = process.cwd();

		var binaryPaths = [];
		nodejsVersions.forEach(function(version) {
			var fullPath = path.join(rootDir, binariesDir, platform, arch, version, exeName);
			binaryPaths.push({'path':fullPath,'exists': false});
		});

		console.log('Binaries', binaryPaths);
		binaryPaths.forEach(function(binaryPath) {
			var doesExist = fs.existsSync(binaryPath.path);
			console.log("Res:", doesExist);
		});
		async.map(
			binaryPaths,
			function(binaryPath, callback) {
				console.log("HERE", binaryPath.path);
				fs.exists(binaryPath.path, function(res) {
					console.log("HERE2", res);
					binaryPath.exists = res;
					callback(null, binaryPath);
				});
			},
			function(err, results) {
				if(err) {
					test.ok(false);
					console.log('Binaries results', err, results);
				} else {
					console.log('Binaries results', results);
				}
				test.done();
			});
	},
	'test 0_11_13<->0_10_33': function(test) {
		test.done();
	}
};
exports.setImports = function(imports) {
	process_manager = imports.process_manager;
	utils = imports.utils;
	getExecution = utils.getExecution;
};
