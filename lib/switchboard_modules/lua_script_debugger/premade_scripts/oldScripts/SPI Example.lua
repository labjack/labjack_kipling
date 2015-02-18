print ("SPI Example")

--Allocate an array of 2000 samples
a = {}    -- new array
for i=1, 2000 do
  a[i] = 0
end

--Configure T7's SPI pin's
MB.W(5000, 0, 0)  --CS
MB.W(5001, 0, 1)  --CLK
MB.W(5002, 0, 2)  --MISO
MB.W(5003, 0, 3)  --MOSI

MB.W(5004, 0, 0)  --Mode
MB.W(5005, 0, 0)  --Speed
MB.W(5006, 0, 1)  --Options, enable CS
MB.W(5009, 0, 1)  --Num Bytes to Tx/Rx

fioState = 0    --Configure FIO state for frequency
MB.W(2000, 0, fioState)

i = 0
LJ.IntervalConfig(0, 0.333) --Configure Interval, 1.5kHz or 0.333ms
while true do
  if LJ.CheckInterval(0) then
    if i > 2000 then
      print('Here')
      i = 0
    end
    a[i]=fioState
    -- print("SPI Rx/Tx", i)
    MB.W(5010, 0, 43520)
    MB.W(5007, 0, 1)
    MB.W(5010, 0, 21760)
    MB.W(5007, 0, 1)
    MB.W(2000, 0, fioState)
    i = i + 1
    if fioState == 1 then
        fioState = 0
    else
        fioState = 1
    end
  end
end