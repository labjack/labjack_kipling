/**
 * Collection of LJM native constants necessary.
 *
 * Set of constants defined by LJM that are necessary for interfacing with the
 * native software layer.
 *
 * @author Chris Johnson (chrisjohn404, LabJack Corp.)
**/

exports.LJM_JS_VERSION = 1.0000;
exports.LJM_DRVR_VERSION = '1.0.0';
exports.LJM_MAX_SUPPORTED_VERSION = 3.0000;
exports.LJM_DT_ANY = 0;
exports.LJM_DT_UE9 = 9;
exports.LJM_DT_U3 = 3;
exports.LJM_DT_U6 = 6;
exports.LJM_DT_T7 = 7;
exports.LJM_DT_SKYMOTE_BRIDGE = 1000;
exports.LJM_DT_DIGIT = 200;

//Max string size
exports.LJM_MAX_STRING_SIZE = 50;

//Connection Types
exports.LJM_CT_ANY = 0;
exports.LJM_CT_USB = 1;
exports.LJM_CT_TCP = 2;
exports.LJM_CT_ETHERNET = 3;
exports.LJM_CT_WIFI = 4;

//Read/write constants
exports.LJM_READ = 0;
exports.LJM_WRITE = 1;

//LJM_ListAll Constants
exports.LJM_LIST_ALL_SIZE = 128;

//Library Errors:
exports.LJME_INVALID_ADDRESS = 1250;
exports.LJME_CANNOT_OPEN_DEVICE = 1236;
exports.LJME_DEVICE_ALREADY_OPEN = 1229;

//LabJack.js debugging enable constants:
exports.GENERAL_DEBUGGING_ENABLE = 1;
exports.OPEN_CALL_DEBUGGING_ENABLE = 1;
exports.CLOSE_CALL_DEBUGGING_ENABLE = 2;
exports.ENABLE_ALL_DEBUGGING = 255;

// Constant for determining REALLY old T7 fw versions.  Before readAddresses support
exports.T7_LIMITED_FW_VERSION				= 0.8;

//FIRMWARE UPGRADING CONSTANTS T7
//==============================================
// Codes
exports.T7_EF_WRITE_CODE					= 0x1E346368;
exports.T7_EF_ERASE_CODE					= 0xD1F4B2D0;
exports.T7_COMM_SETTINGS_CODE				= 0x247E300C;
exports.T7_DEVICE_INFORMAITON_CODE			= 0x7DE1BE08;
exports.T7_DEVICE_CONFIGURATION_CODE		= 0x26B57AF3;
exports.T7_RESTART_CODE						= 0x4C4A;
exports.T7_SET_STARTUP_TO_FACTORY			= 0xE4EC3DC6;
//==============================================
//==============================================
// Keys
exports.T7_EFkey_ExtFirmwareImage			= 0x6A0902B5;
exports.T7_EFkey_ExtFirmwareImgInfo			= 0xDCA6AD50;
exports.T7_EFkey_IntFirmwareImgInfo			= 0xF0B17AC5;
exports.T7_EFkey_EmerFirmwareImgInfo		= 0xB6337A1E;
exports.T7_EFkey_UpgradeLog					= 0x5877D2EF;
exports.T7_EFkey_StartupSettings			= 0x0D08CAEA;
exports.T7_EFkey_CommSettings				= 0x2C69E1CE;
exports.T7_EFkey_DeviceConfig				= 0x9CDD28F7;
exports.T7_EFkey_CalValues					= 0xA7863777;
exports.T7_EFkey_DeviceInfo					= 0x552684BA;
exports.T7_EFkey_EmerFirmwareImage			= 0xCD3D7F15;
exports.T7_EFkey_UserAndWebSpace			= 0x6615E336;

// Addresses
exports.T7_EFAdd_UserAndWebSpace			= 0x000000;
exports.T7_EFAdd_ExtFirmwareImage			= 0x200000;
exports.T7_EFAdd_ExtFirmwareImgInfo			= 0x380000;
exports.T7_EFAdd_IntFirmwareImgInfo			= 0x381000;
exports.T7_EFAdd_EmerFirmwareImgInfo		= 0x382000;
exports.T7_EFAdd_UpgradeLog					= 0x383000;
exports.T7_EFAdd_StartupSettings			= 0x3C0000;
exports.T7_EFAdd_DeviceConfig				= 0x3C1000;
exports.T7_EFAdd_CommSettings				= 0x3C2000;
exports.T7_EFAdd_DeviceInfo					= 0x3C3000;
exports.T7_EFAdd_CalValues					= 0x3C4000;
exports.T7_EFAdd_SWDTSettings				= 0x3C5000;
exports.T7_EFAdd_EmerFirmwareImage			= 0x3E0000;

