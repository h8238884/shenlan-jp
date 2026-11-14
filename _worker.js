// The same Pages project serves the main site and a small, localized photo atlas.
const site = 'https://shenlan.jp';
const atlas = 'https://map.shenlan.jp';
const entry = lang => lang === 'zh' ? '/' : '/' + lang + '/';
const langs = ['zh', 'en', 'ja'];
const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  langs.map(lang => '<url><loc>' + atlas + entry(lang) + '</loc></url>').join('') + '</urlset>';

export default {
  async fetch(request, env) {
    const {origin, pathname, search} = new URL(request.url);
    const legacy = pathname.match(/^\/(zh|en|ja)\/portfolio\/map(?:\/index\.html|\/)?$/);
    if (legacy) return Response.redirect(atlas + entry(legacy[1]) + search, 301);
    if (origin !== atlas) {
      return env.ASSETS.fetch(request);
    }
    function document(body, type) {
      return new Response(request.method === 'HEAD' ? null : body, {headers: {'Content-Type': type + '; charset=utf-8'}});
    }
    if (pathname === '/robots.txt') return document('User-agent: *\nAllow: /\nSitemap: '+atlas+'/sitemap.xml\n', 'text/plain');
    if (pathname === '/sitemap.xml') return document(xml, 'application/xml');
    const page = pathname.match(/^\/(zh|en|ja)(?:\/index\.html|\/)?$/);
    if (pathname === '/' || page) {
      const lang = page ? page[1] : 'zh';
      if (pathname !== entry(lang)) return Response.redirect(atlas + entry(lang) + search, 301);
      const source = await env.ASSETS.fetch(new Request(site + '/' + lang + '/portfolio/map/', {method: 'GET'}));
      if (!source.ok) return source;
      if (request.method === 'HEAD') return document(null,'text/html');
      return new HTMLRewriter().on('a[href]', {
        element(el) {
          const href = el.getAttribute('href');
          const other = href.match(/^\/(zh|en|ja)\/portfolio\/map\/$/);
          if (other) el.setAttribute('href',entry(other[1]));
          else if (/^\/(zh|en|ja)\//.test(href)) el.setAttribute('href',site+href);
        }
      }).transform(source);
    }
    return Response.redirect(site + pathname + search, 301);
  }
};
