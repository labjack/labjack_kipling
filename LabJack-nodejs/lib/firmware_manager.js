/**
 * Class to manage downloading & loading firmware files.
**/

exports.firmwareManager = function()
{
	/**
	 * Sets the directory to where the files should be downladed from,
	 * Default directory is: ""
	 * 
	 * @param {String} directory The full path to the file to read.
	 * @return {q.promise} New DeviceFirmwareBundle without a device loaded but
	 *		initalized with the contents of the specified firmware file.
	**/
	this.setDirectory = function(directory, onError, onSuccess)
	{

	}
	this.setDirectorySync = function(directory)
	{

	}


	this.downloadAllFirmwareVersions = function(, onError, onSuccess)
	{

	}
	this.downloadAllFirmwareVersionsSync = function()
	{

	}


	this.downloadFirmwareVersion = function(device, version, onError, onSuccess)
	{

	}
	this.downloadFirmwareVersionSync = function(device, version)
	{

	}


	this.getDownloadedFirmwareVersion = function(device, version, onError, onSuccess)
	{

	}
	this.getDownloadedFirmwareVersionSync = function(device, version)
	{

	}
}

//Old Functions that need to be migrated:
this.downloadAllFirmwareVersions = function()
{
	//Make sure the constants file is loaded
	this.checkFirmwareConstants();

	//Check for functional vs OOP
	var ret = this.checkCallback(arguments);
	var useCallBacks = ret[0];
	var onError = ret[1];
	var onSuccess = ret[2];

	var numReq = this.firmwareVersions.Digit.length + this.firmwareVersions.T7.length;
	var doneCount = 0;
	this.isDone = false;
	var self = this;

	//console.log(this.firmwareVersions);
	if(useCallBacks)
	{
		for(var i = 0; i < this.firmwareVersions.Digit.length; i++)
		{
			//console.log("making Digit request");
			var request = http.get(this.firmwareVersions.Digit[i].location, function(response) {
				//console.log("Receiving Digit request");
				//console.log(er);
				//console.log(response);
				if(response.statusCode == 200)
				{
					var strs = response.socket._httpMessage.path.split("/");
					var file = fs.createWriteStream("./downloadedFirmware/Digit/"+strs[strs.length-1]);
					response.pipe(file);
				}
				doneCount++;
				if(doneCount == numReq)
				{
					onSuccess();
				}
			}).on('error', function(e) {
				doneCount++;
				//console.log("Er: Receiving Digit request");
				if(doneCount == numReq)
				{
					onError("No Valid Connection:", e);
				}
			});
		}
		for(var i = 0; i < this.firmwareVersions.T7.length; i++)
		{
			//console.log("making T7 request");
			var request = http.get(this.firmwareVersions.T7[i].location, function(response) {
				//console.log("Receiving T7 request");
				//console.log(er);
				//console.log(response);
				if(response.statusCode == 200)
				{
					var strs = response.socket._httpMessage.path.split("/");
					var file = fs.createWriteStream("./downloadedFirmware/T7/"+strs[strs.length-1]);
					response.pipe(file);
				}
				doneCount++;
				if(doneCount == numReq)
				{
					onSuccess();
				}
			}).on('error', function(e) {
				doneCount++;
				//console.log("Er: Receiving T7 request");
				if(doneCount == numReq)
				{
					onError("No Valid Connection:", e);
				}
			});
		}
	}	
	else
	{
		return "ONLY SUPPORTS FUNCTIONAL METHODS";
	}			
};
/**
Downloads a single registered firmware version to the appropriate directory.

returns 0 on success
returns 1 on invalid versionNumber/deviceType pair
**/
this.downloadFirmwareVersion = function(deviceType, versionNumber)
{
	var ret = this.checkCallback(arguments);
	var useCallBacks = ret[0];
	var onError = ret[1];
	var onSuccess = ret[2];

	var info = this.getFirmwareVersionInfo(deviceType,versionNumber);
	if(info == null)
	{
		if(useCallBacks)
		{
			onError(1);
			return 1;
		}
		return 1;
	}
	if(useCallBacks)
	{
		var self = this;
		var request = http.get(info.location, function(err, response) {
			if(err) throw(err);
			if(response.statusCode==200)
			{
				var strs = info.location.split("/");
				var file = fs.createWriteStream(self.getFilePath(deviceType,versionNumber));
				response.pipe(file);
				onSuccess();

			}
			else
			{
				onError("INVALID URL");
			}
		}).on('error', function(e) {
			onError("No Valid Connection:", e.message);
		});
	}
	else
	{
		return "ONLY SUPPORTS FUNCTIONAL METHODS";
	}
};
this.getDownloadedFirmwareVersions = function()
{
	var ret = this.checkCallback(arguments);
	var useCallBacks = ret[0];
	var onError = ret[1];
	var onSuccess = ret[2];


	fs.existsSync("./downloadedFirmware/T7/")
};