exports.T7_HEAD_FIRST_FOUR_BYTES			= 0x4C4A4658;
exports.T7_TARGET_OLD						= 100017001;
exports.T7_TARGET							= 100007001;

// Device Specific constants
exports.T7_HDR_FLASH_PAGE_ERASE				= 1;
exports.T7_IMG_FLASH_PAGE_ERASE				= 120;
exports.T7_IMG_HEADER_LENGTH				= 128;
exports.T7_FLASH_BLOCK_WRITE_SIZE			= 8; 
exports.T7_FLASH_PAGE_SIZE					= 4096;

// Other aka Hidden T7-Registers, in T7_Constants.h
exports.T7_MA_EXF_KEY						= 61800;
exports.T7_MA_EXF_pREAD						= 61810;
exports.T7_MA_EXF_READ						= 61812;
exports.T7_MA_EXF_ERASE						= 61820;
exports.T7_MA_EXF_pWRITE					= 61830;
exports.T7_MA_EXF_WRITE						= 61832;

exports.T7_REQUEST_FW_UPGRADE				= 0x4C4A0020;
exports.T7_MA_REQ_FWUPG 					= 61996;
exports.T7_MA_REQ_RESTART 					= 61998;


// Header Positions
exports.HEADER_CODE							= 0;
exports.HEADER_TARGET						= 4;
exports.HEADER_VERSION						= 8;
exports.HEADER_REQ_LJSU						= 12;
exports.HEADER_IMAGE_NUM					= 16;
exports.HEADER_NUM_IMAGES					= 18;
exports.HEADER_NEXT_IMG						= 20;
exports.HEADER_IMG_LEN						= 24;
exports.HEADER_IMG_OFFSET					= 28;
exports.HEADER_SHA_BYTE_COUNT				= 32;
exports.HEADER_ENC_SHA1						= 76;
exports.HEADER_SHA1							= 96;
exports.HEADER_RESERVED						= 116;
exports.HEADER_CHECKSUM						= 124;
 

//FIRMWARE UPGRADING CONSTANTS DIGIT
//==============================================
exports.DIGIT_TARGET						= 100200000;
// Codes

//==============================================
//==============================================
exports.typeSizes = {
	UINT64: 8,
	INT32: 4,
	STRING: 50,
	UINT16: 2,
	BYTE: 1,
	UINT32: 4,
	FLOAT32: 4
};
exports.LJM_BYTES_PER_REGISTER = 2;
exports.deviceTypes = {
	LJM_DTANY: 0,
	LJM_dtANY: 0,
	LJM_dtAny: 0,
	LJM_dtany: 0,
	0:0,
	ANY: 0,
	Any: 0,
	any: 0,
	LJM_DTUE9: 9,
	LJM_dtUE9: 9,
	LJM_dtue9: 9,
	UE9: 9,
	ue9: 9,
	9:9,
	LJM_DTU3: 3,
	LJM_dtU3: 3,
	LJM_dtu3: 3,
	U3: 3,
	u3: 3,
	3:3,
	LJM_DTU6: 6,
	LJM_dtU6: 6,
	LJM_dtu6: 6,
	U6: 6,
	u6: 6,
	6:6,
	LJM_DTT7: 7,
	LJM_dtT7: 7,
	LJM_dtt7: 7,
	T7: 7,
	t7: 7,
	7:7,
	LJM_dtSKYMOTE_BRIDGE: 1000,
	1000:1000,
	LJM_DTDIGIT: 200,
	LJM_dtDIGIT: 200,
	LJM_dtDigit: 200,
	LJM_dtdigit: 200,
	DIGIT: 200,
	Digit: 200,
	digit: 200,
	200:200
};
exports.connectionTypes = {
	LJM_CTANY: 0,
	LJM_ctANY: 0,
	LJM_ctAny: 0,
	LJM_ctany: 0,
	ANY: 0,
	Any: 0,
	any: 0,
	0:0,
	LJM_CTUSB: 1,
	LJM_ctUSB: 1,
	LJM_ctUsb: 1,
	LJM_ctusb: 1,
	USB: 1,
	Usb: 1,
	usb: 1,
	1:1,
	LJM_CTTCP: 2,
	LJM_ctTCP: 2,
	LJM_cttcp: 2,
	TCP: 2,
	tcp: 2,
	2:2,
	LJM_CTETHERNET: 3,
	LJM_ctETHERNET: 3,
	LJM_ctEthernet: 3,
	LJM_ctethernet: 3,
	ETHERNET: 3,
	Ethernet: 3,
	ethernet: 3,
	3:3,
	LJM_CTWIFI: 4,
	LJM_ctWIFI: 4,
	LJM_ctWiFi: 4,
	LJM_ctWifi: 4,
	LJM_ctwifi: 4,
	WIFI: 4,
	WiFi: 4,
	Wifi: 4,
	wifi: 4,
	4:4
};
exports.LJM_UINT64 = 69;							 // Un-supported C type of UINT64/mac addresses
exports.LJM_UINT16 = 0; 			                 // C type of unsigned short
exports.LJM_UINT32 = 1; 			                 // C type of unsigned int
exports.LJM_INT32 = 2; 				                 // C type of int
exports.LJM_FLOAT32 = 3; 			                 // C type of float
exports.LJM_STRING = 98;                             // C type of c-String
exports.LJM_BYTE = 99;                               // C type of unsigned char

