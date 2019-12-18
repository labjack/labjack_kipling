--[[
    Name: 3_set_dac_based_on_voltage.lua
    Desc: This example shows how to set a DAC according to an input voltage
    Note: This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Read AIN3 input voltage and set DAC0 output voltage. Update at 10Hz")
local threshold = 2.5
local vout0 = 4.5
local vout1 = 0
-- Configure a 100ms interval
LJ.IntervalConfig(0, 100)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Get an input voltage by reading AIN3
    local vin = MB.readName("AIN3")
    print("AIN3: ", vin, "V")
    -- If vin exceeds the threshold (2.5V)
    if vin > threshold then
      -- Set DAC0 to 4.5V
      MB.writeName("DAC0", vout0)
      print ("DAC0: ", vout0)
    else
      -- Set DAC0 to 0V
      MB.writeName("DAC0", vout1)
      print ("DAC0: ", vout1)
    end
  end
end