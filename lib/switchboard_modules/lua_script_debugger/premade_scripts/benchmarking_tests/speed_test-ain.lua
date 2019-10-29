--[[
    Name: speed_test-ain.lua
    Desc: This example will read AIN0 as fast as possible
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"

          On a T7 (FW 1.0282) this example runs at around 16kHz
          On a T4 (FW 1.0023) this example runs at around 12kHz 
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_read = MB.R
local check_interval = LJ.CheckInterval

print("Benchmarking Test: Read AIN0 as fast as possible.")
-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 36
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttle)

-- For the fastest AIN speeds, T7-PROs must use the 16-bit
-- high speed converter, instead of the slower 24-bit converter
-- Make sure the POWER_AIN register is "on"
MB.W(48005, 0, 1)
-- Set AIN_ALL_RESOLUTION_INDEX to 1(fastest setting on both the T7 and T4)
MB.W(43903, 0, 1)

local numwrites = 0
local interval = 2000

-- Configure an interval of 2000ms
LJ.IntervalConfig(0, interval)
-- Run the program in an infinite loop
while true do
  -- Address of AIN0 is 0, type is 3 (FLOAT32)
  local ain0 = modbus_read(0, 3)
  numwrites = numwrites + 1
  -- If a 2000ms interval is done
  if check_interval(0) then
    -- Convert the number of writes per interval into a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end