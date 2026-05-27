(function(){
  // lightbox (simple; can be upgraded to PhotoSwipe later)
  const lightboxLinks = document.querySelectorAll('[data-lightbox]');
  if(lightboxLinks.length){
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.78);display:none;align-items:center;justify-content:center;z-index:1000;padding:22px;';
    const img = document.createElement('img');
    img.style.cssText = 'max-width:min(1200px, 100%);max-height:90vh;border-radius:16px;box-shadow:0 22px 70px rgba(0,0,0,.35);';
    const controls = document.createElement('div');
    controls.style.cssText = 'position:fixed;left:0;right:0;bottom:18px;display:flex;justify-content:center;gap:10px;pointer-events:none;';
    const prev = document.createElement('button');
    const next = document.createElement('button');
    const count = document.createElement('span');
    [prev, next, count].forEach(el=>{
      el.style.cssText = 'pointer-events:auto;border:1px solid rgba(255,255,255,.28);background:rgba(0,0,0,.36);color:#fff;border-radius:999px;padding:10px 13px;font:13px system-ui,-apple-system,Segoe UI,sans-serif;';
    });
    prev.type = 'button';
    next.type = 'button';
    prev.textContent = '‹';
    next.textContent = '›';
    overlay.appendChild(img);
    controls.appendChild(prev);
    controls.appendChild(count);
    controls.appendChild(next);
    overlay.appendChild(controls);
    let current = 0;
    const links = Array.from(lightboxLinks);
    const closeLightbox = ()=>{ overlay.style.display='none'; img.src=''; };
    const show = (idx)=>{
      current = (idx + links.length) % links.length;
      img.src = links[current].getAttribute('href');
      count.textContent = `${current + 1} / ${links.length}`;
    };
    overlay.addEventListener('click', (e)=>{
      if(e.target === overlay) closeLightbox();
    });
    img.addEventListener('click', (e)=>e.stopPropagation());
    prev.addEventListener('click', (e)=>{ e.stopPropagation(); show(current - 1); });
    next.addEventListener('click', (e)=>{ e.stopPropagation(); show(current + 1); });
    let touchX = null;
    overlay.addEventListener('touchstart', (e)=>{ touchX = e.touches[0] && e.touches[0].clientX; }, { passive:true });
    overlay.addEventListener('touchend', (e)=>{
      if(touchX == null) return;
      const endX = e.changedTouches[0] && e.changedTouches[0].clientX;
      if(endX == null) return;
      const dx = endX - touchX;
      if(Math.abs(dx) > 45) show(current + (dx < 0 ? 1 : -1));
      touchX = null;
    }, { passive:true });
    document.body.appendChild(overlay);
    links.forEach((a, idx)=>a.addEventListener('click', (e)=>{
      e.preventDefault();
      show(idx);
      overlay.style.display = 'flex';
    }));
    document.addEventListener('keydown', (e)=>{
      if(overlay.style.display !== 'flex') return;
      if(e.key === 'Escape') closeLightbox();
      if(e.key === 'ArrowLeft') show(current - 1);
      if(e.key === 'ArrowRight') show(current + 1);
    });
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

  // Hanabi portrait video: custom controls avoid browser fullscreen forcing a landscape stage.
  document.querySelectorAll('[data-hanabi-player]').forEach((player)=>{
    const video = player.querySelector('[data-hanabi-video]');
    const toggle = player.querySelector('[data-video-toggle]');
    const play = player.querySelector('[data-video-play]');
    const mute = player.querySelector('[data-video-mute]');
    const progress = player.querySelector('[data-video-progress]');
    if(!video || !toggle || !play || !mute || !progress) return;

    video.setAttribute('webkit-playsinline','');
    video.controls = false;

    const sync = ()=>{
      const playing = !video.paused && !video.ended;
      player.classList.toggle('is-playing', playing);
      toggle.querySelector('[data-video-icon]').textContent = playing ? 'Ⅱ' : '▶';
      play.textContent = playing ? 'Ⅱ' : '▶';
      mute.textContent = video.muted ? (mute.dataset.soundOff || 'Off') : (mute.dataset.soundOn || 'On');
      if(video.duration) progress.value = Math.round((video.currentTime / video.duration) * 1000);
    };
    const togglePlay = ()=>{
      if(video.paused || video.ended) video.play().catch(()=>{
        video.muted = true;
        video.play().catch(()=>{});
      });
      else video.pause();
    };

    toggle.addEventListener('click', togglePlay);
    play.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);
    mute.addEventListener('click', ()=>{
      video.muted = !video.muted;
      sync();
    });
    progress.addEventListener('input', ()=>{
      if(!video.duration) return;
      video.currentTime = (Number(progress.value) / 1000) * video.duration;
    });
    ['play','pause','ended','loadedmetadata','timeupdate','volumechange'].forEach((name)=>video.addEventListener(name, sync));
    sync();
  });

  // canonical URL: reduce duplicates (slash/index.html/http) for search engines
  (function(){
    try{
      const origin = 'https://shenlan.jp';
      let path = window.location.pathname || '/';
      // Normalize index.html
      if(path.endsWith('/index.html')) path = path.slice(0, -'/index.html'.length) + '/';
      // Root redirects to /en/ (site behavior). Prefer canonical to final.
      if(path === '/' || path === '') path = '/en/';
      // Ensure trailing slash for non-file paths
      if(!path.endsWith('/') && !/\.[a-zA-Z0-9]+$/.test(path)) path = path + '/';

      const canonicalHref = origin + path;
      let link = document.querySelector('link[rel="canonical"]');
      if(!link){
        link = document.createElement('link');
        link.setAttribute('rel','canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalHref);
    }catch(e){}
  })();

  // language switcher: keep same path across /en /zh /ja
  (function(){
    const path = window.location.pathname || '/';
    const m = path.match(/^\/(en|zh|ja)(\/.*)?$/);
    const current = m ? m[1] : null;
    // rest includes leading slash; default to '/' (home)
    const rest = m ? (m[2] || '/') : path;
    const hrefFor = (lang)=>{
      if(rest === '/' || rest === '') return `/${lang}/`;
      return `/${lang}${rest}`;
    };

    // Update desktop header language links
    document.querySelectorAll('.lang a').forEach((a)=>{
      const txt = (a.textContent || '').trim().toLowerCase();
      let lang = null;
      if(txt === 'en') lang = 'en';
      else if(txt === '中文') lang = 'zh';
      else if(txt === '日本語') lang = 'ja';
      if(!lang) return;
      a.setAttribute('href', hrefFor(lang));
      if(current) a.classList.toggle('active', lang === current);
    });

    // Update mobile panel language pills (hrefs only)
    document.querySelectorAll('[data-mobile-panel] a.pill').forEach((a)=>{
      const txt = (a.textContent || '').trim().toLowerCase();
      let lang = null;
      if(txt === 'en') lang = 'en';
      else if(txt === '中文') lang = 'zh';
      else if(txt === '日本語') lang = 'ja';
      if(!lang) return;
      a.setAttribute('href', hrefFor(lang));
    });
  })();

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
