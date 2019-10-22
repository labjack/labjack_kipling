--[[
    Name: speed_test-dac.lua
    Desc: This example will output a waveform on DAC0 as fast as possible
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if check_interval(0)"
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_write = MB.W
local check_interval = LJ.CheckInterval

print("Benchmarking Test: Set DAC0 to 2.5V, then 0V as fast as possible.")
-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 36
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttle)

local numwrites = 0

-- Configure an interval of 2000ms
LJ.IntervalConfig(0, 2000)
-- Run the program in an infinite loop
while true do
  -- Write 2.5V to DAC0. Address is 1000, type is 3 (FLOAT32)
  modbus_write(1000, 3, 2.5)
  -- Write 0.0V to DAC0. Address is 1000, type is 3 (FLOAT32)
  modbus_write(1000, 3, 0.0)
  numwrites = numwrites + 1
  -- If an interval is done
  if check_interval(0) then
    -- Convert the number of writes per interval to a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end