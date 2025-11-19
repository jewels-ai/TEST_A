// Client script — auto-loads images from server endpoint that lists Cloudinary folder resources
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const ctx = canvasElement.getContext('2d');
const loader = document.getElementById('loader');
const modeContainer = document.getElementById('jewelry-mode');
const subcatButtons = document.getElementById('subcategory-buttons');
const optionsGroup = document.getElementById('jewelry-options');

let camera = null;
let currentType = '';
let currentImage = null;
let smoothedLandmarks = null;
let smoothingFactor = 0.18;
let smoothedPoints = {};

// Helper
function setLoading(v){ loader.classList.toggle('hidden', !v); }

// loadImage with crossOrigin
function loadImage(src){
  return new Promise(res=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>res(img);
    img.onerror = ()=>res(null);
    img.src = src;
  });
}

// Fetch image list from server for a given Cloudinary folder key
async function fetchResources(folderKey){
  try{
    setLoading(true);
    const res = await fetch(`/api/resources/${encodeURIComponent(folderKey)}`);
    if(!res.ok) throw new Error('Server error '+res.status);
    const json = await res.json();
    return json;
  }catch(err){
    console.error('fetchResources error', err);
    return [];
  }finally{
    setLoading(false);
  }
}

async function insertJewelryOptions(key){
  optionsGroup.innerHTML = '';
  setLoading(true);
  const items = await fetchResources(key);
  if(!items || items.length===0){
    optionsGroup.innerHTML = '<div style="color:#fff8">No items found in this folder.</div>';
    setLoading(false);
    return;
  }
  for(const it of items){
    const btn = document.createElement('button');
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.src = it.src;
    img.alt = it.public_id || 'jewel';
    img.onerror = ()=>{ img.src = 'placeholder.png'; };
    btn.appendChild(img);
    btn.onclick = async ()=>{
      setLoading(true);
      const loaded = await loadImage(it.src);
      if(loaded) currentImage = loaded;
      setTimeout(()=>setLoading(false),200);
    };
    optionsGroup.appendChild(btn);
  }
  setLoading(false);
}

// Mediapipe
const faceMesh = new FaceMesh({ locateFile: (file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({ maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.6, minTrackingConfidence:0.6 });
faceMesh.onResults((results)=>{
  if(videoElement.videoWidth && videoElement.videoHeight){
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
  }
  ctx.clearRect(0,0,canvasElement.width,canvasElement.height);
  if(results.multiFaceLandmarks && results.multiFaceLandmarks.length>0){
    const newLm = results.multiFaceLandmarks[0];
    if(!smoothedLandmarks) smoothedLandmarks = newLm;
    else smoothedLandmarks = smoothedLandmarks.map((prev,i)=>({ x: prev.x*(1-smoothingFactor)+newLm[i].x*smoothingFactor, y: prev.y*(1-smoothingFactor)+newLm[i].y*smoothingFactor, z: prev.z*(1-smoothingFactor)+newLm[i].z*smoothingFactor }));
  } else smoothedLandmarks = null;
  drawOverlay();
});

// start camera
async function startCamera(facingMode='user'){
  if(camera) camera.stop();
  camera = new Camera(videoElement, { onFrame: async ()=>{ await faceMesh.send({image:videoElement}); }, width:1280, height:720, facingMode });
  camera.start();
}

// draw overlay
function sPoint(key,x,y){
  if(!smoothedPoints[key]) smoothedPoints[key] = {x,y};
  else { smoothedPoints[key].x = smoothedPoints[key].x*(1-smoothingFactor) + x*smoothingFactor; smoothedPoints[key].y = smoothedPoints[key].y*(1-smoothingFactor) + y*smoothingFactor; }
  return smoothedPoints[key];
}

function drawOverlay(){
  if(!smoothedLandmarks) return;
  const w = canvasElement.width, h = canvasElement.height;
  const leftEye = smoothedLandmarks[33], rightEye = smoothedLandmarks[263];
  const faceWidth = Math.hypot((rightEye.x-leftEye.x)*w, (rightEye.y-leftEye.y)*h);

  const leftEar = smoothedLandmarks[234] || smoothedLandmarks[132];
  const rightEar = smoothedLandmarks[454] || smoothedLandmarks[361];
  const neck = smoothedLandmarks[152];

  const le = sPoint('le', leftEar.x*w, leftEar.y*h);
  const re = sPoint('re', rightEar.x*w, rightEar.y*h);
  const nk = sPoint('nk', neck.x*w, neck.y*h);

  if(currentImage){
    const earScale = faceWidth * 0.48;
    const eW = earScale, eH = earScale * (currentImage.height/currentImage.width);
    ctx.drawImage(currentImage, le.x - eW/2, le.y - eH*0.15, eW, eH);
    ctx.drawImage(currentImage, re.x - eW/2, re.y - eH*0.15, eW, eH);

    const neckScale = faceWidth * 1.2;
    const nW = neckScale, nH = neckScale * (currentImage.height/currentImage.width);
    ctx.drawImage(currentImage, nk.x - nW/2, nk.y - nH*0.1, nW, nH);
  }
}

// UI
modeContainer.addEventListener('click', e=>{
  const btn = e.target.closest('button[data-cat]');
  if(!btn) return;
  currentType = btn.dataset.cat;
  subcatButtons.style.display = 'flex';
  optionsGroup.style.display = 'none';
  startCamera('user');
});

subcatButtons.addEventListener('click', e=>{
  const btn = e.target.closest('button[data-sub]');
  if(!btn) return;
  const sub = btn.dataset.sub;
  const key = `${sub}_${currentType}`; // e.g. gold_earrings
  optionsGroup.style.display = 'flex';
  insertJewelryOptions(key);
});

// capture (download)
async function captureImage(){
  const out = document.createElement('canvas');
  out.width = canvasElement.width; out.height = canvasElement.height;
  const outCtx = out.getContext('2d');
  outCtx.drawImage(videoElement,0,0,out.width,out.height);
  outCtx.drawImage(canvasElement,0,0);
  outCtx.fillStyle='rgba(0,0,0,0.4)'; outCtx.fillRect(out.width-220,out.height-64,200,48);
  outCtx.font='20px Poppins'; outCtx.fillStyle='#ffd97d'; outCtx.fillText('TryMyGold', out.width-170,out.height-34);
  const a = document.createElement('a'); a.href = out.toDataURL('image/png'); a.download='trymygold.png'; a.click();
}

document.addEventListener('keydown', e=>{ if(e.key==='c') captureImage(); });

document.addEventListener('DOMContentLoaded', ()=>{ setTimeout(()=>startCamera(),500); });
