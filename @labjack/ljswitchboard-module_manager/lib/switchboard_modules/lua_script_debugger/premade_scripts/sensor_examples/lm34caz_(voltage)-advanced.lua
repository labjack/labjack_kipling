--[[
    Name: lm34caz_(voltage)-advanced.lua
    Desc: This example shows how to get voltage measurements from a
          LM34CAZ temperature sensor and save the values to USER_RAM
    Note: The LM34CAZ outputs an analog voltage equal to 10mV/°F
          At 70 degrees F, the output will be 0.70mV, so the conversion is easy

          We recommend connecting a 10kΩ resistor between Vout and GND to
          keep the signal from becoming unstable

          For more information on the LM34CAZ see:
            http://www.ti.com/lit/ds/symlink/lm34.pdf
--]]

print("Get voltage from a LM34 temperature sensor. Set FIO3. Save temperature to USER_RAM")
local tempthreshold = 80
local diostate = 0
-- Assume the device being used is a T7, set FIO3
local outpin = "FIO3"
local devtype = MB.readName("PRODUCT_ID")
-- If actually using a T4
if devtype == 4 then
  -- Set FIO5
	outpin = "FIO5"
end
-- Ensure analog is on
MB.writeName("POWER_AIN", 1)
-- Set AIN_ALL_RESOLUTION_INDEX to auto
MB.writeName("AIN_ALL_RESOLUTION_INDEX", 0)
-- Configure a 1000ms interval
LJ.IntervalConfig(0, 1000)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    --Get the temperature
    local voltage = MB.readName("AIN0")
    local tempf = voltage * 100
    print ("Temperature:", tempf, "°F")
    -- Set outpin according to the temperature reading
    if tempf > tempthreshold then
      diostate = 1
      print("Above Threshold!")
    else
      diostate = 0
      print("Under Threshold")
    end
    MB.writeName(outpin, diostate)
    -- Make temperature accessible to an external computer (logging program)
    MB.writeName("USER_RAM0_F32", tempf)
  end
end