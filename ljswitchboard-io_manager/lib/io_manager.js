const io_interface = require('./io_interface');

exports.io_interface = () => io_interface.createIOInterface(exports);

exports.info = {
	'type': 'library'
};
