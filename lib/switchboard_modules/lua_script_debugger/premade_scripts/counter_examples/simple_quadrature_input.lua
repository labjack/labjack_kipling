--[[
    Name: simple_quadrature_input.lua
    Desc: This is a simple example of how to read quadrature input data.
    Note: It is possible to modify this example to use the DIO0_EF_READ_A_F
          register to return counts as single precision floats

          This example does not take into account counter-clockwise revolutions
          or two's complement conversion
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local modbus_read = MB.R
local modbus_write = MB.W
local check_interval = LJ.CheckInterval

print("simple_quadrature_input.lua")
print("Note: This script only supports 23-bit counts.")
local efreadreg = 0

-- Get the device type by reading the PRODUCT_ID register
local devtype = modbus_read(60000, 3)
if(devtype == 7) then
  print("T7: Enabling quadrature input on DIO0 and DIO1")
  -- Formatting for quadrature input if using a T7
  -- Disable DIO0 (this is necessary for configuration)
  modbus_write(44000, 1, 0)
  -- Disable DIO1 (this is necessary for configuration)
  modbus_write(44002, 1, 0)
  -- Set DIO0_EF_INDEX to 10 (use the quadrature in feature)
  modbus_write(44100, 1, 10)
  -- Set DIO1_EF_INDEX to 10 (use the quadrature in feature)
  modbus_write(44102, 1, 10)
  -- Enable DIO0 for phase A
  modbus_write(44000, 1, 1)
  -- Enable DIO1 for phase B
  modbus_write(44002, 1, 1)
  -- Use DIO0_EF_READ_A to read the input count as a signed 2's complement value
  efreadreg = 3000
elseif(devtype == 4) then
  print("T4: Enabling quadrature input on DIO4 and DIO5")
  -- Formatting for quadrature input if using a T4
  -- Disable DIO4 (this is necessary for configuration)
  modbus_write(44008, 1, 0)
  -- Disable DIO5 (this is necessary for configuration)
  modbus_write(44010, 1, 0)
  -- Set DIO4_EF_INDEX to 10 (use the quadrature in feature)
  modbus_write(44108, 1, 10)
  -- Set DIO5_EF_INDEX to 10 (use the quadrature in feature)
  modbus_write(44110, 1, 10)
  -- Enable DIO4 for phase A
  modbus_write(44008, 1, 1)
  -- Enable DIO5 for phase B
  modbus_write(44010, 1, 1)
  -- Use DIO4_EF_READ_A to read the input count as a signed 2's complement value
  efreadreg = 3008
end

-- Update data every 500ms
LJ.IntervalConfig(0, 500)
while true do
  -- It is possible to take out CheckInterval or make the interval very small
  -- for nearly continuous data polling
  if check_interval(0) then
    -- Read the DIO#_EF_READ_A register
    local counts = modbus_read(efreadreg, 1)
    if(math.abs(counts) > 2^23) then
      print("Quadrature count precision loss detected")
      print("Use the 'Quadrature Input Large Integers' script for more accurate tracking of large integers")
    end
    -- Save the number of counts to USER_RAM0_U32
    modbus_write(46100,1,counts)
  end
end
