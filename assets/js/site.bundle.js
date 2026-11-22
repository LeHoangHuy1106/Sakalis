/* SAKALIS v7.1 · Vanilla JavaScript / Classic bundle. */
'use strict';

/* SAKALIS — Data adapter. Các endpoint được giữ nguyên từ source 2026. */
const API = Object.freeze({
  csv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSwvAAb6bsHp0cD_DlF5htJ9fSv1sqJ5njXKQPg4K7ICZ08TOZ7voL9dkMLT78W0nnXH5JdHXDi-o_m/pub?output=csv',
  views: 'https://script.google.com/macros/s/AKfycbxhDb3472BOmdCw4AvmPDpCR6bBFl2yCJwdLBCIrVHla9fYb2xnolNeulnY-2cQZQ1qJw/exec'
});
const IMAGE_COUNT = 11;
const CACHE_KEY = 'sakalis-poems-cache-v6';
const BOOKMARK_KEY = 'sakalis-bookmarks';
const norm = v => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const slug = v => norm(v).replace(/_/g,'-') || 'bai-tho';
const short = v => String(v ?? '').replace(/\s+/g,' ').trim();
const alias = {
  id:['id','index','stt','số thứ tự','so thu tu'],
  title:['title','tiêu đề','tieu de','tên bài','ten bai','tên bài thơ','ten bai tho'],
  slug:['slug','đường dẫn','duong dan'],
  collection:['collection','tập thơ','tap tho','tập','tap','bộ sưu tập'],
  startTime:['start_time','start time','bắt đầu','ngày bắt đầu','thời gian bắt đầu'],
  endTime:['end_time','end time','kết thúc','ngày kết thúc','thời gian kết thúc'],
  year:['year','năm','nam'],
  topics:['topics','topic','tags','tag','chủ đề','chu de','thẻ','the'],
  views:['views','view','lượt xem','luot xem'],
  image:['image','ảnh','anh','thumbnail','cover'],
  featured:['featured','nổi bật','noi bat','feature'],
  content:['content','nội dung','noi dung','poem','bài thơ','bai tho'],
  youtube:['youtube','youtube link','youtube_url','youtube url','video','video youtube']
};
const fields = Object.fromEntries(Object.entries(alias).map(([key,list])=>[key,list.map(norm)]));
const field = (r,key) => fields[key].map(k=>r[k]).find(v=>v!==undefined&&String(v).trim()!=='')??'';
const integer = v => Number.parseInt(String(v ?? '').replace(/[^\d-]/g,''),10)||0;
const boolean = v => ['1','true','yes','y','co','featured','noi_bat'].includes(norm(v));
const topics = v => [...new Map(String(v??'').split(/[,;|\n]+/).map(short).filter(Boolean).map(t=>[norm(t),t])).values()];
function dateOf(v){
 const s=short(v); if(!s)return null;
 let m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
 if(m)return verifiedDate(+m[1],+m[2],+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));
 m=s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
 if(m)return verifiedDate(+m[3],+m[2],+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0));
 const d=new Date(s);return Number.isNaN(d.getTime())?null:d;
}
function verifiedDate(y,m,d,h=0,min=0,sec=0){const t=new Date(y,m-1,d,h,min,sec);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d?t:null;}
function parseCSV(input){
 const str=String(input??'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');let rows=[],row=[],cell='',quoted=false;
 for(let i=0;i<str.length;i++){
  const c=str[i];if(c==='"'){if(quoted&&str[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;continue;}
  if(c===','&&!quoted){row.push(cell);cell='';continue;}
  if(c==='\n'&&!quoted){row.push(cell);if(row.some(s=>s.trim()))rows.push(row);row=[];cell='';continue;}
  cell+=c;
 }
 row.push(cell);if(row.some(s=>s.trim()))rows.push(row);
 if(!rows.length)return [];
 const header=rows.shift().map(norm);
 return rows.map(row=>Object.fromEntries(header.map((h,i)=>[h,row[i]??'']).filter(([h])=>Boolean(h))));
}
function normalizePoems(records){return records.map((r,index)=>{
 const startTime=short(field(r,'startTime')), endTime=short(field(r,'endTime'));
 const startDate=dateOf(startTime),endDate=dateOf(endTime);
 const year=integer(field(r,'year'))||startDate?.getFullYear()||endDate?.getFullYear()||null;
 const title=short(field(r,'title'))||`Bài thơ ${index+1}`;
 return { id:short(field(r,'id'))||String(index+1), title,slug:short(field(r,'slug'))||slug(title),
 collection:short(field(r,'collection')),startTime,endTime,startDate,endDate,year,
 topics:topics(field(r,'topics')),views:Math.max(0,integer(field(r,'views'))),
 featured:boolean(field(r,'featured')),image:short(field(r,'image')),youtube:short(field(r,'youtube')),
 content:String(field(r,'content')).replace(/\r\n?/g,'\n').replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim(),
 timestamp:endDate?.getTime()||startDate?.getTime()||(year?new Date(year,0,1).getTime():0),sheetIndex:index
 };
}).filter(p=>p.title||p.content);}
let pending=null;
async function loadPoems({force=false}={}){
 if(!force && pending)return pending;
 pending=(async()=>{
  if(!force)try{const cache=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');if(cache && cache.csv){return normalizePoems(parseCSV(cache.csv));}}catch{}
  const url=new URL(API.csv);url.searchParams.set('cache',String(Date.now()));
  const response=await fetch(url.href,{cache:'no-store'});if(!response.ok)throw Error(`Google Sheets: HTTP ${response.status}`);
  const csv=await response.text();if(!csv.trim()||/^\s*<(html|!doctype)/i.test(csv))throw Error('Nguồn dữ liệu Google Sheets không hợp lệ.');
  try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({time:Date.now(),csv}));}catch{}
  return normalizePoems(parseCSV(csv));
 })().catch(error=>{pending=null;throw error;});return pending;
}
const newest = poems=>[...poems].sort((a,b)=>b.timestamp-a.timestamp||a.sheetIndex-b.sheetIndex);
const popular = poems=>[...poems].sort((a,b)=>b.views-a.views||b.timestamp-a.timestamp);
const poemURL = p=>`./detail.html?id=${encodeURIComponent(p.id)}&slug=${encodeURIComponent(p.slug)}`;
const collectionURL = c=>`./collection-detail.html?name=${encodeURIComponent(c)}`;
const topicURL = t=>`./list.html?topic=${encodeURIComponent(t)}`;
const collectionGroups = poems => {
 const groups=new Map();for(const p of poems){if(!p.collection)continue;const k=norm(p.collection);if(!groups.has(k))groups.set(k,{name:p.collection,poems:[]});groups.get(k).poems.push(p);}return [...groups.values()].sort((a,b)=>b.poems.length-a.poems.length);
};
const topicGroups = poems => {
 const groups=new Map();for(const p of poems)for(const t of p.topics){const k=norm(t);if(!groups.has(k))groups.set(k,{name:t,poems:[]});groups.get(k).poems.push(p);}return [...groups.values()].sort((a,b)=>b.poems.length-a.poems.length);
};
const photo = (p,index=0)=>{
 const img=String(p?.image??'').trim();
 if(img && /^(https?:\/\/|\.\.?\/|assets\/)/i.test(img) && !/^javascript:/i.test(img))return img;
 const seed=String(p?.id??`${index}`);let hash=0;for(const c of seed)hash=(hash*31+c.charCodeAt(0))|0;
 return `./assets/images/image-${String((Math.abs(hash)%IMAGE_COUNT)+1).padStart(2,'0')}.webp`;
};
const excerpt = (p,limit=150)=>{const text=String(p?.content??'').replace(/\n+/g,' · ').replace(/\s+/g,' ').trim();return text.length>limit?text.slice(0,limit).replace(/\s+\S*$/,'')+'…':text;};
const formatNumber = x=>new Intl.NumberFormat('vi-VN').format(Number(x)||0);
const formatDate = d=>d instanceof Date&&!isNaN(d)?new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d):'';
const compositionDate = p=>p.startDate&&p.endDate&&p.startDate.getTime()!==p.endDate.getTime()?`${formatDate(p.startDate)} – ${formatDate(p.endDate)}`:formatDate(p.endDate||p.startDate)||(p.year?String(p.year):'Chưa ghi ngày');
const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const query = v=>norm(v).replace(/_/g,' ');
function bookmarks(){try{const v=JSON.parse(localStorage.getItem(BOOKMARK_KEY)||'[]');return new Set(Array.isArray(v)?v.map(String):[]);}catch{return new Set();}}
function toggleBookmark(id){const all=bookmarks();const key=String(id);all.has(key)?all.delete(key):all.add(key);try{localStorage.setItem(BOOKMARK_KEY,JSON.stringify([...all]));}catch{}window.dispatchEvent(new CustomEvent('sakalis:bookmarks'));return all.has(key);}
function trackView(id){if(!id)return;const url=new URL(API.views);url.searchParams.set('action','increment');url.searchParams.set('id',String(id));url.searchParams.set('_',String(Date.now()));const img=new Image();img.onload=img.onerror=()=>img.remove();img.style.display='none';img.src=url.href;document.body.append(img);setTimeout(()=>img.remove(),12000);}
function youtubeId(raw){const s=String(raw||'').trim();if(!s)return null;try{const u=new URL(s);if(u.hostname==='youtu.be')return /^[\w-]{11}$/.test(u.pathname.slice(1))?u.pathname.slice(1):null;if(u.hostname.endsWith('youtube.com')||u.hostname==='youtube-nocookie.com'){const v=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();return /^[\w-]{11}$/.test(v)?v:null;}}catch{}return null;}


