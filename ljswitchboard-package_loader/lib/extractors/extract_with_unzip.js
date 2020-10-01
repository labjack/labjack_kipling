
var fs = require('fs');
var path = require('path');
var q = require('q');
var unzip = require('unzipper');

var extractWithUnzip = function(bundle, self, EVENTS) {
	var defered = q.defer();
	var destinationPath = bundle.currentPackage.location;
	var upgradeZipFilePath = bundle.chosenUpgrade.location;

	var archiveStream = fs.createReadStream(upgradeZipFilePath);
	var unzipExtractor = unzip.Extract({ path: destinationPath });

	// Emit events indicating that a zip file extraction has started
	self.emit(EVENTS.STARTING_EXTRACTION, bundle);
	self.emit(EVENTS.STARTING_ZIP_FILE_EXTRACTION, bundle);

	unzipExtractor.on('error', function(err) {
		console.error('  - Error performZipFileUpgrade', err, bundle.name);
		var msg = 'Error performing a .zip file upgrade.  Verify ' +
		'the user-permissions for the directory and .zip file: ' +
		upgradeZipFilePath + ', and ' + destinationPath;
		bundle.resultMessages.push({
			'step': 'performDirectoryUpgrade-copyRecursive',
			'message': msg,
			'isError': true,
			'error': JSON.stringify(err)
		});
		bundle.overallResult = false;
		bundle.isError = true;

		// Emit events indicating that a zip file extraction has finished
		// w/ an error
		self.emit(EVENTS.FINISHED_EXTRACTION_ERROR, bundle);
		self.emit(EVENTS.FINISHED_ZIP_FILE_EXTRACTION_ERROR, bundle);
		defered.resolve(bundle);
	});

	unzipExtractor.on('close', function() {
		// Emit events indicating that a zip file extraction has finished
		self.emit(EVENTS.FINISHED_EXTRACTION, bundle);
		self.emit(EVENTS.FINISHED_ZIP_FILE_EXTRACTION, bundle);
		defered.resolve(bundle);
	});
	archiveStream.pipe(unzipExtractor);
	return defered.promise;
};

exports.extractWithUnzip = extractWithUnzip;
