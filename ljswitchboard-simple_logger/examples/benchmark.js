console.log('logger.js!!');
console.log('');
console.log('***************************');
console.log('This example requires there to be atleast 1 LJ device available (ANY,ANY,ANY).');
console.log('***************************');
console.log('');

//Require LabJack-nodejs
var ljn = require('labjack-nodejs');
var fs = require('fs');
var path = require('path');
var q = require('q');
 
//Device object (to control a LabJack device)c
var createDeviceObject = ljn.getDevice();
 
//Device object (to control a LabJack device)
var device = new createDeviceObject();


// Open a device
// device.closeSync();
// Zander - TODO - this will need to be looked at when there is no other decieces on the internet.
this.activeDevice = openDevice(device);

// use this vv when or if this is implemented - Zander
// var sn = devices[0].savedAttributes.serialNumber;
// var sn = "470016039"; // Zander T7?
// var sn = "470010175" // Jimmy T7-Pro
var sn = "440011301" // Jimmy T4
var savedData = [];

// setting the file name & location
var fileName = "testThing"
// var selectedFilePath = 'D:/labjack/newLoggerTesting/'; // Zander File Path for Testing
var selectedFilePath = '/Users/jimmy/labjack_data_logger/'; // Jimmy File Path for Testing
 
// settting the length of how long the file will log
var runTime = 5;

// setting the registers that we will be using
var registers = ['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2']

// declare out config for the logging
var configObj = {
    "logging_config": {
        "name": "Basic Config Auto-Template",
        "file_prefix": "basic_config Auto-Template",
        "write_to_file": true,
        "default_result_view": "0",
        "default_result_file": "0",
        "runtimeInSeconds": runTime,
    },
    "view_config": {
        "update_rate_ms": 10
    },
    "basic_data_group": {
        "device_serial_numbers": [],
        "logging_options": {
            "write_to_file": true,
            "file_prefix": fileName,
            "max_samples_per_file": 5,
            "data_collector_config": {
                "REPORT_DEVICE_IS_ACTIVE_VALUES": true,
                "REPORT_DEFAULT_VALUES_WHEN_LATE": false
            }
        }
    },
};

const LOG_TO_FILE = true;
var connectedFile;
if (LOG_TO_FILE) {
    selectedFilePath = createFolderForLogFile(selectedFilePath);
    var folderFilePath = selectedFilePath;
    const filePath = selectedFilePath + configObj.basic_data_group.logging_options.file_prefix;
    var usableFilepath = filePath;
    connectedFile = establishConectionToFile(usableFilepath)
    initializeLogFile(registers, connectedFile)
}

var tempTime;
var tempCounter = 0;
var numberOfLoged = 0;

// initializeLogFile(registers, conectedFile)
// this should be trigering the file loging
ititalTempTime = process.hrtime();
configObj.view_config.update_rate_ms = configObj.view_config.update_rate_ms * 1000000
const stayHere = configObj.view_config.update_rate_ms
var elseCounter = 1;

let numLogged = 0;
let readTimings = [];
let writeTimings = [];
let totalTimings = [];
let intervalTimings = [];
// let registerList = ['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2', 'AIN3', 'AIN4', 'AIN5', 'AIN6']

let registerList = ['CORE_TIMER', 'DAC0']
const INTERVAL_TIME = 5; // ms
const INTERVAL_TIME_NS = INTERVAL_TIME * 1000000
const MAX_LOG_NUM = 1000;


standardInterval();

function standardInterval() {
    console.log("\n------------- Starting the Standard Interval -------------\n")
    let hrIntStart = process.hrtime();
    const interval = setInterval(function() {
        // Call the LogToFile function
        let hrIntervalTime = process.hrtime(hrIntStart);
        let s_ms = (hrIntervalTime[0] * 1000000000 + hrIntervalTime[1]) / 1000000;
        intervalTimings.push(s_ms);
        let exTime = logTofile(device, registerList, connectedFile);
        readTimings.push(exTime[0]);
        writeTimings.push(exTime[1]);
        totalTimings.push(exTime[0] + exTime[1])

        numLogged += 1;
        if(numLogged >= MAX_LOG_NUM){
            clearInterval(interval);
            calculateTimerData(readTimings, writeTimings, totalTimings, intervalTimings);
            numLogged = 0;
            readTimings = [];
            writeTimings = [];
            totalTimings = [];
            intervalTimings = [];
            customInterval();
            // closeDevice(device);
        }
    }, INTERVAL_TIME);
}


