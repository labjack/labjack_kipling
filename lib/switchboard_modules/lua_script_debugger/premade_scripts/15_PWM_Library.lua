-- Functions to configure T7
LJ.IntervalConfig(1, 500)
PWM = {}--add local variables here
FIO0PWM = PWM
function PWM.init (self, ichan, ifreq, iduty, iclk, idivisor)--duty should be in %, not decimal
  irollValue = (80000000/ifreq)/idivisor
  self.rollValue = irollValue--store local values for future use vvvv
  self.chan = ichan
  self.freq = ifreq
  self.duty = iduty
  self.clk = iclk
  self.divisor = idivisor--store local values for future use ^^^^
  MB.W(44900+iclk*10, 0, 0)--Disable clock source
  --Set Clock# divisor and roll value to configure frequency
  MB.W(44901+iclk*10, 0, idivisor)--Configure Clock# divisor
  MB.W(44904+iclk*10, 1, irollValue)--Configure Clock# roll value
  MB.W(44900+iclk*10, 0, 1)--enable clock source
  --Configure EF Channel Registers:
  MB.W(44000+ichan*2, 1, 0)--Disable the EF system for initial configuration
  MB.W(44100+ichan*2, 1, 0)--Configure EF system for PWM
  MB.W(44200+ichan*2, 1, iclk)--Configure what clock source to use: Clock#
  MB.W(44300+ichan*2, 1, irollValue*iduty/100)--Configure duty cycle
end
function PWM.enable (self)
  MB.W(44000+self.chan*2, 1, 1)--enable the EF system
end
function PWM.disable (self)
  MB.W(44000+self.chan*2, 1, 0)--disable the EF system
end
function PWM.changeFreq (self, ifreq)
  irollValue = (80000000/ifreq)/self.divisor
  self.rollValue = irollValue--store local values for future use
  self.freq = ifreq
  MB.W(44904+self.clk*10, 1, self.rollValue)--Configure Clock# roll value
  MB.W(44300+self.chan*2, 1, self.rollValue*self.duty/100)--reconfigure duty cycle
end
function PWM.changeDutyCycle (self, iduty)
  self.duty = iduty--re-store local value
  MB.W(44300+self.chan*2, 1, self.rollValue*self.duty/100)--Configure duty cycle
end
FIO0PWM.init(FIO0PWM, 0, 50, 50, 0, 1)--init
FIO0PWM.enable(FIO0PWM)
while true do               --test the function an osciliscope on FIO0
  if LJ.CheckInterval(1) then
    state1 = MB.R(2003)--buttons on FIO2 and FIO3
    state2 = MB.R(2002)
    if state1 == 1 then
      FIO0PWM.changeFreq(FIO0PWM, 200)
    else
      FIO0PWM.changeFreq(FIO0PWM, 50)
    end
    if state2 == 1 then
      FIO0PWM.changeDutyCycle(FIO0PWM, 10)
    else
      FIO0PWM.changeDutyCycle(FIO0PWM, 5)
    end
      print("On FIO0 a ", FIO0PWM.freq, "Hz signal at a ", FIO0PWM.duty, "% duty cycle has been generated")--print out what is being generated
  end
end