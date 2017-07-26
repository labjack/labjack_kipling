print("Get voltage from a LM34CAZ temperature sensor. Sensor wired to AIN0")
--The LM34CAZ outputs an analog voltage equal to 10mV/°F.
--At 70 degrees F, the output will be 0.70mV, so the conversion is very easy.
--For more information on the LM34CAZ, see http://www.ti.com/lit/ds/symlink/lm34.pdf

local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W

local voltage = 0
local Temperature_F = 0

mbWrite(48005, 0, 1)                   --Ensure analog is on

LJ.IntervalConfig(0, 1000)          --set interval to 1000 for 1000ms
local checkInterval=LJ.CheckInterval

while true do
  if checkInterval(0) then       --interval completed
    voltage = mbRead(0, 3)            --Read address 0 (AIN0), type is 3
    Temperature_F = voltage * 100
    print ("Temperature:", Temperature_F, "°F")
  end
end