print("Benchmarking Test: Mirror AIN1 on DAC1 as fast as possible.")
--This example will output whatever is on AIN1 and mirror it as fast as possible on DAC1
--Note: Most commonly users should throttle their code execution using the functions:
--"LJ.IntervalConfig(0, 1000)", and "if LJ.CheckInterval(0) then" ...


--The throttle setting can correspond roughly with the length of the Lua script.
--A rule of thumb for deciding a throttle setting is Throttle = (3*NumLinesCode) + 20
ThrottleSetting = 40    --Default throttle setting is 10 instructions

LJ.setLuaThrottle(ThrottleSetting)
ThrottleSetting = LJ.getLuaThrottle()
print ("Current Lua Throttle Setting: ", ThrottleSetting)

local mbw=MB.W
local mbr=MB.R

mbw(48005, 0, 1)     --Ensure analog is on
mbw(43903, 0, 1)     --set AIN_ALL_RESOLUTION_INDEX to 1 (default is 8 on t7, 9 on PRO)
mbw(43900, 3,10)     --set range to +-10V

local numCycles = 30000

while true do
  local t= mbr(61520,1)     --Read core clock
  for i=1,numCycles do
    mbw(1000, 3, mbr(2,3))    --read AIN1, write it to DAC0. Address is 1000, type is 3
  end
  local t1=(mbr(61520,1)-t)*25/(10^9)   --core clock returns ticks of 25ns each.
  print(string.format("Time to execute %d",numCycles),"read+writes (s): ",t1)
  print("Freq (Hz): ",numCycles/t1)
end