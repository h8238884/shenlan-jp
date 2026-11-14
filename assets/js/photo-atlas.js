(async () => {
  const status = document.getElementById('atlas-status');
  const regionButtons = [...document.querySelectorAll('[data-region]')];
  const labels = Object.fromEntries(regionButtons.map(b => [b.dataset.region, b.textContent]));
  const codeNames = Object.fromEntries(regionButtons.filter(b=>b.dataset.code && b.dataset.code !== 'JP-13').map(b=>[b.dataset.code,b.dataset.region]));
  const citySelect = document.getElementById('atlas-city');
  const allCities = citySelect.options[0].text;
  const lang = document.documentElement.lang;
  const captions = {zh:['上一张','下一张','放大','缩小'],en:['Previous photo','Next photo','Zoom in','Zoom out'],ja:['前の写真','次の写真','拡大','縮小']}[lang];
  const closeLabel = {zh:'关闭照片',en:'Close photo',ja:'写真を閉じる'}[document.documentElement.lang];
  try {
    const read = async path => {
      const response = await fetch('/assets/maps/' + path);
      if (!response.ok) throw new Error(path);
      return response.json();
    };
    const [land, places, tokyoWards] = await Promise.all([
      read('japan-prefectures.json'), read('photo-locations.json?v=1114b'), read('tokyo-23-wards.json')
    ]);
    const map = L.map('photo-map', {minZoom:3,maxZoom:17,zoomControl:false,zoomSnap:.1,scrollWheelZoom:true,maxBounds:[[16,114],[52,158]],maxBoundsViscosity:.85});
    L.control.zoom({position:'bottomright'}).addTo(map);
    map.attributionControl.setPrefix(false);
    const compact = window.matchMedia('(max-width:700px)');
    const directory = document.querySelector('.atlas-directory');
    directory.open = !compact.matches;
    const panel = document.querySelector('.atlas-panel');
    const siteMenu = document.querySelector('.atlas-site-menu');
    document.addEventListener('click', event => {
      if (!siteMenu.contains(event.target)) siteMenu.open = false;
    });
    siteMenu.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      siteMenu.open = false;
      siteMenu.querySelector('summary').focus();
    });
    function padding() {
      const box = panel.getBoundingClientRect();
      return compact.matches ? [12, box.bottom + 12] : [box.right + 16, 16];
    }
    const viewer = document.getElementById('atlas-viewer');
    const largeImage = viewer.querySelector('img');
    let currentPlace, activeIndex, returnTo;
    const fullLabel = {zh:'查看大图',en:'View full photo',ja:'写真を拡大'}[lang];
    function displayPhoto(step=0) {
      const batch = currentPlace.photos;
      activeIndex = (activeIndex + step + batch.length) % batch.length;
      largeImage.src = batch[activeIndex].full;
      largeImage.alt = currentPlace.title[lang] + ' · ' + (activeIndex+1);
      viewer.querySelector('.viewer-controls span').textContent = (activeIndex+1)+' / '+batch.length;
    }
    viewer.querySelector('.viewer-close').onclick = () => viewer.close();
    viewer.querySelectorAll('[data-step]').forEach(b=>{
      b.setAttribute('aria-label',captions[b.dataset.step==='1'?1:0]);
      b.onclick=()=>displayPhoto(Number(b.dataset.step));
    });
    viewer.addEventListener('keydown', e=>{
      if (e.key==='ArrowLeft' || e.key==='ArrowRight') {
        e.preventDefault(); displayPhoto(e.key==='ArrowRight'?1:-1);
      }
    });
    viewer.addEventListener('close',()=>returnTo?.focus({preventScroll:true}));
    largeImage.onerror=()=>{const thumb=currentPlace.photos[activeIndex].thumb;if(largeImage.getAttribute('src')!==thumb) largeImage.src=thumb;};
    for (const [selector,label] of [['.leaflet-control-zoom-in',captions[2]],['.leaflet-control-zoom-out',captions[3]]]) {
      const control = map.getContainer().querySelector(selector);
      control.title = label;
      control.setAttribute('aria-label',label);
    }
    map.createPane('landFallback').style.zIndex = 190;
    L.geoJSON(land, {pane:'landFallback',interactive:false, attribution:'<a href="https://www.naturalearthdata.com/">Natural Earth</a>',
      style: feature => ({weight:1,color:'#aab7a6',fillColor:codeNames[feature.properties.code]?'#c6d6bd':'#f2f0e4',fillOpacity:1})
    }).addTo(map);
    const tileURL = name => 'https://cyberjapandata.gsi.go.jp/xyz/'+name+'/{z}/{x}/{y}.png';
    const bounds = [[20,122],[46.5,154.5]];
    const credits = '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a> · VMAP0 / NIMA, USGS';
    L.tileLayer(tileURL('hillshademap'), {
      bounds, minNativeZoom:2, maxNativeZoom:16, maxZoom:17, opacity:.42,
      className:'atlas-relief', attribution:credits
    }).addTo(map);
    map.createPane('atlasCartography').style.zIndex = 220;
    const regions = new Map();
    const areas = land.features
      .filter(feature => codeNames[feature.properties.code])
      .map(feature => [codeNames[feature.properties.code], feature]);
    areas.push(['東京都', tokyoWards]);
    for (const [region, shape] of areas) {
      const outline = L.geoJSON(shape, {
        style:{color:'#426b60',weight:region === '東京都' ? 1 : 1.8,opacity:.85,fill:false},
        attribution:region === '東京都'
          ? '<a href="https://smartnews-smri.github.io/japan-topography/">国土数値情報・SMRI</a>' : null,
        interactive:false
      });
      regions.set(region, outline);
      L.geoJSON(shape, {
        style:{stroke:false,fill:true,fillOpacity:0}, bubblingMouseEvents:false
      }).on('click', () => render(region)).addTo(map);
    }
    let activeOutline;
    let selectedRegion = '';
    let selectedCity = '';
    let subset = [];
    let viewMode = 'places';
    L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
    const visible = L.layerGroup().addTo(map);
    const icon = L.divIcon({className:'atlas-pin',iconSize:[26,26],iconAnchor:[13,13]});
    const frame = L.popup({className:'atlas-popup',maxWidth:256,autoPan:false,offset:[0,-7]});
    let pinned = null;
    function fitView() {
      let bounds;
      if (viewMode === 'country') bounds = [[24.1,122.9],[45.6,146.1]];
      else if (selectedCity && subset.length) bounds = subset.map(p=>[p.lat,p.lng]);
      else if (activeOutline) bounds = activeOutline.getBounds();
      else bounds = places.map(place => [place.lat, place.lng]);
      map.fitBounds(bounds, {
        paddingTopLeft:padding(), paddingBottomRight:compact.matches ? [12,56] : [18,32],
        maxZoom:selectedCity ? 14 : 17, animate:false
      });
    }
    function preview(p, pin=false) {
      if (!pin && pinned) return;
      if (pin) pinned = p;
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      let index = 0;
      img.src = p.photos[index].thumb;
      img.alt = '';
      const caption = document.createElement('figcaption');
      caption.textContent = p.title[lang];
      const region = document.createElement('small');
      region.textContent = labels[p.pref]+' · '+p.city[lang];
      caption.prepend(region);
      const expand = document.createElement('button');
      expand.type='button';
      expand.className='atlas-expand';
      expand.setAttribute('aria-label',fullLabel);
      expand.append(img);
      const badge = document.createElement('span');
      badge.textContent = fullLabel+' ⤢';
      expand.append(badge);
      expand.onclick=()=>{
        currentPlace=p; activeIndex=index; returnTo=expand; pinned=p;
        viewer.querySelector('h2').textContent=p.title[lang];
        displayPhoto(); viewer.showModal(); viewer.querySelector('.viewer-close').focus();
      };
      figure.append(expand,caption);
      if (p.photos.length > 1) {
        const nav = document.createElement('div');
        nav.className = 'atlas-photo-controls';
        const count = document.createElement('span');
        count.textContent = '1 / ' + p.photos.length;
        for (const [step, label] of [[-1,captions[0]],[1,captions[1]]]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = step < 0 ? '‹' : '›';
          button.setAttribute('aria-label',label);
          button.onclick = () => {
            pinned = p;
            index = (index + step + p.photos.length) % p.photos.length;
            img.src = p.photos[index].thumb;
            count.textContent = (index+1) + ' / ' + p.photos.length;
          };
          nav.append(button);
          if (step < 0) nav.append(count);
        }
        figure.append(nav);
      }
      const pixel = map.latLngToContainerPoint([p.lat,p.lng]);
      frame.options.offset = L.point(0,-7);
      frame.options.autoPan = false;
      frame.options.autoPanPaddingTopLeft=L.point(...padding());
      frame.options.autoPanPaddingBottomRight=L.point(24,55);
      frame.setLatLng([p.lat,p.lng]).setContent(figure).openOn(map);
      const popup = frame.getElement();
      const cardWidth = popup.offsetWidth;
      const cardHeight = popup.offsetHeight;
      const size = map.getSize();
      const [left,top] = padding();
      const minLeft = Math.min(left, size.x - cardWidth - 8);
      const centered = pixel.x - Math.round(cardWidth / 2);
      const cardLeft = Math.max(minLeft, Math.min(centered, size.x - cardWidth - 8));
      const margin = parseFloat(getComputedStyle(popup).marginBottom) || 0;
      const above = pixel.y - cardHeight - margin - 7;
      const idealTop = above < top ? pixel.y + 12 : above;
      const cardTop = Math.max(8, Math.min(Math.max(top, idealTop), size.y - cardHeight - 12));
      frame.options.offset = L.point(cardLeft - centered, cardTop - above - 7);
      frame.update();
      frame.getElement().querySelector('.leaflet-popup-close-button')?.setAttribute('aria-label',closeLabel);
    }
    map.on('popupclose',()=>{pinned=null;});
    function render(region='', mode='places', city='') {
      siteMenu.open = false;
      selectedRegion = region;
      selectedCity = city;
      viewMode = mode;
      if (compact.matches) directory.open = false;
      if (activeOutline) map.removeLayer(activeOutline);
      activeOutline = regions.get(region);
      if (activeOutline) activeOutline.addTo(map);
      map.closePopup();
      visible.clearLayers();
      regionButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===region)));
      const regional = places.filter(p=>!region || p.pref===region);
      const key = p=>p.pref+'/'+p.city.ja;
      const options = new Map(regional.map(p=>[key(p), region ? p.city[lang] : labels[p.pref]+' · '+p.city[lang]]));
      citySelect.replaceChildren(new Option(allCities,''));
      for(const [value,label] of [...options].sort((a,b)=>a[1].localeCompare(b[1],lang))) citySelect.add(new Option(label,value));
      citySelect.value = city;
      subset = regional.filter(p=>!city || key(p)===city);
      const list = document.getElementById('place-list');
      list.replaceChildren();
      if (subset.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = {zh:'这里还没有照片。',en:'No photos here yet.',ja:'このエリアにはまだ写真がありません。'}[lang];
        list.append(empty);
      }
      document.getElementById('place-count').textContent = subset.length;
      fitView();
      for (const p of subset) {
        const marker = L.marker([p.lat,p.lng],{icon,title:p.title[lang],alt:p.title[lang],riseOnHover:true}).addTo(visible);
        marker.on('mouseover',()=>{if(matchMedia('(hover:hover)').matches)preview(p);});
        marker.on('click',()=>preview(p,true));
        marker.getElement().addEventListener('focus',()=>preview(p));
        const button = document.createElement('button');
        button.type = 'button';
        const thumb=document.createElement('img');
        thumb.src=p.photos[0].thumb; thumb.alt=''; thumb.loading='lazy';
        const text=document.createElement('span');
        text.textContent=p.title[lang];
        const pref=document.createElement('small');
        pref.textContent=labels[p.pref]+' · '+p.city[lang]; text.append(pref);
        button.append(thumb,text);
        button.onclick = () => {
          viewMode = 'place';
          if(compact.matches) directory.open=false;
          map.setView(marker.getLatLng(),Math.max(map.getZoom(),14),{animate:false});
          preview(p,true);
        };
        list.append(button);
      }
    }
    regionButtons.forEach(b=>b.onclick=()=>render(b.dataset.region));
    citySelect.onchange=()=>render(selectedRegion,'places',citySelect.value);
    document.querySelector('.atlas-country').onclick = () => render('', 'country');
    map.on('resize', () => {
      if (selectedRegion && viewMode === 'places') fitView();
    });
    render();
    const cartography = L.maplibreGL({
      pane:'atlasCartography', style:'/assets/maps/atlas-basemap.json',
      interactive:false, padding:0.05
    });
    cartography.addTo(map);
  } catch(error) {
    status.textContent = status.dataset.error;
    console.error('Photo map:',error);
  }
})();
