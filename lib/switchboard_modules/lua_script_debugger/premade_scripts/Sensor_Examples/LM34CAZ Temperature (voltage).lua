print("Get voltage from a LM34CAZ temperature sensor. Sensor wired to AIN0")
--The LM34CAZ outputs an analog voltage equal to 10mV/°F.
--At 70 degrees F, the output will be 0.70mV, so the conversion is very easy.
--For more information on the LM34CAZ, see http://www.ti.com/lit/ds/symlink/lm34.pdf

voltage = 0
Temperature_F = 0

MB.W(48005, 0, 1)                   --Ensure analog is on

LJ.IntervalConfig(0, 1000)          --set interval to 1000 for 1000ms

while true do
  if LJ.CheckInterval(0) then       --interval completed
    voltage = MB.R(0, 3)            --Read address 0 (AIN0), type is 3
    Temperature_F = voltage * 100
    print ("Temperature:", Temperature_F, "°F")
  end
end