--[[
    Name: print_device_time.lua
    Desc: This example shows how to use the RTC module on T7-PRO devices to
          read the device time
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

          This example requires FW 1.0128 or newer
--]]

local modbus_read_array = MB.RA
local check_interval = LJ.CheckInterval

print("Read the real-time-clock RTC, print the timestamp.")
-- Read the HARDWARE_INSTALLED register to get the RTC module status
local hardware = MB.R(60010, 1)
-- The third bit in hardware correlates to the RTC module status
-- If this third bit is not 1, the RTC module is not installed, exit the script
if(bit.band(hardware, 4) ~= 4) then
  print("This Lua script requires a Real-Time Clock (RTC), but an RTC is not detected. These modules are only preinstalled on the T7-Pro, and cannot be added to the T7 or T4. Script Stopping")
  -- Write a 0 to LUA_RUN to stop the script
  MB.W(6000, 1, 0)
end

-- Array of UINT16 time data
local timetable = {}
timetable[1] = 0    --year
timetable[2] = 0    --month
timetable[3] = 0    --day
timetable[4] = 0    --hour
timetable[5] = 0    --minute
timetable[6] = 0    --second

-- Configure an interval of 500ms
LJ.IntervalConfig(0, 500)
while true do
  -- If the interval is done print the time
  if check_interval(0) then
    -- Read the RTC_TIME_CALENDAR register to get the device time
    timetable, error = modbus_read_array(61510, 0, 6)
    print(string.format(
      "%04d/%02d/%02d %02d:%02d.%02d",
      timetable[1],
      timetable[2],
      timetable[3],
      timetable[4],
      timetable[5],
      timetable[6])
    )
    -- print("Year: ", timetable[1])
    -- print("Month: ", timetable[2])
    -- print("Day: ", timetable[3])
    -- print("Hour: ", timetable[4])
    -- print("Minute:", timetable[5])
    -- print("Second:", timetable[6])
    -- print("\n")
  end
end