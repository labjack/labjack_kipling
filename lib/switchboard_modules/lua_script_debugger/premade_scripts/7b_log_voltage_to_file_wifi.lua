--[[
    Name: 7b_log_voltage_to_file_wifi.lua
    Desc: This example shows how to log voltage measurements to file if
          communicating over WiFi (WiFi needs 5s or more to initialize)
without comm
    Note: Requires an SD Card installed inside the T7 or T7-Pro

          This example requires firmware 1.0282 (T7)

          Timestamp (real-time-clock) available on T7-Pro only

          Some helpful Lua file operations in section 5.7:
            http://www.lua.org/manual/5.1/manual.html#5.7

          Some file info docs in 21.2 of the Lua documentation:
            http://www.lua.org/pil/21.2.html
--]]

print("Log voltage to file.  Voltage measured on AIN1 every 50ms.  Store values every 5 seconds")
-- Get info on the hardware that is installed
local hardware = MB.readName("HARDWARE_INSTALLED")
local passed = 1
if(bit.band(hardware, 8) ~= 8) then
  print("uSD card not detected")
  passed = 0
end
if(bit.band(hardware, 4) ~= 4) then
  print("RTC module not detected")
  passed = 0
end
if(bit.band(hardware, 2) ~= 2) then
  print("Wifi module not detected")
  passed = 0
end
if(passed == 0) then
  print("This Lua script requires an RTC module, Wifi, and a microSD card, but one or many are not detected. These features are only preinstalled on the T7-Pro. Script Stopping")
  -- Writing a 0 to LUA_RUN stops the script
  MB.writeName("LUA_RUN", 0)
end

local filepre = "/FWi_"
local filesuf = ".csv"
local numfn = 0
local filename = filepre..string.format("%02d", numfn)..filesuf
local voltage = 0
local indexval = 1
local delimiter = ","
local strdate = ""
local strvoltage = ""
local f = nil

-- Use a 50ms interval for writing DAC values
local dacinterval = 50
-- Use a 5s interval for the sd card
local sdinterval = 5000
local numdacs = math.floor(sdinterval/dacinterval)

local data = {}
local strings = {}

for i=1, numdacs do
  data[i] = 0
  strings[i] = "bar"
end


local date = {}
date[1] = 0    --year
date[2] = 0    --month
date[3] = 0    --day
date[4] = 0    --hour
date[5] = 0    --minute
date[6] = 0    --second

-- Make sure analog is on
MB.writeName("POWER_AIN",1)

LJ.IntervalConfig(0, dacinterval)
LJ.IntervalConfig(1, sdinterval)

f = io.open(filename, "r")
if f ~= nil then
  f:close()
  -- If the file exists, Append to file
  f = io.open(filename, "a+")
  print ("Appending to file")
else
  -- Create or overwrite the file
  f = io.open(filename, "w")
  print ("Creating new file")
end

while true do
  -- If a DAC interval is done
  if LJ.CheckInterval(0) then
    data[indexval] = MB.readName("AIN1")
    -- Read the RTC timestamp, (T7-Pro only)
    date, error = MB.RA(61510, 0, 6)
    print("AIN1: ", data[indexval], "V")
    strdate = string.format(
      "%04d/%02d/%02d %02d:%02d.%02d",
      date[1],
      date[2],
      date[3],
      date[4],
      date[5],
      date[6]
    )
    strvoltage = string.format("%.6f", data[indexval])
    strings[indexval] = strdate..delimiter..strvoltage.."\n"
    indexval = indexval + 1
  end
  -- If the interval wait before writing to an sd card is done
  if LJ.CheckInterval(1) then
    local i = 1
    local fg = 0
    indexval = 1
    -- Check if the host software wants to read the active, opened file
    fg = LJ.CheckFileFlag()
    -- If so, increment filename and start writing to a new file
    if fg == 1 then
      numfn = numfn + 1
      filename = filepre..string.format("%02d", numfn)..filesuf
      f:close()
      -- Inform the host computer that previous file is available
      LJ.ClearFileFlag()
      --create or replace a new file
      f = io.open(filename, "w")
      print ("Command issued by host to create new file")
    end
    print ("Appending to file")
    for i=1, numdacs do
      f:write(strings[i])
    end
  end
end