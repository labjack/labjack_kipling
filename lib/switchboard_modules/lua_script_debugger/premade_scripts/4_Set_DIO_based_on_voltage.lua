print("Set a DIO based on voltage. Digital I/O is FIO3, voltage measured on AIN1. Update at 10Hz")
local InputVoltage = 0
local ThresholdVoltage = 2.5                      --threshold is 2.5V

local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W

LJ.IntervalConfig(0, 100)                   --set interval to 100 for 100ms
local checkInterval=LJ.CheckInterval

while true do
  if checkInterval(0) then               --interval completed
    InputVoltage = mbRead(2, 3)               --read AIN1. Address is 2, type is 3
    print("AIN1: ", InputVoltage, "V")
    if InputVoltage > ThresholdVoltage then --if the input voltage exceeds 2.5V
      mbWrite(2003, 0, 1)                    --write 1 to FIO3. Address is 2003, type is 0, value is 1(output high)
      print(1, "high")
    else
      mbWrite(2003, 0, 0)                    --write 0 to FIO3. Address is 2003, type is 0, value is 0(output low)
      print(0, "low")
    end
  end
end