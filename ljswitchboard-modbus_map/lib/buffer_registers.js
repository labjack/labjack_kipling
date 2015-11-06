
var bufferRegisters = [
	'SPI_DATA_TX',
	'SPI_DATA_RX',
	'I2C_DATA_TX',
	'I2C_DATA_RX',
	'WIFI_SCAN_DATA',
	'LUA_SOURCE_WRITE',
	'LUA_DEBUG_DATA',
	'FILE_IO_NAME_WRITE',		// Old versions...
	'FILE_IO_PATH_WRITE',
	'FILE_IO_NAME_READ',		// Old versions...
	'FILE_IO_PATH_READ',
	'FILE_IO_WRITE',
	'FILE_IO_READ',
	'ONEWIRE_DATA_TX',
	'ONEWIRE_DATA_RX',
	'STREAM_OUT#(0:3)_BUFFER_F32',
	'STREAM_OUT#(0:3)_BUFFER_U32',
	'STREAM_OUT#(0:3)_BUFFER_U16',

	'ASYNCH_DATA_RX',
	'ASYNCH_DATA_TX',
	'USER_RAM_FIFO#(0:3)_DATA_U16',
	'USER_RAM_FIFO#(0:3)_DATA_U32',
	'USER_RAM_FIFO#(0:3)_DATA_I32',
	'USER_RAM_FIFO#(0:3)_DATA_F32',

	// Digit registers:
	'DGT_FLASH_READ',
	'DGT_FLASH_WRITE',

	// This is a special register.  It has to be read 7 bytes at a time to get
	// the complete YMD-weekday-HMS time stamp.
	'DGT_LOG_START_TIME',
	'DGT_RTCC_TIME',
];

exports.bufferRegisters = bufferRegisters;
