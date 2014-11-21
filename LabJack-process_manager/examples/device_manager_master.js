var dict = require('dict');
var q = require('q');
var async = require('async');

var process_manager = require('./process_manager');
var managedProcess;




// function createNewDeviceManager() {
//     var self = this;
// }
// var deviceManager;

exports.createManager = function() {
    // deviceManager = new createNewDeviceManager();
    managedProcess = new process_manager.master_process();
    process_manager.init();
    
    return process_manager.startChildProcess('./device_manager_slave',{'title': 'AA_T1'});
};
exports.sendReceive = function(m) {
    return process_manager.sendReceive(m);
};
exports.sendTestMessage = function() {
    var sendTestMessageDefered = q.defer();
    process_manager.qSendMessage({'arbitraryData': 'testMessage from master'})
    .then(function(res) {
        print('sendTestMessage success', res);
        sendTestMessageDefered.resolve(res);
    }, function(err) {
        print('sendTestMessage error', err);
        sendTestMessageDefered.reject(err);
    });
    return sendTestMessageDefered.promise;
};
exports.stopManager = function() {
    return process_manager.qStop();
};
