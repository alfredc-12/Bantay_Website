import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport'), canvas = $('model-canvas'), picker = $('part-select');
const labelToggle = $('show-labels');
const labels = window.BANTAY_LABELS.labels;
const clamp = THREE.MathUtils.clamp;
const state = { ready:false, progress:0, target:0, selected:null, showLabels:false, zoomScale:1, error:null };
const groups = new Map(), chips = new Map();
let renderer, scene, camera, controls, model, mixer, action, duration, focusTween;
function setProgress(p) {
 state.target=clamp(p,0,1);
}
function overview(reset=true) {
 state.selected=null;focusTween=null;
 picker.value='overview';picker.title='Choose a part to inspect. Whole device returns to the full view.';
 if(reset)fitView();
}
function anchorFor(rec) {
 const group=groups.get(rec.group);const a=rec.anchor_local;
 return group.localToWorld(new THREE.Vector3(a[0],a[2],-a[1]));
}
function selectPart(rec) {
 if(!state.ready)return;
 state.selected=rec;
 if(!['01','03','04','05','17','18','19'].includes(rec.id)&&state.target<.70)setProgress(.75);
 picker.value=rec.id;picker.title=rec.description;
 let d={ '01':1.1,'02':.85,'03':.85,'04':.5,'05':.9,'06':.42,'07':.36,'08':.25,'09':.19,'10':.22,'11':.4,'12':.5,'20':.5 }[rec.id]||.25;
 const direction=camera.position.clone().sub(controls.target).normalize();
 focusTween={ start:performance.now(), from:camera.position.clone(), fromTarget:controls.target.clone(), direction, distance:d };
}
for(const rec of labels) {
 const option=document.createElement('option');option.value=rec.id;
 option.textContent=`${rec.id} · ${rec.id==='11'?'Pump — model to be confirmed':rec.label}`;
 option.title=rec.description;picker.append(option);
 const chip=document.createElement('button');chip.className='label-chip';chip.hidden=true;
 chip.setAttribute('aria-label',`${rec.id}: ${rec.label}`);chip.title=rec.description;
 const number=document.createElement('span');number.textContent=rec.id;
 const name=document.createElement('span');name.className='label-name';name.textContent=rec.id==='11'?'Pump — model to be confirmed':rec.label;
 chip.append(number,name);chip.addEventListener('click',()=>selectPart(rec));
 $('labels').append(chip);chips.set(rec.id,chip);
}
labelToggle.addEventListener('change',()=>{state.showLabels=labelToggle.checked;updateLabels();});
picker.addEventListener('change',()=>{
 const rec=labels.find(r=>r.id===picker.value);
 if(rec)selectPart(rec);else overview();
});
function zoom(factor) {
 if(!state.ready)return;focusTween=null;
 const offset=camera.position.clone().sub(controls.target),old=offset.length();offset.setLength(clamp(old*factor,.09,7));state.zoomScale*=offset.length()/old;camera.position.copy(controls.target).add(offset);controls.update();
}
viewport.addEventListener('wheel',event=>{
 if(event.ctrlKey)return;
 event.preventDefault();event.stopImmediatePropagation();overview(false);
 const unit=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
 setProgress(state.target+event.deltaY*unit/2000);
},{passive:false,capture:true});
viewport.addEventListener('keydown',e=>{if(e.target!==viewport&&e.target!==canvas)return;if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.8);}else if(e.key==='-'){e.preventDefault();zoom(1.25);}else if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();setProgress(state.target+.05);}else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();setProgress(state.target-.05);}else if(e.key==='Escape')overview();});

