print("Output triangle wave centered on 2V. Analog output is DAC0. Update at 100Hz")
local OutputVoltage = 0
local Step = 0.02
local increasing = 1

local checkInterval=LJ.CheckInterval
LJ.IntervalConfig(0, 10)                   --set interval to 10 for 10ms
local mbWrite=MB.W

while true do
  if checkInterval(0) then               --interval completed
    if increasing == 1 then
      OutputVoltage = OutputVoltage + Step
    else
      OutputVoltage = OutputVoltage - Step
    end

    if OutputVoltage >= 4 then
      increasing = 0
      OutputVoltage = 4
    end

    if OutputVoltage <= 0 then
      increasing = 1
      OutputVoltage = 0
    end

    mbWrite(1000, 3, OutputVoltage)            --Set DAC0. Address is 1000, type is 3
    mbWrite(46000, 3, OutputVoltage)        -- Set register "USER_RAM0_F32".  Address 46000, type 3
    print(OutputVoltage)
  end
end
