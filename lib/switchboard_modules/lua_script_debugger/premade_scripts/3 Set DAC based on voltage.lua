print("Read AIN3 input voltage and set DAC0 output voltage. Update at 10Hz")
local InputVoltage = 0
local ThresholdVoltage = 2.5                      --threshold is 2.5V
local OutputVoltageA = 4.5
local OutputVoltageB = 0

LJ.IntervalConfig(0, 100)                   --set interval to 100 for 100ms
local checkInterval=LJ.CheckInterval
local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W

while true do
  if LJ.CheckInterval(0) then               --interval completed
    InputVoltage = mbRead(6, 3)               --read AIN3. Address is 6, type is 3
    print("AIN3: ", InputVoltage, "V")
    if InputVoltage > ThresholdVoltage then --if the input voltage exceeds 2.5V
      mbWrite(1000, 3, OutputVoltageA)       --Set DAC0 to 4.5V. Address is 1000, type is 3
      print ("DAC0: ", OutputVoltageA)
    else
      mbWrite(1000, 3, OutputVoltageB)       --Set DAC0 to 0V.
      print ("DAC0: ", OutputVoltageB)
    end
  end
end