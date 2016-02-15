# ljswitchboard-ljm_special_addresses
This module allows Kipling to interface with LJM's Special Addresses/Specific IPs feature.  Documentation for this feature can be found on LabJack's website: [LJM Special Addresses](https://labjack.com/support/software/api/ljm/constants/SpecialAddressesConfigs).

## Installing the LJM Library
This library can be downloaded and installed for free on LabJack's website on the [LJM Library Installers](https://labjack.com/support/software/installers/ljm) page.

## Installation:
Install with npm:
```
npm install ljswitchboard-ljm_special_addresses
```

## Examples
This module exposes two functions "parse" and "save".

### Example usage of the "parse" function:
```javascript
var ljm_special_addresses = require('ljswitchboard-ljm_special_addresses');

/*
 * The parse function parses the specified .config file.
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
var ljm_special_addresses = require('../lib/ljm_special_addresses');

/*
 * The load function parses and instructs LJM to load the 
 * specified .config file.
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
var ljm_special_addresses = require('ljswitchboard-ljm_special_addresses');

// Save the IPs in one of the test files.
var userIPs = [
	{'ip': '192.168.1.10', 'comments': ['My First IP']},
	{'ip': '192.168.1.11', 'comments': ['My Second IP']},
];

/*
 * The save function formats, saves, and instructs LJM to load the 
 * specified .config file.
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

Other examples are located in the examples directory.