function customInterval() {
    //To-Do: Implemet a custom setInterval timing function
    // There are some issues with the accuracy of the JS built-in setInterval
    // Do we need to have a variable refresh rate here?
    console.log("\n------------- Starting the Custom Interval -------------\n")
    const hr_ms = hr => (hr[0] * 1000000000 + hr[1]) / 1000000; // convert hr time to total ms
    function adjust_hr(hr) {
        let max_ns = 1000000000
        let s =  hr[0];
        let ns = hr[1];
        let adj_ns = ns + INTERVAL_TIME_NS;
        let adj_s = s + Math.floor(adj_ns / max_ns);
        adj_ns = adj_ns % max_ns;
        return [adj_s, adj_ns]
    }
    const adjust_hr_ms = hr => ((hr[0] * 1000000000 + hr[1]) / 1000000) + INTERVAL_TIME;

    let hrStepStart = process.hrtime();
    let hrStepStartMs = hr_ms(hrStepStart) + INTERVAL_TIME;
    let adjHrStepStart = adjust_hr(hrStepStart) //[hrStepStart[0], hrStepStart[1] + INTERVAL_TIME_NS]
    var expected = adjHrStepStart;
    setTimeout(step, INTERVAL_TIME); // First iteration, with delay of INTERVAL_TIME ms
    // The custom implementation of setInterval (recursive function)
    function step() {
        numLogged += 1;
        if (numLogged < MAX_LOG_NUM){
            var now = process.hrtime(hrStepStart);
            var dt = process.hrtime(expected)
            if (hr_ms(now) > INTERVAL_TIME) {
                // If the function executed later then the defined interval 
                // console.log("--- Interval Drift ---");
            }
            let hrIntervalTime = process.hrtime(hrStepStart);
            let s_ms = (hrIntervalTime[0] * 1000000000 + hrIntervalTime[1]) / 1000000;
            intervalTimings.push(s_ms);
            let exTime = logTofile(device, registerList, connectedFile);
            readTimings.push(exTime[0]);
            writeTimings.push(exTime[1]);
            totalTimings.push(exTime[0] + exTime[1])

            adj_hr = adjust_hr(expected)
            expected = adj_hr
            let drift = INTERVAL_TIME  - hr_ms(dt)
            driftAdjustment = Math.max(0, drift) // either dont adjust (executing on schedule), or setInterval to adjust for time drift
            setTimeout(step, driftAdjustment) // execute step again, delay adjusted for the time drift
        } else {
            calculateTimerData(readTimings, writeTimings, totalTimings, intervalTimings);
            closeDevice(device);
        }
    }
}

function calculateTimerData(readTimings, writeTimings, totalTimings, intervalTimings){
    const average = array => array.reduce((a, b) => a + b) / array.length;
    const toHz = ms => ((1/ms) * 1000);
    const delta = ([x,...xs]) =>
        xs.reduce(([acc, last], x) => [[...acc, x-last], x], [[], x]);

    let readms = average(readTimings).toFixed(4);
    let writems = average(writeTimings).toFixed(4);
    let totalms = average(totalTimings).toFixed(4);
    let readhz = toHz(readms).toFixed(4);
    let writehz = toHz(writems).toFixed(4);
    let totalhz = toHz(totalms).toFixed(4);

    let targetms = INTERVAL_TIME
    let targethz = toHz(INTERVAL_TIME).toFixed(4);

    let intervalDelta = delta(intervalTimings)
    let avgIntervalDelta = average(intervalDelta[0]).toFixed(4);
    let avgIntervalDeltaHz = toHz(avgIntervalDelta).toFixed(4);
    let totalIntervalTime = intervalDelta[1];

    let intervalAccuracy = (average(intervalDelta[0])/(INTERVAL_TIME * 1.0)*100).toFixed(4);

    console.log("Target Refresh Rate:\t\t %d ms %d hz", targetms, targethz);
    console.log("Interval Delta:\t\t\t %d ms %d hz", avgIntervalDelta, avgIntervalDeltaHz);
    console.log("Interval Accuracy:\t\t %d%", intervalAccuracy)
    console.log("Average LJM Call Time:\t\t %d ms %d hz", readms, readhz);
    console.log("Average File Write Time:\t %d ms %d hz", writems, writehz);
    console.log("Average Total Execution Time:\t %d ms %d hz", totalms, totalhz);
}

