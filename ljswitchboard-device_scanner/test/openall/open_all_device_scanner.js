// open_all_device_scanner.js

// Unit tests for the unitTestExports object (as exported from
// ljswitchboard-device_scanner/lib/open_all_device_scanner.js).
var assert = require('chai').assert;

var unitTestExports;
var open_all_device_scanner = require('../../lib/open_all_device_scanner');

const TEST_ERROR_DISCOVERED = {
    "errorCode": 1298,
    "errorMessage": "Error while loading device attributes",
    "device": {
        "deviceType": 7,
        "firmware": "1.0188",
        "ip": "192.168.1.207",
        "ljmConnectionType": 2,
        "name": "Quantum Parallax Flux Detector T7 (in break room)",
        "port": 502,
        "serialNumber": 470010610,
        "usableMaxPacketBytes": 1040
    },
    "initFailure": {
        "deviceHints":
        {
            "knownDeviceType": 7,
            "initProtocol": "TCP",
            "ip": "192.168.1.207",
            "initPort": 502,
            "discovered": true
        },
        "attributeLoadFailures" : [
            {
                "attributeAddress" : 60004,
                "attributeCount" : 1,
                "errorCode" : 1263
            },
        ],
        "attributeLoadSuccesses" : [
            {
                "attributeAddress" : 60028,
                "attributeCount" : 0,
                "attributeValue" : 470010610
            },
        ],
    },
};

const TEST_ERROR_1230 = {
    'device': {
        'deviceType': 7,
        'firmware': '1.0225',
        'ip': null,
        'ljmConnectionType': 1,
        'name': 'Was My_T7_0610',
        'port': null,
        'serialNumber': 470010610,
        'usableMaxPacketBytes': 64,
        'userHandle': 1,
    },
    'errorCode': 1230,
    'errorMessage': 'process \'./dual_ain_loop\' (pid 47573) has claimed USB connection to LJM_dtT7 with serial# 470010610 named Was My_T7_0610',
    'initFailure': null,
};

const TEST_ERROR_NOT_DISCOVERED = {
    "device" : null,
    "errorCode" : 1298,
    "errorMessage" : "Error while loading device attributes",
    "initFailure" : {
        "attributeLoadFailures" : [
            {
                "attributeAddress" : 49600,
                "attributeCount" : 0,
                "errorCode" : 1263,
            }
        ],
        "attributeLoadSuccesses" : [],
        "deviceHints" : {
            "discovered" : false,
            "initProtocol" : "UDP",
            "ip" : "192.168.1.236",
            "knownDeviceType" : 7,
            "port" : 52362,
        },
    }
};

function createTestOpenAllInfoJson() {
    return {
        "exceptions": [],
        "networkInterfaces": [],
        "specificIPs": [],
        "returnedDevices": [],
    };
}

function wrapOpenAllInfo(openAllInfo) {
    return {
        'errors': {
            'exceptions': openAllInfo.exceptions,
        }
    };
}

describe('open all device scanner', function() {
    it('Starting unitTestExports Test', function (done) {
        console.log('');
        console.log('*** Starting open_all_device_scanner.unitTestExports Test ***');

        unitTestExports = open_all_device_scanner.unitTestExports;

        done();
    });
	it('parseOutErroniusDevices sanity check', function (done) {
        assert.isOk(
            unitTestExports.hasOwnProperty('parseOutErroniusDevices'),
            'unitTestExports does not have property: parseOutErroniusDevices'
        );
        assert.equals(typeof unitTestExports.parseOutErroniusDevices, 'function');
        done();
    });
	it('parseOutErroniusDevices gets discovered error device', function (done) {
        var openAllInfo = createTestOpenAllInfoJson();
        openAllInfo.exceptions.push(TEST_ERROR_DISCOVERED);
        var errDevs = unitTestExports.parseOutErroniusDevices(
            wrapOpenAllInfo(openAllInfo)
        );
        assert.equals(errDevs.length, 1);
        done();
    });
	it('parseOutErroniusDevices gets 1230 error device', function (done) {
        var openAllInfo = createTestOpenAllInfoJson();
        openAllInfo.exceptions.push(TEST_ERROR_1230);
        var errDevs = unitTestExports.parseOutErroniusDevices(
            wrapOpenAllInfo(openAllInfo)
        );
        assert.equals(errDevs.length, 1);
        done();
    });
	it('parseOutErroniusDevices ignores not discovered error device', function (done) {
        var openAllInfo = createTestOpenAllInfoJson();
        openAllInfo.exceptions.push(TEST_ERROR_NOT_DISCOVERED);
        var errDevs = unitTestExports.parseOutErroniusDevices(
            wrapOpenAllInfo(openAllInfo)
        );
        assert.equals(errDevs.length, 0);
        done();
    });
	it('parseOutErroniusDevices combined', function (done) {
        var openAllInfo = createTestOpenAllInfoJson();
        openAllInfo.exceptions.push(TEST_ERROR_1230);
        openAllInfo.exceptions.push(TEST_ERROR_DISCOVERED);
        openAllInfo.exceptions.push(TEST_ERROR_NOT_DISCOVERED);
        var errDevs = unitTestExports.parseOutErroniusDevices(
            wrapOpenAllInfo(openAllInfo)
        );
        assert.equals(errDevs.length, 2);
        done();
    });
	it('parseOutErroniusDevices combined paranoid ordering', function (done) {
        var openAllInfo = createTestOpenAllInfoJson();
        openAllInfo.exceptions.push(TEST_ERROR_DISCOVERED);
        openAllInfo.exceptions.push(TEST_ERROR_NOT_DISCOVERED);
        openAllInfo.exceptions.push(TEST_ERROR_1230);
        var errDevs = unitTestExports.parseOutErroniusDevices(
            wrapOpenAllInfo(openAllInfo)
        );
        assert.equals(errDevs.length, 2);
        done();
    });
});
