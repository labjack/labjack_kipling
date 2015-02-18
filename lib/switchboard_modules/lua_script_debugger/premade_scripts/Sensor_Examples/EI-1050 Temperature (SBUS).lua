print("Communicate with an EI-1050 digital temperature and humidity probe")
--The EI-1050 includes a SHT-11 temperature/humidity sensor by Sensiron (SBUS).
--Sensibus (SBUS) is a proprietary communication protocol used by the SHT11, SHT15, SHT71, and SHT75
--The T7 has SBUS functionality integrated which handles sensibus comm, so the script is easy.
--For more T7 information, see http://labjack.com/support/datasheets/t7/digital-io/sbus
--For more on the EI-1050, see http://labjack.com/support/ei-1050/datasheet

--WIRES
--Red Wire (Power) FIO2 set to output high
--Black Wire (GND) GND
--Green Wire (Data) FIO0
--White Wire (Clock) FIO1
--Brown Wire (Enable) N/C

--Note: A second sensor could share the clock & data lines, but you'd need to 
--begin using the enable wire

Temperature_K = 0
Temperature_F = 0
Relative_Humidity = 0

MB.W(30277, 0, 2)				--SBUS_ALL_POWER_DIONUM, set to FIO2
MB.W(30200, 0, 0)				--SBUS0_DATA_DIONUM, set to FIO0
MB.W(30225, 0, 1)				--SBUS0_CLOCK_DIONUM, set to FIO1

LJ.IntervalConfig(0, 2000)           --set interval to 2000ms, 2s

while true do
  if LJ.CheckInterval(0) then         --interval completed
    Temperature_K = MB.R(30100, 3)		--SBUS0_TEMP
  	Temperature_F = (Temperature_K - 273.15) * 1.8000 + 32.00
  	Relative_Humidity = MB.R(30150, 3)	--SBUS0_RH
    print ("Temperature is:", Temperature_F, "°F", "Relative Humidity is: ", Relative_Humidity, "%RH")
  end
end