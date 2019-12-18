--[[
    Name: lm34caz_temperature_(voltage).lua
    Desc: This example shows how to get voltage measurements from a
          LM34CAZ temperature sensor
    Note: At 70 degrees F, the output will be 0.70mV, so the conversion is easy

          We recommend connecting a 10kΩ resistor between Vout and GND to
          keep the signal from becoming unstable

          For more information on the LM34CAZ see:
            http://www.ti.com/lit/ds/symlink/lm34.pdf
--]]

print("Get voltage from a LM34CAZ temperature sensor. Sensor wired to AIN0")
-- Ensure analog is on
MB.writeName("POWER_AIN", 1)
-- Configure a 1000ms interval
LJ.IntervalConfig(0, 1000)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    local voltage = MB.readName("AIN0")
    local tempf = voltage * 100
    print ("Temperature:", tempf, "°F")
  end
end