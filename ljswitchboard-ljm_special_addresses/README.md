# ljswitchboard-ljm_special_addresses
This module allows Kipling to interface with LJM's Special Addresses/Specific IPs feature.  Documentation for this feature can be found on LabJack's website: [LJM Special Addresses](https://labjack.com/support/software/api/ljm/constants/SpecialAddressesConfigs).

## Installing the LJM Library
The LJM library can be downloaded and installed for free on LabJack's website on the [LJM Library Installers](https://labjack.com/support/software/installers/ljm) page.

## Installation:
Install with npm:
```
npm install ljswitchboard-ljm_special_addresses
```

## Including
```javascript
var ljm_special_addresses = require('ljswitchboard-ljm_special_addresses');
```

## Examples
The most up to date list of [examples](https://github.com/chrisJohn404/ljswitchboard-ljm_special_addresses/tree/master/examples) can be found in the examples directory of this repository.  This module exposes the following functions:
* parse
* load
* save
* addIP
* addIPs
* getDefaultFilePath

### Example usage of the "parse" function:
```javascript
/*
 * The parse function parses the specified .config file.  There is an optional
 * options argument where file path can be specified:
 * ljm_special_addresses.parse({'filePath': '[customFilePath]'})
 */
ljm_special_addresses.parse()
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
}, function(err) {
	console.log('Error parsing', err);
});
```

### Example usage of the "load" function:
```javascript
/*
 * The load function parses and instructs LJM to load the 
 * specified .config file.  There is an optional
 * options argument where file path can be specified:
 * ljm_special_addresses.load({'filePath': '[customFilePath]'})
 */
ljm_special_addresses.load()
.then(function(res) {
	console.log('Config File Path:', res.filePath);
	console.log('Special IP Addresses:');
	console.log(res.fileData);
}, function(err) {
	console.log('Error parsing', err);
});
```

### Example usage of the "save" function:
```javascript
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
}, function(err) {
	console.log('Error parsing', err);
});
```

### Example usage of the "addIP" function:
```javascript
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
	console.log('Error parsing', err);
});
```

### Example usage of the "addIPs" function:
```javascript
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
	console.log('Error parsing', err);
});
```