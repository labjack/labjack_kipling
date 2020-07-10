

process.on('uncaughtException', function(err) {
	console.log('An uncaughtException occured', err);
	console.log('Stack', err.stack);
	// console.log('An uncaughtException occured');
});