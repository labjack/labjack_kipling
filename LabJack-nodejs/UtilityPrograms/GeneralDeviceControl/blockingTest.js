//Initialization of Driver:
// var deviceManager = require('./labjack');
// var ljm = require('./ljmDriver');

var deviceManager = require('../../lib/device');
var ljm = require('../../lib/driver');

var startTime=0;

var PRINT_INCREMENTAL_STEP = true;

function printAlways(data) {
	console.log(data);
}
function printInfo(data) {
	if(PRINT_INCREMENTAL_STEP) {
		console.log(data);
	}
}
exports.printData = function(choice) {
	PRINT_INCREMENTAL_STEP = choice;
}
exports.run = function(functionList)
{
	console.log('Starting Blocking-Test');
	
	var device = new deviceManager.labjack();
	var ljmDriver = new ljm.ljmDriver();
	var err;
	for(var i = 0; i < functionList.length; i++)
	{
		try
		{
			printInfo(functionList[i]);
			if(functionList[i].search('close') != -1)
			{
				console.log('Time Open: '+(Date.now() - startTime));
				console.log('!TIMER FINISHED!');
			}
			//Execute test-function
			if(functionList[i].search('listAll') != -1)
			{
				err=eval('ljmDriver.'+functionList[i]);
			}
			else if(functionList[i].search('errToStr') != -1)
			{
				err=eval('ljmDriver.'+functionList[i]);
			}
			else
			{
				err=eval('device.'+functionList[i]);
			}
			if(((err != null)&&(err != 0))||(typeof(err)=="string"))
			{
				console.log(err);
			}
			else
			{
				printInfo('SUCCESS');
			}
			if(functionList[i].search('open') != -1)
			{
				startTime = Date.now();
				console.log('!TIMER STARTED!');
			}
		}
		catch (e)
		{
			console.log(e);
		}
	}
}