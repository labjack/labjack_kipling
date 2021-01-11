print("Blink the COMM and Status LEDs at 1 Hz.")
local isOn = 0
local mbWrite=MB.W

LJ.IntervalConfig(0, 1000)      --set interval to 1000 for 1000ms
local checkInterval=LJ.CheckInterval

local i = 0
local maxI = 5
mbWrite(48006, 0, 4) -- Manual LED Control
while i < maxI do
  if checkInterval(0) then   --interval completed
    if isOn == 1 then
      isOn = 0
      mbWrite(2990, 0, 0)
      mbWrite(2991, 0, 0)
      print(isOn, "Off")
    else
      isOn = 1
      mbWrite(2990, 0, 1)
      mbWrite(2991, 0, 1)
      print(isOn, "On")
    end
    i = i + 1
  end
end
print('Finished');
mbWrite(48006, 0, 1) -- Manual LED Control
mbWrite(6000, 1, 0) -- Exit Lua Script