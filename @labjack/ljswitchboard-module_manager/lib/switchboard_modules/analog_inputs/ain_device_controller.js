var async = require('async');
var q = require('q');

var ainDeviceController = new AINDeviceWrapper();


var generateCheckErrorAndFinish = function (deferred)
{
    return function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve();
        }
    };
};


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

        var deferred = q.defer();

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

        var checkErrorAndFinish = generateCheckErrorAndFinish(deferred);
        async.eachSeries(connectedDevices, processDevice, checkErrorAndFinish);

        return deferred.promise;
    };

    this.setConnectedDevices = function (newConnectedDevices) {
        connectedDevices = newConnectedDevices;
        return setAINRanges();
    };

    this.addAINRange = function (ainNum, rangeConstant) {
        ainRanges.push({ ainNum: ainNum, rangeConstant: rangeConstant });
    };

    this.getAINValues = function () {
        var deferred = q.defer();
        var valuesByAIN = {};
        var numAINRanges = ainRanges.length;
        
        for (var i=0; i<numAINRanges; i++) {
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
                function (err) { callback(err); }
            );
        };

        return deferred.promise;
    };
}