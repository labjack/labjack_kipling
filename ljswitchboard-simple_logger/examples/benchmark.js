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
// var sn = "440017663"; // Zander T4
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

let registerList = ['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2', 'AIN3']
const INTERVAL_TIME = 5; // ms
const INTERVAL_TIME_NS = INTERVAL_TIME * 1000000
const MAX_LOG_NUM = 1000;

let exTime = (INTERVAL_TIME * MAX_LOG_NUM)/1000;
console.log ("Each Interval Will Run " + MAX_LOG_NUM + " samples at " + INTERVAL_TIME + " ms sample rate for " + exTime + " seconds");

// console.log("\n------------- Starting the While Interval -------------\n")
// let hrIntStart = process.hrtime();
// while (numLogged < MAX_LOG_NUM) {
//     let hrIntervalTime = process.hrtime(hrIntStart);
//     let s_ms = (hrIntervalTime[0] * 1000000000 + hrIntervalTime[1]) / 1000000;
//     intervalTimings.push(s_ms);
//     let exTime = logTofile(device, registerList, connectedFile);
//     readTimings.push(exTime[0]);
//     writeTimings.push(exTime[1]);
//     totalTimings.push(exTime[0] + exTime[1]);
//     numLogged += 1;
//     hrIntStart = process.hrtime();
// }
// calculateTimerData(readTimings, writeTimings, totalTimings, intervalTimings);
// numLogged = 0;
// readTimings = [];
// writeTimings = [];
// totalTimings = [];
// intervalTimings = [];
standardInterval();
// customInterval();
// performanceInterval();

