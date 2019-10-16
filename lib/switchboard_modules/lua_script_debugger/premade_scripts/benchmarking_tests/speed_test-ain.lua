--[[
    Name: speed_test-ain.lua
    Desc: This example will read AIN0 at a rate between ~12kHz and ~18kHz
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"
--]]

-- Assign functions locally for faster processing
local modbus_read = MB.R
local modbus_write = MB.W
local set_lua_throttle = LJ.setLuaThrottle
local get_lua_throttle = LJ.getLuaThrottle
local interval_config = LJ.IntervalConfig
local check_interval = LJ.CheckInterval

print("Benchmarking Test: Read AIN0 as fast as possible.")
-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 36
set_lua_throttle(throttle)
throttle = get_lua_throttle()
print ("Current Lua Throttle Setting: ", throttle)

-- For the fastest AIN speeds, T7-PROs must use the 16-bit
-- high speed converter, instead of the slower 24-bit converter
-- Make sure the POWER_AIN register is "on"
modbus_write(48005, 0, 1)
-- Set AIN_ALL_RESOLUTION_INDEX to 1(fastest, on both T7 and T4)
modbus_write(43903, 0, 1)

-- Use an interval of 2000ms
local interval = 2000
local numwrites = 0

interval_config(0, interval)
while true do
  -- Address of AIN0 is 0, type is 3 (FLOAT32)
  local ain0 = modbus_read(0, 3)
  numwrites = numwrites + 1
  -- If the 2000ms interval is done
  if check_interval(0) then
    -- Convert the number of writes per interval into a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end