/* SAKALIS — Data adapter. Các endpoint được giữ nguyên từ source 2026. */
export const API = Object.freeze({
  csv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSwvAAb6bsHp0cD_DlF5htJ9fSv1sqJ5njXKQPg4K7ICZ08TOZ7voL9dkMLT78W0nnXH5JdHXDi-o_m/pub?output=csv',
  views: 'https://script.google.com/macros/s/AKfycbxhDb3472BOmdCw4AvmPDpCR6bBFl2yCJwdLBCIrVHla9fYb2xnolNeulnY-2cQZQ1qJw/exec'
});
const IMAGE_COUNT = 13;
const CACHE_KEY = 'sakalis-poems-cache-v6';
const BOOKMARK_KEY = 'sakalis-bookmarks';
const norm = v => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
export const slug = v => norm(v).replace(/_/g,'-') || 'bai-tho';
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
export function parseCSV(input){
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
export function normalizePoems(records){return records.map((r,index)=>{
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
export async function loadPoems({force=false}={}){
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
export const newest = poems=>[...poems].sort((a,b)=>b.timestamp-a.timestamp||a.sheetIndex-b.sheetIndex);
export const popular = poems=>[...poems].sort((a,b)=>b.views-a.views||b.timestamp-a.timestamp);
export const poemURL = p=>`./detail.html?id=${encodeURIComponent(p.id)}&slug=${encodeURIComponent(p.slug)}`;
export const collectionURL = c=>`./collection-detail.html?name=${encodeURIComponent(c)}`;
export const topicURL = t=>`./list.html?topic=${encodeURIComponent(t)}`;
export const collectionGroups = poems => {
 const groups=new Map();for(const p of poems){if(!p.collection)continue;const k=norm(p.collection);if(!groups.has(k))groups.set(k,{name:p.collection,poems:[]});groups.get(k).poems.push(p);}return [...groups.values()].sort((a,b)=>b.poems.length-a.poems.length);
};
export const topicGroups = poems => {
 const groups=new Map();for(const p of poems)for(const t of p.topics){const k=norm(t);if(!groups.has(k))groups.set(k,{name:t,poems:[]});groups.get(k).poems.push(p);}return [...groups.values()].sort((a,b)=>b.poems.length-a.poems.length);
};
export const photo = (p,index=0)=>{
 const img=String(p?.image??'').trim();
 if(img && /^(https?:\/\/|\.\.?\/|assets\/)/i.test(img) && !/^javascript:/i.test(img))return img;
 const seed=String(p?.id??`${index}`);let hash=0;for(const c of seed)hash=(hash*31+c.charCodeAt(0))|0;
 return `./assets/images/svg-art/sakalis-${String((Math.abs(hash)%IMAGE_COUNT)+1).padStart(2,'0')}.svg`;
};
export const excerpt = (p,limit=150)=>{const text=String(p?.content??'').replace(/\n+/g,' · ').replace(/\s+/g,' ').trim();return text.length>limit?text.slice(0,limit).replace(/\s+\S*$/,'')+'…':text;};
export const formatNumber = x=>new Intl.NumberFormat('vi-VN').format(Number(x)||0);
export const formatDate = d=>d instanceof Date&&!isNaN(d)?new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d):'';
export const compositionDate = p=>p.startDate&&p.endDate&&p.startDate.getTime()!==p.endDate.getTime()?`${formatDate(p.startDate)} – ${formatDate(p.endDate)}`:formatDate(p.endDate||p.startDate)||(p.year?String(p.year):'Chưa ghi ngày');
export const esc = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const query = v=>norm(v).replace(/_/g,' ');
export function bookmarks(){try{const v=JSON.parse(localStorage.getItem(BOOKMARK_KEY)||'[]');return new Set(Array.isArray(v)?v.map(String):[]);}catch{return new Set();}}
export function toggleBookmark(id){const all=bookmarks();const key=String(id);all.has(key)?all.delete(key):all.add(key);try{localStorage.setItem(BOOKMARK_KEY,JSON.stringify([...all]));}catch{}window.dispatchEvent(new CustomEvent('sakalis:bookmarks'));return all.has(key);}
export function trackView(id){if(!id)return;const url=new URL(API.views);url.searchParams.set('action','increment');url.searchParams.set('id',String(id));url.searchParams.set('_',String(Date.now()));const img=new Image();img.onload=img.onerror=()=>img.remove();img.style.display='none';img.src=url.href;document.body.append(img);setTimeout(()=>img.remove(),12000);}
export function youtubeId(raw){const s=String(raw||'').trim();if(!s)return null;try{const u=new URL(s);if(u.hostname==='youtu.be')return /^[\w-]{11}$/.test(u.pathname.slice(1))?u.pathname.slice(1):null;if(u.hostname.endsWith('youtube.com')||u.hostname==='youtube-nocookie.com'){const v=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();return /^[\w-]{11}$/.test(v)?v:null;}}catch{}return null;}
