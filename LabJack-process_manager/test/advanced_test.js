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

var platform = process.platform;
var exeName = {
	'win32': 'node.exe',
	'darwin': 'node'
}[platform];

var arch = process.arch;
var rootDir = process.cwd();

var pathOfVersionFolders = path.join(rootDir, binariesDir, platform, arch);

if (!fs.existsSync(pathOfVersionFolders)) {
	exports.tests = {
	};
	return;
}

var nodejsVersions = fs.readdirSync(pathOfVersionFolders);
var nodeExecutables = {};
nodejsVersions.forEach(function(version) {
	var fullPath = path.join(pathOfVersionFolders, version, exeName);
	var exists = fs.existsSync(fullPath);
	if(exists) {
		nodeExecutables[version] = {
			'version': version,
			'path': fullPath,
			'exists': exists,
		};
	}
});

function createTestRunner(options) {
	this.options = options;

	this.testName = 'test ' + options.master + '<->' + options.slave;

	this.runTest = function(test) {

	};
}

var versionsToExclude = [
	'0_10_33',
	'0_11_13',
	'0_11_14',
	'4_2_2',
];

function getTestVersions() {
	var versionsToTest = [];
	var availableVersions = Object.keys(nodeExecutables);
	availableVersions.forEach(function(version) {
		if(versionsToExclude.indexOf(version) < 0) {
			versionsToTest.push(version);
		}
	});
	return versionsToTest;
}

var testVersions = getTestVersions();
var testRunners = [];
testVersions.forEach(function(testVersion) {
	testVersions.forEach(function(secondaryTestVersion) {
		testRunners.push(new createTestRunner({
			'master': testVersion,
			'slave': secondaryTestVersion
		}));
	});
});




console.log('Versions...', testRunners);
var binaryPaths = [];
exports.tests = {
	'check for binaries': function(test) {
		var platform = process.platform;
		var exeName = {
			'win32': 'node.exe',
			'darwin': 'node'
		}[platform];
		var arch = process.arch;
		var rootDir = process.cwd();


		nodejsVersions.forEach(function(version) {
			var fullPath = path.join(rootDir, binariesDir, platform, arch, version, exeName);
			binaryPaths.push({'path':fullPath,'exists': false});
		});

		async.map(
			binaryPaths,
			function(binaryPath, callback) {
				fs.exists(binaryPath.path, function(res) {
					binaryPath.exists = res;
					callback(null, binaryPath);
				});
			},
			function(err, results) {
				if(err) {
					test.ok(false);
					console.log('Binaries results', err, results);
				} else {
					results.forEach(function(result) {
						test.ok(result.exists);
					});
				}
				test.done();
			});
	},
	'test 0_11_13<->0_10_33': function(test) {
		// console.log('Paths...', binaryPaths);
		test.done();
	}
};
exports.setImports = function(imports) {
	process_manager = imports.process_manager;
	utils = imports.utils;
	getExecution = utils.getExecution;
};
