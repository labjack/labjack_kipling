var fs = require('fs');
var path = require('path');

// Require 3rd party libaries
var rmdir = require('rimraf');

var createDataManager = function(baseDirectory, folderName, curVersion) {
	var basePath = path.join(baseDirectory, folderName);
	var versionFileName = 'info.json';
	var versionFilePath = path.join(basePath, versionFileName);

	this.getPath = function() {
		return basePath;
	};

	var initializeDirectory = function() {
		return new Promise((resolve, reject) => {
			fs.exists(basePath, function(exists) {
				if(exists) {
					rmdir(basePath, function(err) {
						if(err) {
							reject('failed to remove dir:' + basePath);
						} else {
							fs.mkdir(basePath, function(err) {
								if(err) {
									reject('failed to make dir:' + basePath);
								} else {
									resolve();
								}
							});
						}
					});
				} else {
					fs.mkdir(basePath, function(err) {
						if(err) {
							reject('failed to make dir:' + basePath);
						} else {
							resolve();
						}
					});
				}
			});
		});
	};
	const initializeVersionFile = function() {
		return new Promise((resolve, reject) => {
			var versionData = {'version': curVersion};
			var dataString = JSON.stringify(versionData);
			fs.writeFile(
				versionFilePath,
				dataString,
				{'encoding': 'ascii'},
				function(res) {
					resolve(true);
				}
			);
		});
	};

	this.init = function(forceRefresh) {
		return new Promise((resolve, reject) => {
			var isValid = true;
			try {

				// 1. Check to see if the basePath exists, if it doesn't, create it.
				if(!fs.existsSync(basePath)) {
					isValid = false;
				}

				// 2. Check to see if the basePath/info.json exists
				if(!fs.existsSync(versionFilePath)) {
					isValid = false;
				}

				// 3. Read the file and make sure that it is the appropriate version.
				if(isValid) {
					var fileData = fs.readFileSync(versionFilePath);
					var parsedFile = JSON.parse(fileData);
					if(parsedFile.version) {
						if(parsedFile.version !== curVersion) {
							isValid = false;
						}
					} else {
						isValid = false;
					}
				}
			} catch (err) {
				isValid = false;
			}

			if(!isValid || forceRefresh) {
				var getOnErr = function(msg) {
					return function(err) {
						console.log('Error!', err, msg);
					};
				};
				initializeDirectory()
				.then(initializeVersionFile, getOnErr('error initializing dir'))
				.then(resolve, reject);
			} else {
				resolve(false);
			}
		});

	};
};

exports.create = createDataManager;
