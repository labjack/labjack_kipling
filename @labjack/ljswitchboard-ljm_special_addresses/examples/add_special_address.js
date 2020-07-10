var ljm_special_addresses = require('../lib/ljm_special_addresses');

// New IP Address to add to the .config file.
var userIP = {'ip': '192.168.1.12', 'comments': ['My First Single New IP']};

/*
 * The addIP function parses the specified .config file, adds the new userIP,
 * removes duplicate IP addresses, formats, saves, and instructs LJM to load the 
 * specified .config file.  There is an optional
 * options argument where file path can be specified:
 * ljm_special_addresses.addIP(userIPs, {'filePath': '[customFilePath]'})
 */
ljm_special_addresses.addIP(userIP)
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
	console.log('LJM\'s Special Addresses Status String:');
	console.log(res.ljmStatus);
}, function(err) {
	console.error('Error adding IP:');
	console.error({
		'isError': err.isError,
		'errorStep': err.errorStep,
	});
	process.exit(1);
});