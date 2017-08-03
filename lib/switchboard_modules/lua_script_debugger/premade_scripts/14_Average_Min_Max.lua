print("Sampling average/min/max: Read AIN1 at set rate for certian number of samples. Outputs average, minimum, and maximum")
--Example program that samples an analog input at a set frequency for a certian number of samples.
--Takes the average, minimum, and maximum of sampled data and prints it to the console as well as saving them to the first 3 addresses of user RAM

--------------------------------------------------------------
--Change scanRate and numScans to achive desired time interval
--Desired sampling time in seconds = numScans/scanRate
--Change the AIN_RESOLUTION_INDEX if faster speeds are desired
--------------------------------------------------------------
local scanRate = 500      --Rate that data will be read in Hz
local numScans = 5000     --number of scans to collect

local mbWrite=MB.W        --create local functions for reading/writing at faster speeds
local mbRead=MB.R

mbWrite(48005, 0, 1)     --Ensure analog is on
mbWrite(43903, 0, 8)     --set AIN_ALL_RESOLUTION_INDEX to 8 (default is 8 on t7, 9 on PRO)
mbWrite(43900, 3,10)     --set range to +-10V 

local avgData=0
local iter=0
local minV=1000                 --set large value so the minimum check sets first value
local maxV=(-1000)              --set small value so the maximum check sets first value
LJ.IntervalConfig(0, 1000/scanRate)   --Define the scan interval in ms.
local checkInterval=LJ.CheckInterval  --create local function to check the interval for faster loop time

print("Estimated time to execute (s): ",numScans/scanRate)

while iter<numScans do          --loop as fast as possible until number of scans has been aquired
  if checkInterval(0) then      --if interval time has been reached, add 1 to iter and take data reading
    iter=1+iter
    local data0 = mbRead(2,3)      --take a reading on the AIN1 line
    if(data0>maxV) then         --maximum check, sets maxV if data is above previous maxV 
      maxV=data0
    end
    if(data0<=minV) then        --minimum check, sets minV if data is below previous minV
      minV=data0
    end
    avgData=data0+avgData       --add data to previous data readings (divide to get average later)
  end
end
local avg=avgData/numScans            --divide added data by the number of scans to get average

mbWrite(46000,3,avg)                --Write average, min, and max into userRAM
mbWrite(46002,3,maxV) 
mbWrite(46004,3,minV)
print("Average voltage: ",avg)
print("Min voltage: ",minV)
print("Max voltage: ",maxV)