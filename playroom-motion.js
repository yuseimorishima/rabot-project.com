// A shallow articulated relief of the approved sprite. Texture coordinates stay
// fixed, so clothing, eyes and facial details move together without a new model.
export function createPetMotion(character, room, getTexture, {onWalk}) {
  const output = document.createElement('canvas'); output.className = 'room-motion';
  output.width = 540; output.height = 720; output.setAttribute('aria-hidden', 'true'); character.append(output);
  const ctx = output.getContext('2d');
  if (!ctx) { output.remove(); throw new Error('Canvas unavailable'); }
  const pet = character.closest('button'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const shadow = document.createElement('span'); shadow.className = 'room-ground-shadow'; shadow.setAttribute('aria-hidden', 'true'); room.append(shadow);
  const cols = 14, rows = 24, vertices = [], triangles = [];
  const smooth = (a,b,x) => { const t = Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
  const ellipse = (u,v,cx,cy,rx,ry) => Math.sqrt(Math.max(0,1-((u-cx)/rx)**2-((v-cy)/ry)**2));
  for(let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) {
    const u=i/cols,v=j/rows;
    vertices.push({u,v,x:u-.5,y:(v-.5)*4/3,
      depth:Math.max(ellipse(u,v,.5,.38,.3,.2)*.19,ellipse(u,v,.5,.72,.3,.31)*.14),
      head:1-smooth(.48,.61,v), arm:(1-smooth(.22,.34,Math.min(u,1-u)))*smooth(.3,.4,v)*(1-smooth(.59,.68,v))});
  }
  for(let j=0;j<rows;j++) for(let i=0;i<cols;i++) {const a=j*(cols+1)+i,b=a+1,c=a+cols+1;triangles.push([a,b,c],[b,c+1,c]);}
  let time=0,last=0,frame=0,visible=true,stopped=false,destroyed=false;
  let gazeX=0,gazeY=0,yaw=0,nod=0,lean=0,arm=0,action='',actionAt=0;
  let targetX=0,targetY=0,walkX=0,walkY=0,targetScale=1,scale=1;
  const damp=(a,b,dt)=>a+(b-a)*(1-Math.exp(-dt*7));
  function paint() {
    const texture=getTexture();if(!texture)return;
    const w=texture.naturalWidth||texture.width,h=texture.naturalHeight||texture.height;
    if(!w||!h)return;
    const pts=vertices.map(p=>{
      let x=p.x,y=p.y,z=p.depth;
      const headYaw=yaw*(.3+.7*p.head),headPitch=nod*p.head;
      // Rotate the face about the neck, with softer movement through the collar.
      const dy=y+ .08;
      y=-.08+dy*Math.cos(headPitch)-z*Math.sin(headPitch);
      z=dy*Math.sin(headPitch)+z*Math.cos(headPitch);
      const turnedX=x*Math.cos(headYaw)+z*Math.sin(headYaw);
      z=-x*Math.sin(headYaw)+z*Math.cos(headYaw);x=turnedX;
      const a=arm*p.arm*(p.u<.5?1:-1),pivot=p.u<.5?-.24:.24;
      const ax=x-pivot,ay=y-.05;
      x=pivot+ax*Math.cos(a)-ay*Math.sin(a);y=.05+ax*Math.sin(a)+ay*Math.cos(a);
      const factor=3/(3+p.depth-z);
      const lx=x*Math.cos(lean)-y*Math.sin(lean),ly=x*Math.sin(lean)+y*Math.cos(lean);
      return {x:output.width*(.5+lx*factor*.86),y:output.height*(.5+ly*factor*.86/(4/3))};
    });
    ctx.clearRect(0,0,output.width,output.height);
    for(const ids of triangles){
      const [a,b,c]=ids.map(i=>vertices[i]),[p,q,r]=ids.map(i=>pts[i]);
      const x0=a.u*w,y0=a.v*h,x1=b.u*w,y1=b.v*h,x2=c.u*w,y2=c.v*h;
      const det=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
      const m11=((q.x-p.x)*(y2-y0)-(r.x-p.x)*(y1-y0))/det;
      const m12=((q.y-p.y)*(y2-y0)-(r.y-p.y)*(y1-y0))/det;
      const m21=((r.x-p.x)*(x1-x0)-(q.x-p.x)*(x2-x0))/det;
      const m22=((r.y-p.y)*(x1-x0)-(q.y-p.y)*(x2-x0))/det;
      ctx.save();ctx.beginPath();
      const center={x:(p.x+q.x+r.x)/3,y:(p.y+q.y+r.y)/3};
      for(const [i,point] of [p,q,r].entries()) {const dx=point.x-center.x,dy=point.y-center.y,len=Math.hypot(dx,dy)||1;ctx[i?'lineTo':'moveTo'](point.x+dx/len*1.1,point.y+dy/len*1.1);}
      ctx.closePath();ctx.clip();ctx.setTransform(m11,m12,m21,m22,p.x-m11*x0-m21*y0,p.y-m12*x0-m22*y0);
      ctx.drawImage(texture,0,0);ctx.restore();
    }
  }
  function draw(ms){
    if(destroyed)return;
    frame=0;
    if(document.hidden||!visible||stopped)return;
    if(last&&ms-last<1000/24){frame=requestAnimationFrame(draw);return;}
    const dt=Math.min(last?(ms-last)/1000:0,.06);last=ms;time+=dt;
    const age=(ms-actionAt)/1000,active=age<2.2?action:'';
    const still=reduced.matches;
    yaw=damp(yaw,still?0:gazeX*.14+Math.sin(time*.65)*.025,dt);
    nod=damp(nod,still?0:gazeY*.045+(active==='charge'?.09:active==='pet'?Math.sin(age*5)*.045:0),dt);
    lean=damp(lean,still?0:active==='play'?Math.sin(age*7)*.035:Math.sin(time*1.4)*.008,dt);
    arm=damp(arm,still?0:active==='play'?Math.sin(age*6)*.16:active==='call'?-.1:0,dt);
    if(still)yaw=nod=lean=arm=0;
    walkX=still?targetX:damp(walkX,targetX,dt);walkY=still?targetY:damp(walkY,targetY,dt);scale=still?targetScale:damp(scale,targetScale,dt);
    const hop=!still&&active==='play'?-Math.abs(Math.sin(age*7))*6:0;
    pet.style.setProperty('--walk-x',`${walkX}px`);pet.style.setProperty('--walk-y',`${walkY+hop}px`);pet.style.setProperty('--depth-scale',scale);
    shadow.style.setProperty('--shadow-x',`${walkX}px`);shadow.style.setProperty('--shadow-y',`${walkY}px`);shadow.style.setProperty('--shadow-scale',scale);
    room.dataset.motion=stopped?'paused':active||((Math.abs(walkX-targetX)+Math.abs(walkY-targetY)>.8)?'walking':'idle');
    paint();if(!still)frame=requestAnimationFrame(draw);
  }
  function wake(){if(frame||destroyed||document.hidden||!visible||stopped)return;last=0;frame=requestAnimationFrame(draw);}
  function pointer(event){const r=room.getBoundingClientRect();gazeX=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));gazeY=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));wake();}
  function leave(){gazeX=gazeY=0;wake();}
  function floor(event){
    if(event.target.closest('button,a,summary,dialog'))return;
    const r=room.getBoundingClientRect();if(event.clientY-r.top<r.height*.6)return;
    targetX=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1))*r.width*.16;
    const depth=Math.max(0,Math.min(1,(event.clientY-r.top-r.height*.6)/(r.height*.4)));
    targetY=(depth-.5)*18;targetScale=.93+depth*.12;onWalk();wake();
  }
  function changed(){last=0;wake();}
  room.addEventListener('pointermove',pointer);room.addEventListener('pointerleave',leave);room.addEventListener('click',floor);
  document.addEventListener('visibilitychange',changed);reduced.addEventListener('change',changed);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;wake();});observer.observe(room);
  const sizeObserver=new ResizeObserver(()=>{
    const limit=room.clientWidth*.16;
    targetX=Math.max(-limit,Math.min(limit,targetX));walkX=Math.max(-limit,Math.min(limit,walkX));wake();
  });sizeObserver.observe(room);
  character.classList.add('has-depth');paint();wake();
  return {
    refresh(){paint();wake();},
    react(kind){action=kind;actionAt=performance.now();wake();},
    call(){targetX=0;targetY=8;targetScale=1.07;action='call';actionAt=performance.now();wake();},
    home(){targetX=targetY=0;targetScale=1;wake();},
    pause(value){stopped=value;if(stopped){cancelAnimationFrame(frame);frame=0;room.dataset.motion='paused';}else wake();},
    dispose(){destroyed=true;cancelAnimationFrame(frame);observer.disconnect();sizeObserver.disconnect();room.removeEventListener('pointermove',pointer);room.removeEventListener('pointerleave',leave);room.removeEventListener('click',floor);document.removeEventListener('visibilitychange',changed);reduced.removeEventListener('change',changed);output.remove();shadow.remove();character.classList.remove('has-depth');}
  };
}