/* Paper stack: single face, staggered pages, bidirectional swiping. */
function initializePaperStack(){
 const reader=document.getElementById('paper-stack-reader'),deck=document.getElementById('stack-deck'),stage=document.getElementById('stack-stage'),normal=document.getElementById('poem-detail-layout');
 const prev=document.getElementById('stack-prev'),next=document.getElementById('stack-next'),label=document.getElementById('stack-label'),seek=document.getElementById('stack-seek'),full=document.getElementById('stack-fullscreen');
 const layout=reader.closest('.detail-layout');
 const modes=[...document.querySelectorAll('[data-reader-mode]')],ctrl=new AbortController(),signal=ctrl.signal;
 const on=(target,event,handler,opts={})=>target.addEventListener(event,handler,{...opts,signal});
 let pages=[],index=0,poem=null,active=false,busy=false,drag=null,timer=0,resize=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const bound=(n,a,b)=>Math.max(a,Math.min(b,n));
 function paginate(text){
  const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n');
  const all=[];let chunk=[],count=0;
  for(const line of lines){if(!line.trim()){if(chunk.length&&chunk.at(-1)!=='')chunk.push('');continue;}if(count===10){while(chunk.at(-1)==='')chunk.pop();all.push(chunk);chunk=[];count=0;}chunk.push(line);count++;}
  while(chunk.at(-1)==='')chunk.pop();if(chunk.length)all.push(chunk);return all.length?all:[['Bài thơ chưa có nội dung.']];
 }
 function sheet(i,role='top'){
  const pg=document.createElement('article');pg.className=`stack-sheet stack-sheet--${role}`;pg.dataset.index=i;
  if(role!=='top'){pg.setAttribute('aria-hidden','true');return pg;}
  const lines=pages[i].map(l=>l?`<span class="stack-line">${esc(l)}</span>`:'<span class="stack-stanza-gap" aria-hidden="true"></span>').join('');
  pg.innerHTML=`<div class="stack-paper-content">${i===0?`<h2>${esc(poem.title)}</h2>`:''}<div class="stack-lines">${lines}</div>${i===pages.length-1?'<div class="stack-signature">BNA</div>':''}</div><footer class="stack-paper-foot"><span>${i+1}</span></footer>`;return pg;
 }
 function fit(){if(!active)return;const paper=deck.querySelector('.stack-sheet--top');if(!paper)return;const content=paper.querySelector('.stack-paper-content'), holder=paper.querySelector('.stack-lines');if(!holder)return;
  holder.style.fontSize='';const base=parseFloat(getComputedStyle(holder).fontSize);if(!base||!holder.clientWidth)return;
  const lines=[...holder.querySelectorAll('.stack-line')];let factor=1;for(const line of lines)if(line.scrollWidth>line.clientWidth)factor=Math.min(factor,(line.clientWidth-2)/line.scrollWidth);
  holder.style.fontSize=`${base*factor}px`;const available=content.clientHeight; if(content.scrollHeight>available&&available>0){const excess=content.scrollHeight-available;holder.style.fontSize=`${Math.max(9,base*factor*(holder.clientHeight-excess-3)/Math.max(1,holder.clientHeight))}px`;}
 }
 function render(){deck.replaceChildren();if(index+2<pages.length)deck.append(sheet(index+2,'back2'));if(index+1<pages.length)deck.append(sheet(index+1,'back1'));if(index>0&&index===pages.length-1)deck.append(sheet(index-1,'back1'));deck.append(sheet(index));label.textContent=`Trang ${index+1} / ${pages.length}`;seek.max=String(pages.length);seek.value=String(index+1);prev.disabled=index===0;next.disabled=index===pages.length-1;fit();}
 function go(to,fromDrag=0){to=bound(to,0,pages.length-1);if(busy||!active||to===index)return false;const old=deck.querySelector('.stack-sheet--top'),dir=to>index?-1:1;index=to;if(reduced){render();return true;}busy=true;render();const incoming=deck.querySelector('.stack-sheet--top');incoming.classList.add('stack-enter');old.classList.add('stack-exit');old.style.transform=`translateX(${fromDrag}px) rotate(${fromDrag/24}deg)`;old.setAttribute('aria-hidden','true');deck.append(old);requestAnimationFrame(()=>{old.style.transform=`translateX(${dir*(stage.clientWidth+60)}px) rotate(${dir*13}deg)`;old.style.opacity='0';});timer=setTimeout(()=>{old.remove();incoming.classList.remove('stack-enter');busy=false;},420);return true;}
 function mode(stack){active=stack;layout?.classList.toggle('is-paper-reading',stack);normal.hidden=stack;reader.hidden=!stack;modes.forEach(b=>{const selected=b.dataset.readerMode===(stack?'stack':'scroll');b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));});if(stack){render();requestAnimationFrame(fit);}else{drag=null;clearTimeout(timer);busy=false;if(document.fullscreenElement===reader)document.exitFullscreen?.().catch(()=>{});document.documentElement.classList.remove('sakalis-stack-fullscreen');}}
 modes.forEach(b=>on(b,'click',()=>mode(b.dataset.readerMode==='stack')));on(prev,'click',()=>go(index-1));on(next,'click',()=>go(index+1));on(seek,'input',()=>{if(!busy)go(Number(seek.value)-1);});on(seek,'change',()=>{const value=Number(seek.value)-1;if(busy){clearTimeout(timer);busy=false;}if(value!==index){index=bound(value,0,pages.length-1);render();}else render();});
 on(stage,'pointerdown',e=>{if(!active||busy||!e.isPrimary||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false};stage.setPointerCapture?.(e.pointerId);});
 on(stage,'pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.horizontal&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy))drag.horizontal=true;if(!drag.horizontal)return;const blocked=(dx>0&&index===0)||(dx<0&&index===pages.length-1);drag.dx=dx*(blocked?.22:1);const el=deck.querySelector('.stack-sheet--top');el.style.transition='none';el.style.transform=`translateX(${drag.dx}px) rotate(${drag.dx/24}deg)`;});
 function release(e,cancel=false){if(!drag||e.pointerId!==drag.id)return;const dx=drag.dx,h=drag.horizontal;drag=null;const el=deck.querySelector('.stack-sheet--top');if(el)el.style.transition='';if(!cancel&&h&&Math.abs(dx)>Math.min(80,stage.clientWidth*.18)&&go(index+(dx<0?1:-1),dx))return;if(el)el.style.transform='';}
 on(stage,'pointerup',e=>release(e));on(stage,'pointercancel',e=>release(e,true));on(stage,'lostpointercapture',e=>release(e,true));
 on(document,'keydown',e=>{if(!active||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(index+(e.key==='ArrowRight'?1:-1));}if(e.key==='Escape')document.documentElement.classList.remove('sakalis-stack-fullscreen');});
 on(full,'click',async()=>{if(document.fullscreenElement===reader){await document.exitFullscreen();return;}if(document.documentElement.classList.contains('sakalis-stack-fullscreen')){document.documentElement.classList.remove('sakalis-stack-fullscreen');return;}try{if(!reader.requestFullscreen)throw Error();await reader.requestFullscreen();}catch{document.documentElement.classList.add('sakalis-stack-fullscreen');}requestAnimationFrame(fit);});
 on(document,'fullscreenchange',()=>{full.querySelector('span').textContent=document.fullscreenElement===reader?'Thoát toàn màn hình':'Toàn màn hình';requestAnimationFrame(fit);});
 if(typeof ResizeObserver!=='undefined'){resize=new ResizeObserver(fit);resize.observe(stage);}else on(window,'resize',fit);document.fonts?.ready.then(()=>{if(!signal.aborted)fit();});
 return {setPoem(p){poem=p;pages=paginate(p.content);index=0;mode(false);},destroy(){ctrl.abort();clearTimeout(timer);resize?.disconnect();document.documentElement.classList.remove('sakalis-stack-fullscreen');}};
}


