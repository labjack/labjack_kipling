
exports.arrayRegisters = [
	// I2C
	{'name': 'I2C_DATA_TX_ARRAY', 'size': 'I2C_NUM_BYTES_TX', 'data': 'I2C_DATA_TX', 'type': 'raw'},
	{'name': 'I2C_DATA_RX_ARRAY', 'size': 'I2C_NUM_BYTES_RX', 'data': 'I2C_DATA_RX', 'type': 'raw'},

	// Asynch
	{'name': 'ASYNCH_DATA_TX_ARRAY', 'size': 'ASYNCH_NUM_BYTES_TX', 'data': 'ASYNCH_DATA_TX', 'type': 'raw'},
	{'name': 'ASYNCH_DATA_RX_ARRAY', 'size': 'ASYNCH_NUM_BYTES_RX', 'data': 'ASYNCH_DATA_RX', 'type': 'raw'},
	
	// LUA
	{'name': 'LUA_DEBUG_DATA_ARRAY', 'size': 'LUA_DEBUG_NUM_BYTES', 'data': 'LUA_DEBUG_DATA', 'type': 'string'},
	{'name': 'LUA_SOURCE_ARRAY', 'size': 'LUA_SOURCE_SIZE', 'data': 'LUA_SOURCE_WRITE', 'type': 'string'},

	// One Wire
	{'name': 'ONEWIRE_DATA_TX_ARRAY', 'size': 'ONEWIRE_NUM_BYTES_TX', 'data': 'ONEWIRE_DATA_TX', 'type': 'raw'},
	{'name': 'ONEWIRE_DATA_RX_ARRAY', 'size': 'ONEWIRE_NUM_BYTES_RX', 'data': 'ONEWIRE_DATA_RX', 'type': 'raw'},
];