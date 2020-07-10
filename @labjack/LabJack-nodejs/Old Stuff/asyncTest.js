//Initialization of Driver:
var deviceManager = require('./labjack');
var ljm = require('./ljmDriver');
var ljmDriver = new ljm.ljmDriver();
var wait = false;
var testComplete = false;
var activeTest = 0;
var numTests = 0;
var functionList;
var device = new deviceManager.labjack();

var startTime=0;
function nextTest()
{
	activeTest++;
	wait=false;
}
function onError(erStr)
{
	console.log("ERROR: ",erStr);
	nextTest();
}
function onSuccess(res)
{
	//console.log("SUCCESS: "+res);
	if(res != null)
	{
		console.log(res);
	}
	else
	{
		console.log('SUCCESS');
	}
	nextTest();
}
function onOpenSuccess(res)
{
	console.log("OPEN SUCCESS, handle: "+res);
	startTime = Date.now();
	console.log('!TIMER STARTED!');
	nextTest();
}

function runTest()
{
	if(activeTest < numTests)
	{
		//console.log('Running!');
		if(!wait)
		{
			var i = activeTest;
			var len = functionList[i].length
			if(functionList[i].search('close') != -1)
			{
				console.log('TimeOpen: '+ (Date.now() - startTime));
				console.log('!TIMER FINISHED!');
			}
			if(functionList[i].slice(len-2, len)!='()')
			{
				if(functionList[i].search('open') != -1)
				{
					functionList[i] = functionList[i].replace(')', ',onError, onOpenSuccess)');
				}
				else
				{
					functionList[i] = functionList[i].replace(')', ',onError, onSuccess)');
				}
			}
			else
			{
				functionList[i] = functionList[i].replace(')', 'onError, onSuccess)');
			}
			console.log(functionList[i]);

			//Execute test-function
			wait=true;
			if(functionList[i].search('listAll') != -1)
			{
				eval('ljmDriver.'+functionList[i]);
			}
			else if(functionList[i].search('errToStr') != -1)
			{
				eval('ljmDriver.'+functionList[i]);
			}
			else
			{
				eval('device.'+functionList[i]);
			}
			
		}
		(typeof setImmediate != 'undefined' ? setImmediate : process.nextTick)(runTest)
	}
	else
	{
		console.log('Ended!');
		testComplete = true;
	}
}
exports.run = function(testList)
{
	console.log('Started!');
	numTests = testList.length
	functionList = testList;
	runTest();
	
	
	/*console.log('Starting Async-Test');

	var device = new deviceManager.labjack();
	for(var i = 0; i < functionList.length; i++)
	{

		//setTimeout(function() { console.log("setTimeout: It's been one second!"); }, 1000);
		setTimeout((function() {
		  console.log('hello world!');
		}), 50);
		while(wait);

		//Append string test-functions with callbacks
		var len = functionList[i].length
		if(functionList[i].slice(len-2, len)!='()')
		{
			functionList[i] = functionList[i].replace(')', ',onError, onSuccess)');
		}
		else
		{
			functionList[i] = functionList[i].replace(')', 'onError, onSuccess)');
		}
		console.log(functionList[i]);

		//Execute test-function
		wait=true;
		console.log(eval('device.'+functionList[i]));
	}	
	*/
}