/* Sakalis Atelier v5. Vanilla JS. API logic lives in data.js and is deliberately unchanged. */
const root=document.getElementById('app');
let page='home';
let args=new URLSearchParams(location.search);
let routeController=new AbortController();
let currentAudio=null;
let currentFlip=null;
let revealObserver=null;
let mutationObserver=null;
let routeID=0;
const routeFromURL=()=>({index:'home',list:'list',collection:'collection','collection-detail':'collection-detail',detail:'detail',about:'about'}[location.pathname.split('/').pop().replace(/\.html$/,'')||'index']||'home');

const svg=(name,size=19)=>{
 const paths={search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',north:'<path d="M5 19 19 5M8 5h11v11"/>',book:'<path d="M3 5.5c4-1.8 7-1.5 9 0 2-1.5 5-1.8 9 0v14c-4-1.8-7-1.5-9 0-2-1.5-5-1.8-9 0zM12 5.5v14"/>',save:'<path d="M6 3h12v18l-6-4-6 4z"/>',menu:'<path d="M3 7h18M3 12h18M3 17h18"/>',close:'<path d="M5 5 19 19M19 5 5 19"/>',play:'<path d="m9 5 10 7-10 7z"/>',headphones:'<path d="M3 13v-2a9 9 0 0 1 18 0v2M3 13v6h4v-6H3Zm14 0v6h4v-6h-4Z"/>',share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14M12 5v14"/>',spark:'<path d="m12 1 2.7 8.3L23 12l-8.3 2.7L12 23l-2.7-8.3L1 12l8.3-2.7Z"/>'};
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
};
const imgUrl=(p,i=0)=>esc(photo(p,i));
function image(p,i=0,extra=''){return `<img src="${imgUrl(p,i)}" alt="${esc(p.title||'Không gian thơ')}" loading="lazy" onerror="this.onerror=null;this.src='./assets/images/image-05.webp'" ${extra}>`;}
function getSaved(){return bookmarks();}
const minor=(v)=>`<span class="eyebrow">${v}</span>`;
function nav(){return `<header class="site-head"><div class="head-top shell"><span>SAKALIS / THƯ VIỆN THƠ</span><span>CHỮ · ẢNH · KÝ ỨC</span><span>NHỮNG DÒNG CHỮ Ở LẠI <i>✳</i> VIỆT NAM</span></div><div class="shell head-main"><a class="brand" href="./index.html" aria-label="Sakalis, về trang chủ"><span class="brand-symbol">✳</span><span>sakalis<small>THE POETRY HOUSE</small></span></a><nav class="nav-links" aria-label="Điều hướng chính"><a href="./index.html" ${page==='home'?'aria-current="page"':''}>Trang chủ</a><a href="./list.html" ${page==='list'?'aria-current="page"':''}>Thư viện thơ</a><a href="./collection.html?type=collection" ${(page==='collection'||page==='collection-detail')&&args.get('type')!=='topic'?'aria-current="page"':''}>Tập thơ</a><a href="./collection.html?type=topic" ${(page==='collection'||page==='collection-detail')&&args.get('type')==='topic'?'aria-current="page"':''}>Chủ đề</a><a href="./about.html" ${page==='about'?'aria-current="page"':''}>Lưu bút</a></nav><div class="head-actions"><a class="head-search" href="./list.html" aria-label="Tìm thơ">${svg('search',18)}</a><a class="head-saved" href="./list.html?filter=saved" aria-label="Bài đã lưu">${svg('save',17)}<span id="saved-count">0</span></a><button class="nav-menu" id="nav-menu" type="button" aria-expanded="false" aria-label="Mở menu">${svg('menu',23)}</button></div></div><nav class="nav-mobile" id="nav-mobile" aria-label="Điều hướng điện thoại"><a href="./index.html">Trang chủ</a><a href="./list.html">Thư viện thơ</a><a href="./collection.html?type=collection">Tập thơ</a><a href="./collection.html?type=topic">Chủ đề</a><a href="./about.html">Lưu bút / Về tác giả</a><a href="./list.html?filter=saved">Bài đã lưu</a></nav></header>`;}
function footer(){return `<footer class="site-footer"><div class="shell footer-art"><div class="footer-orbit">✳</div><div class="footer-lead">Có những điều<br>chỉ <i>thơ</i> mới giữ được.</div><a class="footer-explore" href="./list.html">Mở thư viện ${svg('north',20)}</a></div><div class="shell footer-bottom"><a href="./index.html" class="footer-brand">sakalis<span>✳</span></a><div class="footer-nav"><a href="./list.html">Thư viện thơ</a><a href="./collection.html?type=collection">Tập thơ</a><a href="./collection.html?type=topic">Theo cảm xúc</a><a href="./about.html">Lưu bút</a></div><small>© ${new Date().getFullYear()} SAKALIS. VIẾT ĐỂ NHỚ.</small></div></footer>`;}
function mount(content,cls=''){if(mutationObserver)mutationObserver.disconnect();if(revealObserver)revealObserver.disconnect();root.innerHTML=nav()+`<main class="${cls}">${content}</main>`+footer()+`<div class="toast" role="status" aria-live="polite" id="toast"></div>`;initChrome();}
function initChrome(){
 const button=document.getElementById('nav-menu'),menu=document.getElementById('nav-mobile');
 button?.addEventListener('click',()=>{const isOpen=menu.classList.toggle('open');button.setAttribute('aria-expanded',String(isOpen));button.innerHTML=svg(isOpen?'close':'menu',23)});
 updateSavedCount();
 revealObserver=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');revealObserver.unobserve(entry.target)}}),{threshold:.04,rootMargin:'0px 0px 90px 0px'}):null;
 const watch=()=>document.querySelectorAll('.appear:not(.appear-ready)').forEach(el=>{el.classList.add('appear-ready');if(!revealObserver)el.classList.add('in-view');else revealObserver.observe(el)});
 watch();if(window.MutationObserver){mutationObserver=new MutationObserver(watch);mutationObserver.observe(document.querySelector('main'),{childList:true,subtree:true});}
}

