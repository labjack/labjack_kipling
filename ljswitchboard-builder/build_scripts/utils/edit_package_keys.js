'use strict';

/**
 * edit_package_keys.js
 *
 * Adds or replaces keys in a package.json.
 *
 * Expects to be called from cwd: labjack_kipling/ljswitchboard-builder
 */

const path = require('path');
const fse = require('fs-extra');

let enableDebugging = false;
function debugLog() {
	if(enableDebugging) {
		console.log.apply(console, arguments);
	}
}

/**
 * Adds or replaces keys in a package.json
 *
 * @param {object} bundle - An object with the keys:
 *   project_path - String path of the package directory.
 *   required_keys - object describing what package.json keys to add/overwrite
 *
 * Example:
 *
 * {
 *   project_path: '/Users/me/src/labjack_kipling/ljswitchboard-splash_screen',
 *   required_keys:
 *    { topLevelKey:
 *       { recursiveKey: 1,
 *         otherRecursiveKey: 'Hello',
 *         ... },
 *      otherTopLevelKey: true,
 *    }
 *  }
 *
 * @param {boolean} recursive - Sets whether bundle.required_keys will be added
 * recursively or not.
 * Example: If bundle.required_keys is:
 *   "dependencies": {
 *     "thing": "../thing.tgz",
 *   }
 * And a package.json with:
 *   "dependencies": {
 *     "thing": "1.2.3",
 *     "other": "4.5.6"
 *   }
 *
 * If not recursive, it would get replaced as:
 *   "dependencies": {
 *     "thing": "../thing.tgz",
 *   }
 *
 * If recursive, would get set as:
 *   "dependencies": {
 *     "thing": "../thing.tgz",
 *     "other": "4.5.6"
 *   }
 */
function editPackageKeys(bundle, recursive=false) {
	const projectPackagePath = path.normalize(path.join(
		bundle.project_path,
		'package.json'
	));
	debugLog('Editing file', projectPackagePath);

	// Assumes same type between obj and reqKeys
	function recursiveSetKeys(key, obj, newObj) {
		// typeof will return 'object' for both objects and arrays
		if (typeof(obj[key]) == 'object' && typeof(newObj[key]) == 'object') {
			Object.keys(newObj[key]).forEach(function(deeperKey) {
				// console.log('go', deeperKey, newObj[deeperKey]);
				if (typeof(obj[key][deeperKey]) == 'object') {
					recursiveSetKeys(deeperKey, obj[key], newObj[key]);
				} else {
					obj[key][deeperKey] = newObj[key][deeperKey];
				}
			});
		} else {
			throw Error(`obj[key] (type: ${typeof obj[key]}) or newObj[key] (type: ${typeof newObj[key]}) is not an object`);
		}
	}

	function editFileContents(data) {
		const str = data.toString();
		const obj = JSON.parse(str);
		const reqKeys = bundle.required_keys;
		debugLog('Project Info', obj);
		debugLog('Required keys',reqKeys);

		// Replace info with required info.
		const keys = Object.keys(reqKeys);
		keys.forEach(function(key) {
			if (recursive) {
				recursiveSetKeys(key, obj, reqKeys);
			} else {
				obj[key] = reqKeys[key];
			}
		});
		return obj;
	}

	const data = fse.readFileSync(projectPackagePath);
	const newData = editFileContents(data);
	fse.outputJSONSync(projectPackagePath, newData, {
		spaces: 2
	});
}

exports.editPackageKeys = editPackageKeys;
