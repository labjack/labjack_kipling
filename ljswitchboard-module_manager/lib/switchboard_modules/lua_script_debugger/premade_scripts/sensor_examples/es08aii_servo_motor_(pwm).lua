--[[
    Name: es08aii_servo_motor_(pwm).lua
    Desc: This is an example that shows how to use PWM output to control a
          servo motor
    Note: This example does not use the PWM library (found under Digital IO EF)
          but is fully functional

          Users must first configure a digital I/O for PWM out

          Servos draw a significant amount of current. Capacitors may be needed
          to prevent brownout conditions

          Default for most servo motors is 50 Hz or one cycle every 20ms

          See our datasheet page on the pwm-out feature:
            https://labjack.com/support/datasheets/t7/digital-io/extended-features/pwm-out
--]]

print("Example for servo motor using PWM output.")

local roll = 25000
local rolltable = {}
rolltable[1] = roll / 256
rolltable[2] = roll - rolltable[1]*256
-- Duty cycle as a percentage
local dutycycle = 10
print("duty cycle:", dutycycle)
-- Turn off clock 0 during configuration
MB.writeName("DIO_EF_CLOCK0_ENABLE", 0)
-- Configure the clock 0 divisor
MB.writeName("DIO_EF_CLOCK0_DIVISOR", 8)
-- Write the clock 0 roll value as 2 UINT16s to avoid potential truncation
MB.writeNameArray("DIO_EF_CLOCK0_ROLL_VALUE", 2, rolltable, 0)
-- Enable clock 0
MB.writeName("DIO_EF_CLOCK0_ENABLE", 1)
local pinoffset = 0
local devtype = MB.readName("PRODUCT_ID")
-- If using a T7
if devtype == 7 then
  -- Use FIO0 for PWM
	pinoffset = 0
  -- If using a T4
elseif devtype == 4 then
  -- Use FIO6 for PWM
	pinoffset = 12
end
local efenableaddr = MB.nameToAddress("DIO0_EF_ENABLE")
local efindexaddr = MB.nameToAddress("DIO0_EF_INDEX")
local efoptionsaddr = MB.nameToAddress("DIO0_EF_OPTIONS")
local efconfigaddr = MB.nameToAddress("DIO0_EF_CONFIG_A")
-- Disable DIO#_EF_ENABLE during configuration
MB.W(efenableaddr+pinoffset, 1, 0)
-- Configure the PWM feature
MB.W(efindexaddr+pinoffset, 1, 0)
-- Use clock 0 for the clock source
MB.W(efoptionsaddr+pinoffset, 1, 0)
local processing = 0
-- Configure a 500ms interval
LJ.IntervalConfig(0, 500)

while processing~=3 do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if processing == 0 then
      -- Configure duty cycle to be: 50%
      MB.W(efconfigaddr+pinoffset, 1, roll/((1/dutycycle)*100))
      -- Enable the EF system; the PWM wave is now being output
      MB.W(efenableaddr+pinoffset, 1, 1)
      print("duty cycle:", dutycycle+10)
      processing = 1
      -- If in the "off" state
    elseif processing == 1 then
      -- Disable FIO after 3 seconds to set the servo position
      MB.W(efenableaddr+pinoffset, 1, 0)
      -- Set a new duty cycle to 10% more than previous
      dutycycle=dutycycle+10
      processing = 0
      -- If the duty cycle reaches or exceeds 100% break out of the loop
      if (dutycycle>=100) then
        processing=3
      end
    end
  end
end
-- Writing a 0 to LUA_RUN stops the script
MB.writeName("LUA_RUN", 0)