function updateSavedCount(){const count=document.getElementById('saved-count');if(count)count.textContent=getSaved().size;}
let to;function toast(message){const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('show');clearTimeout(to);to=setTimeout(()=>t.classList.remove('show'),2800)}
function loading(){return `<div class="loading"><span>✳</span><p>Đang mở những trang thơ…</p></div>`;}
function errorMarkup(e){return `<section class="notice"><span class="eyebrow">MỘT CHÚT GIÁN ĐOẠN</span><h2>Thư viện đang tạm khép.</h2><p>Chưa thể tải thơ từ Google Sheets. Kiểm tra kết nối rồi tải lại.</p><button type="button" class="button-ink" onclick="location.reload()">Tải lại ${svg('arrow',16)}</button><small>${esc(e?.message||'Không thể kết nối')}</small></section>`;}
function saveButton(p,cls=''){const saved=getSaved().has(String(p.id));return `<button class="save-btn ${cls} ${saved?'saved':''}" type="button" data-save-id="${esc(p.id)}" title="${saved?'Bỏ lưu':'Lưu bài thơ'}" aria-label="${saved?'Bỏ lưu':'Lưu bài thơ'}" aria-pressed="${saved}">${svg('save',19)}</button>`;}
function bindBookmarks(scope=root){if(root.dataset.bookmarksBound)return;root.dataset.bookmarksBound='1';root.addEventListener('click',e=>{const btn=e.target.closest('[data-save-id]');if(!btn)return;e.preventDefault();e.stopPropagation();const active=toggleBookmark(btn.dataset.saveId);document.querySelectorAll('[data-save-id]').forEach(el=>{if(el.dataset.saveId===btn.dataset.saveId){el.classList.toggle('saved',active);el.classList.remove('save-burst');void el.offsetWidth;el.classList.add('save-burst');el.setAttribute('aria-label',active?'Bỏ lưu':'Lưu bài thơ');el.setAttribute('aria-pressed',String(active));}});toast(active?'Bài thơ đã được lưu.':'Đã bỏ lưu bài thơ.');});}
function sectionHead(no,kicker,title,link,href){return `<div class="section-head appear"><div class="section-index">${no}<span>✳</span></div><div class="section-title"><span class="eyebrow">${kicker}</span><h2>${title}</h2></div>${link?`<a class="text-link" href="${href}">${link} ${svg('north',18)}</a>`:''}</div>`;}
const leadLines=p=>String(p?.content||'').split(/\n/).map(x=>x.trim()).filter(Boolean).slice(0,4);
const quoteLine=p=>leadLines(p)[0]||'Có những chữ ở lại cùng ta rất lâu.';
function poemCard(p,i=0,type){const kind=type||(['cover','editorial','verse','cover','folio','editorial'][i%6]);const url=poemURL(p),meta=esc(p.collection||p.topics?.[0]||'THƠ & KÝ ỨC');const lines=leadLines(p).slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('');
 if(kind==='editorial')return `<article class="poem-item poem-item--editorial appear" style="--delay:${i%6*55}ms"><a class="editorial-art" href="${url}">${image(p,i)}<span class="image-stamp">SAKALIS / ${String(i+1).padStart(2,'0')}</span></a><div class="editorial-copy"><div class="card-topline"><span>${meta} · ${esc(p.year||'')}</span>${saveButton(p)}</div><h3><a href="${url}">${esc(p.title)}</a></h3><div class="editorial-lines">${lines}</div><a class="card-arrow" href="${url}">Mở trang thơ <span>${svg('arrow',20)}</span></a></div></article>`;
 if(kind==='verse')return `<article class="poem-item poem-item--verse appear" style="--delay:${i%6*55}ms"><div class="verse-ink">✳</div><div class="card-topline"><span>SỔ TAY / ${String(i+1).padStart(2,'0')}</span>${saveButton(p)}</div><a href="${url}" class="verse-card-content"><span class="eyebrow">TỪ MỘT TRANG THƠ</span><blockquote>“${esc(quoteLine(p))}”</blockquote><span class="verse-card-title">${esc(p.title)}</span><span class="verse-arrow">Đọc toàn bài ${svg('north',17)}</span></a></article>`;
 if(kind==='folio')return `<article class="poem-item poem-item--folio appear" style="--delay:${i%6*55}ms"><div class="folio-stitch">SAKALIS <b>✳</b> VĂN CHƯƠNG</div><div class="card-topline"><span>THƠ / ${String(i+1).padStart(2,'0')}</span>${saveButton(p)}</div><div class="folio-mid"><span class="folio-ornament">❦</span><h3><a href="${url}">${esc(p.title)}</a></h3><p>${esc(quoteLine(p))}</p></div><a class="folio-foot" href="${url}"><span>${meta}</span>${svg('north',19)}</a></article>`;
 return `<article class="poem-item poem-item--cover appear" style="--delay:${i%6*55}ms"><a class="cover-art" href="${url}">${image(p,i)}<div class="cover-gradient"></div><span class="cover-number">Nº ${String(i+1).padStart(2,'0')}</span><div class="cover-caption"><span>${meta}</span><h3>${esc(p.title)}</h3><span class="cover-excerpt">${esc(quoteLine(p))}</span></div><span class="cover-corner">${svg('north',21)}</span></a>${saveButton(p,'cover-save')}</article>`;
}
function bookCard(group,i=0){const p=group.poems[0];const choices=[6,4,3,10,7,9,8,2];const cover=p.image?imgUrl(p):`./assets/images/image-${String(choices[i%choices.length]).padStart(2,'0')}.webp`;const variants=['book-ink','book-pale','book-silver','book-mist','book-dark'];return `<a class="book-card appear" href="${collectionURL(group.name)}" style="--delay:${i%6*65}ms"><div class="book-object ${variants[i%variants.length]}"><div class="book-photo"><img src="${cover}" loading="lazy" alt="Ảnh bìa ${esc(group.name)}" onerror="this.onerror=null;this.src='./assets/images/image-06.webp'"></div><span class="book-grain"></span><span class="book-spine"></span><div class="book-cover-writing"><span class="book-imprint">SAKALIS · POETRY</span><strong>${esc(group.name)}</strong><span class="book-cover-rule"></span><small>THƠ <span>✳</span></small></div></div><div class="book-caption"><strong>${esc(group.name)}</strong><small>${formatNumber(group.poems.length)} bài thơ ${svg('north',14)}</small></div></a>`;}
// Thư viện và mục lục tập thơ dùng hai component độc lập.
function archiveCard(p,i=0){
 const href=poemURL(p),lines=leadLines(p).slice(0,2);
 return `<article class="archive-card appear" style="--delay:${i%6*55}ms"><a class="archive-art" href="${href}">${image(p,i)}<span class="archive-number">${String(i+1).padStart(2,'0')} · THƠ</span><span class="archive-open">${svg('north',20)}</span></a><div class="archive-copy"><div class="archive-meta"><span>${esc(p.collection||p.topics[0]||'Sakalis')}</span>${saveButton(p)}</div><h2><a href="${href}">${esc(p.title)}</a></h2><div class="archive-verse">${lines.map(l=>`<span>${esc(l)}</span>`).join('')}</div><a class="archive-read" href="${href}">Đọc bài thơ ${svg('arrow',17)}</a></div></article>`;
}
const libraryCards=ps=>`<div class="archive-grid">${ps.map(archiveCard).join('')}</div>`;
function chapterCard(p,i=0){const href=poemURL(p);return `<article class="chapter-card appear" style="--delay:${i%6*45}ms"><a class="chapter-link" href="${href}"><div class="chapter-thumb">${image(p,i)}<span>${String(i+1).padStart(2,'0')}</span></div><div class="chapter-copy"><span class="chapter-meta">BÀI THƠ ${String(i+1).padStart(2,'0')} ${p.year?'· '+esc(p.year):''}</span><h3>${esc(p.title)}</h3><p>${esc(leadLines(p)[0]||'')}</p><span class="chapter-action">Mở trang thơ ${svg('arrow',15)}</span></div></a>${saveButton(p,'chapter-save')}</article>`;}
const chapterCards=ps=>`<div class="chapter-grid">${ps.map(chapterCard).join('')}</div>`;
const cards=(ps,types)=>`<div class="poem-gallery">${ps.map((p,i)=>poemCard(p,i,types?.[i%types.length])).join('')}</div>`;
const topicPanel=(g,i)=>`<a class="mood-card appear" href="${topicURL(g.name)}" style="--delay:${i%6*70}ms"><span class="mood-count">${String(i+1).padStart(2,'0')} / CẢM XÚC</span><div class="mood-background"><img src="./assets/images/image-${String((i*3+2)%11+1).padStart(2,'0')}.webp" loading="lazy" alt=""></div><span class="mood-word">${esc(g.name)}</span><span class="mood-end">${g.poems.length} bài thơ ${svg('north',18)}</span></a>`;
async function home(){mount(`<div id="home-content">${loading()}</div>`,'home-page');const slot=document.getElementById('home-content');try{const poems=newest(await loadPoems());if(!poems.length){slot.innerHTML='<div class="notice"><h2>Chưa có bài thơ nào.</h2></div>';return;}const feat=poems.find(p=>p.featured)||poems[0],second=poems.find(p=>p.id!==feat.id)||feat,third=poems.find(p=>p.id!==feat.id&&p.id!==second.id)||second;const books=collectionGroups(poems).slice(0,5),topics=topicGroups(poems).slice(0,6);const more=poems.filter(p=>p.id!==feat.id).slice(0,9);const lines=leadLines(feat).slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('');
 slot.innerHTML=`<div class="shell"><section class="hero-art"><div class="hero-copy"><span class="hero-edition">✳ &nbsp; TRANG THƠ ĐƯỢC CHỌN &nbsp; / &nbsp; Nº 01</span><div class="hero-title-mask"><span class="hero-typeline">Một chút</span><span class="hero-typeline hero-typeline-em">lặng im</span><span class="hero-typeline">cho chữ.</span></div><div class="hero-bottom"><div class="hero-lines">${lines}</div><div class="hero-cta"><span>ĐANG ĐỌC · ${esc(feat.title)}</span><a href="${poemURL(feat)}">Đọc bài thơ ${svg('north',18)}</a></div></div></div><div class="hero-visual"><div class="hero-image-shape"><div class="hero-art-image">${image(feat,0,'fetchpriority="high"')}</div></div><div class="hero-visual-note">SAKALIS / NHỮNG CHỮ KHÔNG PHÔI PHAI</div><div class="hero-drawn-orbit"></div><div class="hero-visual-seal">✳</div></div><span class="hero-side">A LITERARY SPACE · VOL. 01</span></section></div>
 <div class="marquee-ribbon" aria-hidden="true"><div>SAKALIS <i>✳</i> THƠ & KÝ ỨC <i>✳</i> NHỮNG DÒNG CHỮ Ở LẠI <i>✳</i> SAKALIS <i>✳</i> THƠ & KÝ ỨC <i>✳</i> NHỮNG DÒNG CHỮ Ở LẠI <i>✳</i> &nbsp;</div></div>
 <div class="shell"><section class="home-section highlight-section">${sectionHead('01','MỤC LỤC / TUYỂN CHỌN','Đọc một điều <em>đáng nhớ.</em>','Đến thư viện','./list.html')}<div class="feature-layout appear"><a class="feature-major" href="${poemURL(second)}">${image(second,1)}<span class="feature-major-dark"></span><div class="feature-major-kicker">CHỌN ĐỌC / Nº 01</div><div class="feature-major-copy"><span>${esc(second.collection||'MỘT TRANG THƠ')}</span><h3>${esc(second.title)}</h3><p>${esc(quoteLine(second))}</p><span class="feature-major-link">Đọc bài thơ ${svg('north',18)}</span></div></a><div class="feature-aside"><a class="feature-quotation" href="${poemURL(third)}"><span class="eyebrow">CÂU THƠ GIỮ LẠI</span><span class="quotation-mark">“</span><blockquote>${esc(quoteLine(third))}</blockquote><span class="quote-origin">${esc(third.title)} ${svg('north',16)}</span></a><a class="feature-secondary" href="${poemURL(feat)}"><span class="secondary-image">${image(feat,2)}</span><span class="secondary-body"><small>ĐỌC TIẾP / 02</small><strong>${esc(feat.title)}</strong>${svg('north',18)}</span></a></div></div></section>
 <section class="home-section pieces-section">${sectionHead('02','THƯ VIỆN THƠ / MỚI NHẤT','Những trang thơ <em>vừa mở.</em>','Xem tất cả','./list.html')}${libraryCards((more.length?more:[feat]).slice(0,6))}</section>
 <section class="breathing-section appear"><div class="breathing-visual"><img src="./assets/images/image-03.webp" loading="lazy" alt="Bức ảnh giàu chất thơ"><div class="breathing-sun"></div><span>NHẬT KÝ BẰNG NHỮNG CON CHỮ</span></div><div class="breathing-content"><span class="eyebrow">MỘT DẤU LẶNG / 03</span><span class="breathing-icon">❦</span><h2>Có những ngày, <em>một câu thơ</em> đủ để lòng mình dịu lại.</h2><p>Không cần vội vàng hiểu hết. Chỉ cần tìm được vài dòng chữ khiến ta muốn ở lại lâu hơn một chút.</p><a href="./collection.html?type=topic" class="text-link">Tìm thơ theo cảm xúc ${svg('north',17)}</a></div></section>
 ${books.length?`<section class="home-section shelves-section">${sectionHead('03','TỦ SÁCH / NHỮNG TẬP THƠ','Mỗi tập thơ, <em>một thế giới.</em>','Khám phá tủ sách','./collection.html?type=collection')}<div class="book-shelf">${books.map(bookCard).join('')}</div></section>`:''}
 ${topics.length?`<section class="home-section moods-section">${sectionHead('04','ĐỌC THEO TÂM TRẠNG','Hôm nay, lòng mình <em>ra sao?</em>','Xem mọi chủ đề','./collection.html?type=topic')}<div class="mood-gallery">${topics.map(topicPanel).join('')}</div></section>`:''}
 <section class="closing-note appear"><span class="eyebrow">DÒNG CUỐI CỦA TRANG</span><h2>Mỗi lần trở lại, <i>một câu chữ mới.</i></h2><a href="./list.html" class="button-ink">Tiếp tục đọc ${svg('north',18)}</a><span class="closing-ornament">✳</span></section></div>`;bindBookmarks();document.title='Sakalis · Thư viện văn học đương đại';}catch(e){console.error('[Sakalis] home',e);slot.innerHTML=errorMarkup(e)}}

