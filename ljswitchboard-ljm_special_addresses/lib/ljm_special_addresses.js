
/* 
 * This is a nodejs module that allows uers to interact with LJM's special 
 * addresses config file to configure LJM to scan for specific IP addresses.

 * The functions that are exposed to users are:
 * 1. verify
 * 2. parse
 * 3. addIP
 * 4. addIPs
 */

var q = require('q');
var fs = require('fs');
var path = require('path');
var natural_sort = require('javascript-natural-sort');
var fse = require('fs-extra');

var DEFAULT_SPECIAL_ADDRESS_FILE_PATHS = {
	'darwin': '/usr/local/share/LabJack/LJM/ljm_special_addresses.config',
	'linux': '/usr/local/share/LabJack/LJM/ljm_special_addresses.config',
	'windows': '',
};

var DEFAULT_SPECIAL_ADDRESS_FILE_PATH;

function GET_DEFAULT_UNIX_SA_PATHS() {
	return ['/usr/local/share/LabJack/LJM/ljm_special_addresses.config'];
}
function GET_DEFAULT_WIN32_SA_PATHS() {
	 return [
		'C:\\ProgramData\\LabJack\\LJM\\ljm_special_addresses.config',
		'C:\\Documents and Settings\\All Users\\Application Data\\LabJack\\LJM\\ljm_special_addresses.config'
	];
	// if(IS_WINDOWS_XP) {
	// 	return 'C:\\Documents and Settings\\All Users\\Application Data\\LabJack\\LJM\\ljm_special_addresses.config';
	// } else {
	// 	return 'C:\\ProgramData\\LabJack\\LJM\\ljm_special_addresses.config';
	// }

}
try {
    var DEFAULT_SPECIAL_ADDRESS_FILE_PATHS = {
        'linux': 	GET_DEFAULT_UNIX_SA_PATHS,
        'linux2': 	GET_DEFAULT_UNIX_SA_PATHS,
        'sunos': 	GET_DEFAULT_UNIX_SA_PATHS,
        'solaris': 	GET_DEFAULT_UNIX_SA_PATHS,
        'freebsd': 	GET_DEFAULT_UNIX_SA_PATHS,
        'openbsd': 	GET_DEFAULT_UNIX_SA_PATHS,
        'darwin': 	GET_DEFAULT_UNIX_SA_PATHS,
        'mac': 		GET_DEFAULT_UNIX_SA_PATHS,
        'win32': 	GET_DEFAULT_WIN32_SA_PATHS,
    }[process.platform]();
    var exists = DEFAULT_SPECIAL_ADDRESS_FILE_PATHS.some(function(loc) {
        DEFAULT_SPECIAL_ADDRESS_FILE_PATH = loc;
        return fs.existsSync(loc);
    });
} catch(err) {
	console.log('ERROR!', err, err.stack);
    console.error(
        'This platform combination is not supported.',
        process.platform
    );
}

console.log('Default S-A Path:', DEFAULT_SPECIAL_ADDRESS_FILE_PATH);

function parseOptions(options) {
	var parsedOptions = {
		'filePath': DEFAULT_SPECIAL_ADDRESS_FILE_PATH,
	};
	if(options.filePath) {
		parsedOptions.filePath = options.filePath;
	}
	return parsedOptions;
}

function prepareOperation (options) {
	var data = {
		'filePath': options.filePath,
		'fileString': '',
		'fileData': '',
		'newFileString': '',
		'isError': false,
		'errorStep': undefined,
		'errorInfo': undefined,
	};
	return data;
}


function verify() {
	var defered = q.defer();
	defered.resolve();
	return defered.promise;
}

var MAX_FILE_READ_RETRIES = 5;
function innerReadFile(data) {
	var defered = q.defer();
	var numReTries = 0;
	function handleRead(err, fileData) {
		if(err) {
			numReTries += 1;
			if(numReTries < MAX_FILE_READ_RETRIES) {
				fs.readFile(data.filePath, handleRead);
			} else {
				// There was definitely an error... assume file is empty.
				data.isError = true;
				data.errorStep = 'innerReadFile';
				data.errorInfo = err;
				defered.reject(data);
			}
		} else {
			data.fileString = fileData.toString();
			defered.resolve(data);
		}
	}
	fs.readFile(data.filePath, handleRead);
	
	return defered.promise;
}
var whiteSpaceRegex = /^\s{1,}$/;
var checkForIP = /([0-9]{1,3}.){3}[0-9]{1,3}/;
var checkForComment = /\/\/(\s{1,}).*/;
var getCommentString = /\/\/(\s{1,})/;


