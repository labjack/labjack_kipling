
var ref = require('ref');       //Load variable type module
var driver_const = require('ljswitchboard-ljm_driver_constants');

var ljTypeMap = {
    // These argument types are basic data types and are the easiest to parse.
    'string':       'string',
    'char':         'char',
    'uint':         'uint',
    'int':          'int',
    'double':       'double',
    
    // These argument types are pointers.  They require data to be moved in
    // and out of buffer objects.  They are essentially arrays of length 1.
    'char*':        ref.refType(ref.types.char),
    'uint*':        ref.refType(ref.types.uint),
    'int*':         ref.refType(ref.types.int),
    'double*':      ref.refType(ref.types.double),

    // These argument types are arrays.  Unlike their pointer counterparts,
    // they require a "length".  The pointers are essentially length of 1.
    'a-char*':      ref.refType(ref.types.char),
    'a-uint*':      ref.refType(ref.types.uint),
    'a-int*':       ref.refType(ref.types.int),
    'a-double*':    ref.refType(ref.types.double),

    // These argument types are arrays of arrays or arrays of pointers.
    'char**':       ref.refType(ref.types.CString),
    'a-char**':     ref.refType(ref.types.CString),
};
exports.ljTypeMap = ljTypeMap;

var ARCH_CHAR_NUM_BYTES = 1;
var ARCH_INT_NUM_BYTES = driver_const.ARCH_INT_NUM_BYTES;
var ARCH_DOUBLE_NUM_BYTES = driver_const.ARCH_DOUBLE_NUM_BYTES;
var ARCH_POINTER_SIZE = driver_const.ARCH_POINTER_SIZE;


var ljTypeOps = {};
ljTypeOps.string = {
    'allocate': function(userData) {
        return userData;
    },
    'fill': function(buffer, userData) {
        return userData;
    },
    'parse': function(buffer) {
        return buffer;
    }
    // 'allocate': function(userData) {
    //     var strBuffer = new Buffer(userData.length + 1);
    //     strBuffer.fill(0);
    //     return strBuffer;
    // },
    // 'fill': function(buffer, userData) {
    //     buffer.write(userData, 0, userData.length, 'ascii');
    //     return buffer;
    // },
    // 'parse': function(strBuffer) {
    //     var receivedStrData = strBuffer.toString(
    //         'ascii'
    //     );
    //     var parsedStr = '';
    //     for ( var i = 0; i < receivedStrData.length; i++ ) {
    //         if ( receivedStrData.charCodeAt(i) === 0 ) {
    //             break;
    //         } else {
    //             parsedStr += receivedStrData[i];
    //         }
    //     }
    //     return parsedStr;
    // }
};
ljTypeOps.char = {
    'allocate': function(userData) {
        return userData;
    },
    'fill': function(buffer, userData) {
        return userData;
    },
    'parse': function(buffer) {
        return buffer;
    }
};
ljTypeOps.uint = {
    'allocate': function(userData) {
        return userData;
    },
    'fill': function(buffer, userData) {
        return userData;
    },
    'parse': function(buffer) {
        return buffer;
    }
};
ljTypeOps.int = {
    'allocate': function(userData) {
        return userData;
    },
    'fill': function(buffer, userData) {
        return userData;
    },
    'parse': function(buffer) {
        return buffer;
    }
};
ljTypeOps.double = {
    'allocate': function(userData) {
        return userData;
    },
    'fill': function(buffer, userData) {
        return userData;
    },
    'parse': function(buffer) {
        return buffer;
    }
};

// Handling data type pointer variants is the same way as the standard
// data types.
ljTypeOps['char*'] = {
    'allocate': function(userData) {
        var strBuffer = new Buffer(driver_const.LJM_MAX_STRING_SIZE);
        strBuffer.fill(0);
        return strBuffer;
    },
    'fill': function(buffer, userData) {
        if ( userData.length <= driver_const.LJM_MAX_STRING_SIZE ) {
            buffer.write(userData, 0, userData.length, 'utf8');
        } else {
            buffer.write(
                userData,
                0,
                driver_const.LJM_MAX_STRING_SIZE,
                'utf8'
            );
        }
        return buffer;
    },
    'parse': function(strBuffer) {
        var receivedStrData = strBuffer.toString(
            'utf8',
            0,
            driver_const.LJM_MAX_STRING_SIZE
        );
        var parsedStr = '';
        for ( var i = 0; i < receivedStrData.length; i++ ) {
            if ( receivedStrData.charCodeAt(i) === 0 ) {
                break;
            } else {
                parsedStr += receivedStrData[i];
            }
        }
        return parsedStr;
    }
};

ljTypeOps['uint*'] = {
    'allocate': function(userData) {
        var buffer = ref.alloc('uint32', 1);
        buffer.fill(0);
        return buffer;
    },
    'fill': function(buffer, userData) {
        buffer.writeUInt32LE(userData, 0);
        return buffer;
    },
    'parse': function(buffer) {
        return buffer.readUInt32LE(0);
    }
};
ljTypeOps['int*'] = {
    'allocate': function(userData) {
        var buffer = ref.alloc('int', 1);
        buffer.fill(0);
        return buffer;
    },
    'fill': function(buffer, userData) {
        buffer.writeInt32LE(userData, 0);
        return buffer;
    },
    'parse': function(buffer) {
        return buffer.readInt32LE(0);
    }
};
ljTypeOps['double*'] = {
    'allocate': function(userData) {
        var buffer = ref.alloc('double', 1);
        buffer.fill(0);
        return buffer;
    },
    'fill': function(buffer, userData) {
        buffer.writeDoubleLE(userData, 0);
        return buffer;
    },
    'parse': function(buffer) {
        return buffer.deref();
    }
};