exports.ljmTypes = {
	'LJM_UINT64': exports.LJM_UINT64,
	'UINT64': exports.LJM_UINT64,
	'Uint64': exports.LJM_UINT64,
	'uint64': exports.LJM_UINT64,
	'LJM_UINT16': exports.LJM_UINT16,
	'UINT16': exports.LJM_UINT16,
	'Uint16': exports.LJM_UINT16,
	'uint16': exports.LJM_UINT16,
	'LJM_UINT32': exports.LJM_UINT32,
	'UINT32': exports.LJM_UINT32,
	'Uint32': exports.LJM_UINT32,
	'uint32': exports.LJM_UINT32,
	'LJM_INT32': exports.LJM_INT32,
	'INT32': exports.LJM_INT32,
	'Int32': exports.LJM_INT32,
	'int32': exports.LJM_INT32,
	'LJM_FLOAT32': exports.LJM_FLOAT32,
	'FLOAT32': exports.LJM_FLOAT32,
	'Float32': exports.LJM_FLOAT32,
	'float32': exports.LJM_FLOAT32,
	'LJM_STRING': exports.LJM_STRING,
	'STRING': exports.LJM_STRING,
	'String': exports.LJM_STRING,
	'string': exports.LJM_STRING,
	'LJM_BYTE': exports.LJM_BYTE,
	'BYTE': exports.LJM_BYTE,
	'Byte': exports.LJM_BYTE,
	'byte': exports.LJM_BYTE,
};
exports.ljmTypes[exports.LJM_UINT64] = exports.LJM_UINT64;
exports.ljmTypes[exports.LJM_UINT16] = exports.LJM_UINT16;
exports.ljmTypes[exports.LJM_UINT32] = exports.LJM_UINT32;
exports.ljmTypes[exports.LJM_INT32] = exports.LJM_INT32;
exports.ljmTypes[exports.LJM_FLOAT32] = exports.LJM_FLOAT32;
exports.ljmTypes[exports.LJM_STRING] = exports.LJM_STRING;
exports.ljmTypes[exports.LJM_BYTE] = exports.LJM_BYTE;

var defaultValues = {};
defaultValues[exports.LJM_UINT64] = '00:00:00:00:00:00';
defaultValues[exports.LJM_UINT16] = 0;
defaultValues[exports.LJM_UINT32] = 0;
defaultValues[exports.LJM_INT32] = 0;
defaultValues[exports.LJM_FLOAT32] = -9999;
defaultValues[exports.LJM_STRING] = '';
defaultValues[exports.LJM_BYTE] = 0;
exports.defaultValues = defaultValues;

exports.ARCH_INT_NUM_BYTES = 4;
exports.ARCH_DOUBLE_NUM_BYTES = 8;

exports.ARCH_POINTER_SIZE = {
    'ia32': 4,
    'x64': 8,
    'arm': 4
}[process.arch];
exports.LIST_ALL_EXTENDED_MAX_NUM_TO_FIND = 128;

