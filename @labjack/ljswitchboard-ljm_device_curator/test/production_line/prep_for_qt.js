process.on('uncaughtException', function(err) {
	console.log('ERROR!!!', err);
	console.log(err.stack);
	process.exit();
});


/********************** Require tests *****************************************/
var mult_upgrade_recovery_firmware = require('./mult_upgrade_recovery_firmware');
var mult_upgrade_primary_firmware = require('./mult_upgrade_primary_firmware');


/********************** Perform tests *****************************************/
exports.mult_upgrade_recovery_firmware = mult_upgrade_recovery_firmware;
exports.mult_upgrade_primary_firmware = mult_upgrade_primary_firmware;
