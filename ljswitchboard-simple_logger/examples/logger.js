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
this.device = openDevice(device);

// use this vv when or if this is implemented - Zander
// var sn = devices[0].savedAttributes.serialNumber;
var sn = "470016039";
var savedData = [];

// setting the file name & location
var fileName = "testThing"
var selectedFilePath = 'D:/labjack/newLoggerTesting/';
 
// settting the length of how long the file will log
var runTime = 5;

// setting the registers that we will be using
var registers = ['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2', 'AIN3', 'AIN4', 'AIN5']

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
        // this should be the rate at wich the logger runs
        "device_serial_numbers": [],
        "logging_options": {
            "write_to_file": true,
            "file_prefix": fileName,
            "max_samples_per_file": 65335,
            "data_collector_config": {
                "REPORT_DEVICE_IS_ACTIVE_VALUES": true,
                "REPORT_DEFAULT_VALUES_WHEN_LATE": false
            }
        }
    },
};


selectedFilePath = createFolderForLofFile(selectedFilePath);
var folderFilePath = selectedFilePath;
// fs.mkdir('D:/labjack/newLoggerTesting/basic_config Auto-Template',function(){
// });

// file checking
const filePath = selectedFilePath + configObj.basic_data_group.logging_options.file_prefix;
var usableFilepath = filePath;

// console.log("does the file exist", fs.existsSync(usableFilepath))
var conectedFile = astablishConectionToFile(usableFilepath)

var tempTime;
var tempCounter = 0;
var numberOfLoged = 0;

initializeLogFile(registers, conectedFile)


// console.log("conectedfiel: ", conectedFile) 
// tempTime = (process.hrtime()[0]*1000) + (process.hrtime()[1] / 1000000)
// when we start it will assign the time at wich it will log

// this should be trigering the file loging
ititalTempTime = process.hrtime();
configObj.view_config.update_rate_ms = configObj.view_config.update_rate_ms * 1000000
const stayHere = configObj.view_config.update_rate_ms
var elseCounter = 1;

// setting up all of the timings
var startOfLogger = process.hrtime();
console.log("start of logger", configObj.view_config.update_rate_ms)

startOfLogger[0] = startOfLogger[0] + configObj.logging_config.runtimeInSeconds; 
ititalTempTime[1] = ititalTempTime[1] + configObj.view_config.update_rate_ms;
var duration = ititalTempTime;
var testiter = true;

console.log("logger has started")
console.log("this should be the config", configObj)
while(startOfLogger > process.hrtime()){

    tempTime = process.hrtime();
    // tempTime = (process.hrtime()[0]*1000) + (process.hrtime()[1] / 1000000)
    // var posibleThing = duration;
    // posibleThing[1] = posibleThing[1] - 1000000

    if(tempTime >= duration){
        // console.log("hit")
        var registers = ['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2', 'AIN3', 'AIN4', 'AIN5'];
          
        // console.log("q")
        if(numberOfLoged < configObj.basic_data_group.logging_options.max_samples_per_file){            

            // console.log("device", device)
            logTofile(registers, conectedFile);
            numberOfLoged += 1;
        }
        else{
            // when ever we need to switch to a new file this will trigger
            // console.log(fs.existsSync(conectedFile.path))
            conectedFile = fs.createWriteStream(usableFilepath + "-" + elseCounter + ".csv");
            initializeLogFiles(registers, conectedFile, elseCounter)
            elseCounter++;
            numberOfLoged = 0
        }

        // console.log("hrtime 6", process.hrtime());
        tempTime[1] = tempTime[1] + configObj.view_config.update_rate_ms;
        var duration = tempTime;
    }
    // else{
    //     tempCounter += 1;
    //     console.log("miss")
    // }
    // tempCounter += 1;
    // console.log("at the end of the while loop", tempCounter)
}
console.log("ended the while")

// opening the device
function openDevice(device, cb){
    try{
        device.openSync(
            'LJM_dtANY',
            'LJM_ctANY',
            'LJM_idANY',
        );
        console.log("opened successfully")
        return true;
    }
    catch(err){
        console.log("err:", err)
        cd;
    }
    return device
}
// file.end();
// Close the device
// console.log("close the Device?")
try{
// device.closeSync();
    device.close(
        function(res){
            console.log('Err:', res);
        },
        function(res){
            // console.log("ending time", process.hrtime())
            console.log('closed successfully');
        });
}
catch(err){
    console.log("did not close correctly", err)
}

// asstablishing the conection to be able to save the value information
function astablishConectionToFile(usableFilepath){
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
function createFolderForLofFile(filepath){
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

// store time and see how many nano seconds
// this is for the date time thing
// Date().toLocaleString() +', ' + 
function logTofile(registerName, file) {
    var defered = q.defer();
    // console.log("hrtime 7", process.hrtime());
    var writeData = [getDateFormatted()];
    // console.log("hrtime 7.5", process.hrtime())
    // registerName.forEach(function(key) {
    //     writeData.push(device.readSync(key));        
    // });
    // console.log(device.readMan ySync(['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2', 'AIN3', 'AIN4', 'AIN5']))
    // console.log("dev", device.readMany())
    var hrtime1 = process.hrtime()
    device.readMany(['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2', 'AIN3', 'AIN4', 'AIN5'])
    .then(function(results) {
        results.forEach(function(result) {
            writeData.push(result);
        });
        defered.resolve();
    }, function(err) {
        retInfo.isError = true;
        defered.reject();
    });
    // device.readMany(['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2', 'AIN3', 'AIN4', 'AIN5'])
    // var val = device.readManySync(['CORE_TIMER', 'AIN0', 'AIN1', 'AIN2', 'AIN3', 'AIN4', 'AIN5', 'AIN6'])
    // console.log("hrtime 2", process.hrtime())
    var hrtime2 = process.hrtime()
    // writeData.push(val);
    // var hrtime3 = process.hrtime()
    // console.log("hrtime 3", process.hrtime())
    

    writeData.push(process.hrtime()[0])
    writeData.push(process.hrtime()[1])
    // console.log("writeData")
    // console.log(writeData)
    // console.log(writeData)
    console.log("hrtime1", hrtime1[1] - hrtime2[1])
    file.write(writeData+"\n")

    return true
    // filePath.write(fileData, onSuccess);
    // fs.write(filePath, writeData);
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