exports.LJM_LIBRARY_CONSTANTS = {
	'LJM_DEBUG_LOG_MODE': {
		'LJM_DEBUG_LOG_MODE_NEVER': 1,
		'LJM_DEBUG_LOG_MODE_CONTINUOUS': 2,
		'LJM_DEBUG_LOG_MODE_ON_ERROR': 3
	},
	'LJM_DEBUG_LOG_LEVEL': {
		'LJM_STREAM_PACKET': 1,
		'LJM_TRACE': 2,
		'LJM_DEBUG': 4,
		'LJM_INFO': 6,
		'LJM_PACKET': 7,
		'LJM_WARNING': 8,
		'LJM_USER': 9,
		'LJM_ERROR': 10,
		'LJM_FATAL': 12
	},
	'LJM_OPEN_MODE': {
		'LJM_KEEP_OPEN': 1,
		'LJM_OPEN_CLOSE': 2
	},
	'LJM_STREAM_SCANS_RETURN': {
		'LJM_STREAM_SCANS_RETURN_ALL': 1,
		'LJM_STREAM_SCANS_RETURN_ALL_OR_NONE': 2
	},
	'LJM_STREAM_RECEIVE_TIMEOUT_MODE': {
		'LJM_STREAM_RECEIVE_TIMEOUT_MODE_CALCULATED': 1,
		'LJM_STREAM_RECEIVE_TIMEOUT_MODE_MANUAL': 2
	},
	'LJM_ZERO_LENGTH_ARRAY_MODE': {
		'LJM_ZERO_LENGTH_ARRAY_ERROR': 1,
		'LJM_ZERO_LENGTH_ARRAY_IGNORE_OPERATION': 2
	}
};

exports.DEVICE_TYPE_NAMES = {
    '3': 'U3',
    '6': 'U6',
    '7': 'T7',
    '9': 'UE9',
    '200': 'Digit'
};
exports.DRIVER_DEVICE_TYPE_NAMES = {
    '3': 'LJM_dtU3',
    '6': 'LJM_dtU6',
    '7': 'LJM_dtT7',
    '9': 'LJM_dtUE9',
    '200': 'LJM_dtDIGIT'
};

exports.DEVICE_TYPE_NAMES_BY_DRIVER_NAME = {
    'LJM_dtU3': 'U3',
    'LJM_dtU6': 'U6',
    'LJM_dtT7': 'T7',
    'LJM_dtUE9': 'UE9',
    'LJM_dtDIGIT': 'Digit'
};

exports.DRIVER_CONNECTION_TYPE_NAMES = {
    '0': 'LJM_ctANY',
    '1': 'LJM_ctUSB',
    '2': 'LJM_ctTCP',
    '3': 'LJM_ctETHERNET',
    '4': 'LJM_ctWIFI'
};
exports.CONNECTION_TYPE_NAMES = {
    '0': 'Any',
    '1': 'USB',
    '2': 'TCP',
    '3': 'Ethernet',
    '4': 'WiFi'
};
exports.WIFI_STATUS_DISPLAY_DATA = {
    2900: {'display':true,'str':'Associated'},
    2901: {'display':true,'str':'Associating'},
    2902: {'display':true,'str':'Association Failed'},
    2903: {'display':false,'str':'Un-Powered'},
    2904: {'display':true,'str':'Booting Up'},
    2905: {'display':true,'str':'Could Not Start'},
    2906: {'display':true,'str':'Applying Settings'},
    2907: {'display':true,'str':'DHCP Started'},
    2908: {'display':true,'str':'Unknown'},
    2909: {'display':true,'str':'Other'}
};

exports.serialNumberOffsets = {
	'LJM_dtT7': 470010000,
	'LJM_dtDIGIT': 220010000,
};

// Error codes for the device_curator:
exports.LJN_DEVICE_NOT_CONNECTED = 99999;
exports.device_curator_constants = {
	'DEVICE_DISCONNECTED': 'DEVICE_DISCONNECTED',
	'DEVICE_RECONNECTED': 'DEVICE_RECONNECTED',
	'DEVICE_ERROR': 'DEVICE_ERROR',
};


// Event codes for the device_scanner, ljswitchboard-device_scanner
exports.device_scanner = {
	'DEVICE_FOUND': 'DEVICE_FOUND'
};