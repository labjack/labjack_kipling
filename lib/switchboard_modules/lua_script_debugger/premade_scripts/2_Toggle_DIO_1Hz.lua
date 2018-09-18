print("Toggle the digital I/O called FIO3 (FIO5 on T4) at 1 Hz. Generates a 0.5Hz square wave.")
local count = 0
local high = 0
local mbWrite=MB.W

LJ.IntervalConfig(0, 1000)      --set interval to 1000 for 1000ms
local checkInterval=LJ.CheckInterval

local outPin = 2003--FIO3. Changed if T4 instead of T7
devType = MB.R(60000, 3)
if devType == 4 then
	outPin = 2005--FIO5 on T4
end

while true do
  if checkInterval(0) then   --interval completed
    if high == 1 then
      high = 0
      mbWrite(outPin, 0, 0)        --write 0 to FIO3 (FIO5 on T4). Address is 2003, type is 0, value is 0(output low)
      print(high, "low")
      mbWrite(46000, 3, 0)        -- Set register "USER_RAM0_F32".  Address 46000, type 3
      mbWrite(46002, 3, 200)      -- Set register "USER_RAM1_F32".  Address 46002, type 3
    else
      high = 1
      mbWrite(outPin, 0, 1)        --write 1 to FIO3 (FIO5 on T4). Address is 2003, type is 0, value is 1(output high)
      print(high, "high")
      mbWrite(46000, 3, 200)      -- Set register "USER_RAM0_F32".  Address 46000, type 3
      mbWrite(46002, 3, 0)        -- Set register "USER_RAM1_F32".  Address 46002, type 3
    end
  end
end