async function list(){mount(`<div class="shell"><section class="archive-heading"><div class="archive-heading-copy"><span class="eyebrow">SAKALIS / THƯ VIỆN</span><h1>Thư viện <em>thơ.</em></h1><p>Tìm một bài thơ, một câu chữ, một miền ký ức.</p></div><div class="archive-heading-art" aria-hidden="true"><img src="./assets/images/image-07.webp" alt=""><span>❦</span></div></section>
 <section class="filter-panel" aria-label="Tìm và lọc thơ"><div class="filter-top"><span>✳</span><strong>THƯ VIỆN / TÌM MỘT BÀI THƠ</strong><small>SEARCH IN THE ARCHIVE</small></div><div class="filter-row"><label class="search-box">${svg('search',22)}<input id="search-input" placeholder="Tìm tên bài thơ, một câu chữ..." autocomplete="off" aria-label="Tìm bài thơ"></label><div class="filter-selects"><label><span>TẬP THƠ</span><select id="collection-filter" aria-label="Lọc tập thơ"><option value="">Tất cả tập thơ</option></select></label><label><span>CẢM XÚC</span><select id="topic-filter" aria-label="Lọc cảm xúc"><option value="">Mọi cảm xúc</option></select></label><label><span>SẮP XẾP</span><select id="sort-filter" aria-label="Sắp xếp"><option value="new">Mới nhất</option><option value="popular">Đọc nhiều</option><option value="random">Ngẫu nhiên</option><option value="old">Cũ nhất</option></select></label></div></div><div class="filter-bottom"><label class="saved-only"><input id="saved-only" type="checkbox"><span>✳</span> Chỉ đọc những bài đã lưu</label><span id="result-count">0 bài thơ</span></div></section><section class="library-results"><div class="result-intro"><span>THƯ VIỆN THƠ <span class="slash">/</span> KHÔNG GIAN ĐỌC</span><span>CHỌN MỘT TRANG RỒI BẮT ĐẦU</span></div><div id="poem-list">${loading()}</div><div class="load-more-wrap"><button class="load-more" id="load-more" type="button" hidden>Đọc thêm những trang thơ ${svg('arrow',18)}</button></div></section></div>`,'library-page');
 try{const poems=await loadPoems(),groups=collectionGroups(poems),topics=topicGroups(poems),select=document.getElementById('collection-filter'),topic=document.getElementById('topic-filter'),inp=document.getElementById('search-input'),sort=document.getElementById('sort-filter'),saved=document.getElementById('saved-only'),more=document.getElementById('load-more');select.innerHTML+=groups.map(g=>`<option value="${esc(g.name)}">${esc(g.name)}</option>`).join('');topic.innerHTML+=topics.map(g=>`<option value="${esc(g.name)}">${esc(g.name)}</option>`).join('');if(args.get('collection'))select.value=args.get('collection');if(args.get('topic'))topic.value=args.get('topic');if(args.get('sort')==='popular')sort.value='popular';if(args.get('filter')==='saved')saved.checked=true;
 let showing=12,randomOrder=null;const render=(reset=false)=>{if(reset)showing=12;let all=[...poems],q=query(inp.value);if(q)all=all.filter(p=>query([p.title,p.content,p.collection,...p.topics].join(' ')).includes(q));if(select.value)all=all.filter(p=>p.collection===select.value);if(topic.value)all=all.filter(p=>p.topics.includes(topic.value));if(saved.checked)all=all.filter(p=>getSaved().has(String(p.id)));if(sort.value==='popular')all=popular(all);else if(sort.value==='old')all=newest(all).reverse();else if(sort.value==='random'){if(!randomOrder)randomOrder=new Map(newest(poems).map((p,i)=>[p.id,Math.random()]));all.sort((a,b)=>randomOrder.get(a.id)-randomOrder.get(b.id));}else all=newest(all);document.getElementById('result-count').textContent=`${formatNumber(all.length)} bài thơ`;document.getElementById('poem-list').innerHTML=all.length?libraryCards(all.slice(0,showing)):'<div class="empty-state"><span>✳</span><h2>Chưa tìm được bài thơ phù hợp.</h2><p>Thử một cụm từ khác, hoặc để lòng mình tìm ngẫu nhiên.</p></div>';more.hidden=showing>=all.length;more.onclick=()=>{showing+=9;render(false)};};[inp,select,topic,sort,saved].forEach(el=>el.addEventListener(el===inp?'input':'change',()=>render(true)));window.addEventListener('sakalis:bookmarks',()=>{if(saved.checked)render(false);},{signal:routeController.signal});render();bindBookmarks();}catch(e){document.getElementById('poem-list').innerHTML=errorMarkup(e)}}

