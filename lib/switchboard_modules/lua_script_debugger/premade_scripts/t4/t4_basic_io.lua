--[[
    Name: t4_basic_io.lua
    Desc: This is a basic lua script example that interacts with analog and
          digital I/O on the T4. During initialization, all of the flexible I/O
          lines get configured as digital I/O.  Once running, once per second,
          an analog value is read from AIN0 and written to DAC0. FIO4 is read
          and its state is written to FIO5.
    Note: See our website for more information on flexible I/O:
            https://labjack.com/support/datasheets/t-series/digital-io/flexible-io

          This example requires firmware 1.0023
--]]

print("T4 Basic I/O Example")
local t4minfirmware = 1.0023
-- Read the firmware version
local fwversion = MB.R(60004, 3)
-- The PRODUCT_ID register holds the device type
local devtype = MB.R(60000, 3)
-- If the user is not using a T4 exit the script
if devtype ~= 4 then
  print("Device is not a T4")
  -- Write 0 to LUA_RUN to stop the script
  MB.writeName("LUA_RUN", 0);
elseif fwversion < t4minfirmware then
  print("Error: this example requires firmware version", t4minfirmware, "or higher on the T4")
  print("Stopping the script")
  -- Writing a 0 to LUA_RUN stops the script
  MB.W(6000, 1, 0)
end

-- Write 0 to the DIO_ANALOG_ENABLE register to configure all FIO lines as
-- digital I/O
MB.writeName("DIO_ANALOG_ENABLE", 0x000)

-- Set up a 1 second interval
LJ.IntervalConfig(0, 1000)
-- Run the program in an infinite loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Read AIN0
    local ainval = MB.readName("AIN0")
    -- Ensure the AIN0 value is between 0V and 5V
    local dacval = ainval
    if(ainval > 5) then
      dacval = 5
    end
    if(ainval < 0) then
      dacval = 0
    end
    -- Write the AIN0 value to DAC0.
    MB.writeName("DAC0", dacval)
    -- Read FIO4 and write its value to FIO5
    local fioval = MB.readName("FIO4")
    MB.writeName("FIO5", fioval)
    print('Set DAC0 to:', dacval)
        print('Set FIO5 to:', fioval)
        print('') -- Print a new-line
  end
end

