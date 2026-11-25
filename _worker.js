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
    if (pathname.startsWith('/api/comments')) {
      try { return await handleComments(request, env); }
      catch { return new Response(JSON.stringify({error:'unavailable'}), {status:503, headers:{'Content-Type':'application/json','Cache-Control':'no-store'}}); }
    }
    if (pathname.startsWith('/atlas-admin/')) return env.ASSETS.fetch(request);
    const legacy = pathname.match(/^\/(zh|en|ja)\/portfolio\/map(?:\/index\.html|\/)?$/);
    if (legacy) return Response.redirect(atlas + entry(legacy[1]) + search, 301);
    if (origin !== atlas) {
      return env.ASSETS.fetch(request);
    }
    function document(body, type) {
      return new Response(request.method === 'HEAD' ? null : body, {headers: {'Content-Type': type + '; charset=utf-8'}});
    }
    const atlasIcon = {'/favicon.ico':'map-20261125.ico','/favicon.png':'map-20261125-48.png','/apple-touch-icon.png':'map-20261125-180.png'}[pathname];
    if (atlasIcon) return env.ASSETS.fetch(new Request(site + '/assets/icons/' + atlasIcon, {method:request.method}));
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

// Place comments: public reads expose approved entries only. D1 and secrets are
// deliberately optional until configured; writes fail closed on a static host.
export async function handleComments(request, env) {
  const url = new URL(request.url), path = url.pathname;
  const local = env.COMMENTS_LOCAL === true && ['127.0.0.1','localhost'].includes(url.hostname);
  const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  const fail = (code,status) => json({error:code},status);
  const admin = path.startsWith('/api/comments/admin');
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return fail('origin',403);
  if (!['GET','POST','PATCH'].includes(request.method)) return fail('method',405);
  const ready=!!(env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET && env.COMMENTS_RATE_SECRET?.length >= 32 && env.COMMENTS_ADMIN_TOKEN?.length >= 32);
  if (path === '/api/comments/config' && request.method === 'GET') return json({available:!!env.COMMENTS_DB && (local || ready),local,siteKey:local?'':env.TURNSTILE_SITE_KEY||''});
  if (!env.COMMENTS_DB) return fail('unavailable',503);
  if (admin) {
    const supplied = request.headers.get('Authorization') || '';
    if (local) { if (request.headers.get('X-Atlas-Admin') !== 'local-preview') return fail('unauthorized',401); }
    else {
      if (!env.COMMENTS_ADMIN_TOKEN || env.COMMENTS_ADMIN_TOKEN.length < 32) return fail('unavailable',503);
      const digest = async s => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
      const [a,b]=await Promise.all([digest(supplied),digest('Bearer '+env.COMMENTS_ADMIN_TOKEN)]);
      if (a.some((v,i)=>v!==b[i])) return fail('unauthorized',401);
    }
  }
  const db=env.COMMENTS_DB;
  if (path === '/api/comments/admin' && request.method === 'GET') {
    const status=url.searchParams.get('status')||'pending';
    if (!['pending','approved','rejected'].includes(status)) return fail('invalid',400);
    const before=url.searchParams.get('before')||'9999';
    const {results}=await db.prepare('SELECT * FROM comments WHERE status=? AND created_at<? ORDER BY created_at DESC LIMIT 51').bind(status,before).all();
    return json({comments:results.slice(0,50),next:results.length>50?results[49].created_at:null});
  }
  if (path === '/api/comments' && request.method === 'GET') {
    const place=url.searchParams.get('place')||'';
    if (!/^P-[A-F0-9]{10}$/.test(place)) return fail('invalid',400);
    const {results}=await db.prepare("SELECT id,nickname,body,reply,created_at FROM comments WHERE place_id=? AND status='approved' ORDER BY created_at DESC LIMIT 50").bind(place).all();
    return json({comments:results});
  }
  if (!['POST','PATCH'].includes(request.method)) return fail('not_found',404);
  if (origin !== url.origin || !request.headers.get('Content-Type')?.startsWith('application/json')) return fail('origin',403);
  let payload;
  try {
    const reader=request.body?.getReader(); let size=0,parts=[];
    if (!reader) return fail('invalid',400);
    for (;;) { const {done,value}=await reader.read(); if(done)break;size+=value.length;if(size>12000){await reader.cancel();return fail('too_long',413);}parts.push(value); }
    const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
    payload=JSON.parse(new TextDecoder().decode(bytes));
  } catch { return fail('invalid',400); }
  if (!payload || typeof payload!=='object' || Array.isArray(payload)) return fail('invalid',400);
  const valid=(v,min,max)=>typeof v==='string' && [...v.trim()].length>=min && [...v.trim()].length<=max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v);
  const now=new Date().toISOString();
  if (admin && request.method==='PATCH') {
    const id=path.split('/').pop();
    if (!/^[a-f0-9-]{36}$/.test(id) || !['pending','approved','rejected'].includes(payload.status) || !valid(payload.reply,0,1000)) return fail('invalid',400);
    const result=await db.prepare('UPDATE comments SET status=?,reply=?,updated_at=? WHERE id=?').bind(payload.status,payload.reply.trim(),now,id).run();
    return result.meta.changes?json({ok:true}):fail('not_found',404);
  }
  if (path!=='/api/comments' || request.method!=='POST') return fail('not_found',404);
  if (!local && !ready) return fail('unavailable',503);
  if (payload.consent !== true || !valid(payload.nickname,1,40)||!valid(payload.body,3,1000)||!['zh','en','ja'].includes(payload.lang)||!/^P-[A-F0-9]{10}$/.test(payload.placeId)||!/^[a-f0-9-]{36}$/.test(payload.id)) return fail('invalid',400);
  if (payload.website) return fail('invalid',400);
  const source=await env.ASSETS.fetch(new Request(url.origin+'/assets/maps/photo-locations.json'));
  if (!source.ok) return fail('unavailable',503);
  const places=await source.json();
  if (!places.some(p=>(p.commentKey||p.photos[0]?.id)===payload.placeId)) return fail('invalid_place',400);
  if (!local) {
    if (!valid(payload.token,1,2048)) return fail('verification',403);
    let verification;
    try { verification=await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:payload.token,remoteip:request.headers.get('CF-Connecting-IP')||''}),signal:AbortSignal.timeout(8000)})).json(); }
    catch { return fail('verification',503); }
    if (!verification.success || verification.hostname!==url.hostname || verification.action!=='place-comment') return fail('verification',403);
  }
  const previous=await db.prepare('SELECT place_id,nickname,body FROM comments WHERE id=?').bind(payload.id).first();
  if (previous) return previous.place_id===payload.placeId && previous.nickname===payload.nickname.trim() && previous.body===payload.body.trim()?json({status:'pending'},202):fail('conflict',409);
  const ip=request.headers.get('CF-Connecting-IP')||'local';
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode((env.COMMENTS_RATE_SECRET||'local')+ip)))).map(v=>v.toString(16).padStart(2,'0')).join('');
  const epoch=Math.floor(Date.now()/1000),key=hash+':'+Math.floor(epoch/3600);
  const limit=await db.prepare('INSERT INTO comment_limits(key,hits,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key,epoch+7200).first();
  if (limit.hits>5) return fail('rate_limit',429);
  await db.prepare('DELETE FROM comment_limits WHERE expires<?').bind(epoch).run();
  await db.prepare('INSERT INTO comments(id,place_id,nickname,body,lang,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(payload.id,payload.placeId,payload.nickname.trim(),payload.body.trim(),payload.lang,now,now).run();
  return json({status:'pending'},202);
}
