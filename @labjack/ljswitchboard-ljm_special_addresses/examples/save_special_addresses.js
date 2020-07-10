var ljm_special_addresses = require('../lib/ljm_special_addresses');

// The IP addresses to save to the .config file.
var userIPs = [
	{'ip': '192.168.1.10', 'comments': ['My First IP']},
	{'ip': '192.168.1.11', 'comments': ['My Second IP']},
];

/*
 * The save function formats, saves, and instructs LJM to load the 
 * specified .config file.  There is an optional
 * options argument where file path can be specified:
 * ljm_special_addresses.save(userIPs, {'filePath': '[customFilePath]'})
 */
ljm_special_addresses.save(userIPs)
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
	console.log('LJM\'s Special Addresses Status String:');
	console.log(res.ljmStatus);
}, function(err) {
	console.error('Error saving IPs:');
	console.error({
		'isError': err.isError,
		'errorStep': err.errorStep,
	});
	process.exit(1);
});