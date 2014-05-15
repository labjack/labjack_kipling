/**
 * Low level LJM dynamic library interface as provided by ffi.
 *
 * @author Chris Johnson (chrisjohn404, LabJack Corp.)
 */

var ffi = require('ffi');       //load _______ module 
var ref = require('ref');       //Load variable type module
var fs = require('fs');         //Load File System module
var jsonConstants = require('./json_constants_parser');

/**
 * Global Variables:
 */
var driver_const = require('./driver_const');

var LIBRARY_LOC = {
    'linux': 'libLabJackM.so',
    'linux2': 'libLabJackM.so',
    'sunos': 'libLabJackM.so',
    'solaris': 'libLabJackM.so',
    'freebsd': 'libLabJackM.so',
    'openbsd': 'libLabJackM.so',
    'darwin': 'libLabJackM.dylib',
    'mac': 'libLabJackM.dylib',
    'win32': 'LabJackM.dll'
}[process.platform]

//create FFI'd versions of the liblabjackLJM library
var liblabjack = ffi.Library(LIBRARY_LOC,
    {
        'LJM_AddressesToMBFB': [
            'int', [
                'int',                          //MaxBytesPerMBFB
                ref.refType(ref.types.int),     //aAddresses
                ref.refType(ref.types.int),     //aTypes
                ref.refType(ref.types.int),     //aWrites
                ref.refType(ref.types.int),     //aNumValues
                ref.refType(ref.types.double),  //aValues
                ref.refType(ref.types.int),     //NumFrames
                ref.refType(ref.types.char)     //aMBFBCommand
            ]
        ],

        'LJM_MBFBComm': [
            'int', [
                'int',                          //Handle
                'char',                         //UnitID
                ref.refType(ref.types.char),    //aMBFB
                ref.refType(ref.types.int)      //ErrorAddress
            ]
        ],

        'LJM_UpdateValues': [
            'int', [
                ref.refType(ref.types.char),    //aMBFBResponse
                ref.refType(ref.types.int),     //aTypes
                ref.refType(ref.types.int),     //aWrites
                ref.refType(ref.types.int),     //aNumValues
                'int',                          //NumFrames
                ref.refType(ref.types.double)   //aValues
            ]
        ],
        'LJM_NamesToAddresses': [
            'int', [
                'int',                          //NumFrames
                ref.refType('string'),          //Names
                ref.refType(ref.types.int),     //aAddresses
                ref.refType(ref.types.int)      //aTypes
            ]
        ],
        'LJM_NameToAddress': [
            'int', [
                'string',                       //Name
                ref.refType(ref.types.int),     //Address
                ref.refType(ref.types.int)      //Type
            ]
        ],
        'LJM_AddressesToTypes': [
            'int', [
                'int',                          //NumAddress
                ref.refType(ref.types.int),     //aAddresses
                ref.refType(ref.types.int)      //aTypes
            ]
        ],
        'LJM_AddressToType': [
            'int', [
                'int',                          //Address
                ref.refType(ref.types.int)      //Type
            ]
        ],
        'LJM_ListAll': [
            'int', [
                'int',                          //DeviceType
                'int',                          //Connection Type
                ref.refType(ref.types.int),     //numFound
                ref.refType(ref.types.int),     //aDeviceTypes
                ref.refType(ref.types.int),     //aConnectionTypes
                ref.refType(ref.types.int),     //aSerialNumbers
                ref.refType(ref.types.int)      //aIPAddresses
            ]
        ],
        'LJM_ListAllS': [
            'int', [
                'string',                       //DeviceType
                'string',                       //Connection Type
                ref.refType(ref.types.int),     //numFound
                ref.refType(ref.types.int),     //aDeviceTypes
                ref.refType(ref.types.int),     //aConnectionTypes
                ref.refType(ref.types.int),     //aSerialNumbers
                ref.refType(ref.types.int)      //aIPAddresses
            ]
        ],
        'LJM_ListAllExtended': [
            'int', [
                'int',                          //DeviceType
                'int',                          //Connection Type
                'int',                          //NumAddresses
                ref.refType(ref.types.int),     //aAddresses
                ref.refType(ref.types.int),     //aNumRegs
                'int',                          //MaxNumFound
                ref.refType(ref.types.int),     //NumFound
                ref.refType(ref.types.int),     //aDeviceTypes
                ref.refType(ref.types.int),     //aConnectionTypes
                ref.refType(ref.types.int),     //aSerialNumbers
                ref.refType(ref.types.int),     //aIPAddresses
                ref.refType(ref.types.char)     //aAddresses
            ]
        ],
        'LJM_Open': [
            'int', [
                'int',                          //DeviceType
                'int',                          //ConnectionType
                'string',                       //Identifier
                ref.refType(ref.types.int)      //handle
            ]
        ],
        'LJM_OpenS': [
            'int', [
                'string',                       //DeviceType
                'string',                       //ConnectionType
                'string',                       //Identifier
                ref.refType(ref.types.int)      //Handle
            ]
        ],
        'LJM_GetHandleInfo': [
            'int', [
                'int',                          //Handle
                ref.refType(ref.types.int),     //DeviceType
                ref.refType(ref.types.int),     //ConnectionType
                ref.refType(ref.types.int),     //SerialNumber
                ref.refType(ref.types.int),     //IPAddress
                ref.refType(ref.types.int),     //Port
                ref.refType(ref.types.int)      //MaxBytesPerMB
            ]
        ],
        'LJM_ErrorToString': [
            'int', [
                'int',                          //ErrCode
                ref.refType(ref.types.char)     //ErrString
            ]
        ],
        'LJM_LoadConstants': [
            'int', []                           //No Args
        ],
        'LJM_Close': [
            'int', [
                'int'                           //Handle
            ]
        ],
        'LJM_CloseAll': [
            'int', []                           //No Args
        ],
        'LJM_WriteRaw': [
            'int', [
                'int',                          //Handle
                ref.refType(ref.types.char),    //aData
                'int'                           //NumBytes
            ]
        ],
        'LJM_ReadRaw': [
            'int', [
                'int',                          //Handle
                ref.refType(ref.types.char),    //aData
                'int'                           //NumBytes
            ]
        ],
        'LJM_eWriteAddress': [
            'int', [
                'int',                          //Handle
                'int',                          //Address
                'int',                          //Type
                'double'                        //Value
            ]
        ],
        'LJM_eReadAddress': [
            'int', [
                'int',                          //Handle
                'int',                          //Address
                'int',                          //Type
                ref.refType('double')           //Value (ptr)
            ]
        ],
        'LJM_eWriteName': [
            'int', [
                'int',                          //Handle
                'string',                       //Name
                'double'                        //Value
            ]
        ],
        'LJM_eReadName': [
            'int', [
                'int',                          //Handle
                'string',                       //Name
                ref.refType(ref.types.double)   //Value (ptr)
            ]
        ],
        'LJM_eReadAddresses': [
            'int', [
                'int',                          //Handle
                'int',                          //NumFrames (Number of Registers being accessed)
                ref.refType(ref.types.int),     //Addresses (Registers to read from)
                ref.refType(ref.types.int),     //Types
                ref.refType('double'),          //aValues (Readings)
                ref.refType(ref.types.int)      //ErrorAddress
            ]
        ],
        'LJM_eReadNames': [
            'int', [
                'int',                          //Handle
                'int',                          //NumFrames (Number of Registers being accessed)
                ref.refType(ref.types.CString), //aNames (Registers to read from)
                ref.refType(ref.types.double),  //aValues (Readings)
                ref.refType(ref.types.int)      //ErrorAddress
            ]
        ],
        'LJM_eWriteAddresses': [
            'int', [
                'int',                          //Handle
                'int',                          //NumFrames (Number of Registers being accessed)
                ref.refType(ref.types.int),     //aAddresses (Registers to write to)
                ref.refType(ref.types.int),     //aTypes
                ref.refType('double'),  //aValues (Values to write)
                ref.refType(ref.types.int)      //ErrorAddress
            ]
        ],
        'LJM_eWriteNames': [
            'int', [
                'int',                          //Handle
                'int',                          //NumFrames (Number of Registers being accessed)
                ref.refType(ref.types.CString), //aNames (Registers to write to)
                ref.refType('double'),          //aValues (Values to write)
                ref.refType(ref.types.int)      //ErrorAddress
            ]
        ],
        'LJM_eAddresses': [
            'int', [
                'int',                          //Handle
                'int',                          //NumFrames
                ref.refType(ref.types.int),     //aAddresses
                ref.refType(ref.types.int),     //aTypes
                ref.refType(ref.types.int),     //aWrites (Directions)
                ref.refType(ref.types.int),     //aNumValues
                ref.refType(ref.types.double),  //aValues
                ref.refType(ref.types.int)      //ErrorAddress
            ]
        ],
        'LJM_eNames': [
            'int', [
                'int',                          //Handle
                'int',                          //NumFrames
                ref.refType(ref.types.CString), //aNames
                ref.refType(ref.types.int),     //aWrites (Directions)
                ref.refType(ref.types.int),     //aNumValues
                ref.refType(ref.types.double),  //aValues
                ref.refType(ref.types.int)      //ErrorAddress
            ]
        ],
        'LJM_eStreamStart': [
            'int', [
                'int',                          //Handle
                'int',                          //ScansPerRead
                'int',                          //NumChannels
                ref.refType(ref.types.double),  //aScanList_Pos
                ref.refType(ref.types.int)      //ScanRate
            ]
        ],
        'LJM_eStreamRead': [
            'int', [
                'int',                          //Handle
                ref.refType(ref.types.int),     //aData
                ref.refType(ref.types.double),  //DeviceScanBacklog (ptr)
                ref.refType(ref.types.int)      //LJMScanBacklog (ptr)
            ]
        ],
        'LJM_eStreamStop': [
            'int', [
                'int'                           //Handle
            ]
        ],
        'LJM_eReadNameString': [
            'int', [
                'int',                          //Handle
                'string',                       //Name
                ref.refType(ref.types.char)     //String
            ]
        ],
        'LJM_eReadAddressString': [
            'int', [
                'int',                          //Handle
                'int',                          //Address
                ref.refType(ref.types.char)     //String
            ]
        ],
        'LJM_eWriteNameString': [
            'int', [
                'int',                          //Handle
                'string',                       //Name
                ref.refType(ref.types.char)     //String
            ]
        ],
        'LJM_eWriteAddressString': [
            'int', [
                'int',                          //Handle
                'int',                          //Address
                ref.refType(ref.types.char)     //String
            ]
        ],
        'LJM_WriteLibraryConfigS': [
            'int', [
                'string',                       //Parameter
                'double'                        //Value
            ]
        ],
        'LJM_WriteLibraryConfigStringS': [
            'int', [
                'string',                       //Parameter
                'string'                        //String
            ]
        ],
        'LJM_ReadLibraryConfigS': [
            'int', [
                'string',                       //Attribute
                ref.refType(ref.types.double)   //Return-VarPtr
            ]
        ],
        'LJM_ReadLibraryConfigStringS': [
            'int', [
                'string',                       //Parameter
                'string'                        //String
            ]
        ],
        'LJM_Log': [
            'int', [
                'int',                          //Level
                'string'                        //Return-VarPtr
            ]
        ],
        'LJM_ResetLog': [
            'int', []                           //No Args
        ]
    }
);
exports.getDriver = function()
{
    return liblabjack;
}
exports.getConstants = function()
{
    return jsonConstants.getConstants();
}
exports.parseRegisterNameString = function (name)
{
    return parseRegisterNameString(name);
}

/*
LJM_SEND_RECEIVE_TIMEOUT_MS
LJM_OPEN_TCP_DEVICE_TIMEOUT_MS
LJM_LOG_MODE
LJM_LOG_LEVEL
LJM_LIBRARY_VERSION
LJM_ALLOWS_AUTO_MULTIPLE_FEEDBACKS
LJM_ALLOWS_AUTO_CONDENSE_ADDRESSES
LJM_OPEN_MODE
LJM_NAME_CONSTANTS_FILE
LJM_ERROR_CONSTANTS_FILE
LJM_LOG_FILE
LJM_CONSTANTS_FILE
LJM_MAX_LOG_FILE_SIZE
LJM_STREAM_TRANSFERS_PER_SECOND
LJM_RETRY_ON_TRANSACTION_ID_MISMATCH
*/
