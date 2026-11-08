(function(){
  // Native dialog makes the background inert and keeps image browsing keyboard-accessible.
  const lightboxLinks = document.querySelectorAll('[data-lightbox]');
  if (lightboxLinks.length) {
    const language = (document.documentElement.lang || 'en').split('-')[0];
    const words = ({
      zh: {title:'照片预览', close:'关闭照片预览', prev:'上一张照片', next:'下一张照片', loading:'正在加载照片…', error:'照片暂未加载成功。', original:'打开原图', count:(n,total)=>`第 ${n} 张，共 ${total} 张`},
      ja: {title:'写真プレビュー', close:'写真を閉じる', prev:'前の写真', next:'次の写真', loading:'写真を読み込み中…', error:'写真を読み込めませんでした。', original:'元の写真を開く', count:(n,total)=>`${total} 枚中 ${n} 枚目`},
      en: {title:'Photo preview', close:'Close photo preview', prev:'Previous photo', next:'Next photo', loading:'Loading photograph…', error:'This photograph could not be loaded.', original:'Open original', count:(n,total)=>`Photo ${n} of ${total}`}
    })[language] || {title:'Photo preview', close:'Close photo preview', prev:'Previous photo', next:'Next photo', loading:'Loading photograph…', error:'This photograph could not be loaded.', original:'Open original', count:(n,total)=>`Photo ${n} of ${total}`};
    const galleryLinks = Array.from(lightboxLinks);
    let links = galleryLinks;
    const dialog = document.createElement('dialog');
    dialog.className = 'photo-viewer';
    dialog.setAttribute('aria-labelledby', 'photo-viewer-title');
    dialog.innerHTML = '<div class="photo-viewer-toolbar"><span id="photo-viewer-title"></span><button type="button" class="photo-viewer-close">×</button></div><figure class="photo-viewer-stage"><img alt=""><div class="photo-viewer-status" role="status"><span></span><a target="_blank" rel="noopener" hidden></a></div></figure><div class="photo-viewer-controls"><button type="button" class="photo-viewer-prev">‹</button><span class="photo-viewer-count" aria-live="polite" aria-atomic="true"></span><button type="button" class="photo-viewer-next">›</button></div>';
    const img = dialog.querySelector('img');
    const stage = dialog.querySelector('figure');
    const close = dialog.querySelector('.photo-viewer-close');
    const prev = dialog.querySelector('.photo-viewer-prev');
    const next = dialog.querySelector('.photo-viewer-next');
    const count = dialog.querySelector('.photo-viewer-count');
    const status = dialog.querySelector('.photo-viewer-status');
    const message = status.querySelector('span');
    const original = status.querySelector('a');
    dialog.querySelector('#photo-viewer-title').textContent = words.title;
    close.setAttribute('aria-label', words.close);
    prev.setAttribute('aria-label', words.prev);
    next.setAttribute('aria-label', words.next);
    original.textContent = words.original;
    let current = 0;
    let returnFocus = null;
    let bodyOverflow = '';
    let bodyPadding = '';
    const show = (index) => {
      current = (index + links.length) % links.length;
      const link = links[current];
      status.hidden = false;
      original.hidden = true;
      message.textContent = words.loading;
      img.style.visibility = 'hidden';
      img.alt = link.querySelector('img')?.alt || words.title;
      img.src = link.href;
      original.href = link.href;
      count.textContent = `${current + 1} / ${links.length}`;
      count.setAttribute('aria-label', words.count(current + 1, links.length));
      prev.disabled = next.disabled = links.length < 2;
    };
    img.addEventListener('load', () => { status.hidden = true; img.style.visibility = ''; });
    img.addEventListener('error', () => { message.textContent = words.error; original.hidden = false; });
    document.body.appendChild(dialog);
    galleryLinks.forEach(link => link.addEventListener('click', (event) => {
      // Keep modified clicks and browsers without native dialog on their normal image link.
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      const pane = link.closest('[data-pane]');
      links = pane ? Array.from(pane.querySelectorAll('[data-lightbox]')) : galleryLinks;
      returnFocus = link;
      bodyOverflow = document.body.style.overflow;
      bodyPadding = document.body.style.paddingRight;
      const scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      if (scrollbar) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
      document.body.style.overflow = 'hidden';
      show(links.indexOf(link));
      dialog.showModal();
      close.focus({preventScroll:true});
    }));
    close.addEventListener('click', () => dialog.close());
    prev.addEventListener('click', () => show(current - 1));
    next.addEventListener('click', () => show(current + 1));
    dialog.addEventListener('click', event => { if (event.target === dialog || event.target === stage) dialog.close(); });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = bodyOverflow;
      document.body.style.paddingRight = bodyPadding;
      img.removeAttribute('src');
      if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(current - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(current + 1); }
      if (event.key === 'Tab') {
        const targets = Array.from(dialog.querySelectorAll('button:not(:disabled), a[href]')).filter(el => !el.hidden && el.getClientRects().length);
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    let touch = null;
    stage.addEventListener('touchstart', event => {
      touch = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null;
    }, {passive:true});
    stage.addEventListener('touchend', event => {
      if (!touch || event.touches.length) return;
      const point = event.changedTouches[0];
      const dx = point.clientX - touch.x, dy = point.clientY - touch.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(current + (dx < 0 ? 1 : -1));
      touch = null;
    }, {passive:true});
  }

  // Expose the current page and parent section without changing menu open/close behavior.
  (function () {
    const normal = path => path.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
    const current = normal(window.location.pathname);
    const section = path => {
      const match = path.match(/^\/(zh|en|ja)\/(routes|portfolio|services|autumn)(?:\/|$)/);
      return match ? (match[2] === 'autumn' ? 'routes' : match[2]) : '';
    };
    const currentSection = section(current);
    const exact = link => normal(new URL(link.href, window.location.origin).pathname) === current;
    document.querySelectorAll('.nav-links a, [data-mobile-panel] > a, [data-mp-sub] a').forEach(link => {
      if (exact(link)) link.setAttribute('aria-current', 'page');
    });
    document.querySelectorAll('.nav-links [data-dropdown]').forEach(dropdown => {
      const links = Array.from(dropdown.querySelectorAll('.dropdown-menu a'));
      if (!currentSection || !links.some(link => section(new URL(link.href, window.location.origin).pathname) === currentSection)) return;
      const button = dropdown.querySelector('[data-dropdown-btn]');
      button.dataset.navCurrent = 'true';
      button.setAttribute('aria-current', 'true');
    });
    document.querySelectorAll('[data-mp-toggle]').forEach(button => {
      const submenu = button.nextElementSibling;
      if (!submenu || !currentSection) return;
      const links = Array.from(submenu.querySelectorAll('a'));
      if (links.some(link => section(new URL(link.href, window.location.origin).pathname) === currentSection)) {
        button.dataset.navCurrent = 'true';
        button.setAttribute('aria-current', 'true');
      }
    });
  })();

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

  // All desktop dropdowns share hover, touch and keyboard behavior.
  // A continuous pointer bridge and a short grace period prevent accidental dismissal.
  const dropdowns = Array.from(document.querySelectorAll('[data-dropdown]'));
  const closeTimers = new Map();
  const pinnedDropdowns = new Set();
  const cancelDropdownClose = dd => {
    if (!closeTimers.has(dd)) return;
    clearTimeout(closeTimers.get(dd));
    closeTimers.delete(dd);
  };
  const setDropdown = (dd, open) => {
    cancelDropdownClose(dd);
    dd.classList.toggle('open', open);
    dd.querySelector('[data-dropdown-btn]')?.setAttribute('aria-expanded', String(open));
    if (!open) pinnedDropdowns.delete(dd);
  };
  const openDropdown = dd => dropdowns.forEach(other => setDropdown(other, other === dd));
  const scheduleDropdownClose = dd => {
    cancelDropdownClose(dd);
    if (pinnedDropdowns.has(dd)) return;
    closeTimers.set(dd, setTimeout(() => {
      closeTimers.delete(dd);
      if (pinnedDropdowns.has(dd) || dd.matches(':hover') || dd.contains(document.activeElement)) return;
      setDropdown(dd, false);
    }, 320));
  };
  dropdowns.forEach(dd => {
    const btn = dd.querySelector('[data-dropdown-btn]');
    const menu = dd.querySelector('.dropdown-menu');
    const items = Array.from(dd.querySelectorAll('[role="menuitem"]'));
    if (!btn || !menu) return;
    const enter = event => {
      cancelDropdownClose(dd);
      if (event.pointerType !== 'touch' && window.matchMedia('(hover:hover)').matches) openDropdown(dd);
    };
    const leave = event => {
      if (event.pointerType !== 'touch' && !dd.contains(event.relatedTarget)) scheduleDropdownClose(dd);
    };
    dd.addEventListener('pointerenter', enter);
    dd.addEventListener('pointerleave', leave);
    menu.addEventListener('pointerenter', enter);
    menu.addEventListener('pointerleave', leave);
    btn.addEventListener('click', () => {
      if (dd.classList.contains('open') && pinnedDropdowns.has(dd)) setDropdown(dd, false);
      else {
        openDropdown(dd);
        pinnedDropdowns.add(dd);
      }
    });
    dd.addEventListener('focusout', event => {
      if (dd.contains(event.relatedTarget)) return;
      if (event.relatedTarget) setDropdown(dd, false);
      else scheduleDropdownClose(dd);
    });
    items.forEach(item => item.addEventListener('click', () => setDropdown(dd, false)));
    dd.addEventListener('keydown', event => {
      const index = items.indexOf(document.activeElement);
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        openDropdown(dd);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
          : event.key === 'ArrowDown' ? (index + 1) % items.length
          : (index <= 0 ? items.length - 1 : index - 1);
        items[next]?.focus();
      }
    });
  });
  document.addEventListener('click', event => {
    dropdowns.forEach(dd => { if (!dd.contains(event.target)) setDropdown(dd, false); });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    dropdowns.forEach(dd => {
      if (!dd.classList.contains('open')) return;
      if (dd.contains(document.activeElement)) dd.querySelector('[data-dropdown-btn]').focus();
      setDropdown(dd, false);
    });
  });

  // tabs
  document.querySelectorAll('[data-tabs]').forEach((root)=>{
    const btns = Array.from(root.querySelectorAll('[data-tab]'));
    const panes = Array.from(root.querySelectorAll('[data-pane]'));
    if(!btns.length || !panes.length) return;
    const set = (name)=>{
      btns.forEach(button => {
        const selected = button.dataset.tab === name;
        button.classList.toggle('active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
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

  const hero = document.querySelector('.swiper[data-hero]');
  if (window.Swiper && hero) {
    const section = hero.closest('.hero');
    const control = section.querySelector('[data-hero-playback]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let enabled = !motion.matches;
    let hovering = section.matches(':hover') && window.matchMedia('(hover: hover)').matches;
    let focused = section.contains(document.activeElement);
    const swiper = new Swiper(hero, {
      loop: true,
      speed: motion.matches ? 0 : 900,
      autoplay: {enabled, delay:5200, disableOnInteraction:false},
      grabCursor: true,
      slidesPerView: 1,
      pagination: {el:hero.querySelector('.swiper-pagination'), clickable:true},
      navigation: {
        nextEl:hero.querySelector('.swiper-button-next'),
        prevEl:hero.querySelector('.swiper-button-prev')
      },
      keyboard: {enabled:true},
      on: {init:applyHeroSlide, slideChange:applyHeroSlide}
    });
    const updatePlayback = () => {
      const shouldPlay = enabled && !hovering && !focused && !document.hidden;
      if (shouldPlay && !swiper.autoplay.running) swiper.autoplay.start();
      if (!shouldPlay && swiper.autoplay.running) swiper.autoplay.stop();
      if (control) {
        const label = enabled ? control.dataset.pause : control.dataset.play;
        control.setAttribute('aria-label', label);
        control.title = label;
        control.firstElementChild.textContent = enabled ? 'Ⅱ' : '▶';
        control.hidden = false;
      }
    };
    section.addEventListener('pointerenter', event => {
      hovering = event.pointerType !== 'touch';
      updatePlayback();
    });
    section.addEventListener('pointerleave', () => { hovering = false; updatePlayback(); });
    section.addEventListener('focusin', () => { focused = true; updatePlayback(); });
    section.addEventListener('focusout', event => {
      focused = section.contains(event.relatedTarget);
      updatePlayback();
    });
    control?.addEventListener('click', () => {
      enabled = !enabled;
      // An explicit play command takes effect while the control still has focus.
      if (enabled) { hovering = false; focused = false; }
      updatePlayback();
    });
    motion.addEventListener('change', () => {
      swiper.params.speed = motion.matches ? 0 : 900;
      if (motion.matches) enabled = false;
      updatePlayback();
    });
    document.addEventListener('visibilitychange', updatePlayback);
    updatePlayback();
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
