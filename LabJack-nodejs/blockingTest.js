//Initialization of Driver:
var deviceManager = require('./labjack');



exports.run = function(functionList)
{
	console.log('Starting Blocking-Test');
	
	var device = new deviceManager.labjack();

	for(var i = 0; i < functionList.length; i++)
	{
		console.log(functionList[i]);
		
		//Execute test-function
		console.log(eval('device.'+functionList[i]));
	}
}