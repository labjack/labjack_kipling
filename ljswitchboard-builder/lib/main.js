
console.log('in main.js');
var me = function() {
	// console.log('in main.js');

};
exports.me = me;


var startupAttributes = {
	'cwd': process.cwd(),
	'execPath': process.execPath,
};
exports.info = startupAttributes;
// var catchUncaughtExceptions = function(err) {
// 	console.log('in catchUncaughtExceptions');
// };
// var catchWindowErrors = function(err) {
// 	console.log('in catchWindowErrors');
// };

// process.on('exit', function() {
// 	console.log('Goodbye!');
// });
// process.on('SIGINT', function() {
// 	console.log('Got SIGINT.  Press Control-D to exit');
// });
// process.on('uncaughtException', catchUncaughtExceptions);
// window.addEventListener('error' ,catchWindowErrors);