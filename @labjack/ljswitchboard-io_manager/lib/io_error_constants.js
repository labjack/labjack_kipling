
/*
Some common exit codes are documented here:
https://github.com/joyent/node/blob/master/doc/api/process.markdown#exit-codes
*/
var errors = {
	'REQUIRE_REF_OR_FFI_ERROR': {
		'code': 20,
		'message': 'Likely failed to require the REF or FFI libraries.  Failed to require the initial managers.'
	}
};
var errorKeys = Object.keys(errors);

exports.errors = errors;
exports.parseError = function(code) {
	var message = 'Unknown Error';
	errorKeys.forEach(function(key) {
		if(errors[key].code == code) {
			message = errors[key].message;
		}
	});
	return message;
};