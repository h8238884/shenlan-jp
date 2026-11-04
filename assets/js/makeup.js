(function () {
  'use strict';
  const gallery = document.querySelector('[data-makeup-gallery]');
  if (!gallery) return;
  const works = Array.from(gallery.querySelectorAll('[data-makeup-work]'));
  const filters = Array.from(document.querySelectorAll('[data-makeup-filter]'));
  const count = document.querySelector('[data-makeup-count]');
  const dialog = document.querySelector('[data-makeup-dialog]');
  const picture = dialog.querySelector('[data-makeup-picture]');
  const title = dialog.querySelector('[data-makeup-title]');
  const code = dialog.querySelector('[data-makeup-code]');
  const position = dialog.querySelector('[data-makeup-position]');
  const inquiry = dialog.querySelector('[data-makeup-inquiry]');
  let visible = works.slice();
  let current = 0;
  let opener;

  function show(index) {
    current = (index + visible.length) % visible.length;
    const button = visible[current].querySelector('button');
    picture.src = button.dataset.full;
    picture.alt = button.dataset.title;
    title.textContent = button.dataset.title;
    code.textContent = '大米粥 / ' + button.dataset.code;
    position.textContent = (current + 1) + ' / ' + visible.length;
    const url = new URL(inquiry.dataset.booking, window.location.origin);
    url.searchParams.set('service', 'makeup');
    url.searchParams.set('artist', 'damizhou');
    url.searchParams.set('look', button.dataset.code);
    inquiry.href = url.pathname + url.search;
  }

  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.makeupFilter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    works.forEach(work => { work.hidden = category !== 'all' && work.dataset.category !== category; });
    visible = works.filter(work => !work.hidden);
    count.textContent = count.dataset.template.replace('{count}', visible.length).replace('{total}', works.length);
  }));

  works.forEach(work => work.querySelector('button').addEventListener('click', event => {
    opener = event.currentTarget;
    show(visible.indexOf(work));
    dialog.showModal();
  }));
  dialog.querySelector('[data-makeup-close]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-makeup-prev]').addEventListener('click', () => show(current - 1));
  dialog.querySelector('[data-makeup-next]').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => { if (opener) opener.focus({ preventScroll: true }); });
})();
