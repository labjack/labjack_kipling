--[[
    Name: 12_rtc_triggered_logging.lua
    Desc: Example showing how to log AIN values to file on an SD card
    Note: Requires a micro SD Card installed inside the T7 or T7-Pro

          T7 uSD card:
             http://labjack.com/support/datasheets/t7/sd-card

          Timestamp (real-time-clock) is only available on the T7-Pro

          As of Firmware v1.0150, some SD cards do not work.
          Check for the latest firwmare updates at:
            http://labjack.com/support/firmware/t7/beta

          This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Log voltage of AIN1 to file every 10 minutes. RTC value checked every 1000ms.")

-- Get statuses of the device hardware modules
local hardware = MB.readName("HARDWARE_INSTALLED")
local passed = 1
-- The 7th bit of hardware holds the sd card status
if(bit.band(hardware, 8) ~= 8) then
  print("uSD card not detected")
  passed = 0
end
-- the 3rd bit holds of hardware holds the RTC module status
if(bit.band(hardware, 4) ~= 4) then
  print("RTC module not detected")
  passed = 0
end
if(passed == 0) then
  print("This Lua script requires an RTC and a microSD card, but one or both are not detected. These features are only preinstalled on the T7-Pro. Script Stopping.")
  MB.W(6000, 1, 0)
end

local filepre = "RTWi_"
local filesuf = ".csv"
local numfn = 0
local filename = filepre..string.format("%02d", numfn)..filesuf
local voltage = 0
local modulo = 0


local delimiter = ","
local stringdate = ""
local voltagestr = ""
local f = nil

-- Interval in ms for polling
local pollinterval = 1000
local pollpermin = 60*1000 / pollinterval
-- Use a 10 minute logging interval
local loginterval = 10
local pollcount = 0
-- Minutes returned from the RTC
local minute = 0

local date = {}
date[1] = 0    --year
date[2] = 0    --month
date[3] = 0    --day
date[4] = 0    --hour
date[5] = 0    --minute
date[6] = 0    --second

-- Ensure that analog is on
MB.writeName("POWER_AIN",1)

LJ.IntervalConfig(0, pollinterval)
f = io.open(filename, "r")
-- If the file exists append to the end of it
if f ~= nil then
  f:close()
  f = io.open(filename, "a+")
  print ("Appending to file")
-- If the file does not exist create it and write to it
else
  f = io.open(filename, "w")
  print ("Creating new file")
end

-- Run the program in an infinite loop
while true do
  -- If the RTC polling interval completed
  if LJ.CheckInterval(0) then
    local fg = 0
    -- Read the RTC timestamp -Pro only
    date, error = MB.RA(61510, 0, 6)
    stringdate = string.format(
      "%04d/%02d/%02d %02d:%02d.%02d",
      date[1],
      date[2],
      date[3],
      date[4],
      date[5],
      date[6]
    )
    print("DateTime: ", stringdate)
    minute = date[5]
    modulo = minute - math.floor(minute/loginterval)*loginterval
    pollcount = pollcount + 1
    print ("RTC poll events since last save: ", pollcount)
    -- If the host software wants to read the active file write 1 to address 6500, U32
    fg = LJ.CheckFileFlag()
    -- If the file flag is set start logging data in a new file
    if fg == 1 then
      numfn = numfn + 1               --increment filename
      filename = filepre..string.format("%02d", numfn)..filesuf
      f:close()
      -- Inform the host that previous file is available
      LJ.ClearFileFlag()
      -- Create or replace a new file
      f = io.open(filename, "w")
      print ("Command issued by host to create a new file")
    end
    -- If the minutes digit matches the rollover condition log to file
    if modulo == 0 and pollcount > pollpermin then
      -- Reset the poll count
      pollcount = 0
      voltage = MB.readName("AIN1")
      print("AIN1: ", voltage, "V")
      voltagestr = string.format("%.6f", voltage)
      -- Create a string holding a timestamp and the AIN voltage
      stringResult = stringdate..delimiter..voltagestr.."\n"
      print ("Appending to file")
      -- Write the log data to file
      f:write(stringResult)
    end
  end
end