function standardInterval() {
    lineseperatoe("Starting the Standard Interval", connectedFile)
    console.log("\n------------- Starting the Standard Interval -------------\n")
    const hr_ms = hr => (hr[0] * 1000000000 + hr[1]) / 1000000; // convert hr time to total ms
    function adjust_hr(hr) {
        let max_ns = 1000000000
        let s = hr[0];
        let ns = hr[1];
        let adj_ns = ns + INTERVAL_TIME_NS;
        let adj_s = s + Math.floor(adj_ns / max_ns);
        adj_ns = adj_ns % max_ns;
        return [adj_s, adj_ns]
    }
    let hrIntStart = process.hrtime();
    let adjHrStepStart = adjust_hr(hrIntStart);
    var expected = adjHrStepStart;
    var negDrift = 0;
    var prevTime = process.hrtime();
    var jitterTime = [];
    const interval = setInterval(function() {
        var dt = process.hrtime(expected)

        let hrIntervalTime = process.hrtime(hrIntStart);
        let s_ms = hr_ms(hrIntervalTime);
        intervalTimings.push(s_ms);
        let exTime = logTofile(device, registerList, connectedFile);

        var reportedTime = process.hrtime();
        var diff = process.hrtime(prevTime);
        prevTime = reportedTime;
        diff = hr_ms(diff)
        jitterTime.push(diff);

        readTimings.push(exTime[0]);
        writeTimings.push(exTime[1]);
        totalTimings.push(exTime[0] + exTime[1])

        adj_hr = adjust_hr(expected); //Expected execution time for next iteration
        expected = adj_hr;
        let drift = INTERVAL_TIME  - hr_ms(dt); // difference between interval time and actual execution time.
        driftAdjustment = Math.max(0, drift)
        if(drift <= 0){
            negDrift += 1;
        }
        numLogged += 1;
        if(numLogged >= MAX_LOG_NUM){
            clearInterval(interval);
            const average = array => array.reduce((a, b) => a + b) / array.length;
            calculateTimerData(readTimings, writeTimings, totalTimings, intervalTimings, jitterTime, negDrift);
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
    lineseperatoe("Starting the Custom Interval", connectedFile)
    console.log("\n------------- Starting the Custom Interval -------------\n")
    const hr_ms = hr => (hr[0] * 1000000000 + hr[1]) / 1000000; // convert hr time to total ms
    function adjust_hr(hr) {
        let max_ns = 1000000000
        let s = hr[0];
        let ns = hr[1];
        let adj_ns = ns + INTERVAL_TIME_NS;
        let adj_s = s + Math.floor(adj_ns / max_ns);
        adj_ns = adj_ns % max_ns;
        return [adj_s, adj_ns]
    }
    const adjust_hr_ms = hr => ((hr[0] * 1000000000 + hr[1]) / 1000000) + INTERVAL_TIME;

    let hrStepStart = process.hrtime();
    let hrStepStartMs = hr_ms(hrStepStart) + INTERVAL_TIME;
    let adjHrStepStart = adjust_hr(hrStepStart); //[hrStepStart[0], hrStepStart[1] + INTERVAL_TIME_NS]
    var expected = adjHrStepStart;
    var negDrift = 0;
    var prevTime = process.hrtime();
    var jitterTime = [];
    setTimeout(step, INTERVAL_TIME); // First iteration, with delay of INTERVAL_TIME ms
    // The custom implementation of setInterval (recursive function)
    function step() {
        if (numLogged <= MAX_LOG_NUM){
            var now = process.hrtime(hrStepStart); // not necessary
            var dt = process.hrtime(expected)
            // console.log("Interval Time", hr_ms(dt))
            if (hr_ms(dt) > INTERVAL_TIME) {
                // If the function executed later then the defined interval 
                // console.log("--- Interval Drift %d ---", numLogged);
            }
            let hrIntervalTime = process.hrtime(hrStepStart);
            let s_ms = hr_ms(hrIntervalTime);
            intervalTimings.push(s_ms);
            // console.log("dt time", hr_ms(dt))
            let exTime = logTofile(device, registerList, connectedFile);

            var reportedTime = process.hrtime();
            var diff = process.hrtime(prevTime);
            prevTime = reportedTime;
            diff = hr_ms(diff)
            jitterTime.push(diff);

            readTimings.push(exTime[0]);
            writeTimings.push(exTime[1]);
            totalTimings.push(exTime[0] + exTime[1]);

            adj_hr = adjust_hr(expected); //Expected execution time for next iteration
            expected = adj_hr;
            let drift = INTERVAL_TIME  - hr_ms(dt); // difference between interval time and actual execution time.
            driftAdjustment = Math.max(0, drift) // either dont adjust (executing on schedule), or setInterval to adjust for time drift
            numLogged += 1;
            if (drift <= 0){
                negDrift++;
                setImmediate(step);
            }
            else{
                setTimeout(step, driftAdjustment);
            } // execute step again, delay adjusted for the time drift
        } else {
            calculateTimerData(readTimings, writeTimings, totalTimings, intervalTimings, jitterTime, negDrift);
            numLogged = 0;
            readTimings = [];
            writeTimings = [];
            totalTimings = [];
            intervalTimings = [];
            // setTimeout(performanceInterval, 5000);
            performanceInterval();
            // closeDevice(device);
        }
    }
}

function performanceInterval() {
    console.log("\n------------- Starting the Performance Interval -------------\n")
    const hr_ms = hr => (hr[0] * 1000000000 + hr[1]) / 1000000; // convert hr time to total ms
    function adjust_hr(hr) {
        return hr + INTERVAL_TIME;
    }
    const adjust_hr_ms = hr => ((hr[0] * 1000000000 + hr[1]) / 1000000) + INTERVAL_TIME;

    let perStepStart = performance.now();
    let adjPerStepStart = perStepStart + INTERVAL_TIME;
    var expected = adjPerStepStart;
    var negDrift = 0;
    var prevTime = performance.now();
    var jitterTime = [];
    setTimeout(step, INTERVAL_TIME); // First iteration, with delay of INTERVAL_TIME ms
    // The custom implementation of setInterval (recursive function)
    function step() {
        if (numLogged <= MAX_LOG_NUM){

            var per_now = performance.now();
            var now = per_now - perStepStart;
            var dt = per_now - expected;
            // console.log("Now:", now, "\tdt", dt);
            // console.log("Interval Time", hr_ms(dt))
            // if (hr_ms(dt) > INTERVAL_TIME) {
            //     // If the function executed later then the defined interval 
            //     console.log("--- Interval Drift %d ---", numLogged);
            // }
            let perIntervalTime = per_now - perStepStart;
            // let s_ms = hr_ms(hrIntervalTime);
            intervalTimings.push(perIntervalTime);
            let exTime = logTofile(device, registerList, connectedFile);
            var reportedTime = performance.now();
            var diff = reportedTime - prevTime;
            prevTime = reportedTime;
            jitterTime.push(diff);
            readTimings.push(exTime[0]);
            writeTimings.push(exTime[1]);
            totalTimings.push(exTime[0] + exTime[1]);



            adj_hr = adjust_hr(expected); //Expected execution time for next iteration
            expected = adj_hr;
            let drift = INTERVAL_TIME  - dt // difference between interval time and actual execution time.
            // console.log("Drift: " + drift)
            driftAdjustment = Math.max(0, drift) // either dont adjust (executing on schedule), or setInterval to adjust for time drift
            numLogged += 1;
            if (drift <= 0){
                negDrift++;
                setImmediate(step);
            }
            else{
                setTimeout(step, driftAdjustment);
            }
        } else {
            calculateTimerData(readTimings, writeTimings, totalTimings, intervalTimings, jitterTime, negDrift);
            closeDevice(device);
        }
    }
}

function calculateVariance(values) {
    // Calculate the average of all the numbers
    const calculateMean = (values) => {
        const mean = (values.reduce((sum, current) => sum + current)) / values.length;
        return mean;
    };
    // Calculate variance
    const calculateVariance = (values) => {
        const average = calculateMean(values);
        const squareDiffs = values.map((value) => {
            const diff = value - average;
            return diff * diff;
        });
        const variance = calculateMean(squareDiffs);
        return variance;
    };

    // Calculate stand deviation
    const calculateSD = (variance) => {
        return Math.sqrt(variance);
    };

    // Test our function
    const variance = calculateVariance(values);
    const sd = calculateSD(variance);
    console.log(`Variance: ${variance}`);
    console.log(`Standard Deviation: ${sd}`);
}


function calculateTimerData(readTimings, writeTimings, totalTimings, intervalTimings, jitterTime, negDrift){
    // Calculate the average of all the numbers
    const calculateMean = (values) => {
        const mean = (values.reduce((sum, current) => sum + current)) / values.length;
        return mean;
    };
    // Calculate variance
    const calculateVariance = (values) => {
        const average = calculateMean(values);
        const squareDiffs = values.map((value) => {
            const diff = value - average;
            return diff * diff;
        });
        const variance = calculateMean(squareDiffs);
        return variance;
    };

    // Calculate stand deviation
    const calculateSD = (variance) => {
        return Math.sqrt(variance);
    };
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

    let jitterVariance = calculateVariance(jitterTime);
    let jitterSD = calculateSD(jitterVariance)

    // console.log(intervalTimings)
    let intervalDelta = delta(intervalTimings)
    let avgIntervalDelta = average(intervalDelta[0]).toFixed(4);
    let avgIntervalDeltaHz = toHz(avgIntervalDelta).toFixed(4);
    let totalIntervalTime = intervalDelta[1];

    let intervalAccuracy = (average(intervalDelta[0])/(INTERVAL_TIME * 1.0)*100).toFixed(4);

    console.log("Target Refresh Rate:\t\t %d ms %d hz", targetms, targethz);
    console.log("Interval Delta:\t\t\t %d ms %d hz", avgIntervalDelta, avgIntervalDeltaHz);
    console.log("Interval Accuracy:\t\t %d%", intervalAccuracy);
    console.log("Interval Average Jitter:\t", average(jitterTime).toFixed(6));
    console.log("Interval Jitter Variance:\t", jitterVariance.toFixed(6));
    console.log("Interval Jitter Std Dev:\t", jitterSD.toFixed(6));
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
        console.log("\n------------- Device Opened Successfully -------------\n");
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
                console.log('\n------------- Device Closed Successfully -------------\n');
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
    var hrtime2 = process.hrtime()
    var hrReadStart = process.hrtime();
    let readData = [getDateFormatted()];
    let res = device.readManySync(registers);
    readData.push(res);

    readData.push(process.hrtime()[0])
    readData.push(process.hrtime()[1])
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
}

function lineseperatoe(statment, file){
    file.write('\n');
    file.write(statment+'\n');
    file.write('\n');
}

function getDateFormatted(){
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    var h = today.getHours();
    var min = today.getMinutes();
    var s = today.getSeconds();
    var ms = today.getMilliseconds();

    // format all the times so they are consitent between lines.
    if (dd < 10) {dd = '0' + dd}
    if (mm < 10) {mm = '0' + mm}
    if (h < 10) { h = '0' + h }
    if (min < 10) { min = '0' + min }
    if (s < 10) { s = '0' + s }

    if(ms < 10) {ms = '00' + ms}
    else if (ms < 100) {ms = '0' + ms}

    var curtime = yyyy + '-' + mm + '-' + dd + ' ' + h + ':' + min + ':' + s + ':' + ms;

    return curtime.toString();
}