// opening the device
function openDevice(device){
    try{
        device.openSync(
            'LJM_dtANY',
            'LJM_ctANY',
            'LJM_idANY',
        );
        console.log("Device Opened Successfully");
        return device;
    }
    catch(err){
        console.log("err:", err);
        return null;
    }
    
}
// Close the device
function closeDevice(device){
    try{
    // device.closeSync();
        device.close(
            function(res){
                console.log('Err:', res);
            },
            function(res){
                // console.log("ending time", process.hrtime())
                console.log('Device Closed Successfully');
            });
    }
    catch(err){
        console.log("did not close correctly", err)
    }
}

// asstablishing the conection to be able to save the value information
function establishConectionToFile(usableFilepath){
    try{
        for(var i = 1; fs.existsSync(usableFilepath + '.csv') == true; ++i){
            if(fs.existsSync(usableFilepath + '.csv') == false){
                usableFilepath = usableFilepath;
            }
            else if(fs.existsSync(usableFilepath + '.csv') == true && fs.existsSync(usableFilepath + "_" + i + '.csv') != true){
                usableFilepath = usableFilepath + "_" + i;
            }
        }
        usableFilepath += '.csv'
    } catch(err){
        console.error("unable to save to selected file location", err)
        // defer.resolve();
        usableFilepath += '.csv'
    }
    var file = fs.createWriteStream(usableFilepath);
    // console.log("file.on(open)", file)
    return file;
}

// This will be used to create the forlder inwich all of the csv files will be saved
function createFolderForLogFile(filepath){
    try{
        filepath = filepath + configObj.logging_config.name;
        for(var i = 1; fs.existsSync(filepath) == true; ++i){
            if(fs.existsSync(filepath) == false){
                filepath = filepath;
            }
            else if(fs.existsSync(filepath) == true && fs.existsSync(filepath + "_" + i) != true){
                filepath = filepath + "_" + i;
            }
        }
    } catch(err){
        console.error("unable to creat the file", err)
    }
    fs.mkdir(filepath,function(){});
    return filepath + "/";
}

// setting up the heder for the file
function initializeLogFile(registerName, file){
    file.write(configObj.basic_data_group.logging_options.file_prefix + "\n");
    file.write("SN: " + sn + "\n")
    file.write("Time" + ', ')
    file.write(registerName + "," + "hrtime seconds" + "," + "hrtime nanoseconds" + "\n")
}

function initializeLogFiles(registerName, file, iteration){
    file.write(configObj.basic_data_group.logging_options.file_prefix + "-" + iteration + "\n");
    file.write("SN: " + sn + "\n")
    file.write("Time" + ', ')
    file.write(registerName + "\n")
}

function logTofile(device, registers, file) {
    // var defered = q.defer();
    var writeData = [];
    var hrReadStart = process.hrtime();
    let readData = device.readManySync(registers);
    // device.readMany(registerList)
    // .then(function(results) {
    //     console.log('readMany Results', registerList, results);
    // }, function(err) {
    //     console.log('readMany Error', err);
    // });
	// defered.resolve();
    var hrReadEnd = process.hrtime(hrReadStart);
    // console.info('Read Registers Execution time (hr): %ds %dms', hrReadEnd[0], hrReadEnd[1] / 1000000);

    var hrWriteStart = process.hrtime();
    file.write(readData+'\n');
    var hrWriteEnd = process.hrtime(hrWriteStart);
    // console.info('Write Registers Execution time (hr): %ds %dms', hrWriteEnd[0], hrWriteEnd[1] / 1000000)

    let exTime = ((hrReadEnd[1] + hrWriteEnd[1]) / 1000000);
    return [(hrReadEnd[1] / 1000000), (hrWriteEnd[1] / 1000000)];
    return null;
    return defered.promise;
}
