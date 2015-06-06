
var fse = require('fs-extra');
var fsex = require('fs.extra');
var path = require('path');
var q = require('q');


exports.emptyDirectoryOrDie = function(directoryName) {
	// Empty the output directory
	var numDeleteAttempts = 0;
	var isDeleteDirectorySuccessful = true;
	var deleteDirectory = function() {
		var repeatExecution = false;
		try {
			console.log('Cleaning temp project files directory', numDeleteAttempts);
			// fse.emptyDirSync(directoryName);
			fsex.rmrfSync(directoryName);
		} catch(err) {

			if(err.code === 'ENOTEMPTY') {
				repeatExecution = true;
				numDeleteAttempts += 1;
			} else if(err.code === 'EPERM') {
				repeatExecution = true;
				numDeleteAttempts += 1;
			} else if(err.code === 'ENOENT') {
				isDeleteDirectorySuccessful = true;
			} else {
				console.log('Bad Error code...', err);
				isDeleteDirectorySuccessful = false;
			}
		}

		if(numDeleteAttempts > 500) {
			repeatExecution = false;
		}
		return repeatExecution;
	};

	while(deleteDirectory()) {
		console.log('Tried to delete');
	}

	if(!isDeleteDirectorySuccessful) {
		console.log('Failed to empty the temp project files directory');
		process.exit(1);
	}

	try {
		fse.emptyDirSync(directoryName);
	} catch(err) {
		console.log('Failed to ensure directory is empty', err);
		process.exit(1);
	}
}