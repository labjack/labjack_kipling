--[[
    Name: 6_output_triangle_wave.lua
    Desc: This example shows how to output a triangle wave on DAC0
    Note: Faster(higher frequency) sine waves can be created using stream out:
            https://labjack.com/support/datasheets/t-series/communication/stream-mode
    This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Output triangle wave centered on 2V. Analog output is DAC0. Update at 100Hz")
local vout = 0
local step = 0.02
local increasing = 1

-- configure a 10ms interval
LJ.IntervalConfig(0, 10)
-- Run an infinite loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if increasing == 1 then
      vout = vout + step
    else
      vout = vout - step
    end
    -- Use 4V for the peak voltage
    if vout >= 4 then
      increasing = 0
      vout = 4
    end
    -- Use 0V for the minimum voltage
    if vout <= 0 then
      increasing = 1
      vout = 0
    end
    MB.writeName("DAC0", vout)
    MB.writeName("USER_RAM0_F32", vout)
    print(vout)
  end
end
