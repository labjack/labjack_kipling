Fname = "log1.csv"
file = assert(io.open(Fname, "w"))
count = 0
MB.W(48005,0,1)

print("Read temperature sensor and save value to a file.")
while true do
  D, T = LJ.TickDelta(LT)
  if D > 20000000 then	
    LT = T
    temp = MB.R(60050,3)
    print(temp)
    file:write(string.format("%.6f\r\n", temp))
    count = count + 1
  end
  if(count >= 10) then
    break
  end
end
file:close()

print("Done acquiring data. Now read and display file contents.")
Fname = "log1.csv"
file = assert(io.open(Fname, "r"))
local line = file:read("*all")
file:close()
print(line)