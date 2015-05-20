		
var fs = require('fs');
var path = require('path');
var q = require('q');
var unzip = require('unzip');
var semver = require('../semver_min');
var fse = require('fs-extra');

function parseWithUnzip(packageInfo) {
	var defered = q.defer();

	// Create a readable stream for the .zip file
	var readZipStream = fs.createReadStream(packageInfo.location);

	// Create an unzip parsing stream that will get piped the readable 
	// stream data.
	var parseZipStream = unzip.Parse();

	var foundPackageJsonFile = false;
	var packageString = '';

	// Define a function that saves the streamed package.json data to a 
	// string.
	var savePackageData = function(chunk) {
		packageString += chunk.toString('ascii');
	};

	// Define a function to be called when the .json file is finished being
	// parsed.
	var finishedReadingPackageData = function() {
		var data = JSON.parse(packageString);
		if(data.version) {
			if(semver.valid(data.version)) {
				packageInfo.version = data.version;
			}
		}
		if(data.ljswitchboardDependencies) {
			packageInfo.dependencies = data.ljswitchboardDependencies;
		}
		defered.resolve(packageInfo);
	};

	// Attach a variety of event listeners to the parse stream
	parseZipStream.on('entry', function(entry) {
		// console.log('Zip Info', entry.path);
		if(entry.path === 'package.json') {
			foundPackageJsonFile = true;
			entry.on('data', savePackageData);
			entry.on('end', finishedReadingPackageData);
		} else {
			entry.autodrain();
		}
	});
	parseZipStream.on('error', function(err) {
		console.error('  - .zip parsing finished with error', err, packageInfo.location);
		if(!foundPackageJsonFile) {
			defered.resolve(packageInfo);
		}
	});
	parseZipStream.on('close', function() {
		if(!foundPackageJsonFile) {
			defered.resolve(packageInfo);
		}
	});

	// Pipe the readStream into the parseStream
	readZipStream.pipe(parseZipStream);
	return defered.promise;
}

exports.parseWithUnzip = parseWithUnzip;