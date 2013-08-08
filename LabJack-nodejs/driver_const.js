

exports.LJM_JS_VERSION = 0.0245;
exports.LJM_DRVR_VERSION = '0.2.45';
exports.LJM_DT_ANY = 0;
exports.LJM_DT_UE9 = 9;
exports.LJM_DT_U3 = 3;
exports.LJM_DT_U6 = 6;
exports.LJM_DT_T7 = 7;
exports.LJM_DT_SKYMOTE_BRIDGE = 1000;
exports.LJM_DT_DIGIT = 200;

//Connection Types
exports.LJM_CT_ANY = 0;
exports.LJM_CT_USB = 1;
exports.LJM_CT_TCP = 2;
exports.LJM_CT_ETHERNET = 3;
exports.LJM_CT_WIFI = 4;

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

exports.T7_HDR_FLASH_PAGE_ERASE				= 1;
exports.T7_IMG_FLASH_PAGE_ERASE				= 120;
exports.T7_IMG_HEADER_LENGTH				= 128;

//Other
exports.T7_MA_EXF_KEY						= 61800;
exports.T7_MA_EXF_pREAD						= 61810;
exports.T7_MA_EXF_READ						= 61812;
exports.T7_MA_EXF_ERASE						= 61820;
exports.T7_MA_EXF_WRITE						= 61830;


//FIRMWARE UPGRADING CONSTANTS DIGIT
//==============================================
exports.DIGIT_TARGET						= 100200000;
// Codes

//==============================================
//==============================================
