// Require npm modules
var assert = require('chai').assert;
var fs = require('fs');
var path = require('path');
var async = require('async');

var binariesDir = 'node_binaries';

var platform = process.platform;
var exeName = {
	'win32': 'node.exe',
	'darwin': 'node',
	'linux': 'node'
}[platform];

var arch = process.arch;
var rootDir = process.cwd();

var pathOfVersionFolders = path.join(rootDir, binariesDir, platform, arch);

if (!fs.existsSync(pathOfVersionFolders)) { // For linux perform darwin tests instead
	platform = 'darwin';
	pathOfVersionFolders = path.join(rootDir, binariesDir, platform, arch);
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

describe('advanced_test', function() {

	it('check for binaries', function(done) {
		var platform = process.platform;
		var exeName = {
			'win32': 'node.exe',
			'darwin': 'node',
			'linux': 'node'
		}[platform];
		var arch = process.arch;
		if (platform === 'linux') {
			platform = 'darwin';
		}

		var rootDir = process.cwd();

		nodejsVersions.forEach(function(version) {
			var fullPath = path.join(rootDir, binariesDir, platform, arch, version, exeName);
			binaryPaths.push({'path': fullPath, 'exists': false});
		});

		async.map(
			binaryPaths,
			function(binaryPath, callback) {
				fs.exists(binaryPath.path, function(res) {
					if (!res) {
						console.log(binaryPath.path);
					}
					binaryPath.exists = res;
					callback(null, binaryPath);
				});
			},
			function(err, results) {
				if(err) {
					assert.isOk(false);
					console.log('Binaries results', err, results);
				} else {
					results.forEach(function(result) {
						assert.isOk(result.exists);
					});
				}
				done();
			}
		);
	});
	it('test 0_11_13<->0_10_33', function(done) {
		// console.log('Paths...', binaryPaths);
		done();
	});
});
