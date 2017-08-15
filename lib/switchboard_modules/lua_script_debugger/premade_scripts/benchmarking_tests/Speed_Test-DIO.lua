print("Benchmarking Test: Toggle the digital I/O called FIO3 (FIO5 on T4) as fast as possible.")
--This example will output a digital waveform at ~16kHz to ~18kHz on FIO3 (FIO5 on T4)
--It is NOT RECOMMENDED for users to structure their code as is done in this benchmarking test.
--Most commonly users should throttle their code execution using the functions:
--"LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0) then" ...


--The throttle setting can correspond roughly with the length of the Lua script.
--A rule of thumb for deciding a throttle setting is Throttle = (3*NumLinesCode) + 20
ThrottleSetting = 48    --Default throttle setting is 10 instructions

local outPin = 2003--FIO3. Changed if T4 instead of T7
devType = MB.R(60000, 3)
if devType == 4 then
	outPin = 2005--FIO5
end

LJ.setLuaThrottle(ThrottleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", ThrottleSetting)

Print_interval_ms = 2000
c = 0
LJ.IntervalConfig(0, Print_interval_ms)

while true do
  MB.W(outPin, 0, 1)      --write 1 to FIO3. Address is 2003, type is 0
  MB.W(outPin, 0, 0)      --write 0 to FIO3. Address is 2003, type is 0
  c = c + 1
  if LJ.CheckInterval(0) then
    c = c / (Print_interval_ms / 1000)
    print ("Frequency in Hz: ", c)
    c = 0
  end
end