



var startupAttributes = {
	'cwd': process.cwd(),
	'execPath': process.execPath,
};
exports.info = startupAttributes;

var catchWindowErrors = function(err) {
	console.error('in catchWindowErrors', err);
};
window.addEventListener('error' ,catchWindowErrors);