async function collection(){const isTopic=args.get('type')==='topic';mount(`<div class="shell"><section class="collection-hero"><div><span class="eyebrow">SAKALIS / ${isTopic?'CẢM XÚC':'TỦ SÁCH'}</span><h1>${isTopic?'Chạm vào một miền <em>cảm xúc.</em>':'Một tủ sách của <em>những ký ức.</em>'}</h1><p>${isTopic?'Tìm những câu chữ có thể gọi tên điều bạn đang cảm thấy.':'Mỗi bìa sách khép lại một khoảng thời gian, và mở ra một đời sống khác.'}</p></div><span class="collection-emblem">✳</span></section><div class="collection-toolbar"><label class="search-box">${svg('search',19)}<input id="collection-search" placeholder="Tìm ${isTopic?'chủ đề':'tập thơ'}..." aria-label="Tìm kiếm"></label><div class="collection-switch"><a href="./collection.html?type=collection" ${!isTopic?'aria-current="page"':''}>Tập thơ</a><a href="./collection.html?type=topic" ${isTopic?'aria-current="page"':''}>Chủ đề</a></div></div><div class="collection-count" id="collection-count"></div><div id="collection-results">${loading()}</div></div>`,'collections-page');try{const poems=await loadPoems(),groups=isTopic?topicGroups(poems):collectionGroups(poems),inp=document.getElementById('collection-search');const render=()=>{const q=query(inp.value),filtered=groups.filter(g=>query(g.name).includes(q));document.getElementById('collection-count').textContent=`${formatNumber(filtered.length)} ${isTopic?'chủ đề':'tập thơ'}`;document.getElementById('collection-results').innerHTML=filtered.length?(isTopic?`<div class="mood-gallery collection-moods">${filtered.map(topicPanel).join('')}</div>`:`<div class="book-shelf collection-books">${filtered.map(bookCard).join('')}</div>`):'<div class="empty-state"><h2>Không tìm thấy kết quả.</h2></div>';};inp.addEventListener('input',render);render();}catch(e){document.getElementById('collection-results').innerHTML=errorMarkup(e)}}


