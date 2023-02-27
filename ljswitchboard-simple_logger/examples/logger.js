//Require LabJack-nodejs
var ljn = require('labjack-nodejs');
var fs = require('fs');
var path = require('path');
 
//Device object (to control a LabJack device)c
var createDeviceObject = ljn.getDevice();
 
//Device object (to control a LabJack device)
var device = new createDeviceObject();


// Open a device
// device.closeSync();
// Zander - TODO - this will need to be looked at when there is no other decieces on the internet.
openDevice(device);
var sn = "470016039";
// console.log("device")
 
// delay between each log in milla seconds
var msDelay = 10;
var max_logs_per_file = 65335;

// settting the length of how long the file will log
secondsdelay = 300;
// secondsdelay = 3;

// setting the file name & location
var fileName = "testthing"
var selectedFilePath = 'D:/labjack/newLoggerTesting/';
selectedFilePath = createFolderForLofFile(selectedFilePath);
var folderFilePath = selectedFilePath;
// fs.mkdir('D:/labjack/newLoggerTesting/basic_config Auto-Template',function(){
// });

// setting the registers that we will be using
var registers = ['CORE_TIMER', 'AIN0', 'AIN1']

// file checking
const filePath = selectedFilePath + fileName;
var usableFilepath = filePath;

console.log("does the file exist", fs.existsSync(usableFilepath))
var conectedFile = astablishConectionToFile(usableFilepath)

var tempTime = 0;
var tempCounter = 0;
var numberOfLoged = 0;

initializeLogFile(registers, conectedFile)


// console.log("conectedfiel: ", conectedFile) 
// tempTime = (process.hrtime()[0]*1000) + (process.hrtime()[1] / 1000000)
// when we start it will assign the time at wich it will log

// this should be trigering the file loging
ititalTempTime = process.hrtime();
msDelay = msDelay * 1000000
var elseCounter = 1;

// setting up all of the timings
var startOfLogger = process.hrtime();
// console.log("start of logger", startOfLogger)
startOfLogger[0] = startOfLogger[0] + secondsdelay; 
ititalTempTime[1] = ititalTempTime[1] + msDelay;
var duration = ititalTempTime;

while(startOfLogger > process.hrtime()){

    tempTime = process.hrtime();
    // tempTime = (process.hrtime()[0]*1000) + (process.hrtime()[1] / 1000000)
    console.log("tempTime", tempTime)
    // console.log("", tempTime >= duration)
    if(tempTime >= duration){
        // console.log("process.hrtime(): ", process.hrtime())
        // tempCounter += 1;
        // console.log("hit")/
        var registers = ['CORE_TIMER', 'AIN0', 'AIN1'];

        if(numberOfLoged < max_logs_per_file){
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
            
        tempTime[1] = tempTime[1] + msDelay;
        var duration = tempTime;
    }
    // else{
    //     tempCounter += 1;
    //     console.log("miss")
    // }
    // tempCounter += 1;
    // console.log("at the end of the while loop", tempCounter)
}

// opening the device
function openDevice(device, cb){
    try{
        device.openSync(
            'LJM_dtANY',
            'LJM_ctANY',
            'LJM_idANY',
        );
        // console.log('AIN1:', device.readSync('AIN1'));
        // console.log('AIN1:', device.readSync('AIN1'));
        // console.log("device name", device.readSync('DEVICE_NAME_DEFAULT'))
        return true;
    }
    catch(err){
        console.log("err:", err)
        cd;
    }
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
        // console.log("outside the file path", usableFilepath, ":")
        // console.log(usableFilepath + '.csv' + ':')
        // console.log("fs.existsSync(usableFilepath + '.csv')", fs.existsSync(usableFilepath + '.csv'))
        // console.log("this is me tr5ing to",usableFilepath.fileExists)
        for(var i = 1; fs.existsSync(usableFilepath + '.csv') == true; ++i){
            // console.log("in the file path")
            if(fs.existsSync(usableFilepath + '.csv') == false){
                usableFilepath = usableFilepath;
            }
            else if(fs.existsSync(usableFilepath + '.csv') == true && fs.existsSync(usableFilepath + "_" + i + '.csv') != true){
                // console.log("i: ", i)
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
        filepath = filepath + 'basic_config Auto-Template';
        for(var i = 1; fs.existsSync(filepath) == true; ++i){
            if(fs.existsSync(filepath) == false){
                filepath = filepath;
            }
            else if(fs.existsSync(filepath) == true && fs.existsSync(filepath + "_" + i) != true){
                // console.log("i: ", i)
                filepath = filepath + "_" + i;
            }
        }
    } catch(err){
        console.error("unable to creat the file")
    }
    fs.mkdir(filepath,function(){});
    return filepath + "/";
}

// setting up the heder for the file
function initializeLogFile(registerName, file){
    file.write(fileName+"\n");
    file.write("SN: " + sn + "\n")
    file.write("Time" + ', ')
    file.write(registerName+"hrtime seconds"+"hrtime nanoseconds"+"\n")
}

function initializeLogFiles(registerName, file, iteration){
    file.write(fileName+"-"+iteration+"\n");
    file.write("SN: " + sn + "\n")
    file.write("Time" + ', ')
    file.write(registerName+"\n")
}

// store time and see how many nano seconds
// this is for the date time thing
// Date().toLocaleString() +', ' + 
function logTofile(registerName, file) {
    // console.log("process.hrtime(): ", process.hrtime())
    // console.log("registername", registerName[0]) 
    var writeData = [Date().toLocaleString()];
    // writeData.push(registerName);
    registerName.forEach(function(key) {
        // console.log("key", key)
        writeData.push(device.readSync(key));
        // console.log("wtf", writeData)
        // fileData = JSON.stringify(writeData, null, 2);
        
    });
    writeData.push(process.hrtime()[0])
    writeData.push(process.hrtime()[1])
    file.write(writeData+"\n")
    return true
    // filePath.write(fileData, onSuccess);
    // fs.write(filePath, writeData);
}