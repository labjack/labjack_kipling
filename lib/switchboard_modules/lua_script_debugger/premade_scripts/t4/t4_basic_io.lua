--[[
    Name: t4_basic_io.lua
    Desc: This is a basic lua script example that interacts with analog and
          digital I/O on the T4. During initialization, all of the flexible I/O
          lines get configured as digital I/O.  Once running, once per second,
          an analog value is read from AIN0 and written to DAC0. FIO4 is read
          and its state is written to FIO5.
    Note: See our website for more information on flexible I/O:
            https://labjack.com/support/datasheets/t-series/digital-io/flexible-io
--]]

print("T4 Basic I/O Example")
-- Get the device type by reading the PRODUCT_ID register
local devtype = MB.R(60000, 3)
-- If the user is not using a T4 exit the script
if devtype ~= 4 then
  print("Device is not a T4")
  -- Write 0 to LUA_RUN to stop the script
  MB.W(6000, 1, 0);
end

-- Write 0 to the DIO_ANALOG_ENABLE register to configure all FIO lines as
-- digital I/O
MB.W(2880, 1, 0x000)

-- Set up a 1 second interval
LJ.IntervalConfig(0, 1000)
-- Run the program in an infinite loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Read AIN0
    local ainval = MB.R(0, 3)
    -- Ensure the AIN0 value is between 0V and 5V
    local dacval = ainval
    if(ainval > 5) then
      dacval = 5
    end
    if(ainval < 0) then
      dacval = 0
    end
    -- Write the AIN0 value to DAC0.
    MB.W(1000, 3, dacval)
    -- Read FIO4 and write its value to FIO5
    local fioval = MB.R(2004, 0)
    MB.W(2005, 0, fioval)
    print('Set DAC0 to:', dacval)
        print('Set FIO5 to:', fioval)
        print('') -- Print a new-line
  end
end