// Handling the array based data types is very different...
ljTypeOps['a-char*'] =  {
    'allocate': function(userData) {
        var charArray = new Buffer(ARCH_CHAR_NUM_BYTES * userData.length);
        charArray.fill(0);
        return charArray;
    },
    'fill': function(buffer, userData) {
        var i = 0;
        var offset = 0;
        for ( i = 0; i < userData.length; i++ ) {
            buffer.writeUInt8(userData[i], offset);
            offset += ARCH_CHAR_NUM_BYTES;
        }
        return buffer;
    },
    'parse': function(buffer) {
        var charArray = [];
        var length = buffer.length/ARCH_CHAR_NUM_BYTES;
        var i = 0;
        var offset = 0;
        for ( i = 0; i < length; i++ ) {
            charArray.push(buffer.readUInt8(offset));
            offset += ARCH_CHAR_NUM_BYTES;
        }
        return charArray;
    },
};
ljTypeOps['a-uint*'] =  {
    'allocate': function(userData) {
        var uintArray = new Buffer(ARCH_INT_NUM_BYTES * userData.length);
        uintArray.fill(0);
        return uintArray;
    },
    'fill': function(buffer, userData) {
        var i = 0;
        var offset = 0;
        for ( i = 0; i < userData.length; i++ ) {
            buffer.writeUInt32LE(userData[i], offset);
            offset += ARCH_INT_NUM_BYTES;
        }
        return buffer;
    },
    'parse': function(buffer) {
        var uintArray = [];
        var length = buffer.length/ARCH_INT_NUM_BYTES;
        var i = 0;
        var offset = 0;
        for ( i = 0; i < length; i++ ) {
            uintArray.push(buffer.readUInt32LE(offset));
            offset += ARCH_INT_NUM_BYTES;
        }
        return uintArray;
    },
};
ljTypeOps['a-int*'] =  {
    'allocate': function(userData) {
        var intArray = new Buffer(ARCH_INT_NUM_BYTES * userData.length);
        intArray.fill(0);
        return intArray;
    },
    'fill': function(buffer, userData) {
        var i = 0;
        var offset = 0;
        for ( i = 0; i < userData.length; i++ ) {
            buffer.writeInt32LE(userData[i], offset);
            offset += ARCH_INT_NUM_BYTES;
        }
        return buffer;
    },
    'parse': function(buffer) {
        var intArray = [];
        var length = buffer.length/ARCH_INT_NUM_BYTES;
        var i = 0;
        var offset = 0;
        for ( i = 0; i < length; i++ ) {
            intArray.push(buffer.readInt32LE(offset));
            offset += ARCH_INT_NUM_BYTES;
        }
        return intArray;
    },
};
ljTypeOps['a-double*'] =  {
    'allocate': function(userData) {
        var doubleArray = new Buffer(ARCH_DOUBLE_NUM_BYTES * userData.length);
        doubleArray.fill(0);
        return doubleArray;
    },
    'fill': function(buffer, userData) {
        var i = 0;
        var offset = 0;
        for ( i = 0; i < userData.length; i++ ) {
            buffer.writeDoubleLE(userData[i], offset);
            offset += ARCH_DOUBLE_NUM_BYTES;
        }
        return buffer;
    },
    'parse': function(buffer) {
        var doubleArray = [];
        var length = buffer.length/ARCH_DOUBLE_NUM_BYTES;
        var i = 0;
        var offset = 0;
        for ( i = 0; i < length; i++ ) {
            doubleArray.push(buffer.readDoubleLE(offset));
            offset += ARCH_DOUBLE_NUM_BYTES;
        }
        return doubleArray;
    },
};

ljTypeOps['char**'] =  {
    'allocate': function(userData) {
        var length = userData.length;
        var i = 0;
        var offset = 0;

        //ref: http://tootallnate.github.io/ref/
        var pointerArray = new Buffer(ARCH_POINTER_SIZE*length);
        pointerArray.fill(0);
        return pointerArray;
    },
    'fill':function(buffer, userData) {
        var length = userData.length;
        var i = 0;
        var offset = 0;

        for ( i = 0; i < length; i++ ) {
            var buf = new Buffer(userData[i].length + 1);
            buf.fill(0);
            ref.writeCString(buf, 0, userData[i]);
            ref.writePointer(buffer, offset, buf);
            offset += ARCH_POINTER_SIZE;
        }
        return buffer;
    },
    'parse': function(buffer) {
        var parsedDataArray = [];
        var length = buffer.length/ARCH_POINTER_SIZE;
        var i = 0;
        var offset = 0;
        for ( i = 0; i < length; i ++) {
            // Reading pointers is scary.  With the provided info. the actual
            // size of the array being read is unknown.  We will just read
            // the max string size worth of data and hope that it is null
            // terminated.... ummm.... yeah....
            var pointerSize = driver_const.LJM_MAX_STRING_SIZE;
            var buf = ref.readPointer(buffer, offset, pointerSize);

            // Leaving these comments here.  
            // console.log('Buf', buf); // Prints out the read buffer.  SUPER long.
            var str = ref.readCString(buf, 0);
            // Prints out the parsed string.  This is where a buffer overflow
            // attack would happen.  Ugh... I hope this is safe...
            // console.log('String "' + str + '"');
            parsedDataArray.push(str);
            offset += ARCH_POINTER_SIZE;
        }

        return parsedDataArray;
    },
};
ljTypeOps['a-char**'] = ljTypeOps['char**'];

exports.ljTypeOps = ljTypeOps;

function convertToFFIType(ljType) {
    if ( ljTypeMap[ljType] ) {
        return ljTypeMap[ljType];
    } else {
        console.log('!!! Undefined Type:', ljType);
    }
}
exports.convertToFFIType = convertToFFIType;
