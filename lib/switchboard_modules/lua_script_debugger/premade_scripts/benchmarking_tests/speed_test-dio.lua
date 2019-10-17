--[[
    Name: speed_test-dio.lua
    Desc: This example will output a digital waveform on FIO3
          (FIO5 if using a T4) as fast as possible
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if check_interval(0)"
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_write = MB.W
local check_interval = LJ.CheckInterval

print("Benchmarking Test: Toggle the digital I/O pin FIO3 (FIO5 on the T4) as fast as possible.")
-- It is NOT RECOMMENDED for users to structure their code as is done in this benchmarking test.
-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 48
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttle)

-- The PRODUCT_ID register holds the device type
local devtype = MB.readName("PRODUCT_ID")
-- Assume the device being used is a T7, use FIO3 pin (address = 2003)
local outpin = 2003
-- If actually using a T4
if devtype == 4 then
  -- Use FIO5 pin (address = 2005)
  outpin = 2005
end

-- Use a 2000ms interval
local interval = 2000
local numwrites = 0

LJ.IntervalConfig(0, interval)
while true do
  -- Write 1 to the outpin. Type is 0 (UINT16)
  modbus_write(outpin, 0, 1)
  -- Write 0 to outpin. Type is 0 (UINT16)
  modbus_write(outpin, 0, 0)
  numwrites = numwrites + 1
  if check_interval(0) then
    -- Convert the number of writes per interval to a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end