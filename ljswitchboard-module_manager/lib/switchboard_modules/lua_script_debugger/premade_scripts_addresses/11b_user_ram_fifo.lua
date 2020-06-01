print("Transfer an array of ordered information to/from an external computer using a FIFO buffer.")
--Requires Firmware 1.0161 or newer.
--This system is considered advanced topic.  Simple data transfer to/from Lua is easiest with USER_RAM, not a FIFO.
--These FIFO buffers are good for users who want to send an array of information in sequence to/from a Lua script.
--Usually 2 buffers are used for each endpoint, one buffer dedicated for each communication direction (read and write).
--A host may write new data for the Lua script into FIFO0, then once the script reads the data out of that buffer, 
--it responds by writing data into FIFO1, and then the host may read the data out of FIFO1.

--See the datasheet for more on USER RAM FIFOs
--https://labjack.com/support/datasheets/t7/scripting

--To get started, simply run the script.
--Once the script is running, open up the Register Matrix, and search USER_RAM_FIFO1_DATA_F32
--add this USER_RAM_FIFO1_DATA_F32 register to the active watch area, and
--view each element coming out in sequence at the update rate of the software.

local mbRead=MB.R			--local functions for faster processing
local mbWrite=MB.W

local aF32_Out= {}  --array of 5 values(floats)
aF32_Out[1] = 10.0
aF32_Out[2] = 20.1
aF32_Out[3] = 30.2
aF32_Out[4] = 40.3
aF32_Out[5] = 50.4

local aF32_In = {}
local numValuesFIO0 = 5
local numValuesFIO1 = 5
local ValueSizeInBytes = 4
local numBytesAllocFIFO0 = numValuesFIO0*ValueSizeInBytes
local numBytesAllocFIFO1 = numValuesFIO1*ValueSizeInBytes
mbWrite(47900, 1, numBytesAllocFIFO0) --allocate USER_RAM_FIFO0_NUM_BYTES_IN_FIFO to 20 bytes
mbWrite(47902, 1, numBytesAllocFIFO1) --allocate USER_RAM_FIFO1_NUM_BYTES_IN_FIFO to 20 bytes

LJ.IntervalConfig(0, 2000)
local checkInterval=LJ.CheckInterval
while true do
  if checkInterval(0) then
    --write out to the host with FIFO0
    for i=1, numValuesFIO0 do
      ValOutOfLua = aF32_Out[i]
      numBytesFIFO0 = mbRead(47910, 1)
      if (numBytesFIFO0 < numBytesAllocFIFO0) then
        mbWrite(47030, 3, ValOutOfLua)  --provide a new array of size numValuesFIO0 to host
        print ("Next Value FIFO0: ", ValOutOfLua)
      else
        print ("FIFO0 buffer is full.")
      end
    end
    --read in new data from the host with FIFO1
    --Note that an external computer must have previously written to FIFO1
    numBytesFIFO1 = mbRead(47912, 1) --USER_RAM_FIFO1_NUM_BYTES_IN_FIFO
    if (numBytesFIFO1 == 0) then
      print ("FIFO1 buffer is empty.")
    end
    for i=1, ((numBytesFIFO1+1)/ValueSizeInBytes) do
      ValIntoLua = mbRead(47032, 3)
      aF32_In[i] = ValIntoLua
      print ("Next Value FIFO1: ", ValIntoLua)
    end
    print ("\n")
  end
end
