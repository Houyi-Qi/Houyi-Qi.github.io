(() => {
  'use strict';
  const canvas = document.getElementById('network-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, ratio = 1, frame = 0, lastFrame = 0;
  let points = [];
  const pointer = {x:0,y:0,inside:false,lastMove:0,lastSeed:0};

  function clear() {
    cancelAnimationFrame(frame);
    frame = 0; lastFrame = 0; points = []; pointer.inside = false;
    ctx.clearRect(0,0,width,height);
  }
  function resize() {
    width = window.innerWidth; height = window.innerHeight;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    clear();
  }
  function seed(x,y,count,now) {
    const radius = Math.min(155, width * .4);
    for(let i=0;i<count;i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = (.14 + Math.sqrt(Math.random()) * .62) * radius;
      points.push({
        x:Math.max(3,Math.min(width-3,x+Math.cos(angle)*distance)),
        y:Math.max(3,Math.min(height-3,y+Math.sin(angle)*distance)),
        vx:(Math.random()-.5)*.006, vy:(Math.random()-.5)*.006,
        born:now, expires:now+2100+Math.random()*900
      });
    }
    if(points.length>48) points.splice(0,points.length-48);
  }
  function draw(now,delta) {
    ctx.clearRect(0,0,width,height);
    if(document.hidden) return false;
    points = points.filter(point=>reducedMotion.matches || point.expires>now);
    if(!points.length) return false;
    const radius = Math.min(155, width*.4);
    const reach = radius*.77;
    ctx.strokeStyle = ctx.fillStyle = getComputedStyle(canvas).color;
    ctx.lineWidth = 1;
    points.forEach(point=>{
      if(!reducedMotion.matches) {
        point.x = Math.max(3,Math.min(width-3,point.x+point.vx*delta));
        point.y = Math.max(3,Math.min(height-3,point.y+point.vy*delta));
      }
      point.alpha = reducedMotion.matches ? 1 : Math.min(1,Math.max(0,(now-point.born+40)/140),(point.expires-now)/750);
    });
    const drawn = new Set();
    points.forEach((point,i)=>{
      const nearest = points.map((other,j)=>({other,j,distance:Math.hypot(point.x-other.x,point.y-other.y)}))
        .filter(item=>item.j!==i&&item.distance<reach&&item.distance>4)
        .sort((a,b)=>a.distance-b.distance).slice(0,3);
      nearest.forEach(({other,j,distance})=>{
        const key=Math.min(i,j)+':'+Math.max(i,j);
        if(drawn.has(key)) return;
        drawn.add(key);
        ctx.globalAlpha=.32*(1-distance/reach)*Math.min(point.alpha,other.alpha);
        ctx.beginPath();ctx.moveTo(point.x,point.y);ctx.lineTo(other.x,other.y);ctx.stroke();
      });
    });
    const cursorAlpha=pointer.inside?(reducedMotion.matches?1:Math.max(0,1-(now-pointer.lastMove)/2800)):0;
    if(cursorAlpha>0) {
      points.map(point=>({point,distance:Math.hypot(point.x-pointer.x,point.y-pointer.y)}))
        .filter(item=>item.distance<radius).sort((a,b)=>a.distance-b.distance).slice(0,6)
        .forEach(({point,distance})=>{
          ctx.globalAlpha=.38*(1-distance/radius)*point.alpha*cursorAlpha;
          ctx.beginPath();ctx.moveTo(pointer.x,pointer.y);ctx.lineTo(point.x,point.y);ctx.stroke();
        });
    }
    points.forEach(point=>{
      ctx.globalAlpha=.53*point.alpha;
      ctx.beginPath();ctx.arc(point.x,point.y,1.65,0,Math.PI*2);ctx.fill();
    });
    if(cursorAlpha>0) {
      ctx.globalAlpha=.6*cursorAlpha;
      ctx.beginPath();ctx.arc(pointer.x,pointer.y,2,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    return true;
  }
  function tick(now) {
    frame=0;
    if(document.hidden||reducedMotion.matches) return;
    if(lastFrame&&now-lastFrame<32) {frame=requestAnimationFrame(tick);return;}
    const delta=lastFrame?Math.min(now-lastFrame,70):0;
    lastFrame=now;
    if(draw(now,delta)) frame=requestAnimationFrame(tick);
    else lastFrame=0;
  }
  function start() {if(!frame&&!reducedMotion.matches) frame=requestAnimationFrame(tick);}
  function move(event) {
    if(document.hidden||event.pointerType==='touch') return;
    const x=event.clientX,y=event.clientY,now=performance.now();
    const dx=x-pointer.x,dy=y-pointer.y;
    const distance=Math.hypot(dx,dy);
    const first=!pointer.inside||!points.length;
    if(reducedMotion.matches) {
      if(first) seed(x,y,13,now);
      else points.forEach(point=>{point.x=Math.max(3,Math.min(width-3,point.x+dx));point.y=Math.max(3,Math.min(height-3,point.y+dy));});
    } else if(first) seed(x,y,13,now);
    else if(distance>9||now-pointer.lastSeed>70) {seed(x,y,distance>35?5:3,now);pointer.lastSeed=now;}
    pointer.x=x;pointer.y=y;pointer.inside=true;pointer.lastMove=now;
    if(reducedMotion.matches) draw(now,0); else start();
  }
  function leave() {
    pointer.inside=false;
    if(reducedMotion.matches) {clear();return;}
    const now=performance.now();
    points.forEach(point=>point.expires=Math.min(point.expires,now+650));
    start();
  }
  window.addEventListener('pointermove',move,{passive:true});
  document.documentElement.addEventListener('pointerleave',leave,{passive:true});
  window.addEventListener('pointercancel',leave,{passive:true});
  window.addEventListener('blur',clear);
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden) clear();});
  reducedMotion.addEventListener('change',clear);
  window.addEventListener('pagehide',clear);
  resize();
})();
