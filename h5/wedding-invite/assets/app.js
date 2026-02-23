// H5 Invite

// ===== BGM =====
// Mobile requires a user gesture. Keep a button.
const audio = document.getElementById('bgm');
const musicBtn = document.querySelector('[data-music]');
let audioOn = false;

async function safePlay(){
  if(!audio) return false;
  try{
    await audio.play();
    audioOn = true;
    musicBtn.dataset.on = "true";
    return true;
  } catch (e){
    // iOS/WeChat blocks until a user gesture; stay silent (no prompt)
    audioOn = false;
    musicBtn.dataset.on = "false";
    return false;
  }
}

function stop(){
  if(!audio) return;
  audio.pause();
  audioOn = false;
  musicBtn.dataset.on = "false";
}

async function toggleMusic(){
  if(audioOn) return stop();
  await safePlay();
}

musicBtn.addEventListener('click', toggleMusic);

// "Old mode": try to unlock on first touch anywhere (no overlay, no alerts)
['touchstart','pointerdown'].forEach(evt=>{
  window.addEventListener(evt, ()=>{ safePlay(); }, { once:true, passive:true });
});

// ===== Toast =====
const toast = document.getElementById('toast');
function showToast(msg){
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
}

// ===== Swiper =====
const swiper = new Swiper('.swiper', {
  direction: 'vertical',
  speed: 760,
  effect: 'fade',
  fadeEffect: { crossFade: true },
  allowTouchMove: true,
  pagination: { el: '.swiper-pagination', clickable: true },
  on: {
    init(){ setActive(this.activeIndex); },
    slideChange(){ setActive(this.activeIndex); }
  }
});

function setActive(index){
  document.querySelectorAll('.swiper-slide').forEach((el,i)=>{
    el.classList.toggle('is-active', i===index);
  });
}

// ===== Auto flip =====
// Disabled (user requested no auto page switching)
