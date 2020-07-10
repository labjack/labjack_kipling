

var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var q = require('q');

var extract = require('extract-zip');

/*
 * Documentation for using extract-zip is found below:
 *
 *  Extract-zip github page:
 *  - https://github.com/thejoshwolfe/yauzl
 *  Extract-zip npm page:
 *  - https://www.npmjs.com/package/extract-zip
*/

function extractWithExtractZip (from, to) {
	var defered = q.defer();
	extract(from, {dir: to}, function(err) {
		if(err) {
			console.log('Error!', err);
			defered.reject();
		} else {
			console.log('Success');
			defered.resolve();
		}
	});

	return defered.promise;
}
exports.extractWithExtractZip = extractWithExtractZip;