'use strict';

process.on('uncaughtException', function(err) {
	console.log('An uncaughtException occurred', err);
	console.log('Stack', err.stack);
	process.exit(1);
});
