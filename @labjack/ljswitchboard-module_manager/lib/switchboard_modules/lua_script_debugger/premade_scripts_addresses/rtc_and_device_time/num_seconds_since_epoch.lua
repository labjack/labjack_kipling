print("Read the RTC_TIME_S register and SYSTEM_COUNTER_10KHZ to get a ms value.")
local hardware = MB.R(60010, 1)
if(bit.band(hardware, 4) ~= 4) then
  print("This Lua script requires a Real-Time Clock (RTC), but an RTC is not detected. These modules are only preinstalled on the T7-Pro, and cannot be added to the T7 or T4. Script Stopping")
  MB.W(6000, 1, 0)--stop script
end
--The RTC is only included on the -Pro variant of the T7
--Address 61510 has the timestamp in a format that can be read by Lua scripts.
--Address 61500 should not be used directly due to truncation during conversion from u32 to float
--If Address 61500 absolutely needs to be read, it can be done by reading it as an
-- array of u16s but if you try to combine them truncation will occur.
--If a (ms) value needs to be read, the SYSTEM_COUNTER_10KHZ register can be read and correlated 
-- to the RTC_TIME_S register.
-- For more details see the datasheet page: https://labjack.com/support/datasheets/t-series/rtc
--Requires FW 1.0128 or newer

local numSec = {}
numSec[1] = 0    --upper uint16
numSec[2] = 0    --lower uint16

local mbReadArray=MB.RA
local mbRead=MB.R
LJ.IntervalConfig(0, 500)
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then
    numSec, error = mbReadArray(61500, 0, 2)
    msec = mbRead(61502, 1)
    print(string.format("%d %d %f", numSec[1], numSec[2], msec, msec/10000))
  end
end