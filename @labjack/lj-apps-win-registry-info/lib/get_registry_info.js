
/* Require external libraries */
var async = require('async');
var Registry = require('winreg');


function getLJAppRegistryInfo(appName, cb) {
  var regKey = new Registry({
    hive: Registry.HKCU,
    key: '\\Software\\LabJack\\' + appName,
  });

  regKey.values(function (err, items) {
    var returnInfo = {
      // 'isFound': false,
    };
    if(err) {
    } else {
      for (var i=0; i<items.length; i++) {
        // returnInfo.isFound = true;
        returnInfo[items[i].name] = items[i].value;
        // returnInfo[items[i].name].value = items[i].value;
        // returnInfo[items[i].name].type = items[i].type;
      }
    }
    cb(err, returnInfo);
  });
}

function getLJAppsRegistryInfo(appNames, finalCB) {
  var returnData = {};
  async.each(
    appNames,
    function(appName, cb) {
      getLJAppRegistryInfo(appName, function(err, info) {
        if(err) {
          // Do Nothing...
        } else {
          returnData[appName] = info;
        }
        cb();
      });
    },
    function(err) {
      finalCB(err, returnData);
    }
  );
}

exports.getLJAppRegistryInfo = getLJAppRegistryInfo;
exports.getLJAppsRegistryInfo = getLJAppsRegistryInfo;
exports.ljAppNames = [
  'LJStreamM',
  'LJLogM',
  'LJLogUD',
  'LJStreamUD',
  'Otero',
  'T7 uSD',
];