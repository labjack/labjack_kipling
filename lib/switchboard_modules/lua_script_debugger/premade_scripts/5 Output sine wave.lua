print("Output sine wave. Analog output is DAC0.")
--Creates a rudimentary sine wave on DAC0.
--Note that faster(higher frequency) sine waves can be created using stream out 
--see the device datasheet stream out section

OutputVoltage = 0

amplitude = 2           --amplitude in volts (maximum of 5V for VS)
offset = 2.5            --offset, or centerline voltage in volts
frequency = 1           --frequency in Hz
rad_step = .1           --radians per step. A smaller number increases waveform resolution

timer_ms = 1000 / (2 * (frequency / rad_step) )
rads = 0

LJ.IntervalConfig(0, timer_ms)                   --set interval to 10 for 10ms

while true do
  if LJ.CheckInterval(0) then                 --interval completed
    if rads >= 2 then
      rad_step = rad_step * -1
    end
    OutputVoltage = ( (math.sin(rads) ) * amplitude) + offset
    rads = rads + rad_step
    MB.W(1000, 3, OutputVoltage)            --Set DAC0. Address is 1000, type is 3
    print(OutputVoltage)
  end
end