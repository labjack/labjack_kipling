print ("SPI Example")

--local functions for faster processing
local mbWrite=MB.W

--Allocate an array of 2000 samples
local a = {}    -- new array
for i=1, 2000 do
  a[i] = 0
end

--Configure T7's SPI pin's
mbWrite(5000, 0, 0)  --CS
mbWrite(5001, 0, 1)  --CLK
mbWrite(5002, 0, 2)  --MISO
mbWrite(5003, 0, 3)  --MOSI

mbWrite(5004, 0, 0)  --Mode
mbWrite(5005, 0, 0)  --Speed
mbWrite(5006, 0, 1)  --Options, enable CS
mbWrite(5009, 0, 1)  --Num Bytes to Tx/Rx

fioState = 0    --Configure FIO state for frequency
mbWrite(2000, 0, fioState)

local i = 0
LJ.IntervalConfig(0, 0.333) --Configure Interval, 1.5kHz or 0.333ms
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then
    if i > 2000 then
      print('Here')
      i = 0
    end
    a[i]=fioState
    -- print("SPI Rx/Tx", i)
    mbWrite(5010, 0, 43520)
    mbWrite(5007, 0, 1)
    mbWrite(5010, 0, 21760)
    mbWrite(5007, 0, 1)
    mbWrite(2000, 0, fioState)
    i = i + 1
    if fioState == 1 then
        fioState = 0
    else
        fioState = 1
    end
  end
end