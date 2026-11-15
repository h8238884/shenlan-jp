(function () {
  const field = document.getElementById('route');
  if (!field) return;
  const allowed = Array.from(field.options).map(option => option.value);
  const requested = new URLSearchParams(window.location.search).get('route');
  if (requested && allowed.includes(requested)) field.value = requested;
  const lang = document.documentElement.lang.split('-')[0];
  const stopIds = [...new Set((new URLSearchParams(location.search).get('stops') || '')
    .split(',').filter(id => /^P-[0-9A-F]{10}$/.test(id)))];
  const itinerary = document.querySelector('.booking-itinerary');
  let itinerarySummary = '';
  if (stopIds.length && itinerary) {
    const edit = itinerary.querySelector('a');
    const mapUrl = new URL(edit.href);
    mapUrl.searchParams.set('stops', stopIds.join(','));
    edit.href = mapUrl.href;
    const publicMap = new URL(lang === 'zh' ? '/' : '/' + lang + '/', 'https://map.shenlan.jp');
    publicMap.search = mapUrl.search;
    const heading = itinerary.querySelector('h3').textContent;
    itinerarySummary = heading + '\n' + publicMap.href;
    itinerary.hidden = false;
    field.closest('.field').hidden = true;
    const status = itinerary.querySelector('[role="status"]');
    const loading = {zh:'正在读取地点…', en:'Loading stops…', ja:'撮影地を読み込み中…'};
    const unavailable = {zh:'部分地点暂时无法读取，可返回地图核对。', en:'Some stops could not be loaded. Check your route on the map.', ja:'一部の撮影地を読み込めません。地図でルートをご確認ください。'};
    status.textContent = loading[lang];
    fetch('/assets/maps/photo-locations.json?v=1115n')
      .then(response => {
        if (!response.ok) throw new Error('locations');
        return response.json();
      })
      .then(places => {
        const byPhoto = new Map(places.flatMap(place => place.photos.map(photo => [photo.id, place])));
        const names = [];
        for (const id of stopIds) {
          const place = byPhoto.get(id);
          if (!place) continue;
          const name = place.title[lang] + ' · ' + place.city[lang];
          const row = document.createElement('li');
          row.textContent = name;
          itinerary.querySelector('ol').append(row);
          names.push(name);
        }
        status.textContent = names.length === stopIds.length ? '' : unavailable[lang];
        itinerarySummary = [heading, ...names.map((name, i) => (i + 1) + '. ' + name), publicMap.href].join('\n');
      })
      .catch(() => { status.textContent = unavailable[lang]; });
  }
  window.shenlanRouteSummary = function () {
    if (itinerarySummary) return itinerarySummary;
    if (!field.value) return '';
    return field.dataset.summaryLabel + ': ' + field.options[field.selectedIndex].textContent;
  };
  function updateLanguageLinks() {
    document.querySelectorAll('.lang a, [data-mobile-panel] a.pill, a[lang]').forEach(link => {
      const url = new URL(link.getAttribute('href'), window.location.origin);
      if (!/^\/(zh|en|ja)\/book\/$/.test(url.pathname)) return;
      if (stopIds.length) url.searchParams.set('stops', stopIds.join(','));
      if (field.value) url.searchParams.set('route', field.value);
      else url.searchParams.delete('route');
      link.setAttribute('href', url.pathname + url.search);
    });
  }
  field.addEventListener('change', updateLanguageLinks);
  updateLanguageLinks();
})();
