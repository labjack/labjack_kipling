--[[
    Name: log_voltage_to_file.lua
    Desc: This example shows how to log voltage measurements to file
    Note: Requires an SD Card installed inside the T7 or T7-Pro

          This example requires firmware 1.0282 (T7)

          Timestamp (real-time-clock) available on T7-Pro only
--]]

print("Log voltage to file.  Voltage measured on AIN1.  Store value every 1 second for 10 seconds")
-- Disable truncation warnings (truncation should not be a problem in this script)
MB.writeName("LUA_NO_WARN_TRUNCATION", 1)
-- Read information about the hardware installed
local hardware = MB.readName("HARDWARE_INSTALLED")
local passed = 1
-- If the seventh bit is not a 1 then an SD card is not installed
if(bit.band(hardware, 8) ~= 8) then
  print("uSD card not detected")
  passed = 0
end
-- If the fourth bit is not a 1 then there is no RTC installed
if(bit.band(hardware, 4) ~= 4) then
  print("RTC module not detected")
  passed = 0
end
if(passed == 0) then
  print("This Lua script requires an RTC module and a microSD card, but one or both are not detected. These features are only preinstalled on the T7-Pro. Script Stopping")
  -- Writing a 0 to LUA_RUN stops the script
  MB.W("LUA_RUN", 0)
end

local filename = "/log1.csv"
local voltage = 0
local count = 0
local delimiter = ","
local strdate = ""
local strvoltage = ""
local table = {}
table[1] = 0    --year
table[2] = 0    --month
table[3] = 0    --day
table[4] = 0    --hour
table[5] = 0    --minute
table[6] = 0    --second
-- Create and open a file for write access
local file = io.open(filename, "w")
-- Make sure that the file was opened properly.
if file then
  print("Opened File on uSD Card")
else
  -- If the file was not opened properly we probably have a bad SD card.
  print("!! Failed to open file on uSD Card !!")
end
-- Make sure analog is on
MB.writeName("POWER_AIN", 1)
-- Configure an interval of 1000ms
LJ.IntervalConfig(0, 1000)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    voltage = MB.readName("AIN1")
    -- Read the RTC timestamp (T7-Pro only)
    table, error = MB.readNameArray("RTC_TIME_CALENDAR", 6)
    print("AIN1:", voltage, "V")
    strdate = string.format(
      "%04d/%02d/%02d %02d:%02d.%02d",
      table[1],
      table[2],
      table[3],
      table[4],
      table[5],
      table[6]
    )
    strvoltage = string.format("%.6f", voltage)
    print(strdate, "\n")
    file:write(strdate, delimiter, strvoltage, "\n")
    count = count + 1
  end
  if count >= 10 then
    break
  end
end

file:close()
print("Done acquiring data. Now read and display file contents. \n")
file = io.open(filename, "r")
local line = file:read("*all")
file:close()
print(line)
print("Finished Script")
MB.W(6000, 1, 0);
