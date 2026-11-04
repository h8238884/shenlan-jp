(function () {
  'use strict';
  const fieldset = document.querySelector('[data-booking-services]');
  if (!fieldset) return;
  const inputs = Array.from(fieldset.querySelectorAll('input[name="service"]'));
  const allowed = new Set(inputs.map(input => input.value));
  const params = new URLSearchParams(window.location.search);
  const flowerReference = /^M20-(?:0[1-9]|1[0-9]|2[0-4])$/.test(params.get('flower') || '') ? params.get('flower') : '';
  const makeupReference = /^DMZ-(?:0[1-9]|1[0-8])$/.test(params.get('look') || '') ? params.get('look') : '';
  const hasMakeupArtist = params.get('artist') === 'damizhou' || Boolean(makeupReference);
  const dressReference = /^PS-(?:0[1-9]|1[0-2])$/.test(params.get('dress') || '') ? params.get('dress') : '';
  const hasDressBoutique = params.get('boutique') === 'purestudio' || Boolean(dressReference);
  const requested = params.getAll('service').flatMap(value => value.split(',')).filter(value => allowed.has(value));
  if (flowerReference && !requested.includes('flowers')) requested.push('flowers');
  if (hasMakeupArtist && !requested.includes('makeup')) requested.push('makeup');
  if (hasDressBoutique && !requested.includes('dress')) requested.push('dress');
  const status = fieldset.querySelector('[data-service-status]');
  inputs.forEach(input => { if (requested.includes(input.value)) input.checked = true; });

  function selected() { return inputs.filter(input => input.checked); }
  function namesWithReference() {
    return selected().map(input => {
      if (input.value === 'dress' && hasDressBoutique) return input.dataset.label + ' (PURESTUDIO' + (dressReference ? ' · ' + dressReference : '') + ')';
      if (input.value === 'flowers' && flowerReference) return input.dataset.label + ' (M-20 FLOWER · ' + flowerReference + ')';
      if (input.value === 'makeup' && hasMakeupArtist) return input.dataset.label + ' (大米粥 / Damizhou' + (makeupReference ? ' · ' + makeupReference : '') + ')';
      return input.dataset.label;
    });
  }
  window.shenlanServiceSummary = function () {
    const names = namesWithReference();
    return names.length ? fieldset.dataset.summaryLabel + ': ' + names.join(' / ') : '';
  };

  function update() {
    const names = namesWithReference();
    status.textContent = names.length ? fieldset.dataset.selectedLabel + ': ' + names.join(' / ') : '';
    document.querySelectorAll('.lang a, [data-mobile-panel] a.pill').forEach(link => {
      const url = new URL(link.getAttribute('href'), window.location.origin);
      if (!/^\/(zh|en|ja)\/book\/$/.test(url.pathname)) return;
      url.searchParams.delete('service');
      selected().forEach(input => url.searchParams.append('service', input.value));
      if (flowerReference && selected().some(input => input.value === 'flowers')) url.searchParams.set('flower', flowerReference);
      else url.searchParams.delete('flower');
      if (hasDressBoutique && selected().some(input => input.value === 'dress')) {
        url.searchParams.set('boutique', 'purestudio');
        if (dressReference) url.searchParams.set('dress', dressReference);
        else url.searchParams.delete('dress');
      } else {
        url.searchParams.delete('boutique');
        url.searchParams.delete('dress');
      }
      if (hasMakeupArtist && selected().some(input => input.value === 'makeup')) {
        url.searchParams.set('artist', 'damizhou');
        if (makeupReference) url.searchParams.set('look', makeupReference);
        else url.searchParams.delete('look');
      } else {
        url.searchParams.delete('artist');
        url.searchParams.delete('look');
      }
      link.setAttribute('href', url.pathname + url.search);
    });
  }
  inputs.forEach(input => input.addEventListener('change', update));
  update();
})();
