// Read the visitor's wall clock before the map or its stylesheet renders.
(() => {
  let timer;
  const root = document.documentElement;
  const chromeColor = document.querySelector('meta[name="theme-color"]');
  function sync() {
    const now = new Date();
    const hour = now.getHours();
    const theme = hour >= 6 && hour < 18 ? 'light' : 'dark';
    if (root.dataset.atlasTheme !== theme) {
      root.dataset.atlasTheme = theme;
      chromeColor.content = theme === 'dark' ? '#17252b' : '#e4eef0';
      document.dispatchEvent(new Event('atlas-theme-change'));
    }
    clearTimeout(timer);
    // Check at the next local minute, including after a device time zone change.
    if (!document.hidden) timer = setTimeout(sync, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
  }
  sync();
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('focus', sync);
})();
