print("Save some data to RAM for subsequent access by an external computer.")
--Requires Firmware 1.0161 or newer
--The USER_RAM registers are useful in situations when a script is collecting 
--readings, but external software running on a remote computer also
--needs to log or view the data. *formerly called LUA IO MEM

--The Lua script handles the complicated sensor comm(I2C, SPI, 1-Wire etc), 
--and then saves the resultant values to RAM.  Then, the external software
--simply reads the result out of the RAM registers.
--See the datasheet for more on USER RAM
--https://labjack.com/support/datasheets/t7/scripting


--To get started, simply run the script.
--Once the script is running, open up the Register Matrix, and search USER_RAM0_F32
--add this USER_RAM0_F32 register to the active watch area, and
--view CoolData changing in real-time!

local CoolData = 0    --Data that will be available to external computers

LJ.IntervalConfig(0, 100)   --Define a data collection interval 100 = 100ms
local checkInterval=LJ.CheckInterval
local mbWrite=MB.W

while true do
  if checkInterval(0) then
    mbWrite(46000, 3, CoolData)    --USER_RAM0_F32 is address 46000
    print("CoolData:", CoolData, "\n")
    CoolData = CoolData + 1
    --CoolData = CoolData + math.random()
  end
end