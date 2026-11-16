(async () => {
  const status = document.getElementById('atlas-status');
  const regionButtons = [...document.querySelectorAll('[data-region]')];
  const labels = Object.fromEntries(regionButtons.map(b => [b.dataset.region, b.textContent]));
  const codeNames = Object.fromEntries(regionButtons.filter(b=>b.dataset.code && b.dataset.code !== 'JP-13').map(b=>[b.dataset.code,b.dataset.region]));
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
      read('japan-prefectures.json'), read('photo-locations.json?v=1116-tags'), read('tokyo-23-wards.json')
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
    const topics = {
      city:      {color:'#53799b', zh:'城市风光', ja:'都市風景', en:'Cityscapes'},
      nature:    {color:'#388268', zh:'自然风光', ja:'自然風景', en:'Nature'},
      sakura:    {color:'#d67ba3', zh:'樱花', ja:'桜', en:'Cherry blossoms'},
      autumn:    {color:'#c25430', zh:'红叶', ja:'紅葉', en:'Autumn foliage'},
      hydrangea: {color:'#8970bc', zh:'紫阳花', ja:'あじさい', en:'Hydrangeas'},
      heritage:  {color:'#926943', zh:'古迹', ja:'史跡', en:'Heritage'},
      culture:   {color:'#247f91', zh:'人文', ja:'暮らし・文化', en:'Local culture'},
      portrait:  {color:'#995273', zh:'人像', ja:'ポートレート', en:'Portraits'},
      fireworks: {color:'#ad791b', zh:'花火', ja:'花火', en:'Fireworks'}
    };
    let selectedTopic = '';
    function matchingPhotos(place) {
      return selectedTopic ? place.photos.filter(photo => photo.tags?.includes(selectedTopic)) : place.photos;
    }
    // A mixed location uses its most frequent primary subject, with ties in album order.
    function primaryTopic(place) {
      const counts = new Map();
      for (const photo of place.photos) {
        const tag = photo.tags?.[0];
        if (topics[tag]) counts.set(tag, (counts.get(tag) || 0) + 1);
      }
      return [...counts].sort((a,b) => b[1] - a[1])[0]?.[0];
    }
    const placeTopics = new Map(places.map(place => [place, primaryTopic(place)]));
    let currentPlace, viewerPhotos, activeIndex, returnTo;
    const fullLabel = {zh:'查看大图',en:'View full photo',ja:'写真を拡大'}[lang];
    function displayPhoto(step=0) {
      const batch = viewerPhotos;
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
    largeImage.onerror=()=>{const thumb=viewerPhotos[activeIndex].thumb;if(largeImage.getAttribute('src')!==thumb) largeImage.src=thumb;};
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
    let viewMode = 'places';
    L.control.scale({imperial:false,position:'bottomleft'}).addTo(map);
    const icon = L.divIcon({className:'atlas-pin',iconSize:[26,26],iconAnchor:[13,13]});
    const frame = L.popup({className:'atlas-popup',maxWidth:256,autoPan:false,offset:[0,-7]});
    let pinned = null;
    function fitView() {
      let bounds;
      if (viewMode === 'country') bounds = [[24.1,122.9],[45.6,146.1]];
      else if (viewMode === 'itinerary') bounds = stops.map(place => [place.lat, place.lng]);
      else if (activeOutline) bounds = activeOutline.getBounds();
      else bounds = places.filter(place => matchingPhotos(place).length).map(place => [place.lat, place.lng]);
      if (Array.isArray(bounds) && !bounds.length) return;
      map.fitBounds(bounds, {
        paddingTopLeft:padding(), paddingBottomRight:compact.matches ? [12,56] : [18,32],
        maxZoom: viewMode === 'itinerary' ? 14 : map.getMaxZoom(), animate:false
      });
    }
    const planner = document.querySelector('.atlas-planner');
    const togglePlan = planner.querySelector('.atlas-plan-toggle');
    const itinerary = document.getElementById('atlas-itinerary');
    const enquiry = planner.querySelector('.plan-enquire');
    const enquiryPage = enquiry.href;
    const languageLinks = [...document.querySelectorAll('.atlas-panel-head a[lang]')];
    const markers = new Map();
    const routeLine = L.polyline([], {color:'#356754', weight:3, dashArray:'5 7', interactive:false});
    const actions = {
      zh: {add:'加入路线', remove:'移除', up:'上移', down:'下移', added:'已加入路线'},
      en: {add:'Add to route', remove:'Remove', up:'Move up', down:'Move down', added:'Added to route'},
      ja: {add:'ルートに追加', remove:'削除', up:'前へ', down:'後へ', added:'追加済み'}
    }[lang];
    const byPhoto = new Map(places.flatMap(place => place.photos.map(photo => [photo.id, place])));
    const requestedStops = new URLSearchParams(location.search).get('stops') || '';
    const stops = [...new Set(requestedStops.split(',').map(id => byPhoto.get(id)).filter(Boolean))];

    function withStops(href) {
      const url = new URL(href, location.href);
      if (stops.length) url.searchParams.set('stops', stops.map(place => place.photos[0].id).join(','));
      else url.searchParams.delete('stops');
      return url.href;
    }
    function drawRoute() {
      const list = planner.querySelector('.plan-stops');
      list.replaceChildren();
      for (const [index, place] of stops.entries()) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = place.title[lang];
        item.append(name);
        for (const [key, symbol] of [['up','↑'], ['down','↓'], ['remove','×']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = symbol;
          button.setAttribute('aria-label', actions[key] + ' · ' + place.title[lang]);
          button.disabled = (key === 'up' && index === 0) || (key === 'down' && index === stops.length - 1);
          button.onclick = () => {
            stops.splice(index, 1);
            if (key !== 'remove') stops.splice(index + (key === 'up' ? -1 : 1), 0, place);
            map.closePopup();
            drawRoute();
            (list.children[Math.min(index, stops.length - 1)]?.querySelector('button:not(:disabled)') || togglePlan).focus();
          };
          item.append(button);
        }
        list.append(item);
      }
      planner.querySelector('.plan-hint').hidden = stops.length > 0;
      planner.querySelector('.plan-count').textContent = stops.length ? String(stops.length) : '';
      enquiry.hidden = stops.length === 0;
      enquiry.href = withStops(enquiryPage);
      languageLinks.forEach(link => {link.href = withStops(link.href);});
      const nextUrl = withStops(location.href);
      if (nextUrl !== location.href) history.replaceState(history.state, '', nextUrl);
      routeLine.setLatLngs(stops.map(place => [place.lat, place.lng]));
      for (const [place, marker] of markers) {
        const element = marker.getElement();
        const index = stops.indexOf(place);
        if (index < 0) delete element.dataset.stop;
        else element.dataset.stop = String(index + 1);
      }
    }
    function showPlanner(open) {
      itinerary.hidden = !open;
      togglePlan.setAttribute('aria-expanded', String(open));
      map.closePopup();
      if (open && compact.matches) directory.open = false;
    }
    togglePlan.onclick = () => showPlanner(itinerary.hidden);
    const googleMapsLabel = {zh:'在 Google 地图中打开', ja:'Google マップで開く', en:'Open in Google Maps'}[lang];
    function preview(p, pin=false) {
      if (!pin && pinned) return;
      const photos = matchingPhotos(p);
      if (!photos.length) return;
      if (pin) pinned = p;
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      let index = 0;
      img.src = photos[index].thumb;
      img.alt = '';
      const caption = document.createElement('figcaption');
      caption.textContent = p.title[lang];
      const region = document.createElement('small');
      region.textContent = labels[p.pref]+' · '+p.city[lang];
      caption.prepend(region);
      const tagLine = document.createElement('span');
      tagLine.className = 'atlas-photo-tags';
      function updateTags() {
        tagLine.replaceChildren();
        for (const key of photos[index].tags || []) {
          const topic = topics[key];
          if (!topic) continue;
          const label = document.createElement('span');
          label.style.setProperty('--topic-color', topic.color);
          label.textContent = topic[lang];
          tagLine.append(label);
        }
      }
      updateTags();
      caption.append(tagLine);
      const expand = document.createElement('button');
      expand.type='button';
      expand.className='atlas-expand';
      expand.setAttribute('aria-label',fullLabel);
      expand.append(img);
      const badge = document.createElement('span');
      badge.textContent = fullLabel+' ⤢';
      expand.append(badge);
      expand.onclick=()=>{
        currentPlace=p; viewerPhotos=photos; activeIndex=index; returnTo=expand; pinned=p;
        viewer.querySelector('h2').textContent=p.title[lang];
        displayPhoto(); viewer.showModal(); viewer.querySelector('.viewer-close').focus();
      };
      figure.append(expand,caption);
      if (itinerary.hidden) {
        const mapsLink = document.createElement('a');
        mapsLink.className = 'atlas-maps-link';
        mapsLink.href = 'https://www.google.com/maps/search/?' + new URLSearchParams({
          api: '1', query: [p.lat, p.lng].join(',')
        });
        mapsLink.target = '_blank';
        mapsLink.rel = 'noopener noreferrer';
        mapsLink.textContent = googleMapsLabel;
        caption.append(mapsLink);
      }
      if (photos.length > 1) {
        const nav = document.createElement('div');
        nav.className = 'atlas-photo-controls';
        const count = document.createElement('span');
        count.textContent = '1 / ' + photos.length;
        for (const [step, label] of [[-1,captions[0]],[1,captions[1]]]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = step < 0 ? '‹' : '›';
          button.setAttribute('aria-label',label);
          button.onclick = () => {
            pinned = p;
            index = (index + step + photos.length) % photos.length;
            img.src = photos[index].thumb;
            updateTags();
            frame.update();
            count.textContent = (index+1) + ' / ' + photos.length;
          };
          nav.append(button);
          if (step < 0) nav.append(count);
        }
        figure.append(nav);
      }
      if (!itinerary.hidden) {
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'atlas-add-stop';
        add.disabled = stops.includes(p);
        add.textContent = add.disabled ? actions.added : '+ ' + actions.add;
        add.onclick = () => {
          if (!stops.includes(p)) stops.push(p);
          drawRoute();
          map.closePopup();
          togglePlan.focus({preventScroll:true});
        };
        figure.append(add);
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
    const search = document.querySelector('#atlas-search');
    const list = document.getElementById('place-list');
    const normalize = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const regionTerms = new Map(regionButtons.map(button => [button.dataset.region, button.dataset.names]));
    const searchText = new Map(places.map(place => [place, normalize([
      ...Object.values(place.title), ...Object.values(place.city), place.pref, regionTerms.get(place.pref)
    ].join(' '))]));
    function selectRegion(region) {
      selectedRegion = region;
      if (activeOutline) map.removeLayer(activeOutline);
      activeOutline = regions.get(region);
      if (activeOutline) activeOutline.addTo(map);
      regionButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.region===region)));
    }
    function updateList() {
      const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
      const subset = places.filter(place =>
        matchingPhotos(place).length && (!selectedRegion || place.pref === selectedRegion) &&
        terms.every(term => searchText.get(place).includes(term))
      );
      list.replaceChildren();
      list.scrollTop = 0;
      if (subset.length === 0) {
        const empty = document.createElement('p');
        empty.textContent = {zh:'没有找到匹配的取景地。',en:'No matching photo spots.',ja:'一致する撮影地がありません。'}[lang];
        list.append(empty);
      }
      document.getElementById('place-count').textContent = subset.length;
      for (const p of subset) {
        const button = document.createElement('button');
        button.type = 'button';
        const thumb=document.createElement('img');
        thumb.src=matchingPhotos(p)[0].thumb; thumb.alt=''; thumb.loading='lazy';
        const text=document.createElement('span');
        text.textContent=p.title[lang];
        const pref=document.createElement('small');
        pref.textContent=labels[p.pref]+' · '+p.city[lang]; text.append(pref);
        button.append(thumb,text);
        button.onclick = () => {
          viewMode = 'place';
          if(compact.matches) directory.open=false;
          map.setView([p.lat, p.lng],Math.max(map.getZoom(),14),{animate:false});
          preview(p,true);
        };
        list.append(button);
      }
    }
    function render(region='', mode='places') {
      siteMenu.open = false;
      viewMode = mode;
      search.value = '';
      if (compact.matches) directory.open = false;
      selectRegion(region);
      map.closePopup();
      updateList();
      fitView();
    }
    search.oninput = () => {
      if (selectedRegion) selectRegion('');
      map.closePopup();
      directory.open = true;
      updateList();
    };
    search.onfocus = () => { if (search.value) directory.open = true; };
    search.onkeydown = event => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter' && search.value.trim()) {
        event.preventDefault();
        const first = list.querySelector('button');
        if (first) { search.blur(); first.click(); }
      }
    };
    search.hidden = false;
    regionButtons.forEach(b=>b.onclick=()=>render(b.dataset.region));
    document.querySelector('.atlas-country').onclick = () => render('', 'country');
    map.on('resize', () => {
      if (selectedRegion && viewMode === 'places') fitView();
    });
    const topicBar = document.querySelector('.atlas-topics');
    function updateMarker(place, pin) {
      pin.hidden = matchingPhotos(place).length === 0;
      const topic = topics[selectedTopic || placeTopics.get(place)];
      pin.style.setProperty('--topic-color', topic?.color || '#61756a');
      const label = topic ? place.title[lang] + ' · ' + topic[lang] : place.title[lang];
      pin.title = label;
      pin.setAttribute('aria-label', label);
    }
    for (const [key, topic] of Object.entries(topics)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.topic = key;
      button.setAttribute('aria-pressed', 'false');
      button.style.setProperty('--topic-color', topic.color);
      button.textContent = topic[lang];
      topicBar.append(button);
    }
    topicBar.addEventListener('click', event => {
      const button = event.target.closest('button[data-topic]');
      if (!button || selectedTopic === button.dataset.topic) return;
      selectedTopic = button.dataset.topic;
      for (const option of topicBar.querySelectorAll('button')) {
        option.setAttribute('aria-pressed', String(option === button));
      }
      map.closePopup();
      for (const [place, marker] of markers) updateMarker(place, marker.getElement());
      updateList();
      if (!selectedRegion && !search.value.trim()) {
        viewMode = 'places';
        fitView();
      }
    });
    topicBar.hidden = false;
    render();
    // A touch can focus a pin before its click. Opening the card at that
    // moment can redirect the rest of the tap to the photo or the map.
    let touchFocus = false;
    document.addEventListener('pointerdown', event => {
      touchFocus = event.pointerType === 'touch' || event.pointerType === 'pen';
    }, true);
    document.addEventListener('keydown', () => { touchFocus = false; }, true);
    for (const place of places) {
      const title = place.title[lang];
      const marker = L.marker([place.lat, place.lng], {icon, title, alt: title, riseOnHover: true}).addTo(map);
      markers.set(place, marker);
      const pin = marker.getElement();
      updateMarker(place, pin);
      pin.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') preview(place);
      });
      marker.on('click', () => preview(place, true));
      pin.addEventListener('focus', () => {
        if (!touchFocus) preview(place);
      });
    }
    routeLine.addTo(map);
    planner.hidden = false;
    showPlanner(stops.length > 0);
    drawRoute();
    if (stops.length) viewMode = 'itinerary';
    fitView();
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
