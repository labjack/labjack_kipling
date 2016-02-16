var ljm_special_addresses = require('../lib/ljm_special_addresses');

// New IPs to add to the .config file.
var userIPs = [
	{'ip': '192.168.1.10', 'comments': ['My First New IP']},
	{'ip': '192.168.1.11', 'comments': ['My Second New IP']},
];

/*
 * The addIPs function parses the specified .config file, adds the new userIPs,
 * removes duplicate IP addresses, formats, saves, and instructs LJM to load the 
 * specified .config file.  There is an optional
 * options argument where file path can be specified:
 * ljm_special_addresses.addIPs(userIPs, {'filePath': '[customFilePath]'})
 */
ljm_special_addresses.addIPs(userIPs)
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
	console.log('LJM\'s Special Addresses Status String:');
	console.log(res.ljmStatus);
}, function(err) {
	console.error('Error adding IPs:');
	console.error({
		'isError': err.isError,
		'errorStep': err.errorStep,
	});
	process.exit(1);
});