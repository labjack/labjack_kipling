print("Save some data to RAM for subsequent access by an external computer.")
--The LUA IO MEM registers are useful in situations when a script is collecting 
--readings, but external software running on a remote computer also
--needs to log or view the data.

--The Lua script handles the complicated sensor comm(I2C, SPI, 1-Wire etc), 
--and then saves the resultant values to Lua IO Memory.  Then, the external software
--simply reads the result out of the IO MEM registers.
--See the datasheet for more on LUA IO system
--http://labjack.com/support/datasheets/t7/scripting


--To get started, simply run the script.
--Once the script is running, open up the Register Matrix, and search LUA_IO0_READ
--add this LUA_IO0_READ register to the active watch area, and
--view CoolData changing in real-time!

CoolData = 0    --Data that will be availalbe to external computers
NumFloats = 1   --memory allocation size

MB.W(6006, 1, NumFloats)    --allocate memory for CoolData
LJ.IntervalConfig(0, 100)   --Define a data collection interval 100 = 100ms

while true do
  if LJ.CheckInterval(0) then
    IOMEM.W(46000, CoolData)    --LUA_IO0_READ is address 46000
    print("CoolData:", CoolData, "\n")
    CoolData = CoolData + 1
    --CoolData = CoolData + math.random()
  end
end