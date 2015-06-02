print("Benchmarking Test: Set DAC0 to 2.5V, then 0V as fast as possible.")
--This example will output a waveform at ~13kHz to ~15kHz on DAC0
--Note: Most commonly users should throttle their code execution using the functions:
--'LJ.IntervalConfig(0, 1000)', and 'if LJ.CheckInterval(0) then' ...


--The throttle setting can correspond roughly with the length of the Lua script.
--A rule of thumb for deciding a throttle setting is Throttle = (3*NumLinesCode) + 20
ThrottleSetting = 36    --Default throttle setting is 10 instructions

LJ.setLuaThrottle(ThrottleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", ThrottleSetting)

Print_interval_ms = 2000
c = 0
LJ.IntervalConfig(0, Print_interval_ms)

while true do
  MB.W(1000, 3, 2.5)    --write 2.5V to DAC0. Address is 1000, type is 3
  MB.W(1000, 3, 0.0)    --write 0.0V to DAC0. Address is 1000, type is 3
  c = c + 1
  if LJ.CheckInterval(0) then
    c = c / (Print_interval_ms / 1000)
    print ("Frequency in Hz: ", c)
    c = 0
  end
end