function framing() {
 model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const fov=THREE.MathUtils.degToRad(camera.fov);
 const distance=Math.max(size.y,size.x/camera.aspect,size.z)*.67/Math.tan(fov/2)+.28;
 return {center,distance};
}
function fitView() {
 if(!state.ready)return;
 focusTween=null;state.zoomScale=1;
 const {center,distance}=framing();
 camera.position.copy(center).add(new THREE.Vector3(1.1,.65,1.9).normalize().multiplyScalar(distance));controls.target.copy(center);controls.update();
}
function resize() {
 if(!renderer)return;
 const w=viewport.clientWidth,h=viewport.clientHeight;
 renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
 if(state.ready&&!state.selected)fitView();
}
function updateLabels() {
 const w=viewport.clientWidth,h=viewport.clientHeight,placed=[],lines=[];
 for(const rec of labels) {
  const chip=chips.get(rec.id),external=['01','03','04','05','17','18','19'].includes(rec.id);
  chip.classList.toggle('selected',state.selected?.id===rec.id);
  if(!state.ready||!state.showLabels||!groups.has(rec.group)||(!external&&state.progress<.31)){chip.hidden=true;continue;}
  const p=anchorFor(rec).project(camera);
  if(p.z<-1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1){chip.hidden=true;continue;}
  const ax=(p.x*.5+.5)*w,ay=(-p.y*.5+.5)*h;
  let x=clamp(ax,22,w-22),y=clamp(ay,24,h-110);
  for(let k=0;k<24;k++){
   if(placed.every(q=>Math.hypot(x-q.x,y-q.y)>35))break;
   const angle=k*2.4,radius=25+5*k;
   x=clamp(ax+Math.cos(angle)*radius,22,w-22);y=clamp(ay+Math.sin(angle)*radius,24,h-110);
  }
  placed.push({x,y});chip.hidden=false;chip.style.left=`${x}px`;chip.style.top=`${y}px`;
  if(Math.hypot(x-ax,y-ay)>5)lines.push(`<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`);
 }
 $('leader-lines').innerHTML=lines.join('');
}
function fail(error) {
 state.error=String(error?.message||error);console.error(error);
 $('loading').hidden=false;$('loading').classList.add('error');$('loading-message').textContent='The interactive view could not start. Try opening this page in an updated Chrome or Edge browser.';
}
async function start() {
 try {
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.005,30);camera.position.set(1.1,.9,1.9);
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe9f3ec,0x536051,2.4));const key=new THREE.DirectionalLight(0xfff1d9,3.2);key.position.set(2,4,4);scene.add(key);const fill=new THREE.DirectionalLight(0xc5ddff,1.8);fill.position.set(-3,1,1);scene.add(fill);
  controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.minDistance=.09;controls.maxDistance=7;controls.enablePan=true;
  controls.addEventListener('start',()=>{focusTween=null;});
  controls.addEventListener('end',()=>{if(state.ready&&!state.selected)state.zoomScale=camera.position.distanceTo(controls.target)/framing().distance;});
  const decoded=atob(window.BANTAY_MODEL_BASE64);const bytes=new Uint8Array(decoded.length);for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);delete window.BANTAY_MODEL_BASE64;
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer,'');model=gltf.scene;scene.add(model);
  model.traverse(o=>{if(o.userData.part_name)groups.set(o.userData.part_name,o);});
  if(groups.size!==15||gltf.animations.length!==1)throw new Error('The assembly model is incomplete.');
  mixer=new THREE.AnimationMixer(model);action=mixer.clipAction(gltf.animations[0]);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();duration=gltf.animations[0].duration;
  state.ready=true;resize();mixer.setTime(0);model.updateMatrixWorld(true);fitView();$('loading').hidden=true;
  picker.disabled=false;labelToggle.disabled=false;
  new ResizeObserver(resize).observe(viewport);
  const raycaster=new THREE.Raycaster();let pointerStart;
  canvas.addEventListener('pointerdown',e=>pointerStart={x:e.clientX,y:e.clientY});
  canvas.addEventListener('pointerup',e=>{
   if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)return;
   const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
   const hit=raycaster.intersectObject(model,true)[0];if(!hit)return;
   let obj=hit.object;while(obj&&!obj.userData.part_name)obj=obj.parent;if(!obj)return;
   const choices=labels.filter(r=>r.group===obj.userData.part_name).sort((a,b)=>anchorFor(a).distanceTo(hit.point)-anchorFor(b).distanceTo(hit.point));if(choices[0])selectPart(choices[0]);
  });
  renderer.setAnimationLoop(()=>{
   const changed=Math.abs(state.target-state.progress)>.0001;
   state.progress=changed?THREE.MathUtils.lerp(state.progress,state.target,.16):state.target;
   action.enabled=true;action.paused=false;mixer.setTime(duration*state.progress);model.updateMatrixWorld(true);
   if(focusTween&&state.selected){
    const p=anchorFor(state.selected),t=clamp((performance.now()-focusTween.start)/700,0,1),ease=1-Math.pow(1-t,3);
    controls.target.copy(focusTween.fromTarget).lerp(p,ease);camera.position.copy(focusTween.from).lerp(p.clone().addScaledVector(focusTween.direction,focusTween.distance),ease);
    if(t===1)focusTween=null;
   }else if(changed&&!state.selected){
    const {center,distance}=framing(),offset=camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.lerp(offset.length(),clamp(distance*state.zoomScale,.09,7),.14));
    controls.target.lerp(center,.14);camera.position.copy(controls.target).add(offset);
   }
   controls.update();renderer.render(scene,camera);updateLabels();
  });
 }catch(error){fail(error);}
}
window.BANTAY_VIEWER={state,get model(){return model;},get camera(){return camera;},get controls(){return controls;},groups,setProgress,selectPart,overview,labels};
picker.disabled=true;
setProgress(0);start();
