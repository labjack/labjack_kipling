const async = require('async');

const ainDeviceController = new AINDeviceWrapper();

var createDeviceWritter = function (ainRanges, device) {

    var addresses = ainRanges.map(function (e) { 
        return e.ainNum * 2 + START_RANGE_CONFIG_ADDR;
    });

    var ranges = ainRanges.map(function (e) {
        return e.rangeConstant;
    });

    return function (device) {
        return device.writeMany(addresses, ranges);
    };
};


function AINDeviceWrapper()
{
    var connectedDevices = [];
    var ainRanges = [];

    this.setAINRanges = function () {

        return new Promise((resolve, reject) => {
            var setAINRangesDevice = createDeviceWritter(ainRanges);

            var processDevice = function (device, callback) {
                setAINRangesDevice(device).then(
                    function () {
                        callback(null);
                    },
                    function (err) {
                        callback(err);
                    }
                );
            };

            var checkErrorAndFinish = function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            };
            async.eachSeries(connectedDevices, processDevice, checkErrorAndFinish);
        });
    };

    this.setConnectedDevices = (newConnectedDevices) => {
        connectedDevices = newConnectedDevices;
        return this.setAINRanges();
    };

    this.getAINValues = function () {
        return new Promise((resolve, reject) => {
            var valuesByAIN = {};
            var numAINRanges = ainRanges.length;

            for (var i = 0; i < numAINRanges; i++) {
                valuesByAIN[ainRanges[i].ainNum] = {};
            }

            var processDevice = function (device, callback) {
                getAINValuesForDevice(device).then(
                    function (values) {
                        async.each(
                            values,
                            function (item, innerCallback) {
                                var valueIndex = valuesByAIN[item.ainNum];
                                valueIndex[device.getSerial()] = item.val;
                            },
                            function (err) {
                                if (err)
                                    throw new Error(err);
                            }
                        );
                    },
                    function (err) {
                        callback(err);
                    }
                );
            };
        });
    };
}