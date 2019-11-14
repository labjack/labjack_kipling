print("Read AIN0 and AIN1 and write those values to DAC0 and DAC1")

LJ.IntervalConfig(0, 500)           --Configure interval
local checkInterval=LJ.CheckInterval

while true do
  if checkInterval(0) then     --interval finished
    MB.writeName("DAC0", MB.readName("AIN0"))
    MB.writeName("DAC1", MB.readName("AIN1"))
  end
end