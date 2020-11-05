'use strict';

const extract = require('extract-zip');

/*
 * Documentation for using extract-zip is found below:
 *
 *  Extract-zip github page:
 *  - https://github.com/thejoshwolfe/yauzl
 *  Extract-zip npm page:
 *  - https://www.npmjs.com/package/extract-zip
*/

function extractWithExtractZip (from, to) {
	return new Promise((resolve, reject) => {
		extract(from, {dir: to}, function(err) {
			if(err) {
				console.log('Error!', err);
				reject();
			} else {
				console.log('Success');
				resolve();
			}
		});
	});
}
exports.extractWithExtractZip = extractWithExtractZip;
