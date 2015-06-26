print("Output triangle wave centered on 2V. Analog output is DAC0. Update at 100Hz")
OutputVoltage = 0
Step = 0.02
increasing = 1

LJ.IntervalConfig(0, 10)                   --set interval to 10 for 10ms

while true do
  if LJ.CheckInterval(0) then               --interval completed
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

    MB.W(1000, 3, OutputVoltage)            --Set DAC0. Address is 1000, type is 3
    print(OutputVoltage)
  end
end