/**
 * get_labjack_kipling_packages.js
 *
 * See the functions below for details.
 *
 * Package name may not match the path: labjack_kipling/LabJack-process_manager
 * contains a package.json with the name process_manager
 *
 * Expects to be called from cwd: labjack_kipling/ljswitchboard-builder
 */

const childProcess = require('child_process');
const path = require('path');

const startingDir = process.cwd();
const lernaBin = path.join(startingDir,'..','node_modules','.bin','lerna');

/**
 * Returns a list of objects describing the labjack_kipling packages. Resembles:
 *
 * [ { name: 'labjack-nodejs',
 *     version: '2.0.0',
 *     private: false,
 *     location: '/Users/me/src/labjack_kipling/LabJack-nodejs'
 *   },
 *   {
 *     name: 'process_manager',
 *     version: '0.0.17',
 *     private: false,
 *     location: '/Users/rory/src/labjack_kipling/LabJack-process_manager'
 *    },
 *   ...
 * ]
 */
function getPackages() {
	const command = `${lernaBin} ls --all --json --loglevel silent`;
	const modulesStr = childProcess.execSync(command);
	return JSON.parse(modulesStr);
}

/**
 * Returns a object of lists of the dependencies of each labjack_kipling
 * package. Resembles:
 *
 * { 'labjack-nodejs':
 *    [ 'allocate_buffer',
 *      'async',
 *      'diff',
 *      'ffi-napi',
 *      'ljm-ffi',
 *      'ljswitchboard-ljm_driver_constants',
 *      'ljswitchboard-modbus_map',
 *      'ref-napi' ],
 *   process_manager: [ 'async', 'dict' ],
 *   ...
 * }
 */
function getAdjacencyGraph() {
	const command = `${lernaBin} ls --all --graph --loglevel silent`;
	const modulesStr = childProcess.execSync(command);
	return JSON.parse(modulesStr);
}

exports.getPackages = getPackages;
exports.getAdjacencyGraph = getAdjacencyGraph;
