print("Toggle the digital I/O called FIO3 at 1 Hz.")
local count = 0
local high = 0
local mbWrite=MB.W

LJ.IntervalConfig(0, 1000)      --set interval to 1000 for 1000ms
local checkInterval=LJ.CheckInterval

while true do
  if checkInterval(0) then   --interval completed
    if high == 1 then
      high = 0
      mbWrite(2003, 0, 0)        --write 0 to FIO3. Address is 2003, type is 0, value is 0(output low)
      print(high, "low")
    else
      high = 1
      mbWrite(2003, 0, 1)        --write 1 to FIO3. Address is 2003, type is 0, value is 1(output high)
      print(high, "high")
    end
  end
end