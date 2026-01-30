(function(){
  // lightbox (simple; can be upgraded to PhotoSwipe later)
  const lightboxLinks = document.querySelectorAll('[data-lightbox]');
  if(lightboxLinks.length){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;z-index:1000;padding:22px;';
    const img = document.createElement('img');
    img.style.cssText = 'max-width:min(1200px, 100%);max-height:90vh;border-radius:16px;box-shadow:0 22px 70px rgba(0,0,0,.35);';
    overlay.appendChild(img);
    overlay.addEventListener('click', ()=>{ overlay.style.display='none'; img.src=''; });
    document.body.appendChild(overlay);
    lightboxLinks.forEach(a=>a.addEventListener('click', (e)=>{
      e.preventDefault();
      img.src = a.getAttribute('href');
      overlay.style.display = 'flex';
    }));
  }

  // mobile burger
  const burger = document.querySelector('[data-burger]');
  if(burger){
    burger.addEventListener('click', ()=>{
      document.body.classList.toggle('menu-open');
    });
    document.addEventListener('keydown', (e)=>{
      if(e.key==='Escape') document.body.classList.remove('menu-open');
    });
  }

  // mobile panel accordion (hide sub menus until toggled)
  const mp = document.querySelector('[data-mobile-panel]');
  if(mp){
    mp.querySelectorAll('[data-mp-toggle]').forEach((btn)=>{
      const sub = btn.nextElementSibling;
      if(!sub || !sub.matches('[data-mp-sub]')) return;
      // default collapsed
      btn.setAttribute('aria-expanded','false');
      sub.hidden = true;
      btn.addEventListener('click', ()=>{
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        sub.hidden = open;
      });
    });
  }

  // dropdown menu (click on touch devices; hover handled by CSS on desktop)
  const dd = document.querySelector('[data-dropdown]');
  if(dd){
    const btn = dd.querySelector('[data-dropdown-btn]');
    const close = ()=> dd.classList.remove('open');
    btn && btn.addEventListener('click', (e)=>{
      // only use click-toggle on non-hover devices
      const canHover = window.matchMedia && window.matchMedia('(hover:hover)').matches;
      if(canHover) return;
      e.preventDefault();
      dd.classList.toggle('open');
    });
    document.addEventListener('click', (e)=>{
      if(!dd.contains(e.target)) close();
    });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
  }

  // tabs
  document.querySelectorAll('[data-tabs]').forEach((root)=>{
    const btns = Array.from(root.querySelectorAll('[data-tab]'));
    const panes = Array.from(root.querySelectorAll('[data-pane]'));
    if(!btns.length || !panes.length) return;
    const set = (name)=>{
      btns.forEach(b=>b.classList.toggle('active', b.getAttribute('data-tab')===name));
      panes.forEach(p=>p.classList.toggle('active', p.getAttribute('data-pane')===name));
    };
    btns.forEach(b=>b.addEventListener('click', ()=> set(b.getAttribute('data-tab'))));
    set(btns[0].getAttribute('data-tab'));
  });

  // reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if(reveals.length && 'IntersectionObserver' in window){
    // Enable the reveal CSS only when IO exists; otherwise keep content visible.
    document.documentElement.classList.add('reveal-on');
    const io = new IntersectionObserver((entries)=>{
      for(const e of entries){
        if(e.isIntersecting){
          e.target.classList.add('show');
          io.unobserve(e.target);
        }
      }
    }, { threshold: 0.12 });
    reveals.forEach(el=>io.observe(el));
  }



  function applyHeroSlide(sw){
    const slide = sw.slides[sw.activeIndex];
    if(!slide) return;
    const d = slide.dataset || {};
    const title = document.querySelector('[data-hero-title]');
    const desc  = document.querySelector('[data-hero-desc]');
    const pA = document.querySelector('[data-hero-primary]');
    const pAt = document.querySelector('[data-hero-primary-text]');
    const pAs = document.querySelector('[data-hero-primary-sub]');
    // secondary CTA removed
    const pB = null;
    const pBt = null;
    const pBs = null;

    if(title && d.title) title.textContent = d.title;
    if(desc && d.desc) desc.textContent = d.desc;

    if(pA && d.primaryHref) pA.setAttribute('href', d.primaryHref);
    if(pAt && d.primaryText) pAt.textContent = d.primaryText;
    if(pAs && d.primarySub) pAs.textContent = d.primarySub;

    // secondary CTA removed
  }

  // Swiper init (if present)
  if(window.Swiper){
    const hero = document.querySelector('.swiper[data-hero]');
    if(hero){
      // eslint-disable-next-line no-new
      const sw = new Swiper(hero, {
        loop: true,
        speed: 900,
        effect: 'slide',
        autoplay: { delay: 5200, disableOnInteraction: false },
        grabCursor: true,
        slidesPerView: 1,
        pagination: { el: hero.querySelector('.swiper-pagination'), clickable: true },
        navigation: {
          nextEl: hero.querySelector('.swiper-button-next'),
          prevEl: hero.querySelector('.swiper-button-prev')
        },
        keyboard: { enabled: true },
        on: {
          init: (swiper)=>applyHeroSlide(swiper),
          slideChange: (swiper)=>applyHeroSlide(swiper),
        },
      });
      // Apply once in case init didn't fire yet
      try{ applyHeroSlide(sw); }catch(e){}
    }

    // Vehicle swiper removed; vehicle is now a click-to-swap gallery
  }

  // Vehicle gallery: click thumbnails to swap the main image
  const vMain = document.querySelector('[data-vehicle-main]');
  if(vMain){
    const thumbs = Array.from(document.querySelectorAll('[data-vehicle-thumb]'));
    thumbs.forEach((img)=>{
      img.addEventListener('click', ()=>{
        const full = img.getAttribute('data-full') || img.getAttribute('src');
        if(!full) return;
        vMain.setAttribute('src', full);
        thumbs.forEach(t=>t.removeAttribute('data-active'));
        img.setAttribute('data-active','true');
      });
    });
  }
})();
