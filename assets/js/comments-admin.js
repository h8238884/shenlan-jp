(() => {
 const $=s=>document.querySelector(s);let local=false,token='',next=null,places=[],epoch=0;
 const status=$('#notice');
 const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e};
 async function api(path,options={}){const r=await fetch('/api/comments'+path,{...options,headers:{'Content-Type':'application/json',...(local?{'X-Atlas-Admin':'local-preview'}:{Authorization:'Bearer '+token})}});const d=await r.json();if(!r.ok)throw Error(d.error==='unauthorized'?'管理密钥无效或已退出。':d.error==='unavailable'?'服务尚未配置，请先连接留言数据库。':'操作失败，请重试。');return d;}
 async function load(more=false){const seq=++epoch;status.textContent='正在读取…';$('#more').disabled=true;try{
  const selected=$('#status').value;
  const data=await api('/admin?status='+selected+(more&&next?'&before='+encodeURIComponent(next):''));if(seq!==epoch)return;
  if(!more)$('#items').replaceChildren();
  for(const c of data.comments){const article=document.createElement('article'),p=places.find(p=>(p.commentKey||p.photos[0]?.id)===c.place_id);article.append(text('h2',p?.title.zh||c.place_id),text('small',c.nickname+' · '+new Date(c.created_at).toLocaleString()+' · '+c.lang),text('p',c.body));
   const label=text('label','摄影师回复（随已公开留言一起显示）'),reply=document.createElement('textarea');reply.value=c.reply;reply.maxLength=1000;label.append(reply);article.append(label);
   const actions=document.createElement('div');actions.className='actions';
   for(const [state,caption]of [['approved','批准并公开'],['rejected','不公开'],['pending','退回待审核']]){const button=text('button',caption);button.dataset.state=state;button.onclick=async()=>{actions.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent='保存中…';try{await api('/admin/'+c.id,{method:'PATCH',body:JSON.stringify({status:state,reply:reply.value})});await load();status.textContent='已保存。'}catch(e){status.textContent=e.message;actions.querySelectorAll('button').forEach(b=>b.disabled=false)}};actions.append(button);}
   article.append(actions);$('#items').append(article);
  }
  next=data.next;$('#more').hidden=!next;status.textContent=$('#items').children.length?'仅批准的留言和回复会出现在地图上。':'这个状态下暂无留言。';
 }catch(e){if(seq===epoch)status.textContent=e.message;}finally{$('#more').disabled=false;}}
 $('#login').onsubmit=e=>{e.preventDefault();token=e.target.elements.token.value.trim();e.target.elements.token.value='';$('#login').hidden=true;$('#admin').hidden=false;load()};
 $('#status').onchange=()=>load();$('#refresh').onclick=()=>load();$('#more').onclick=()=>load(true);
 $('#logout').onclick=()=>{epoch++;token='';$('#items').replaceChildren();$('#admin').hidden=true;$('#login').hidden=false;status.textContent='已退出。';};
 (async()=>{try{const config=await api('/config');local=config.local;places=await(await fetch('/assets/maps/photo-locations.json')).json();$('#mode').textContent=local?'本地试用：仅管理本机留言，不影响线上网站。':'正式留言审核：请使用管理密钥登录。';if(local){$('#login').hidden=true;$('#admin').hidden=false;load();}else if(!config.available)status.textContent='后端未配置，暂不能接收留言。';}catch{status.textContent='无法连接留言服务。';}})();
})();
