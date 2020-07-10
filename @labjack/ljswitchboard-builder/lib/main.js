



var startupAttributes = {
	'cwd': process.cwd(),
	'execPath': process.execPath,
};
exports.info = startupAttributes;
var catchUncaughtExceptions = function(err) {
	console.error('in catchUncaughtExceptions', err);
};
var catchWindowErrors = function(err) {
	console.error('in catchWindowErrors', err);
};

// process.on('exit', function() {
// 	console.log('Goodbye!');
// });
// process.on('SIGINT', function() {
// 	console.log('Got SIGINT.  Press Control-D to exit');
// });
process.on('uncaughtException', catchUncaughtExceptions);
window.addEventListener('error' ,catchWindowErrors);