function innerParseFile(data) {
	// console.log('Parsing File');
	var defered = q.defer();
	// We need to parse the file like how LJM is doing it...
	/*
	1. Whitespace is ignored.
	2. Empty lines and lines starting with // are ignored.
	3. All other lines are expected to contain one IP address, which should not be a broadcast address.

	Ex:
	// Have LJM connect to the static-IP T7...
	//   ...in the lab:
	192.168.2.207

	//   ...in the kitchen:
	10.0.0.123
	*/
	// Define a variable that parsed data will get added to.
	
	var innerParseFileStep = 'initializing';
	try {
		// Before doing anything, lets get rid of the '\r' character.
		innerParseFileStep = 'remove \\r chars';
		var removedReturnCarrage = data.fileString.split('\r').join('');

		// Now we should get rid of the blank lines so search for '\n\n' and replace
		// with a single '\n'
		innerParseFileStep = 'remove blank lines';
		var blankLineRemoved = removedReturnCarrage.split('\n\n').join('\n');

		// Now we should split by lines and remove any lines that are purely white
		// space.
		innerParseFileStep = 'remove whitespace lines';
		var linesWithData = [];
		blankLineRemoved.split('\n').forEach(function removeWhitespace(lineStr) {
			var res = whiteSpaceRegex.exec(lineStr);
			if(res) {
				// Don't add to the lines w/ data array.
			} else {
				linesWithData.push(lineStr);
			}
		});

		// Now we should loop through the remaining lines and group the associated
		// comments with the IP address.
		innerParseFileStep = 'parsing data';
		var ipAddresses = [];
		var ipData = {};
		var tempComments = [];
		var tempIP = '';
		linesWithData.forEach(function organizingData(lineStr) {
			var isIP = checkForIP.exec(lineStr);
			if(isIP) {
				ipData[isIP[0]] = {
					'ip': isIP[0],
					'comments': tempComments
				};
				ipAddresses.push(isIP[0]);
				tempComments = [];
			} else {
				var isComment = checkForComment.exec(lineStr);
				var commentHeader = getCommentString.exec(lineStr);
				if(commentHeader) {
					var commentText = lineStr.split(commentHeader[0])[1];
					tempComments.push(commentText);
				}
			}
		});

		// Sort the ipData
		ipAddresses.sort(natural_sort);

		// Fill the fileData array
		data.fileData = [];
		ipAddresses.forEach(function(ipAddress) {
			data.fileData.push(ipData[ipAddress]);
		});

		defered.resolve(data);
	} catch(err) {
		data.isError = true;
		data.errorStep = 'innerParseFile:' + innerParseFileStep;
		data.errorInfo = err;
		defered.reject(data);
	}
	
	return defered.promise;
}

function parse(options) {
	var defered = q.defer();
	var parsedOptions = parseOptions(options);
	var data = prepareOperation(parsedOptions);
	
	function finalize(successData) {
		defered.resolve(successData);
	}

	innerReadFile(data)
	.then(innerParseFile)
	.then(finalize)
	.catch(function resolveError(errData) {
		defered.reject({
			'data': errData,
			'isError': errData.isError,
			'errorStep': errData.errorStep,
			'errorInfo': errData.errorInfo,
		});
	});
	return defered.promise;
}

function sortUserIPs(a, b) {
	var ips = {};
	ips[a.ip] = a;
	ips[b.ip] = b;

	var selectedIP = natural_sort(a.ip, b.ip);
	return ips[selectedIP];
}

function save(userIPs, options) {
	var defered = q.defer();
	var parsedOptions = parseOptions(options);
	var data = prepareOperation(parsedOptions);
	
	var ips = {};
	var ipAddrs = [];
	userIPs.forEach(function(userIP) {
		ips[userIP.ip] = userIP;
		ipAddrs.push(userIP.ip);
	});
	// console.log('Un-sorted Data', ipAddrs);
	ipAddrs.sort(natural_sort);
	// console.log('Sorted Data', ipAddrs);

	var sortedUserIPs = [];
	ipAddrs.forEach(function(ipAddr) {
		sortedUserIPs.push(ips[ipAddr]);
	});

	var partialStrs = [];
	partialStrs = sortedUserIPs.map(function(userIP) {
		
		var ipDataLines = [];
		userIP.comments.forEach(function(comment) {
			ipDataLines.push('// ' + comment);
		});
		ipDataLines.push(userIP.ip);
		return ipDataLines.join('\r\n') + '\r\n';
	});
	// console.log('Partial Strs', partialStrs);
	var fullStr = partialStrs.join('\r\n');
	// console.log('Full Str:');
	// console.log(fullStr);

	// console.log('Creating file', parsedOptions.filePath);
	fse.outputFile(
		parsedOptions.filePath,
		fullStr,
		function(err) {
			if(err) {
				console.log('Error writing file', err);
			}
			defered.resolve();
		});
	return defered.promise;
}

function addIP(newIP, options) {
	var defered = q.defer();
	var parsedOptions = parseOptions(options);
	var data = prepareOperation(parsedOptions);

	innerReadFile(data)
	.then(innerParseFile)
	.catch(function resolveError(errData) {
		defered.reject({
			'isError': errData.isError,
			'errorStep': errData.errorStep,
			'errorInfo': errData.errorInfo,
		});
	});
	return defered.promise;
}

function addIPs(newIPs, options) {
	var defered = q.defer();
	var promises = newIPs.map(function mappingToAddIP(newIP) {
		return addIP(newIP, options);
	});

	q.allSettled(promises)
	.then(function() {
		defered.resolve();
	}, function() {
		defered.resolve();
	});
	return defered.promise;
}

exports.parse = parse;
exports.save = save;