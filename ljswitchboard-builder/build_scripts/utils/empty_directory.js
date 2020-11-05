const fse = require('fs-extra');
const fsex = require('fs.extra');

exports.emptyDirectoryOrDie = function(directoryName) {
	// Empty the output directory
	let numDeleteAttempts = 0;
	let isDeleteDirectorySuccessful = true;
	const deleteDirectory = function() {
		let repeatExecution = false;
		try {
			console.log(`Cleaning ${directoryName}. Attempt: ${numDeleteAttempts}`);
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
};