async function collectionDetail(){
 mount(`<div class="shell collection-detail-page"><div id="volume-content">${loading()}</div></div>`,'volume-page');
 const target=document.getElementById('volume-content');
 try{
  const poems=await loadPoems(),name=args.get('name')||'',isTopic=args.get('type')==='topic';
  const groups=isTopic?topicGroups(poems):collectionGroups(poems);
  const group=groups.find(g=>query(g.name)===query(name));
  if(!group){target.innerHTML=`<div class="empty-state"><h2>Chưa tìm thấy ${isTopic?'chủ đề':'tập thơ'}.</h2><a href="./collection.html?type=${isTopic?'topic':'collection'}" class="button-ink">Trở lại tủ sách ${svg('arrow',17)}</a></div>`;return;}
  const items=[...group.poems].sort((a,b)=>a.sheetIndex-b.sheetIndex),first=items[0];
  const firstLines=leadLines(first).slice(0,2).map(esc);
  const tags=[...new Set(items.flatMap(p=>p.topics))].slice(0,5);
  const years=[...new Set(items.map(p=>p.year).filter(Boolean))].sort((a,b)=>a-b);
  const yearLabel=years.length>1?`${years[0]} – ${years.at(-1)}`:(years[0]||'SAKALIS');
  const cover=first.image?imgUrl(first):'./assets/images/image-06.webp';
  document.title=`${group.name} | ${isTopic?'Chủ đề':'Tập thơ'} · Sakalis`;
  target.innerHTML=`<nav class="volume-crumb" aria-label="Đường dẫn"><a href="./index.html">Trang chủ</a><span>/</span><a href="./collection.html?type=${isTopic?'topic':'collection'}">${isTopic?'Chủ đề':'Tập thơ'}</a><span>/</span><strong>${esc(group.name)}</strong></nav>
  <section class="volume-cover-hero"><div class="volume-cover-display"><div class="volume-display-glow"></div><div class="volume-book"><div class="volume-book-front"><img src="${cover}" alt="Bìa tập thơ ${esc(group.name)}" onerror="this.onerror=null;this.src='./assets/images/image-06.webp'"><div class="volume-book-shade"></div><span class="volume-book-imprint">SAKALIS / THƯ VIỆN</span><strong>${esc(group.name)}</strong><span class="volume-book-author">TUYỂN TẬP THƠ</span></div><span class="volume-book-spine"></span></div><span class="volume-plate-index">SAKALIS — VOLUME / ${String(groups.indexOf(group)+1).padStart(2,'0')}</span></div>
  <div class="volume-intro"><span class="eyebrow">${isTopic?'CHỦ ĐỀ / NHỮNG CẢM XÚC':'TỦ SÁCH / CHI TIẾT TẬP THƠ'}</span><h1>${esc(group.name)}</h1><p class="volume-intro-note">${firstLines.length?'“'+firstLines.join('<br>')+'”':'Một tập thơ để đọc thật chậm.'}</p><div class="volume-metrics"><div><strong>${String(items.length).padStart(2,'0')}</strong><span>BÀI THƠ</span></div><div><strong>${esc(yearLabel)}</strong><span>THỜI GIAN</span></div></div><div class="volume-topic-pills">${tags.map(t=>`<a href="${topicURL(t)}">${esc(t)}</a>`).join('')}</div><a href="${poemURL(first)}" class="volume-read-first">Bắt đầu đọc <span>${svg('arrow',21)}</span></a></div></section>
  <section class="volume-chapters"><header class="volume-chapters-head"><div><span class="eyebrow">TRANG SÁCH / MỤC LỤC</span><h2>${isTopic?'Những bài thơ thuộc chủ đề.':'Những bài thơ trong tập.'}</h2><p>Mục lục của riêng tập thơ này. Chọn một bài để bắt đầu đọc.</p></div><label class="volume-order">THỨ TỰ <select id="volume-order"><option value="original">Theo tập thơ</option><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option><option value="popular">Đọc nhiều</option></select></label></header><div id="volume-poem-grid">${chapterCards(items)}</div></section><div class="volume-endnote"><span>❦</span><p>Khép một bài thơ, mở một khoảng lặng.</p><a href="./collection.html?type=${isTopic?'topic':'collection'}">Trở về tủ sách ${svg('north',17)}</a></div>`;
  bindBookmarks();
  const order=document.getElementById('volume-order'),slot=document.getElementById('volume-poem-grid');
  order.addEventListener('change',()=>{let sorted=[...items];if(order.value==='newest')sorted=newest(sorted);if(order.value==='oldest')sorted=newest(sorted).reverse();if(order.value==='popular')sorted=popular(sorted);slot.innerHTML=chapterCards(sorted);});
 }catch(e){target.innerHTML=errorMarkup(e)}
}

async function about(){mount(`<div class="shell about-wrap"><section class="about-opening"><div class="about-portrait"><img src="./assets/images/image-10.webp" alt="Khung cảnh tĩnh lặng, một trang lưu bút" loading="lazy"><span>SAKALIS — NHỮNG GHI CHÉP BÊN LỀ</span></div><div class="about-intro"><span class="eyebrow">LƯU BÚT / VỀ NHỮNG TRANG THƠ</span><h1>Viết xuống,<br><em>để không quên.</em></h1><div class="about-ornament">❦</div><p>Những dòng chữ đôi khi không cần lời giải thích. Chúng ở đây như những dấu gạch chân trong một cuốn sách cũ, đợi một người đọc tình cờ tìm thấy.</p><a href="./list.html" class="button-ink">Bước vào thư viện ${svg('north',18)}</a></div></section><div class="about-numberline"><span>01 / MỘT GÓC NHỎ DÀNH CHO THƠ</span><span>SAKALIS · THE POETRY HOUSE</span></div><section class="about-journal"><div><span class="eyebrow">TẬP SAN / GHI CHÉP</span><h2>Mỗi bài thơ là một <i>ký ức</i> được gọi tên.</h2></div><div id="about-poems">${loading()}</div></section></div>`,'about-page');try{const poems=newest(await loadPoems());document.getElementById('about-poems').innerHTML=poems.length?cards(poems.slice(0,3),['verse','folio','cover']):'<p>Chưa có bài thơ nào.</p>';bindBookmarks();document.title='Lưu bút · Sakalis'}catch(e){document.getElementById('about-poems').innerHTML=errorMarkup(e)}}

