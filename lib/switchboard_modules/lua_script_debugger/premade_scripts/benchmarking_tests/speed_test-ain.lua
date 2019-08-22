print("Benchmarking Test: Read AIN0 as fast as possible.")
--This example will read AIN0 at a rate between ~12kHz and ~18kHz
--Most commonly users should throttle their code execution using the functions:
--"LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0) then" ...


--The throttle setting can correspond roughly with the length of the Lua script.
--A rule of thumb for deciding a throttle setting is Throttle = (3*NumLinesCode) + 20
ThrottleSetting = 36    --Default throttle setting is 10 instructions

LJ.setLuaThrottle(ThrottleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", ThrottleSetting)

--For fastest AIN speeds, T7-PROs must use the 16-bit 
--high speed converter, instead of the slower 24-bit converter
MB.W(48005, 0, 1)     --Ensure analog is on
MB.W(43903, 0, 1)     --set AIN_ALL_RESOLUTION_INDEX to 1(fastest, on both T7 and T4)
AIN0 = 0

Print_interval_ms = 2000
c = 0
LJ.IntervalConfig(0, Print_interval_ms)

while true do
  AIN0 = MB.R(0, 3)   --Address of AIN0 is 0, type is 3
  c = c + 1
  if LJ.CheckInterval(0) then
    c = c / (Print_interval_ms / 1000)
    print ("Frequency in Hz: ", c)
    c = 0
  end
end