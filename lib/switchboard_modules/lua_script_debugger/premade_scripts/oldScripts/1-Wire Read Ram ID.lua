print ("1-Wire Read Ram ID")

SensPinNum = 14		-- EIO6 aka 14

--Configure T7's 1-Wire Functionality:
--Pins
MB.W(5300, 0, SensPinNum)	--DQ
MB.W(5301, 0, 0)	--DPU

--Options
MB.W(5302, 0, 0)	--Options
MB.W(5307, 0, 240)	--Search Function
MB.W(5308, 0, 0)	--Num Bytes Tx
MB.W(5309, 0, 0)	--Num Bytes Rx

MB.W(5004, 0, 0)	--Mode
MB.W(5005, 0, 0)	--Speed
MB.W(5006, 0, 1)	--Options, enable CS
MB.W(5009, 0, 1)	--Num Bytes to Tx/Rx

i = 0
LJ.IntervalConfig(0, 1000)	--Configure Interval, 1sec
while true do
  if LJ.CheckInterval(0) then
  	print("SPI Rx/Tx", i)
  	MB.W(5010, 0, 43520)
  	MB.W(5007, 0, 1)
  	MB.W(5010, 0, 21760)
  	MB.W(5007, 0, 1)
  	i = i + 1
  end
end