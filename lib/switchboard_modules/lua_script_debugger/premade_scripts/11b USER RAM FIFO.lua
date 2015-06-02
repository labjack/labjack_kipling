print("Transfer an array of ordered information to/from an external computer using a FIFO buffer.")
--Requires Firmware 1.0161 or newer.
--This system is considered advanced topic.  Simple data transfer to/from Lua is easiest with USER_RAM, not a FIFO.
--These FIFO buffers are good for users who want to send an array of information in sequence to/from a Lua script.
--Usually 2 buffers are used for each endpoint, one buffer dedicated for each communication direction (read and write).
--A host may write new data for the Lua script into FIFO0, then once the script reads the data out of that buffer, 
--it responds by writing data into FIFO1, and then the host may read the data out of FIFO1.

--See the datasheet for more on USER RAM FIFOs
--http://labjack.com/support/datasheets/t7/scripting

--To get started, simply run the script.
--Once the script is running, open up the Register Matrix, and search USER_RAM_FIFO1_DATA_F32
--add this USER_RAM_FIFO1_DATA_F32 register to the active watch area, and
--view each element coming out in sequence at the update rate of the software.

aF32_Out= {}  --array of 5 values(floats)
aF32_Out[1] = 10.0
aF32_Out[2] = 20.1
aF32_Out[3] = 30.2
aF32_Out[4] = 40.3
aF32_Out[5] = 50.4

aF32_In = {}
numValuesFIO0 = 5
ValueSizeInBytes = 4
numBytesAllocFIFO0 = numValuesFIO0*ValueSizeInBytes
MB.W(47900, 1, numBytesAllocFIFO0) --allocate USER_RAM_FIFO0_NUM_BYTES_IN_FIFO to 20 bytes

LJ.IntervalConfig(0, 2000)
while true do
  if LJ.CheckInterval(0) then
    --write out to the host with FIFO0
    for i=1, numValuesFIO0 do
      ValOutOfLua = aF32_Out[i]
      numBytesFIFO0 = MB.R(47910, 1)
      if (numBytesFIFO0 < numBytesAllocFIFO0) then
        MB.W(47030, 3, ValOutOfLua)  --provide a new array of size numValuesFIO0 to host
        print ("Next Value FIFO0: ", ValOutOfLua)
      else
        print ("FIFO0 buffer is full.")
      end
    end
    --read in new data from the host with FIFO1
    --Note that an external computer must have previously written to FIFO1
    numBytesFIFO1 = MB.R(47912, 1) --USER_RAM_FIFO1_NUM_BYTES_IN_FIFO
    if (numBytesFIFO1 == 0) then
      print ("FIFO1 buffer is empty.")
    end
    for i=1, ((numBytesFIFO1+1)/ValueSizeInBytes) do
      ValIntoLua = MB.R(47032, 3)
      aF32_In[i] = ValIntoLua
      print ("Next Value FIFO1: ", ValIntoLua)
    end
    print ("\n")
  end
end