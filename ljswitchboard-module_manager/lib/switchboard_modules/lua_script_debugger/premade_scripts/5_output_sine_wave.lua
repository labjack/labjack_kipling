--[[
    Name: 5_output_sine_wave.lua
    Desc: This example shows how to output a sine wave on DAC0
    Note: Faster(higher frequency) sine waves can be created using stream out:
            https://labjack.com/support/datasheets/t-series/communication/stream-mode
    This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Output sine wave. Analog output is DAC0.")
local vout = 0
-- If max amplitude is needed, use 2.5V centerline and 2.25V amplitude.
-- VS ranges from 4.75-5.00V depending on setup.
-- Amplitude in volts (maximum of 5V for VS)
local amplitude = 2
-- Offset, or centerline voltage in volts
local offset = 2.5
-- Frequency in Hz
local frequency = 1
-- Radians per step. A smaller number increases waveform resolution
local radstep = .1
local interval = 1000 / (2 * (frequency / radstep) )
local rads = 0
LJ.IntervalConfig(0, interval)

while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    if rads >= 2 then
      radstep = radstep * -1
    end
    vout = ( (math.sin(rads) ) * amplitude) + offset
    rads = rads + radstep
    MB.writeName("DAC0", vout)
    MB.writeName("USER_RAM0_F32", vout)
    print(vout)
  end
end
