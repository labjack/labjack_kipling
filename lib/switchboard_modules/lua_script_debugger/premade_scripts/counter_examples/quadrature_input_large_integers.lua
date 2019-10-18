--[[
    Name: quadrature_input_large_integers.lua
    Desc: Program for handling quadrature input counts that overflow 32 bit
          floats by tracking and reporting counts in two registers
    Note: Could modify with the DIO0_EF_READ_AF register for float mode

          Does not take into effect counter-clockwise revolutions or two's
          complement conversion
--]]

-- For sections of code that require precise timing assign global functions
-- locally (local definitions of globals are marginally faster)
local check_interval = LJ.CheckInterval
local modbus_read = MB.R
local modbus_write = MB.W

print("quadrature_input_large_integers.lua")

-- Get the device type by reading the PRODUCT_ID register
devtype = modbus_read(60000, 3)
efreadreg = 0
efreadresetreg = 0
if(devtype == 7) then
  print("T7: Enabling quadrature input on DIO0 and DIO1")
  -- Formatting for quadrature input if using a T7
  -- Disable DIO0
  modbus_write(44000, 1, 0)
  -- Disable DIO1
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
  -- Use DIO0_EF_READ_A_AND_RESET (same as DIO0_EF_READ_A but it resets the
  -- count back to 0 after getting the input value)
  efreadresetreg = 3100
else if(devtype == 4) then
  print("T4: Enabling quadrature input on DIO4 and DIO5")
  -- Formatting for quadrature input if using a T4
  -- Disable DIO4
  modbus_write(44008, 1, 0)
  -- Disable DIO5
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
  -- Use DIO4_EF_READ_A_AND_RESET (same as DIO4_EF_READ_A but it resets the
  -- count back to 0 after getting the input value)
  efreadresetreg = 3108
end

-- Update data every 500ms
LJ.IntervalConfig(0, 500)
-- Number used to store the new value polled from the LabJack register
newcount = 0
-- Number used to keep the higher precision lower 22 bits of the number
lownum = 0
-- Number used to store the residual number of counts after conversion
residual = 0
-- Number used to store how many multiples of 2^22 have been reached
multiplier = 0

while true do
  -- It is possible to take out CheckInterval or make the interval very small
  -- for nearly continuous data polling
  if check_interval(0) then
    -- Read the DIO#_EF_READ_A register and combine it with any residual from
    -- the last conversion
    lownum = modbus_read(efreadreg, 1) + residual

    -- Once the register has a number of counts large enough that the
    -- precision could be compromised (greater than  22 bits), convert by
    -- resetting the register and split it into separate values
    if (math.abs(lownum) >= 2^22) then
      -- Read and reset the count to zero by reading the
      -- DIO#_EF_READ_A_AND_RESET register
      lownum = modbus_read(efreadresetreg, 1) + residual
      if(math.abs(lownum) > 2^23) then
        print("Quadrature count precision loss detected")
      end
      -- Save how many multiples of 2^22 of counts have occurred
      multiplier = multiplier + math.floor(lownum/2^22)
      -- Get the number of residual counts
      residual = (lownum) % 2^22
      -- Prepare to store the residual
      lownum = residual
    end

    -- Save the number of counts to USER_RAM0_U32 and USER_RAM1_U32
    modbus_write(46100,1,lownum)
    modbus_write(46102,1,multiplier)

    -- To get the full number of counts from an external application:
    --  counts = (2^22 * USER_RAM1_U32) + USER_RAM0_U32
    -- USER_RAM1_U32 can now also be used as a boolean register to see whether
    -- an overflow (data>=2^22) has occurred
  end
end
