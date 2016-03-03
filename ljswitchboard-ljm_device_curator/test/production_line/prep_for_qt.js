process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});


/********************** Require tests *****************************************/
var upgrade_recovery_firmware = require('./upgrade_recovery_firmware');
var upgrade_primary_firmware = require('./upgrade_primary_firmware');


/********************** Perform tests *****************************************/
exports.upgrade_recovery_firmware = upgrade_recovery_firmware;
exports.upgrade_primary_firmware = upgrade_primary_firmware.tests;								// Passing
