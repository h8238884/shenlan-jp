(function () {
  const field = document.getElementById('route');
  if (!field) return;
  const allowed = Array.from(field.options).map(option => option.value);
  const requested = new URLSearchParams(window.location.search).get('route');
  if (requested && allowed.includes(requested)) field.value = requested;
  window.shenlanRouteSummary = function () {
    if (!field.value) return '';
    return field.dataset.summaryLabel + ': ' + field.options[field.selectedIndex].textContent;
  };
  function updateLanguageLinks() {
    document.querySelectorAll('.lang a, [data-mobile-panel] a.pill').forEach(link => {
      const url = new URL(link.getAttribute('href'), window.location.origin);
      if (!/^\/(zh|en|ja)\/book\/$/.test(url.pathname)) return;
      if (field.value) url.searchParams.set('route', field.value);
      else url.searchParams.delete('route');
      link.setAttribute('href', url.pathname + url.search);
    });
  }
  field.addEventListener('change', updateLanguageLinks);
  updateLanguageLinks();
})();
