'use strict';

const fs = require('fs');
const path = require('path');
const rmdir = require('rimraf');

class PersistentDataManager {

	constructor(baseDirectory, folderName, curVersion) {
		this.curVersion = curVersion;
		this.basePath = path.join(baseDirectory, folderName);
		this.versionFileName = 'info.json';
		this.versionFilePath = path.join(this.basePath, this.versionFileName);
	}

	getPath() {
		return this.basePath;
	}

	initializeDirectory() {
		const exists = fs.existsSync(this.basePath);
		let createMainDir = false;
		if (exists) {
			try {
				rmdir.sync(this.basePath);
				createMainDir = true;
			} catch (err) {
				try {
					const files = fs.readdirSync(this.basePath);
					for (const file of files) {
						console.log('Removing: ', path.join(this.basePath, file));
						rmdir.sync(path.join(this.basePath, file));
					}
				} catch (e) {
					console.error(e);
					throw 'failed to remove dir: ' + this.basePath + ' ' + e.message;
				}
			}
		} else {
			createMainDir = true;
		}

		if (createMainDir) {
			try {
				fs.mkdirSync(this.basePath);
			} catch (e) {
				throw 'failed to make dir: ' + this.basePath + ' ' + e.message;
			}
		}
	}

	initializeVersionFile() {
		const versionData = {'version': this.curVersion};
		const dataString = JSON.stringify(versionData);
		fs.writeFileSync(
			this.versionFilePath,
			dataString,
			{'encoding': 'ascii'}
		);
	}

	async init(forceRefresh) {
		let isValid = true;
		try {
			// 1. Check to see if the basePath exists, if it doesn't, create it.
			if (!fs.existsSync(this.basePath)) {
				isValid = false;
			}

			// 2. Check to see if the basePath/info.json exists
			if (!fs.existsSync(this.versionFilePath)) {
				isValid = false;
			}

			// 3. Read the file and make sure that it is the appropriate version.
			if (isValid) {
				const fileData = fs.readFileSync(this.versionFilePath).toString();
				const parsedFile = JSON.parse(fileData);
				if (parsedFile.version) {
					if (parsedFile.version !== this.curVersion) {
						isValid = false;
					}
				} else {
					isValid = false;
				}
			}
		} catch (err) {
			isValid = false;
		}

		if (!isValid || forceRefresh) {
			await this.initializeDirectory();
			await this.initializeVersionFile();

			return true;
		} else {
			return false;
		}
	}
}

exports.PersistentDataManager = PersistentDataManager;
