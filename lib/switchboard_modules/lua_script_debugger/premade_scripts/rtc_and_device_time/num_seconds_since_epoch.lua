--[[
    Name: num_seconds_since_epoch.lua
    Desc: This example shows how to use the RTC module on T7-PRO devices to get
          the number of seconds since epoch
    Note: The RTC is only included on the -Pro variant of the T7

          Address 61510 has the timestamp in a format that can be read by Lua
          scripts. Address 61500 should not be used directly due to truncation
          during conversion from u32 to float

          If Address 61500 absolutely needs to be read, it can be done by
          reading it as an array of u16's, but if you try to combine them,
          truncation will occur.

          If a (ms) value needs to be read, the SYSTEM_COUNTER_10KHZ register
          can be read and correlated to the RTC_TIME_S register.
          For more details see the datasheet page:
            https://labjack.com/support/datasheets/t-series/rtc

          This example requires firmware 1.0282
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_read_array = MB.RA
local modbus_read = MB.R
local check_interval = LJ.CheckInterval

print("Read the RTC_TIME_S register and SYSTEM_COUNTER_10KHZ to get a ms value.")
-- Read the HARDWARE_INSTALLED register to get the RTC module status
local hardware = MB.readName("HARDWARE_INSTALLED")
-- The third bit in hardware correlates to the RTC module status
-- If this third bit is not 1, the RTC module is not installed, exit the script
if(bit.band(hardware, 4) ~= 4) then
  print("This Lua script requires a Real-Time Clock (RTC), but an RTC is not detected. These modules are only preinstalled on the T7-Pro, and cannot be added to the T7 or T4. Stopping Script")
  -- Write a 0 to LUA_RUN to stop the script
  MB.writeName("LUA_RUN", 0)
end

local numseconds = {}
-- Upper UINT16
numseconds[1] = 0
-- Lower UINT16
numseconds[2] = 0

-- Create an interval of 500ms
LJ.IntervalConfig(0, 500)
-- Run the program in an infinite loop
while true do
  -- If the interval is done print the time since epoch
  if check_interval(0) then
    -- Read RTC_TIME_S to get the time since epoch
    numseconds, error = modbus_read_array(61500, 0, 2)
    -- Read SYSTEM_COUNTER_10KHZ, which is synchronized with RTC_TIME_S, to get
    -- the decimal point of the time since epoch (up to .1ms resolution)
    msec = modbus_read(61502, 1)
    print(string.format("%d %d %f", numseconds[1], numseconds[2], msec, msec/10000))
  end
end