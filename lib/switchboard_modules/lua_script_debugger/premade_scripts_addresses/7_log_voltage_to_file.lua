print("Log voltage to file.  Voltage measured on AIN1.  Store value every 1 second for 10 seconds")
--Requires SD Card installed inside the T7 or T7-Pro.
--Requires FW 1.0150 or newer. On older firmware the file must exist already on the SD card
--Older firmware uses "assert" command: file=assert(io.open(Filename, "w"))
--timestamp (real-time-clock) available on T7-Pro only

local hardware = MB.R(60010, 1)
local passed = 1
if(bit.band(hardware, 8) ~= 8) then
  print("uSD card not detected")
  passed = 0
end

if(bit.band(hardware, 4) ~= 4) then
  print("RTC module not detected")
  passed = 0
end
if(passed == 0) then
  print("This Lua script requires an RTC module and a microSD card, but one or both are not detected. These features are only preinstalled on the T7-Pro. Script Stopping")
  MB.W(6000, 1, 0)--stop script
end

local mbRead=MB.R			--local functions for faster processing
local mbReadArray=MB.RA

local Filename = "/log1.csv"
local voltage = 0
local count = 0
local delimiter = ","
local dateStr = ""
local voltageStr = ""


local table = {}
table[1] = 0    --year
table[2] = 0    --month
table[3] = 0    --day
table[4] = 0    --hour
table[5] = 0    --minute
table[6] = 0    --second

local file = io.open(Filename, "w")   --create and open file for write access
-- Make sure that the file was opened properly.
if file then
  print("Opened File on uSD Card")
else
  -- If the file was not opened properly we probably have a bad SD card.
  print("!! Failed to open file on uSD Card !!")
end

MB.W(48005, 0, 1)                       --ensure analog is on

LJ.IntervalConfig(0, 1000)              --set interval to 1000 for 1000ms
local checkInterval=LJ.CheckInterval

while true do
  if checkInterval(0) then     	    --interval completed
    voltage = mbRead(2, 3)        	      --voltage on AIN1, address is 2, type is 3
    table, error = mbReadArray(61510, 0, 6)   --Read the RTC timestamp, -Pro only
    print("AIN1: ", voltage, "V")
    dateStr = string.format("%04d/%02d/%02d %02d:%02d.%02d", table[1], table[2], table[3], table[4], table[5], table[6])
    voltageStr = string.format("%.6f", voltage)
    print(dateStr, "\n")
    file:write(dateStr, delimiter, voltageStr, "\n")
    count = count + 1
  end
  if count >= 10 then
    break
  end
end

file:close()
print("Done acquiring data. Now read and display file contents. \n")
file = io.open(Filename, "r")
local line = file:read("*all")
file:close()
print(line)

print("Finished Script")
MB.W(6000, 1, 0);
