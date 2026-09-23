const SPEED=360/18000;
const BRAKE_MS=300;
const RESUME_MS=350;

// Only the artwork rotates: hit areas, labels and row assembly stay untouched.
export function startStarRotation(controls) {
  const states=controls.map(control=>({
    control,image:control.querySelector('.logo-star img,.star-hit>img'),
    angle:0,speed:SPEED,target:SPEED,remaining:0,hovered:false,focused:false
  }));
  let last=performance.now();
  let paused=false;
  let frameId=0;

  function advance(now) {
    if(paused)return;
    const elapsed=Math.max(0,now-last);
    last=Math.max(last,now);
    for(const state of states) {
      const ramp=Math.min(elapsed,state.remaining);
      if(ramp>0) {
        const acceleration=(state.target-state.speed)/state.remaining;
        state.angle+=state.speed*ramp+acceleration*ramp*ramp/2;
        state.speed+=acceleration*ramp;
        state.remaining-=ramp;
        if(state.remaining===0)state.speed=state.target;
      }
      state.angle=(state.angle+state.speed*(elapsed-ramp))%360;
      state.image.style.transform=`rotate(${state.angle}deg)`;
    }
  }
  function retarget(state) {
    advance(performance.now());
    const target=state.hovered||state.focused?0:SPEED;
    if(target===state.target)return;
    state.target=target;
    state.remaining=target===0?BRAKE_MS:RESUME_MS;
  }
  for(const state of states) {
    state.control.addEventListener('pointerenter',()=>{state.hovered=true;retarget(state);});
    state.control.addEventListener('pointerleave',()=>{state.hovered=false;retarget(state);});
    state.control.addEventListener('focus',()=>{state.focused=true;retarget(state);});
    state.control.addEventListener('blur',()=>{state.focused=false;retarget(state);});
  }
  function frame(now) {
    advance(now);
    frameId=requestAnimationFrame(frame);
  }
  frameId=requestAnimationFrame(frame);
  return {
    setPaused(value) {
      if(paused===value)return;
      paused=value;
      cancelAnimationFrame(frameId);
      // A global stop freezes the rendered angle, even mid-ramp. Never catch up.
      for(const state of states) {
        state.speed=0;
        state.target=state.hovered||state.focused?0:SPEED;
        state.remaining=RESUME_MS;
      }
      last=performance.now();
      if(!paused)frameId=requestAnimationFrame(frame);
    }
  };
}
