(() => {
  "use strict";
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const hero = new Image();
  hero.src = "assets/hero.png";
  const maps = {
    "Город без людей": "assets/zone_city.png",
    "Лес, который помнит": "assets/zone_forest.png",
    "Мёртвый холод": "assets/zone_frozen.png",
    "Конечная станция": "assets/zone_terminal.png"
  };
  const loading = document.getElementById("zone-loading");
  const loadingName = document.getElementById("zone-loading-name");
  const hud = document.getElementById("explore-hud");
  const zoneName = document.getElementById("zone-name");
  const joystick = document.getElementById("joystick");
  const knob = document.getElementById("joystick-knob");
  const back = document.getElementById("return-train");
  const state = {
    active:false, map:null, region:"", x:0, y:0, speed:190,
    cameraX:0, cameraY:0, zoom:1, axisX:0, axisY:0,
    pointerId:null, facing:1, loadingToken:0
  };
  const held = new Set();
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const viewport = () => ({w:window.innerWidth,h:window.innerHeight});

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1,2), v = viewport();
    canvas.width = Math.round(v.w*dpr);
    canvas.height = Math.round(v.h*dpr);
    canvas.style.width = v.w+"px";
    canvas.style.height = v.h+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if (state.map) updateZoom();
  }
  function updateZoom() {
    const v=viewport(), iw=state.map.naturalWidth, ih=state.map.naturalHeight;
    state.zoom=Math.min(1.15,Math.max(v.w/iw,v.h/ih));
    const vw=v.w/state.zoom, vh=v.h/state.zoom;
    state.cameraX=clamp(state.x-vw/2,0,Math.max(0,iw-vw));
    state.cameraY=clamp(state.y-vh/2,0,Math.max(0,ih-vh));
  }
  function moveStick(x,y) {
    const r=joystick.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
    const max=r.width*.34;
    let dx=x-cx,dy=y-cy,len=Math.hypot(dx,dy);
    if(len>max){dx*=max/len;dy*=max/len;}
    state.axisX=dx/max; state.axisY=dy/max;
    knob.style.transform="translate("+dx+"px,"+dy+"px)";
  }
  function resetStick() {
    state.axisX=state.axisY=0; state.pointerId=null;
    knob.style.transform="translate(0,0)";
  }
  joystick.addEventListener("pointerdown",e=>{
    e.preventDefault(); state.pointerId=e.pointerId;
    joystick.setPointerCapture(e.pointerId); moveStick(e.clientX,e.clientY);
  });
  joystick.addEventListener("pointermove",e=>{
    if(state.pointerId!==e.pointerId)return;
    e.preventDefault(); moveStick(e.clientX,e.clientY);
  });
  ["pointerup","pointercancel","lostpointercapture"].forEach(type=>
    joystick.addEventListener(type,e=>{if(state.pointerId===e.pointerId)resetStick();})
  );
  back.addEventListener("click",exit);
  window.addEventListener("resize",resize);
  window.addEventListener("blur",()=>{resetStick();held.clear();});
  window.addEventListener("keydown",e=>{
    if(!state.active)return;
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","Escape"].includes(e.code))e.preventDefault();
    held.add(e.code);
    if(e.code==="Escape")exit();
  });
  window.addEventListener("keyup",e=>held.delete(e.code));

  function enter(region) {
    const src=maps[region];
    if(!src)return;
    const token=++state.loadingToken;
    state.region=region; state.active=true; state.map=null;
    resetStick(); held.clear(); hud.hidden=true;
    loading.hidden=false; loading.classList.remove("fade");
    loadingName.textContent=region.toUpperCase()+" · ЗАГРУЗКА КАРТЫ";
    const map=new Image();
    map.onload=()=>{
      if(token!==state.loadingToken)return;
      state.map=map;
      state.x=map.naturalWidth/2; state.y=map.naturalHeight/2;
      updateZoom(); zoneName.textContent=region.toUpperCase();
      loadingName.textContent="МАРШРУТ ГОТОВ · ВЫСАДКА";
      setTimeout(()=>{
        if(token!==state.loadingToken)return;
        loading.classList.add("fade");
        setTimeout(()=>{
          if(token!==state.loadingToken)return;
          loading.hidden=true; hud.hidden=false;
        },680);
      },450);
    };
    map.onerror=()=>{
      if(token!==state.loadingToken)return;
      loadingName.textContent="ОШИБКА ЗАГРУЗКИ КАРТЫ";
      setTimeout(exit,1400);
    };
    map.src=src;
  }
  function exit() {
    if(!state.active)return;
    state.active=false; state.loadingToken++;
    resetStick(); held.clear(); hud.hidden=true;
    loading.hidden=true; loading.classList.remove("fade");
    state.map=null;
  }
  function update(dt) {
    if(!state.active||!state.map)return;
    const key=c=>held.has(c);
    let ax=state.axisX+(key("ArrowRight")||key("KeyD")?1:0)-(key("ArrowLeft")||key("KeyA")?1:0);
    let ay=state.axisY+(key("ArrowDown")||key("KeyS")?1:0)-(key("ArrowUp")||key("KeyW")?1:0);
    const len=Math.hypot(ax,ay);
    if(len>1){ax/=len;ay/=len;}
    state.x=clamp(state.x+ax*state.speed*dt,18,state.map.naturalWidth-18);
    state.y=clamp(state.y+ay*state.speed*dt,18,state.map.naturalHeight-18);
    if(Math.abs(ax)>.08)state.facing=ax>0?1:-1;
    const v=viewport(),vw=v.w/state.zoom,vh=v.h/state.zoom;
    const tx=clamp(state.x-vw/2,0,Math.max(0,state.map.naturalWidth-vw));
    const ty=clamp(state.y-vh/2,0,Math.max(0,state.map.naturalHeight-vh));
    state.cameraX+=(tx-state.cameraX)*Math.min(1,dt*8);
    state.cameraY+=(ty-state.cameraY)*Math.min(1,dt*8);
  }
  function draw() {
    const v=viewport(); ctx.clearRect(0,0,v.w,v.h);
    if(!state.map){ctx.fillStyle="#090d14";ctx.fillRect(0,0,v.w,v.h);return;}
    ctx.save(); ctx.scale(state.zoom,state.zoom);
    ctx.translate(-state.cameraX,-state.cameraY);
    ctx.drawImage(state.map,0,0);
    if(hero.complete&&hero.naturalWidth){
      const h=46,w=h*hero.naturalWidth/hero.naturalHeight;
      ctx.save();ctx.translate(state.x,state.y);ctx.scale(state.facing,1);
      ctx.drawImage(hero,-w/2,-h/2,w,h);ctx.restore();
    }else{
      ctx.fillStyle="#e6c17c";ctx.beginPath();ctx.arc(state.x,state.y,10,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  window.cityExploration={enter,update,draw,exit};
  Object.defineProperty(window.cityExploration,"active",{get:()=>state.active});
  resize();
})();