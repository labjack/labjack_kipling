--[[
    Name: mb1000_range_finder_(pwm).lua
    Desc: This example shows how to communicate with a MaxBotix MB1000
          ultrasonic range sensor using PWM
    Note: The PWM capable DIO on the T7 are FIO0 and FIO1, so this example uses
          FIO0 (DIO0)

          Alternatively, you could poll a DIO line, but the PWM feature of the
          T7 makes it more accurate, and the script is simple when using the PWM feature

          The distance can be calculated using the scale factor of 147uS per inch

          See the mb1000 datasheet and our T7 datasheet page on PWM:
            http://www.maxbotix.com/documents/MB1000_Datasheet.pdf
            https://labjack.com/support/datasheets/t7/digital-io/extended-features/pulse-width
--]]

print("Communicate with a MaxBotix MB1000 ultrasonic range sensor using PWM.")
-- These settings could be configured outside of script, and saved as defaults
-- Configure the clock to provide the maximum measurable period
local roll = 0
local rolltable = {}
rolltable[1] = roll / 256
rolltable[2] = roll - rolltable[1]*256
-- Disable the clock during configuration
MB.writeName("DIO_EF_CLOCK0_ENABLE", 0)
-- Set the divisor to 1, PWM resolution is 12.5ns
MB.writeName("DIO_EF_CLOCK0_DIVISOR", 1)
-- Write the clock 0 roll value as 2 UINT16s to avoid potential truncation
MB.writeNameArray("DIO_EF_CLOCK0_ROLL_VALUE", 2, rolltable, 0)
-- Enable the clock
MB.writeName("DIO_EF_CLOCK0_ENABLE", 1)
local pinoffset = 0
local devtype = MB.readName("PRODUCT_ID")
-- If using a T7
if devtype == 7 then
  -- Use FIO0 for PWM
	pinoffset = 0
-- If using a T4
elseif devtype == 4 then
  -- Use FIO4 for PWM
	pinoffset = 8
end
local efenableaddr = MB.nameToAddress("DIO0_EF_ENABLE")
local efindexaddr = MB.nameToAddress("DIO0_EF_INDEX")
local efoptionsaddr = MB.nameToAddress("DIO0_EF_OPTIONS")
local efreadaddr = MB.nameToAddress("DIO0_EF_READ_A_F_AND_RESET")
-- Disable the DIO extended features during configuration
MB.W(efenableaddr+pinoffset, 1, 0)
-- Set DIO_EF_INDEX to use PWM (index = 5)
MB.W(efindexaddr+pinoffset, 1, 5)
-- Use clock 0 for the clock source
MB.W(efoptionsaddr+pinoffset, 1, 0)
-- Enable the DIO_EF system
MB.W(efenableaddr+pinoffset, 1, 1)
-- Configure a 333ms interval
LJ.IntervalConfig(0, 333)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Get the measured high time in seconds and reset
    local pulsewidth = MB.R(efreadaddr+pinoffset, 3)
    -- Apply the scale factor to get the range in inches
    local range = pulsewidth / 0.000147
    print("range: ", range, "inches")
  end
end