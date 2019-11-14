--[[
    Name: 11b_user_ram_fifo.lua
    Desc: Example showing how to use USER RAM FIFO buffers to transfer an array
          of data to/from an external computer
    Note: This system is considered an advanced topic. Simple data transfer
          to/from Lua is easiest with USER_RAM, not a FIFO. These FIFO buffers
          are good for users who want to send an array of information in
          sequence to/from a Lua script. Usually 2 buffers are used for each
          endpoint, one buffer dedicated for each communication direction (read
          and write). A host may write new data for the Lua script into FIFO0,
          then once the script reads the data out of that buffer, it responds
          by writing data into FIFO1, and then the host may read the data out
          of FIFO1

          See the datasheet for more on USER RAM FIFO buffers:
            http://labjack.com/support/datasheets/t7/scripting

          This example requires firmware 1.0282 (T7) or 1.0023 (T4)
--]]

print("Transfer an array of ordered information to/from an external computer using a FIFO buffer.")
-- To get started, simply run the script.
-- Once the script is running, open up the Register Matrix, and search USER_RAM_FIFO1_DATA_F32
-- add this USER_RAM_FIFO1_DATA_F32 register to the active watch area, and
-- view each element coming out in sequence at the update rate of the software.
local f32out= {}
f32out[1] = 10.0
f32out[2] = 20.1
f32out[3] = 30.2
f32out[4] = 40.3
f32out[5] = 50.4
local f32in = {}
local numvalsfio0 = 5
local numvalsfio1 = 5
local bytesperval = 4
local fifo0bytes = numvalsfio0*bytesperval
local fifo1bytes = numvalsfio1*bytesperval

-- Allocate 20 bytes for FIFO0 by writing to USER_RAM_FIFO0_NUM_BYTES_IN_FIFO
MB.writeName("USER_RAM_FIFO0_ALLOCATE_NUM_BYTES", fifo0bytes)
-- Allocate 20 bytes for FIFO1 by writing to USER_RAM_FIFO1_NUM_BYTES_IN_FIFO
MB.writeName("USER_RAM_FIFO1_ALLOCATE_NUM_BYTES", fifo1bytes)

-- Configure an interval of 2000ms
LJ.IntervalConfig(0, 2000)
-- Run the program in an infinite loop
while true do
  -- If an interval is done
  if LJ.CheckInterval(0) then
    -- Write to FIFO0 for the host computer to access
    for i=1, numvalsfio0 do
      local outval = f32out[i]
      local currentbytesfifo0 = MB.readName("USER_RAM_FIFO0_NUM_BYTES_IN_FIFO")
      -- If there are less bytes in FIFO0 than we allocated for, send a new
      -- array of size numvalsfio0 to the host
      if (currentbytesfifo0 < fifo0bytes) then
        MB.writeName("USER_RAM_FIFO0_DATA_F32", outval)
        print ("Next Value FIFO0: ", outval)
      else
        print ("FIFO0 buffer is full.")
      end
    end
    --read in new data from the host with FIFO1
    --Note that an external computer must have previously written to FIFO1
    currentbytesfifo1 = MB.readName("USER_RAM_FIFO1_NUM_BYTES_IN_FIFO")
    if (currentbytesfifo1 == 0) then
      print ("FIFO1 buffer is empty.")
    end
    for i=1, ((currentbytesfifo1+1)/bytesperval) do
      inval = MB.readName("USER_RAM_FIFO1_DATA_F32")
      f32in[i] = inval
      print ("Next Value FIFO1: ", inval)
    end
    print ("\n")
  end
end
