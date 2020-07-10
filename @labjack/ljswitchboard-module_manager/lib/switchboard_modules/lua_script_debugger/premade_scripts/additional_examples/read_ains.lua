--[[
    Name: read_ains.lua
    Desc: Read analog inputs with the array function.
--]]

print("Read analog inputs with the array function.")


-- Configure a 500ms interval
LJ.IntervalConfig(0, 500)
local numAINs = 3
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    ains = MB.readNameArray("AIN0",numAINs)

    for i=1, (numAINs) do
      print(string.format("AIN%d: %.5f",(i-1),ains[i]))
    end
    
  end
end


