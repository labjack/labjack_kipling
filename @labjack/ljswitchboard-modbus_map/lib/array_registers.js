
/*
http://labjack.rhb.cc/support/datasheets/t7/communication/modbus-map/buffer-registers
*/
exports.arrayRegisters = [
	// SPI
	{'name': 'SPI_DATA_TX_ARRAY', 'size': 'SPI_NUM_BYTES', 'data': 'SPI_DATA_TX', 'type': 'raw'},// LJM Type: Raw
	{'name': 'SPI_DATA_RX_ARRAY', 'size': 'SPI_NUM_BYTES', 'data': 'SPI_DATA_RX', 'type': 'raw'},// LJM Type: Raw

	// I2C
	{'name': 'I2C_DATA_TX_ARRAY', 'size': 'I2C_NUM_BYTES_TX', 'data': 'I2C_DATA_TX', 'type': 'raw'},// LJM Type: Raw
	{'name': 'I2C_DATA_RX_ARRAY', 'size': 'I2C_NUM_BYTES_RX', 'data': 'I2C_DATA_RX', 'type': 'raw'},// LJM Type: Raw
	
	// WiFi Scan
	{'name': 'WIFI_SCAN_DATA_ARRAY', 'size': 'WIFI_SCAN_NUM_BYTES', 'data': 'WIFI_SCAN_DATA', 'type': 'raw'},// LJM Type: Raw

	// LUA
	{'name': 'LUA_DEBUG_DATA_ARRAY', 'size': 'LUA_DEBUG_NUM_BYTES', 'data': 'LUA_DEBUG_DATA', 'type': 'string'},
	{'name': 'LUA_SOURCE_ARRAY', 'size': 'LUA_SOURCE_SIZE', 'data': 'LUA_SOURCE_WRITE', 'type': 'string'},

	// File IO
	{'name': 'FILE_IO_NAME_WRITE_ARRAY', 'size': 'FILE_IO_NAME_WRITE_LEN', 'data': 'FILE_IO_NAME_WRITE', 'type': 'string'},
	{'name': 'FILE_IO_NAME_READ_ARRAY', 'size': 'FILE_IO_NAME_READ_LEN', 'data': 'FILE_IO_NAME_READ', 'type': 'string'},
	
	// Pure buffers with no length property:
	// FILE_IO_WRITE
	// FILE_IO_READ
	{'name': 'FILE_IO_READ_ARRAY', 'size': 'FILE_IO_SIZE_BYTES', 'data': 'FILE_IO_READ', 'type': 'string'},
	{'name': 'FILE_IO_WRITE_ARRAY', 'size': 'FILE_IO_SIZE_BYTES', 'data': 'FILE_IO_WRITE', 'type': 'string'},

	// One Wire
	{'name': 'ONEWIRE_DATA_TX_ARRAY', 'size': 'ONEWIRE_NUM_BYTES_TX', 'data': 'ONEWIRE_DATA_TX', 'type': 'raw'},
	{'name': 'ONEWIRE_DATA_RX_ARRAY', 'size': 'ONEWIRE_NUM_BYTES_RX', 'data': 'ONEWIRE_DATA_RX', 'type': 'raw'},
	
	// Stream Out
	/*
	 * Who knows...
	 * Size is one of these two:
	 *  - STREAM_OUT#(0:3)_BUFFER_SIZE
	 *  - STREAM_OUT#(0:3)_LOOP_SIZE
	 * Registers
	 *  - STREAM_OUT#(0:3)_BUFFER_F32  // Type: FLOAT32
	 *  - STREAM_OUT#(0:3)_BUFFER_U32  // Type: UINT32
	 *  - STREAM_OUT#(0:3)_BUFFER_U16  // Type: UINT16
	 */

	// Asynch
	{'name': 'ASYNCH_DATA_TX_ARRAY', 'size': 'ASYNCH_NUM_BYTES_TX', 'data': 'ASYNCH_DATA_TX', 'type': 'raw'},
	{'name': 'ASYNCH_DATA_RX_ARRAY', 'size': 'ASYNCH_NUM_BYTES_RX', 'data': 'ASYNCH_DATA_RX', 'type': 'raw'},

	// DGT_FLASH
	// Probably don't have to define

	// User Ram
	// Who knows...
];