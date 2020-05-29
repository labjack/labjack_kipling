--[[
    Name: 0_voltage_follower.lua
    Desc: Read AIN0-1 and write them to DAC0-1
--]]

print("Read AIN0 and AIN1 and write those values to DAC0 and DAC1")
-- Configure a 500ms interval
LJ.IntervalConfig(0, 500)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    MB.writeName("DAC0", MB.readName("AIN0"))
    MB.writeName("DAC1", MB.readName("AIN1"))
  end
end