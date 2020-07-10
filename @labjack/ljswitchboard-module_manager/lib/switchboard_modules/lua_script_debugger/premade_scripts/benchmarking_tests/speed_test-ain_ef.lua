--[[
    Name: speed_test-ain_ef.lua
    Desc: This example will read a thermocouple connected to AIN0 as fast as possible
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0)"

          On a T7 (FW 1.0282) this example runs at around 16kHz

          This example requires firmware 1.0282 (T7)
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_read = MB.R
local check_interval = LJ.CheckInterval

-- Read product ID, stop script if T4 is detected.
local pid = MB.readName('PRODUCT_ID')
if pid == 4 then
    MB.writeName('LUA_RUN',0)
end

print("Benchmarking Test: Read a thermocouple connected to AIN0 as fast as possible.")
MB.writeName("IO_CONFIG_SET_CURRENT_TO_FACTORY", 1)

-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 36
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print("Current Lua Throttle Setting: ", throttle)

-- For the fastest AIN speeds, T7-PROs must use the 16-bit
-- high speed converter, instead of the slower 24-bit converter
-- Make sure the POWER_AIN register is "on"
MB.writeName("POWER_AIN", 1)
-- Configure AIN0 for type K thermocouples
MB.writeName("AIN0_EF_INDEX", 0)
MB.writeName("AIN0_EF_INDEX", 22)
MB.writeName("AIN0_EF_CONFIG_B", 60052) -- Set the CJC source to be "TEMPERATURE_DEVICE_K"
MB.writeName("AIN0_EF_CONFIG_D", 1) -- Set the slope for the CJC reading to be 1
MB.writeName("AIN0_EF_CONFIG_E", 0) -- Set the offset for the CJC reading to be 0


local numwrites = 0
local interval = 2000

-- Configure an interval of 2000ms
LJ.IntervalConfig(0, interval)
-- Run the program in an infinite loop
while true do
  -- Address of AIN0_EF_READ_A is 7000, type is 3 (FLOAT32)
  local ain0 = modbus_read(7000, 3)
  numwrites = numwrites + 1
  -- If a 2000ms interval is done
  if check_interval(0) then
    -- Convert the number of writes per interval into a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end
