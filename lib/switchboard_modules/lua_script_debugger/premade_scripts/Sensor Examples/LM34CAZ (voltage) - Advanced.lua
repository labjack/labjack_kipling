print("Get voltage from a LM34 temperature sensor. Set FIO3. Save temperature to LUA_IO0_READ.")
--Requires Firmware 1.0161 or newer
--The LM34CAZ outputs an analog voltage equal to 10mV/°F.
--At 70 degrees F, the output will be 0.70mV, so the conversion is very easy.
--For more information on the LM34CAZ, see http://www.ti.com/lit/ds/symlink/lm34.pdf

local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W

local voltage = 0
local Temperature_F = 0
local Temperature_Threshold_F = 80
local above_thresh_DIO_state = 1      --1 is output high 3.3V
local under_thresh_DIO_state = 0      --0 is output low 0V

mbWrite(48005, 0, 1)               --Ensure analog is on
mbWrite(43903, 0, 0)               --Set AIN_ALL_RESOLUTION_INDEX to auto

LJ.IntervalConfig(0, 1000)      --set interval to 1000 for 1000ms
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then   --interval completed
    
    --Get the temperature
    voltage = mbRead(0, 3)        --Read address 0 (AIN0), type is 3
    Temperature_F = voltage * 100
    print ("Temperature:", Temperature_F, "°F")
    
    --Code response to temperature changes
    if Temperature_F > Temperature_Threshold_F then
      mbWrite(2003, 0, above_thresh_DIO_state)  --Address is 2003 (FIO3), type is 0
      print("Above Thresh!")
    else
      mbWrite(2003, 0, under_thresh_DIO_state)  --Address is 2003 (FIO3), type is 0
      print("Under Threshold")
    end
    
    --Make temperature accessible to external computer (logging program)
    mbWrite(46000, Temperature_F)    --USER_RAM0_F32
    
  end
end