function stanzaHtml(content){return String(content||'').trim().split(/\n\s*\n/).map(stanza=>`<p class="stanza">${stanza.split('\n').map(line=>`<span class="verse">${esc(line)||'&nbsp;'}</span>`).join('')}</p>`).join('')}
function readingFit(){const holder=document.querySelector('#poem-detail-layout .poem-body');if(!holder)return;const computed=getComputedStyle(holder),base=Number.parseFloat(computed.fontSize)||20,available=holder.clientWidth,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)return;document.querySelectorAll('#poem-body .verse').forEach(el=>{el.style.fontSize='';ctx.font=`${computed.fontWeight} ${base}px ${computed.fontFamily}`;const width=ctx.measureText(el.textContent||'').width;if(width>available-2)el.style.fontSize=`${Math.max(11.2,base*(available-2)/width)}px`;});}
function stackMarkup(){return `<section class="paper-stack-reader" id="paper-stack-reader" hidden tabindex="0" aria-label="Đọc thơ dạng xấp giấy"><header class="stack-toolbar"><span class="eyebrow">BẢN THẢO</span><button id="stack-fullscreen" type="button" class="stack-control" aria-label="Toàn màn hình">${svg('expand',17)} <span>Toàn màn hình</span></button></header><div class="stack-stage" id="stack-stage" aria-label="Vuốt trái để đọc tiếp, vuốt phải để quay lại"><div class="stack-deck" id="stack-deck"></div></div><nav class="stack-nav" aria-label="Điều hướng trang giấy"><button class="stack-control" id="stack-prev" type="button">← Trước</button><span id="stack-label" role="status" aria-live="polite"></span><button class="stack-control" id="stack-next" type="button">Tiếp →</button></nav><input class="stack-seek" id="stack-seek" type="range" min="1" max="1" value="1" aria-label="Chọn trang giấy"><p class="stack-hint">Vuốt trái hoặc phải để chuyển tờ</p></section>`;}
async function detail(){mount(`<div class="shell detail-shell"><div id="detail-loading">${loading()}</div><div id="detail-container" hidden></div></div>`,'detail-page');const area=document.getElementById('detail-container'),busy=document.getElementById('detail-loading');try{const poems=newest(await loadPoems()),id=args.get('id'),s=args.get('slug');const p=poems.find(p=>id&&String(p.id)===String(id))||poems.find(p=>s&&slug(p.slug)===slug(s));if(!p)throw Error('Không tìm thấy bài thơ.');const ind=poems.findIndex(q=>String(q.id)===String(p.id)),prev=poems[(ind-1+poems.length)%poems.length],next=poems[(ind+1)%poems.length],yt=youtubeId(p.youtube);document.title=`${p.title} | Sakalis`;const desc=document.querySelector('meta[name="description"]');if(desc)desc.content=excerpt(p,155);
 area.innerHTML=`<section class="detail-intro"><div class="detail-breadcrumb"><a href="./index.html">Trang đầu</a><span>/</span><a href="./list.html">Thư viện</a><span>/</span> Đọc thơ</div><div class="detail-title-block"><span class="eyebrow">MỘT TRANG THƠ / ${esc(p.collection||'SAKALIS')}</span><h1>${esc(p.title)}</h1><div class="detail-meta"><span>THƠ BNA</span><span>✳</span><span>${esc(compositionDate(p))}</span><span>✳</span><span>${formatNumber(p.views)} LƯỢT ĐỌC</span></div></div></section><div class="detail-layout"><aside class="detail-aside"><figure class="detail-portrait">${image(p,0)}<figcaption>✳ &nbsp; PHÍA SAU MỖI CÂU CHỮ</figcaption></figure><div class="detail-aside-info"><span class="eyebrow">THUỘC TỦ SÁCH</span><a href="${p.collection?collectionURL(p.collection):'./list.html'}">${esc(p.collection||'Sakalis')} ${svg('north',15)}</a>${p.topics.length?`<div class="aside-tags">${p.topics.map(t=>`<a href="${topicURL(t)}">${esc(t)}</a>`).join('')}</div>`:''}</div><div class="aside-quote">“Có những con chữ đi cùng ta lâu hơn một đời người.”</div></aside><div class="reading-area"><div class="reading-toolbar"><div class="reading-modes" aria-label="Chọn chế độ đọc"><button type="button" data-reader-mode="scroll" class="detail-reading-option is-active" aria-pressed="true">${svg('book',17)} Đọc thơ</button><button type="button" data-reader-mode="stack" class="detail-reading-option" aria-pressed="false">Xấp giấy</button></div><div class="reading-tools"><button type="button" class="tool-button" id="smaller-font" aria-label="Giảm cỡ chữ">A−</button><button type="button" class="tool-button" id="larger-font" aria-label="Tăng cỡ chữ">A+</button><button type="button" class="tool-button" id="music-toggle" aria-pressed="false" title="Phát nhạc nền">${svg('headphones',18)}</button>${saveButton(p,'toolbar-save')}<button type="button" class="tool-button" id="share-poem" aria-label="Chia sẻ bài thơ">${svg('share',18)}</button></div></div>
 <article class="poem-paper" id="poem-detail-layout"><div class="poem-paper-top"><span>SAKALIS &nbsp; / &nbsp; VĂN HỌC</span><span>✳</span></div><div class="poem-text-block"><span class="paper-kicker">MỘT BÀI THƠ CỦA BNA</span><h2 class="paper-poem-title">${esc(p.title)}</h2><div class="poem-body" id="poem-body">${stanzaHtml(p.content)}</div><div class="poem-signature"><span>❦</span><strong>BNA</strong><small>${esc(compositionDate(p))}</small></div></div><div class="poem-paper-bottom"><span>Đọc chậm. Cảm nhận sâu.</span><span>Nº ${String(ind+1).padStart(3,'0')} / SAKALIS</span></div></article>
 ${stackMarkup()}
 ${yt?`<section class="video-section"><div class="video-heading"><div><span class="eyebrow">TÁC PHẨM / VIDEO</span><h2>Nghe một bài thơ.</h2></div><span>YOUTUBE ✳</span></div><div class="video-frame"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="Video: ${esc(p.title)}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></section>`:''}
 <div class="poem-actions"><span>Giữ lại một dòng chữ, giữ lại một cảm xúc.</span><button id="share-bottom" type="button">Chia sẻ bài thơ ${svg('north',16)}</button></div></div></div><section class="related-wrap">${sectionHead('04','NẾU BẠN CÒN MUỐN Ở LẠI','Đọc thêm <em>một trang nữa.</em>','Đến thư viện','./list.html')}${libraryCards(poems.filter(q=>q.id!==p.id).slice(0,3))}</section><div class="detail-next"><a href="${poemURL(prev)}"><span>← BÀI TRƯỚC</span><strong>${esc(prev.title)}</strong></a><span>✳</span><a href="${poemURL(next)}"><span>BÀI TIẾP →</span><strong>${esc(next.title)}</strong></a></div>`;busy.remove();area.hidden=false;bindBookmarks();
 // Never restore flip mode automatically. Readers always enter normal reading mode.
 const flip=initializePaperStack();currentFlip=flip;flip.setPoem(p);
 let font=Number(localStorage.getItem('sakalis-font-size')||20);const apply=()=>{font=Math.max(15,Math.min(28,font));document.getElementById('poem-body').style.fontSize=`${font}px`;requestAnimationFrame(readingFit);};apply();document.fonts?.ready.then(readingFit);window.addEventListener('resize',readingFit,{passive:true,signal:routeController.signal});document.getElementById('smaller-font').addEventListener('click',()=>{font--;localStorage.setItem('sakalis-font-size',font);apply()});document.getElementById('larger-font').addEventListener('click',()=>{font++;localStorage.setItem('sakalis-font-size',font);apply()});
 const share=async()=>{try{if(navigator.share)await navigator.share({title:p.title,url:location.href});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href);toast('Đã sao chép liên kết.')}else toast('Hãy sao chép đường dẫn trên trình duyệt.')}catch(e){if(e.name!=='AbortError')toast('Không thể chia sẻ lúc này.')}};document.getElementById('share-poem').addEventListener('click',share);document.getElementById('share-bottom').addEventListener('click',share);
 const music=new Audio('./assets/audio/background.mp3');currentAudio=music;music.loop=true;music.preload='none';music.volume=.28;const mb=document.getElementById('music-toggle');mb.addEventListener('click',async()=>{if(music.paused){try{await music.play()}catch{toast('Không thể phát nhạc lúc này.')}}else music.pause()});music.addEventListener('play',()=>{mb.classList.add('playing');mb.setAttribute('aria-pressed','true')});music.addEventListener('pause',()=>{mb.classList.remove('playing');mb.setAttribute('aria-pressed','false')});window.addEventListener('pagehide',()=>music.pause(),{once:true,signal:routeController.signal});trackView(p.id);
 }catch(e){console.error('[Sakalis] detail',e);busy.innerHTML=errorMarkup(e)}}
// SPA Router: các link .html là deep link hợp lệ; nhấp trong ứng dụng dùng History API.
async function renderRoute(){
 const token=++routeID;
 routeController.abort();routeController=new AbortController();
 if(currentAudio){currentAudio.pause();currentAudio.src='';currentAudio=null;}
 if(currentFlip?.destroy)currentFlip.destroy();currentFlip=null;
 if(document.fullscreenElement){try{await document.exitFullscreen();}catch{}}
 document.documentElement.classList.remove('page-leaving','sakalis-stack-fullscreen');
 page=routeFromURL();args=new URLSearchParams(location.search);
 document.body.dataset.page=page;
 try{
  // Một promise CSV dùng suốt vòng đời của tab; sessionStorage dùng lại khi refresh.
  await loadPoems(); if(token!==routeID)return;
  if(page==='home')await home();else if(page==='list')await list();else if(page==='collection')await collection();else if(page==='collection-detail')await collectionDetail();else if(page==='detail')await detail();else if(page==='about')await about();else await home();
 }catch(e){console.error('[Sakalis SPA]',e);if(token===routeID)root.innerHTML=`<main class="fatal-fallback">${errorMarkup(e)}</main>`;}
}
function navigate(url,replace=false){
 try{
  if(replace)history.replaceState({sakalis:true},'',url);
  else history.pushState({sakalis:true},'',url);
 }catch(e){ // Một số trình duyệt hạn chế History API khi mở trực tiếp file://.
  window.location.assign(url);
  return;
 }
 window.scrollTo({top:0,behavior:'instant'});
 renderRoute();
}
document.addEventListener('click',e=>{
 const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||a.target&&a.target!=='_self'||a.hasAttribute('download'))return;
 let url;try{url=new URL(a.href,location.href)}catch{return;}
 if(url.origin!==location.origin||!url.pathname.match(/\.html$/i))return;
 e.preventDefault();if(url.href===location.href)return;navigate(url.href);
});
window.addEventListener('popstate',()=>{window.scrollTo({top:0,behavior:'instant'});renderRoute();});
window.addEventListener('sakalis:bookmarks',updateSavedCount);
if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
 let raf=0;document.addEventListener('pointermove',e=>{if(raf)return;const x=e.clientX,y=e.clientY;raf=requestAnimationFrame(()=>{raf=0;const hero=document.querySelector('.hero-art-image');if(hero){hero.style.setProperty('--mx',`${((x/innerWidth)-.5)*14}px`);hero.style.setProperty('--my',`${((y/innerHeight)-.5)*12}px`);}});},{passive:true});
}
renderRoute();
