--[[
    Name: speed_test-ain_and_pwm.lua
    Desc: This example will output whatever is on AIN0 and configure a PWM wave
    Note: In most cases, users should throttle their code execution using the
          functions: "LJ.IntervalConfig(0, 1000)", and "if check_interval(0)"

          Users must first configure a digital I/O for PWM out, and save those
          settings as defaults. After PWM output is enabled, the duty cycle can
          be updated easily by changing DIO0_EF_CONFIG_A:
            http://labjack.com/support/datasheets/t7/digital-io/extended-features/pwm-out
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_read = MB.R
local modbus_write = MB.W
local check_interval = LJ.CheckInterval

print("Benchmarking Test: Read AIN0 as fast as possible, and configure Duty Cycle.")
-- The throttle setting can correspond roughly with the length of the Lua
-- script. A rule of thumb for deciding a throttle setting is
-- Throttle = (3*NumLinesCode)+20. The default throttle setting is 10 instructions
local throttle = 50
LJ.setLuaThrottle(throttle)
throttle = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", throttle)

-- Read the PRODUCT_ID register to get the device type
local devtype = modbus_read(60000, 3)
-- Not all DIO registers are capable of PWM and the capable registers can vary
-- depending on the device being used
-- Assume the device being used is a T7, use DIO0_EF_CONFIG_A
local dioefchannel = 44300
-- If actually using a T4 device
if devtype == 4 then
  -- Use DIO6_EF_CONFIG_A
	dioefchannel = 44312
end

-- For the fastest AIN speeds, T7-PROs must use the 16-bit
-- high speed converter, instead of the slower 24-bit converter
-- Make sure the POWER_AIN register is "on"
modbus_write(48005, 0, 1)
-- Set AIN_ALL_RESOLUTION_INDEX to 1(fastest setting on both the T7 and T4)
modbus_write(43903, 0, 1)

local numwrites = 0

-- Configure an interval of 2000ms
LJ.IntervalConfig(0, 2000)
-- Run the program in an infinite loop
while true do
  -- The address of AIN0 is 0, type is 3 (FLOAT32)
  local ain0 = modbus_read(0, 3)
  -- Insert logic for determining the new duty cycle
  local newdc = 4000;
  -- End logic

  -- Change the duty cycle to 50% DIO#_EF_CONFIG_A
  modbus_write(dioefchannel, 1, newdc)
  numwrites = numwrites + 1
  -- If an interval is done
  if check_interval(0) then
    -- Convert the number of writes per interval to a frequency
    numwrites = numwrites / (interval / 1000)
    print ("Frequency in Hz: ", numwrites)
    numwrites = 0
  end
end