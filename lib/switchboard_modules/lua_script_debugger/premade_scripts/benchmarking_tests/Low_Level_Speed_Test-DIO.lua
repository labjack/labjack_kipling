print("Benchmarking Test: Low-Level toggle of digital I/O 3 as fast as possible.")
--This example will output a digital waveform at at 20-25kHz on FIO3
--Note: Most commonly users should throttle their code execution using the functions:
--"LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0) then" ...


--The throttle setting can correspond roughly with the length of the Lua script.
--A rule of thumb for deciding a throttle setting is Throttle = (3*NumLinesCode) + 20
ThrottleSetting = 40    --Default throttle setting is 10 instructions
LJ.DIO_D_W(3, 1)        --Change FIO3 direction _D_ to output. Low level IO number is 3

LJ.setLuaThrottle(ThrottleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", ThrottleSetting)

Print_interval_ms = 2000
c = 0
LJ.IntervalConfig(0, Print_interval_ms)

while true do
  LJ.DIO_S_W(3, 0)      --Change the state _S_ of FIO3 to 0
  LJ.DIO_S_W(3, 1)      --Change the state _S_ of FIO3 to 1
  c = c + 1
  if LJ.CheckInterval(0) then
    c = c / (Print_interval_ms / 1000)
    print ("Frequency in Hz: ", c)
    c = 0
  end
end