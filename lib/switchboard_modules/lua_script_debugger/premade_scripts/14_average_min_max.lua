--[[
    Name: 14_average_min_max.lua
    Desc: Example program that samples an analog input at a set frequency for a
          certain number of samples. It takes the average, minimum, and maximum
          of sampled data and prints it to the console as well as saving them
          to the first 3 addresses of user RAM

    Note: Change scanrate and numscans to achieve a desired time interval
          The desired sampling time in seconds = numscans/scanrate
          Change the AIN_RESOLUTION_INDEX if faster speeds are desired

          This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Sampling average/min/max: Read AIN1 at set rate for certain number of samples. Outputs average, minimum, and maximum")
local t7minfirmware = 1.0282
local t4minfirmware = 1.0023
-- Read the firmware version
local fwversion = MB.R(60004, 3)
-- The PRODUCT_ID register holds the device type
local devtype = MB.R(60000, 3)
if devtype == 4 then
  -- If using a T4 and the firmware does not meet the minimum requirement
  if fwversion < t4minfirmware then
    print("Error: this example requires firmware version", t4minfirmware, "or higher on the T4")
    print("Stopping the script")
    -- Writing a 0 to LUA_RUN stops the script
    MB.W(6000, 1, 0)
  end
  -- Set the resolution index to Automatic (usually the highest available)
  MB.writeName("AIN_ALL_RESOLUTION_INDEX", 0)
elseif devtype == 7 then
  -- If using a T7 and the firmware does not meet the minimum requirement
  if fwversion < t7minfirmware then
    print("Error: this example requires firmware version", t7minfirmware, "or higher on the T7")
    print("Stopping the script")
    -- Writing a 0 to LUA_RUN stops the script
    MB.W(6000, 1, 0)
  end
  -- Set the resolution index to 8 (the default value is 8 on the T7, 9 on the PRO)
  MB.writeName("AIN_ALL_RESOLUTION_INDEX", 8)
  --set the input voltage range to +-10V
  MB.writeName("AIN_ALL_RANGE",10)
end

-- Ensure analog is on
MB.writeName("POWER_AIN", 1)

local devtype = MB.readName("PRODUCT_ID")
-- If using a T7
if devtype == 7 then

  -- If using a T4
elseif devtype == 4 then

end

local alldata = 0
local iter = 0
-- Initialize min to a large value so the first data value is set to min
local minv = 1000
-- Initialize max to a small value so the first data value is set to max
local maxv = -1000
-- The rate that data will be read in Hz
local scanrate = 50
-- The number of scans to collect
local numscans = 5000
-- Configure an interval (in ms) to wait before acquiring new data
LJ.IntervalConfig(0, 1000 / scanrate)
print("Estimated time to execute (s): ", numscans / scanrate)

-- Loop as fast as possible until the desired number of scans have been acquired
while iter < numscans do
  -- If an interval is done increase iter and read data from AIN
  if LJ.CheckInterval(0) then
    iter = 1 + iter
    -- Read AIN1
    local newdata = MB.readName("AIN1")
    -- Check if the new data is the new maximum
    if (newdata > maxv) then
      maxv = newdata
    end
    -- Check if the new data is the new minimum
    if (newdata <= minv) then
      minv = newdata
    end
    -- Keep a summation of all acquired data in order to get an average later
    alldata = newdata + alldata
  end
end
-- Calculate the average of all of the acquired data
local avg = alldata / numscans

-- Write the average, min, and max values to USER RAM
MB.writeName("USER_RAM0_F32",avg)
MB.writeName("USER_RAM1_F32",maxv)
MB.writeName("USER_RAM2_F32",minv)
print("Average voltage: ",avg)
print("Min voltage: ",minv)
print("Max voltage: ",maxv)

print("")
print("Finished")
-- Writing 0 to LUA_RUN stops the script
MB.writeName("LUA_RUN", 0)