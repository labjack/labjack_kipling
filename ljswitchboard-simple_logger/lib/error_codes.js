exports.errorCodes = {
	/*
	This error code defines LJM's error code:
	LJME_DEVICE_NOT_OPEN: 1224, The requested handle did not refer to an
	open device.
	*/
	'DEVICE_NOT_VALID': 1224,

	/*
	This error code indicates that a read was requested while one is currently
	pending.   These errors will occur commonly when a read is taking a long
	time or if we are trying to read to quickly.

	Chose to use the same error code as LJM's error code:
	LJME_MBE6_SLAVE_DEVICE_BUSY: 1206, The device is busy and cannot respond 
	currently.
	*/
	'DEVICE_STILL_ACTIVE': 1206,

	/*
	This error code indicates that a read was returned later than expected.
	*/
	'VALUE_WAS_DELAYED': 90001,

	/*
	This error code indicates that a data point is initialized and not a real
	value.
	*/
	'VALUE_INITIALIZED': 90002,

	/*
	No Error case
	*/
	'NO_ERROR': 0
};