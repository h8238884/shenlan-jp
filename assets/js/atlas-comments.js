(() => {
  const lang=document.documentElement.lang;
  const strings={
    zh:{entry:'地点留言',title:'取景地留言',intro:'分享拍摄体验、近期花况或交通提醒，也欢迎反馈位置问题。',nickname:'昵称',body:'留言',hint:'昵称和留言审核后公开，请勿填写电话、微信或其他私人信息。每条 3–1000 字。',send:'提交留言',sending:'正在提交…',pending:'已收到，审核通过后会显示在这里。',empty:'这里还没有公开留言，欢迎留下你的拍摄发现。',loading:'正在读取留言…',error:'暂时无法加载，请稍后重试。',unavailable:'留言功能尚未启用，请通过预约页面联系摄影师。',local:'本地试用 · 留言仅保存在本机，审核后才显示。',reply:'摄影师回复 · SHENLAN',close:'关闭留言',retry:'重新加载',recent:'最近公开的留言',rate:'留言太频繁，请一小时后再试。',verify:'请完成防刷验证后再提交。',invalid:'请检查昵称和留言长度。',consent:'我同意昵称和留言审核后公开展示。',contact:'预约与咨询 ↗'},
    en:{entry:'Place notes',title:'Notes from this place',intro:'Share photo tips, seasonal conditions, access updates or a location correction.',nickname:'Name',body:'Your note',hint:'Your name and note become public after review. Do not include private contact details. 3–1000 characters.',send:'Submit for review',sending:'Submitting…',pending:'Received. Your note will appear after approval.',empty:'No published notes yet. Share your discoveries from this place.',loading:'Loading notes…',error:'Unable to load notes. Please try again.',unavailable:'Notes are not available yet. Please contact the photographer through the booking page.',local:'Local preview · Notes are saved on this computer and appear after approval.',reply:'Photographer reply · SHENLAN',close:'Close notes',retry:'Reload',recent:'Recent published notes',rate:'Too many submissions. Please try again in an hour.',verify:'Please complete the verification before submitting.',invalid:'Please check your name and note length.',consent:'I agree to publish my name and note after review.',contact:'Booking & enquiries ↗'},
    ja:{entry:'撮影地のコメント',title:'撮影地のコメント',intro:'撮影の感想、花の様子、アクセス情報、位置の訂正などをお寄せください。',nickname:'ニックネーム',body:'コメント',hint:'お名前とコメントは確認後に公開します。連絡先などの個人情報は入力しないでください。3〜1000文字。',send:'確認用に送信',sending:'送信中…',pending:'受け付けました。確認・承認後に公開されます。',empty:'公開されたコメントはまだありません。撮影地での発見をお聞かせください。',loading:'読み込み中…',error:'読み込めませんでした。再度お試しください。',unavailable:'コメント機能は準備中です。予約ページからお問い合わせください。',local:'ローカル試用版 · このパソコンに保存し、承認後に表示します。',reply:'撮影者からの返信 · SHENLAN',close:'閉じる',retry:'再読み込み',recent:'最近の公開コメント',rate:'送信回数が多すぎます。1時間後にお試しください。',verify:'認証を完了してから送信してください。',invalid:'お名前とコメントの文字数をご確認ください。',consent:'確認後にお名前とコメントが公開されることに同意します。',contact:'予約・お問い合わせ ↗'}
  };
  const privacy={
    zh:['留言与隐私说明','留言由 SHENLAN 审核，使用 Cloudflare 保存和防刷验证；通过后公开昵称、留言、日期及回复。记录保留至管理员移除。需要更正或撤回，请邮件联系 no070809@gmail.com 并提供地点、昵称与日期。留言不代表预约确认。','查看隐私说明'],
    en:['Notes & privacy','SHENLAN reviews notes using Cloudflare storage and bot protection. Approved names, notes, dates and replies are public. Records remain until removed by the operator. For correction or removal, email no070809@gmail.com with the place, name and date. Notes do not confirm bookings.','Read privacy notice'],
    ja:['コメントとプライバシー','SHENLAN が内容を確認し、Cloudflare の保存・不正送信防止機能を利用します。承認後は名前、本文、日付、返信を公開します。記録は管理者が削除するまで保存されます。訂正・削除は場所、名前、日付を添えて no070809@gmail.com へご連絡ください。コメントは予約確定ではありません。','プライバシーについて']
  }[lang]||[];
  const t=strings[lang]||strings.en;
  const dialog=document.createElement('dialog');dialog.id='atlas-comments';dialog.setAttribute('aria-labelledby','comments-title');
  dialog.innerHTML=`<header><div><small>${t.title}</small><h2 id="comments-title"></h2></div><button type="button" class="comments-close" aria-label="${t.close}">×</button></header><p>${t.intro}</p><p class="comments-local" hidden>${t.local}</p><section class="comments-list" aria-label="${t.recent}"></section><button type="button" class="comments-retry" hidden>${t.retry}</button><form class="comments-form"><label>${t.nickname}<input name="nickname" required maxlength="40" autocomplete="nickname"></label><label>${t.body}<textarea name="body" required minlength="3" maxlength="1000" rows="4" aria-describedby="comments-hint"></textarea></label><p id="comments-hint">${t.hint}</p><label class="comments-consent"><input type="checkbox" name="consent" required>${t.consent}</label><details class="comments-privacy"><summary>${privacy[0]}</summary><p>${privacy[1]} <a href="https://shenlan.jp/en/privacy-policy/#map-notes" target="_blank" rel="noopener">${privacy[2]} ↗</a></p></details><div class="comments-trap" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><div class="comments-verification"></div><button class="comments-submit" type="submit">${t.send}</button></form><p class="comments-status" role="status" aria-live="polite"></p><a class="comments-contact" href="https://shenlan.jp/${lang}/book/">${t.contact}</a>`;
  document.querySelector('.atlas-page').append(dialog);
  const form=dialog.querySelector('form'),list=dialog.querySelector('.comments-list'),status=dialog.querySelector('.comments-status'),submit=form.querySelector('[type=submit]'),retry=dialog.querySelector('.comments-retry');
  const field=name=>form.elements.namedItem(name);
  let place,trigger,config,sequence=0,token='',widget,scriptPromise,busy=false,requestId;
  const drafts=new Map();
  const note=(text,parent=list)=>{const p=document.createElement('p');p.textContent=text;parent.append(p);return p;};
  async function api(path,options={}) {const r=await fetch('/api/comments'+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});let data;try{data=await r.json()}catch{throw Error('unavailable')}if(!r.ok)throw Error(data.error||'unavailable');return data;}
  function remember(){if(place)drafts.set((place.commentKey||place.photos[0].id),{nickname:field('nickname').value,body:field('body').value,id:requestId});}
  function clearVerification(){token='';if(widget!==undefined&&window.turnstile){window.turnstile.remove(widget);widget=undefined;}}
  dialog.querySelector('.comments-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{remember();sequence++;clearVerification();trigger?.focus({preventScroll:true});});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();});
  async function verification(seq){
    if(config.local)return;
    if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{if(window.turnstile)return resolve();const s=document.createElement('script');s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.onload=resolve;s.onerror=()=>{scriptPromise=null;reject(Error('verification'))};document.head.append(s);});
    await scriptPromise;if(seq!==sequence||!dialog.open)return;
    clearVerification();widget=window.turnstile.render(dialog.querySelector('.comments-verification'),{sitekey:config.siteKey,action:'place-comment',theme:'auto',callback:value=>token=value,'expired-callback':()=>token='','error-callback':()=>{token='';status.textContent=t.verify;}});
  }
  async function load(){
    const seq=++sequence;list.replaceChildren();note(t.loading);retry.hidden=true;form.hidden=true;status.textContent='';clearVerification();
    try{
      config=await api('/config');if(seq!==sequence)return;
      dialog.querySelector('.comments-local').hidden=!config.local;
      if(!config.available){list.replaceChildren();note(t.unavailable);return;}
      const data=await api('?place='+encodeURIComponent((place.commentKey||place.photos[0].id)));if(seq!==sequence)return;
      list.replaceChildren();if(!data.comments.length)note(t.empty);
      for(const c of data.comments){const item=document.createElement('article');const head=document.createElement('div');const name=document.createElement('strong');name.textContent=c.nickname;const date=document.createElement('time');date.dateTime=c.created_at;date.textContent=new Date(c.created_at).toLocaleDateString(lang);head.append(name,date);item.append(head);note(c.body,item);if(c.reply){const reply=document.createElement('aside');const label=document.createElement('strong');label.textContent=t.reply;reply.append(label);note(c.reply,reply);item.append(reply);}list.append(item);}
      form.hidden=false;await verification(seq);
    }catch{if(seq===sequence){list.replaceChildren();note(t.error);retry.hidden=false;}}
  }
  retry.onclick=load;
  form.addEventListener('input',e=>{if(e.target.name==='nickname'||e.target.name==='body')requestId=crypto.randomUUID();});
  form.onsubmit=async event=>{
    event.preventDefault();if(busy)return;
    if(!config.local&&!token){status.textContent=t.verify;return;}
    const seq=sequence,placeId=(place.commentKey||place.photos[0].id);
    busy=true;submit.disabled=true;submit.textContent=t.sending;status.textContent='';
    try{
      await api('',{method:'POST',body:JSON.stringify({id:requestId,placeId,lang,consent:field('consent').checked,nickname:field('nickname').value,body:field('body').value,website:field('website').value,token})});
      drafts.delete(placeId);
      if(seq===sequence){field('body').value='';field('consent').checked=false;requestId=crypto.randomUUID();status.textContent=t.pending;}
    }catch(e){if(seq===sequence)status.textContent=({rate_limit:t.rate,verification:t.verify,invalid:t.invalid,unavailable:t.error})[e.message]||t.error;}
    finally{busy=false;submit.disabled=false;submit.textContent=t.send;if(seq===sequence&&widget!==undefined){token='';window.turnstile.reset(widget);}}
  };
  window.AtlasComments={label:t.entry,open(p,button){if(busy)return;remember();place=p;trigger=button;dialog.querySelector('h2').textContent=p.title[lang];const draft=drafts.get((p.commentKey||p.photos[0].id));form.reset();field('nickname').value=draft?.nickname||'';field('body').value=draft?.body||'';requestId=draft?.id||crypto.randomUUID();dialog.showModal();dialog.querySelector('.comments-close').focus();load();}};
})();
