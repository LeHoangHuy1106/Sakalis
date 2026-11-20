/* SAKALIS v4 · Vanilla JavaScript / Classic bundle. */
'use strict';

/* SAKALIS — Data adapter. Các endpoint được giữ nguyên từ source 2026. */
const API = Object.freeze({
  csv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSwvAAb6bsHp0cD_DlF5htJ9fSv1sqJ5njXKQPg4K7ICZ08TOZ7voL9dkMLT78W0nnXH5JdHXDi-o_m/pub?output=csv',
  views: 'https://script.google.com/macros/s/AKfycbxhDb3472BOmdCw4AvmPDpCR6bBFl2yCJwdLBCIrVHla9fYb2xnolNeulnY-2cQZQ1qJw/exec'
});
const IMAGE_COUNT = 11;
const CACHE_KEY = 'sakalis-poems-cache-v3';
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
  if(!force)try{const cache=JSON.parse(sessionStorage.getItem(CACHE_KEY)||'null');if(cache && Date.now()-cache.time<180000 && cache.csv){return normalizePoems(parseCSV(cache.csv));}}catch{}
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
const collectionURL = c=>`./list.html?collection=${encodeURIComponent(c)}`;
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


/* =========================================================
   SAKALIS - Trình đọc thơ lật trang 3D
   Không thay đổi nội dung Google Sheets hoặc kiểu đọc cũ.
   Tạo trang từ văn bản thuần, tự phân trang theo khổ giấy.
   ========================================================= */

const READING_MODE_KEY = "sakalis-detail-reading-mode";
const ANIMATION_MS = 880;
const LINES_PER_PAGE = 10;
const CURL_SEGMENTS = 24;
const REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
}

function makePoemLines(content) {
    if (!String(content ?? "").trim()) {
        return [{ text: "Bài thơ chưa có nội dung.", stanzaStart: false }];
    }

    const stanzas = String(content)
        .replace(/\r\n?/g, "\n")
        .split(/\n\s*\n/)
        .map((stanza) => stanza.trim())
        .filter(Boolean);
    const lines = [];

    stanzas.forEach((stanza, stanzaIndex) => {
        stanza.split("\n").forEach((line, lineIndex) => {
            lines.push({
                text: line.trimEnd(),
                stanzaStart: stanzaIndex > 0 && lineIndex === 0
            });
        });
    });
    return lines;
}

function makeLineNode(line, firstOnPage = false) {
    const el = createElement("span", "flipbook-line", line.text || "\u00a0");
    if (line.stanzaStart && !firstOnPage) el.classList.add("flipbook-stanza-start");
    if (line.fit && line.fit < 0.999) el.style.transform = `scaleX(${line.fit})`;
    return el;
}

function createPage(page, number, total, poem) {
    const paper = createElement("div", `flipbook-paper flipbook-paper-${page.type}`);
    const inner = createElement("div", "flipbook-paper-inner");
    paper.append(inner);

    if (page.type === "cover") {
        inner.append(createElement("div", "flipbook-cover-imprint", "SAKALIS"));
        const coverMiddle = createElement("div", "flipbook-cover-middle");
        coverMiddle.append(createElement("div", "flipbook-cover-ornament", "❧"));
        coverMiddle.append(createElement("div", "flipbook-cover-category", poem.collection || "THI CA · TẢN VĂN"));
        coverMiddle.append(createElement("h2", "flipbook-cover-title", poem.title || "Bài thơ"));
        coverMiddle.append(createElement("div", "flipbook-cover-rule"));
        coverMiddle.append(createElement("div", "flipbook-cover-by", "BNA"));
        inner.append(coverMiddle);
        inner.append(createElement("div", "flipbook-cover-bottom", "MỘT TRANG KÝ ỨC"));
        return paper;
    }

    if (page.type === "end") {
        inner.append(createElement("div", "flipbook-cover-imprint", "SAKALIS"));
        const ending = createElement("div", "flipbook-end-middle");
        ending.append(createElement("div", "flipbook-end-ornament", "❦"));
        ending.append(createElement("p", "flipbook-end-word", "Hết"));
        ending.append(createElement("div", "flipbook-end-rule"));
        ending.append(createElement("p", "flipbook-end-author", "BNA"));
        inner.append(ending);
        inner.append(createElement("div", "flipbook-cover-bottom", "SAKALIS · CREATIVE ARCHIVE"));
        return paper;
    }

    const heading = createElement("div", "flipbook-page-heading");
    heading.append(createElement("span", "", "SAKALIS"));
    heading.append(createElement("span", "flipbook-page-heading-title", poem.title || "BÀI THƠ"));
    inner.append(heading);

    const body = createElement("div", "flipbook-page-body");
    const text = createElement("div", "flipbook-poem-text");
    (page.lines || []).forEach((line, index) => text.append(makeLineNode(line, index === 0)));
    body.append(text);
    inner.append(body);

    const footer = createElement("div", "flipbook-page-footer");
    footer.append(createElement("span", "", "BNA"));
    footer.append(createElement("span", "", `${number} / ${total}`));
    inner.append(footer);
    return paper;
}

/**
 * Mỗi dòng gốc của tác giả phải nằm TRÊN MỘT DÒNG GIẤY.
 * Nhóm 10 dòng mỗi trang, giữ dấu ngắt khổ và điều chỉnh cỡ chữ/độ rộng chữ
 * theo diện tích trang thực tế. Không tự cắt một câu xuống hàng tiếp theo.
 */
function paginatePoem(stage, lines, width, height, poem, baseFontSize) {
    const measurePage = createPage({ type: "poem", lines: [] }, 1, 1, poem);
    measurePage.classList.add("flipbook-measure");
    measurePage.style.width = `${width}px`;
    measurePage.style.height = `${height}px`;
    stage.append(measurePage);
    const body = measurePage.querySelector(".flipbook-page-body");
    const text = measurePage.querySelector(".flipbook-poem-text");
    const availableWidth = Math.max(120, body.clientWidth);
    const bodyStyle = getComputedStyle(body);
    const availableHeight = Math.max(120, body.clientHeight -
        parseFloat(bodyStyle.paddingTop || 0) - parseFloat(bodyStyle.paddingBottom || 0));
    const family = getComputedStyle(text).fontFamily;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const measured = (fontSize) => {
        if (!context) return [];
        context.font = `400 ${fontSize}px ${family}`;
        return lines.map((line) => context.measureText(line.text || " ").width);
    };
    const samples = measured(baseFontSize).sort((a, b) => a - b);
    const typicalLongest = samples[Math.min(samples.length - 1, Math.floor(samples.length * .90))] || 1;
    // Ưu tiên kích thước dễ đọc, chỉ nén ngang những dòng dài bất thường.
    let fontSize = Math.min(baseFontSize, baseFontSize * (availableWidth - 5) / Math.max(1, typicalLongest));
    fontSize = Math.max(width < 330 ? 11.1 : 12.0, fontSize);
    // Nếu màn hình rất thấp, vòng phân trang bên dưới tự giảm số dòng.
    // Giữ cỡ chữ ở mức dễ đọc thay vì ép 10 dòng bằng mọi giá.
    stage.closest(".flipbook-reader")?.style.setProperty("--flipbook-font-size", `${fontSize.toFixed(2)}px`);
    const widths = measured(fontSize);
    const prepared = lines.map((line, i) => ({
        ...line,
        fit: widths[i] > availableWidth - 3 ? (availableWidth - 3) / widths[i] : 1
    }));
    const pages = [];
    let current = [];
    for (const line of prepared) {
        if (current.length >= LINES_PER_PAGE) {
            pages.push({ type: "poem", lines: current });
            current = [];
            text.replaceChildren();
        }
        const node = makeLineNode(line, current.length === 0);
        text.append(node);
        if (current.length > 0 && text.scrollHeight > availableHeight + 1) {
            node.remove();
            pages.push({ type: "poem", lines: current });
            current = [];
            text.replaceChildren();
            text.append(makeLineNode(line, true));
        }
        current.push(line);
    }
    if (current.length) pages.push({ type: "poem", lines: current });
    measurePage.remove();
    return pages.length ? pages : [{ type: "poem", lines: [] }];
}

function initializeFlipbookReader() {
    const reader = document.querySelector("#flipbook-reader");
    const stage = document.querySelector("#flipbook-stage");
    const book = document.querySelector("#flipbook-book");
    const left = document.querySelector("#flipbook-left");
    const right = document.querySelector("#flipbook-right");
    const curlLayer = document.querySelector("#flipbook-curl-layer");
    const fullscreenButton = document.querySelector("#flipbook-fullscreen");
    const backButton = document.querySelector("#flipbook-previous");
    const nextButton = document.querySelector("#flipbook-next");
    const seek = document.querySelector("#flipbook-seek");
    const pageLabel = document.querySelector("#flipbook-page-label");
    const nameLabel = document.querySelector("#flipbook-reader-name");
    const oldLayout = document.querySelector("#poem-detail-layout");
    const modeButtons = Array.from(document.querySelectorAll("[data-reader-mode]"));
    if (!reader || !stage || !book || !oldLayout || !curlLayer || !seek) {
        return { setPoem() {} };
    }

    let storedMode = "scroll";
    try {
        storedMode = "scroll"; // Không khôi phục flip từ phiên trước: đọc thơ là mặc định.
    } catch (_) { /* Chế độ riêng tư có thể khóa localStorage. */ }

    const state = {
        poem: null,
        mode: storedMode,
        pages: [],
        single: false,
        spread: 0,
        width: 420,
        height: 586,
        busy: false,
        pointer: null,
        animationFrame: null,
        animationToken: 0,
        resizeTimer: null,
        dragCorner: 1
    };

    const maxSpread = () => state.single
        ? Math.max(0, state.pages.length - 1)
        : Math.max(0, Math.ceil((state.pages.length - 1) / 2));

    const firstVisibleIndex = () => state.single
        ? state.spread
        : state.spread === 0 ? 0 : 2 * state.spread - 1;

    function pageAt(index) {
        return index !== null && index >= 0 ? (state.pages[index] || null) : null;
    }

    function paint(host, index) {
        const page = pageAt(index);
        host.replaceChildren(page ? createPage(page, index + 1, state.pages.length, state.poem) : createElement("div", "flipbook-empty-paper"));
    }

    function updateNavigation() {
        const count = state.pages.length;
        const first = Math.min(firstVisibleIndex(), Math.max(0, count - 1));
        if (state.single || state.spread === 0) {
            pageLabel.textContent = `Trang ${first + 1} / ${count}`;
        } else {
            const last = Math.min(first + 2, count);
            pageLabel.textContent = last === first + 1
                ? `Trang ${first + 1} / ${count}`
                : `Trang ${first + 1}–${last} / ${count}`;
        }
        backButton.disabled = state.busy || state.spread <= 0;
        nextButton.disabled = state.busy || state.spread >= maxSpread();
        seek.max = String(Math.max(1, count));
        seek.value = String(first + 1);
        seek.disabled = state.busy || count <= 1;
        seek.style.setProperty("--seek-progress", `${count > 1 ? 100 * first / (count - 1) : 0}%`);
    }

    function draw() {
        if (!state.poem || state.pages.length === 0) return;
        book.classList.toggle("flipbook-is-single", state.single);
        book.style.width = `${state.width * (state.single ? 1 : 2)}px`;
        book.style.height = `${state.height}px`;
        if (state.single) {
            left.hidden = true;
            paint(right, state.spread);
        } else {
            left.hidden = false;
            paint(left, state.spread === 0 ? null : state.spread * 2 - 1);
            paint(right, state.spread * 2);
        }
        curlLayer.hidden = true;
        updateNavigation();
    }

    function clearFlip() {
        state.animationToken += 1;
        if (state.animationFrame !== null) cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
        state.pointer = null;
        state.busy = false;
        curlLayer.hidden = true;
        curlLayer.replaceChildren();
        curlLayer.style.transform = "none";
    }

    function rebuild(preserve = false) {
        if (!state.poem || reader.hidden) return;
        const previousTotal = state.pages.length;
        const previousIndex = firstVisibleIndex();
        clearFlip();

        const available = Math.max(245, stage.clientWidth);
        const isFullscreen = document.fullscreenElement === reader || reader.classList.contains("is-fullscreen-fallback");
        state.single = available < 710;
        const maxWidth = isFullscreen ? 600 : 432;
        const widthForStage = Math.floor((available - (state.single ? 8 : 28)) / (state.single ? 1 : 2));
        const heightForStage = isFullscreen ? Math.max(250, stage.clientHeight - 30) : Infinity;
        state.width = Math.max(215, Math.min(maxWidth, widthForStage, Math.floor(heightForStage / 1.40)));
        state.height = Math.round(state.width * 1.40);
        const baseFont = state.width < 330 ? 13.7 : state.width < 380 ? 14.8 : 16.2;
        reader.style.setProperty("--flipbook-font-size", `${baseFont}px`);
        reader.style.setProperty("--flipbook-page-width", `${state.width}px`);
        reader.style.setProperty("--flipbook-page-height", `${state.height}px`);

        const lines = makePoemLines(state.poem.content);
        const contentPages = paginatePoem(stage, lines, state.width, state.height, state.poem, baseFont);
        state.pages = [{ type: "cover" }, ...contentPages, { type: "end" }];
        const scaledIndex = preserve && previousTotal > 1
            ? Math.round((previousIndex / (previousTotal - 1)) * (state.pages.length - 1))
            : 0;
        state.spread = state.single ? scaledIndex : Math.ceil(scaledIndex / 2);
        state.spread = clamp(state.spread, 0, maxSpread());
        draw();
    }

    /**
     * Một trang giấy = 24 dải 3D liền nhau. Góc của từng dải thay đổi
     * theo vị trí trên tờ giấy, vì vậy toàn trang tạo thành một mặt cong
     * (không phải một tấm phẳng rotateY 180°).
     * Mặt sau được đảo đối xứng để chữ vẫn đọc xuôi sau khi lật.
     */
    function createCurlSurface(page, pageIndex, back, start, pieceWidth) {
        const face = createElement("div", back ? "flipbook-strip-back" : "flipbook-strip-front");
        face.style.width = `${pieceWidth + 1.5}px`;
        const paper = page ? createPage(page, pageIndex + 1, state.pages.length, state.poem)
            : createElement("div", "flipbook-empty-paper");
        paper.style.width = `${state.width}px`;
        paper.style.height = `${state.height}px`;
        paper.style.position = "absolute";
        paper.style.left = `${-start}px`;
        paper.style.top = "0";
        if (back) paper.style.transform = "scaleX(-1)";
        face.append(paper);
        return face;
    }

    function prepareCurl(frontIndex, backIndex) {
        curlLayer.replaceChildren();
        curlLayer.style.left = `${state.single ? 0 : state.width}px`;
        curlLayer.style.width = `${state.width}px`;
        curlLayer.style.height = `${state.height}px`;
        const pieceWidth = state.width / CURL_SEGMENTS;
        const strips = [];
        for (let i = 0; i < CURL_SEGMENTS; i += 1) {
            const start = i * pieceWidth;
            const strip = createElement("div", "flipbook-curl-strip");
            strip.style.width = `${pieceWidth + 1.5}px`;
            strip.style.height = `${state.height}px`;
            strip.append(
                createCurlSurface(pageAt(frontIndex), frontIndex, false, start, pieceWidth),
                createCurlSurface(pageAt(backIndex), backIndex, true, start, pieceWidth)
            );
            curlLayer.append(strip);
            strips.push(strip);
        }
        curlLayer.hidden = false;
        return strips;
    }

    let strips = [];
    function renderCurl(turn) {
        const t = clamp(turn, 0, 1);
        const pieceWidth = state.width / CURL_SEGMENTS;
        const baseAngle = Math.PI * t;
        const bend = .99 * Math.sin(Math.PI * t);
        let x = 0;
        let z = 0;
        for (let i = 0; i < strips.length; i += 1) {
            // Góc riêng từng dải, tích phân vị trí để các dải nối nhau.
            const s = (i + .5) / CURL_SEGMENTS;
            const theta = baseAngle - bend * Math.sin(Math.PI * s);
            const strip = strips[i];
            strip.style.transform = `translate3d(${x.toFixed(3)}px,0,${z.toFixed(3)}px) rotateY(${(-theta).toFixed(5)}rad)`;
            strip.style.setProperty("--flipbook-strip-shade", `${Math.min(.83, Math.abs(Math.sin(theta)) * .49 + Math.sin(Math.PI * t) * .19).toFixed(3)}`);
            x += pieceWidth * Math.cos(theta);
            z += pieceWidth * Math.sin(theta);
        }
        const skew = state.dragCorner * -7 * Math.sin(Math.PI * t);
        curlLayer.style.transform = `skewY(${skew.toFixed(2)}deg)`;
        curlLayer.style.setProperty("--flipbook-fold-shadow", `${(.17 + .30 * Math.sin(Math.PI * t)).toFixed(2)}`);
    }

    function prepareFlip(direction) {
        if (state.busy || !state.pages.length) return false;
        const target = state.spread + direction;
        if (target < 0 || target > maxSpread()) return false;
        state.busy = true;
        let frontIndex;
        let backIndex;
        if (state.single) {
            paint(right, direction > 0 ? target : state.spread);
            frontIndex = direction > 0 ? state.spread : target;
            backIndex = null; // Mặt sau là trang trắng như một tờ giấy lẻ.
        } else if (direction > 0) {
            paint(left, state.spread === 0 ? null : state.spread * 2 - 1);
            paint(right, target * 2);
            frontIndex = state.spread * 2;
            backIndex = target * 2 - 1;
        } else {
            paint(left, target === 0 ? null : target * 2 - 1);
            paint(right, state.spread * 2);
            frontIndex = target * 2;
            backIndex = state.spread * 2 - 1;
        }
        strips = prepareCurl(frontIndex, backIndex);
        setProgress(direction, 0);
        updateNavigation();
        return true;
    }

    function setProgress(direction, progress) {
        renderCurl(direction > 0 ? progress : 1 - progress);
    }

    function settle(direction, complete, fromProgress = 0) {
        const startProgress = clamp(fromProgress, 0, 1);
        const targetProgress = complete ? 1 : 0;
        const distance = Math.abs(targetProgress - startProgress);
        const duration = REDUCED_MOTION?.matches ? 0 : Math.max(120, ANIMATION_MS * distance);
        const token = ++state.animationToken;
        let startTime = null;
        const animate = (time) => {
            if (token !== state.animationToken) return;
            if (startTime === null) startTime = time;
            const t = duration ? clamp((time - startTime) / duration, 0, 1) : 1;
            // Ease-in-out quintic: tăng tốc nhẹ, giảm tốc mềm khi giấy đáp xuống.
            const eased = t < .5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
            setProgress(direction, startProgress + (targetProgress - startProgress) * eased);
            if (t < 1) {
                state.animationFrame = requestAnimationFrame(animate);
            } else {
                if (complete) state.spread = clamp(state.spread + direction, 0, maxSpread());
                clearFlip();
                draw();
            }
        };
        state.animationFrame = requestAnimationFrame(animate);
    }

    function flip(direction) {
        if (!prepareFlip(direction)) return;
        settle(direction, true, 0);
    }

    function goToPage(pageOneBased) {
        if (state.busy) return;
        const index = clamp(Number(pageOneBased) - 1, 0, state.pages.length - 1);
        state.spread = state.single ? index : Math.ceil(index / 2);
        draw();
    }

    function setMode(mode) {
        if (mode !== "scroll" && mode !== "flip") return;
        state.mode = mode;
        const isFlip = mode === "flip";
        oldLayout.hidden = isFlip;
        reader.hidden = !isFlip;
        modeButtons.forEach((button) => {
            const selected = button.dataset.readerMode === mode;
            button.classList.toggle("is-active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        try { localStorage.setItem(READING_MODE_KEY, mode); } catch (_) {}
        if (isFlip && state.poem) {
            // Trước khi đo giấy cần bỏ hidden để clientHeight đúng.
            requestAnimationFrame(() => rebuild(false));
        } else {
            clearFlip();
            if (reader.classList.contains("is-fullscreen-fallback")) exitFallbackFullscreen();
            if (document.fullscreenElement === reader) document.exitFullscreen().catch(() => {});
        }
    }

    function pointerPosition(event) {
        const rect = book.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function pointerDown(event) {
        if (event.button !== undefined && event.button !== 0) return;
        if (!state.poem || state.busy || reader.hidden) return;
        const pos = pointerPosition(event);
        if (pos.y < 0 || pos.y > state.height) return;
        const bookWidth = state.width * (state.single ? 1 : 2);
        const edge = Math.max(65, state.width * 0.34);
        const direction = pos.x >= bookWidth - edge ? 1 : pos.x <= edge ? -1 : 0;
        if (direction === 0 || !prepareFlip(direction)) return;
        state.dragCorner = pos.y < state.height / 2 ? -1 : 1;
        state.pointer = {
            id: event.pointerId,
            startX: event.clientX,
            progress: 0,
            direction,
            moved: false
        };
        book.setPointerCapture?.(event.pointerId);
    }

    function pointerMove(event) {
        const drag = state.pointer;
        if (!drag || drag.id !== event.pointerId) return;
        const delta = drag.direction > 0 ? drag.startX - event.clientX : event.clientX - drag.startX;
        const progress = clamp(delta / (state.width * (state.single ? 0.95 : 1.65)), 0, 1);
        if (Math.abs(event.clientX - drag.startX) > 6) drag.moved = true;
        drag.progress = progress;
        if (drag.moved) {
            if (event.cancelable) event.preventDefault();
            setProgress(drag.direction, progress);
        }
    }

    function pointerUp(event, cancelled = false) {
        const drag = state.pointer;
        if (!drag || drag.id !== event.pointerId) return;
        state.pointer = null;
        try { book.releasePointerCapture?.(event.pointerId); } catch (_) {}
        const complete = !cancelled && (!drag.moved || drag.progress > 0.26);
        settle(drag.direction, complete, drag.progress);
    }

    function isFullscreen() {
        return document.fullscreenElement === reader || reader.classList.contains("is-fullscreen-fallback");
    }

    function updateFullscreenButton() {
        if (!fullscreenButton) return;
        const active = isFullscreen();
        fullscreenButton.classList.toggle("is-active", active);
        fullscreenButton.setAttribute("aria-label", active ? "Thoát toàn màn hình" : "Mở toàn màn hình");
        fullscreenButton.setAttribute("aria-pressed", String(active));
        const label = fullscreenButton.querySelector(".flipbook-fullscreen-label");
        if (label) label.textContent = active ? "Thu nhỏ" : "Toàn màn hình";
    }

    function exitFallbackFullscreen() {
        reader.classList.remove("is-fullscreen-fallback");
        document.documentElement.classList.remove("sakalis-flipbook-fullscreen");
        updateFullscreenButton();
        if (!reader.hidden) requestAnimationFrame(() => rebuild(true));
    }

    async function toggleFullscreen() {
        if (document.fullscreenElement === reader) {
            try { await document.exitFullscreen(); } catch (error) { console.warn(error); }
        } else if (reader.classList.contains("is-fullscreen-fallback")) {
            exitFallbackFullscreen();
        } else {
            try {
                if (!reader.requestFullscreen) throw new Error("Fullscreen API unavailable");
                await reader.requestFullscreen();
            } catch (_) {
                // iOS Safari cũ không hỗ trợ Fullscreen trên thẻ section.
                reader.classList.add("is-fullscreen-fallback");
                document.documentElement.classList.add("sakalis-flipbook-fullscreen");
                updateFullscreenButton();
                requestAnimationFrame(() => rebuild(true));
            }
        }
    }

    fullscreenButton?.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", () => {
        updateFullscreenButton();
        if (!reader.hidden) requestAnimationFrame(() => rebuild(true));
    });

    for (const button of modeButtons) {
        button.addEventListener("click", () => setMode(button.dataset.readerMode));
    }
    backButton.addEventListener("click", () => flip(-1));
    nextButton.addEventListener("click", () => flip(1));
    seek.addEventListener("input", () => goToPage(seek.value));
    book.addEventListener("pointerdown", pointerDown);
    book.addEventListener("pointermove", pointerMove);
    book.addEventListener("pointerup", (event) => pointerUp(event));
    book.addEventListener("pointercancel", (event) => pointerUp(event, true));
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && reader.classList.contains("is-fullscreen-fallback")) {
            exitFallbackFullscreen();
            return;
        }
        if (reader.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            flip(event.key === "ArrowRight" ? 1 : -1);
        }
    });
    window.addEventListener("resize", () => {
        if (reader.hidden || !state.poem) return;
        clearTimeout(state.resizeTimer);
        state.resizeTimer = setTimeout(() => rebuild(true), 180);
    });
    document.fonts?.ready.then(() => {
        if (!reader.hidden && state.poem) rebuild(true);
    });

    return {
        setPoem(poem) {
            state.poem = poem;
            nameLabel.textContent = poem.title || "Bài thơ";
            state.pages = [];
            state.spread = 0;
            setMode(state.mode);
        }
    };
}


/* Sakalis / quiet edition. Vanilla JS, giữ nguyên Google Sheets + Apps Script. */
const root=document.getElementById('app');
const page=({index:'home'}[document.body.dataset.page]||document.body.dataset.page||'home');
const args=new URLSearchParams(location.search);
const svg=(name,size=19)=>{
 const paths={search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',north:'<path d="M5 19 19 5M8 5h11v11"/>',book:'<path d="M3 5.5c4-1.8 7-1.5 9 0 2-1.5 5-1.8 9 0v14c-4-1.8-7-1.5-9 0-2-1.5-5-1.8-9 0zM12 5.5v14"/>',save:'<path d="M6 3h12v18l-6-4-6 4z"/>',menu:'<path d="M3 7h18M3 12h18M3 17h18"/>',close:'<path d="M5 5 19 19M19 5 5 19"/>',play:'<path d="m9 5 10 7-10 7z"/>',headphones:'<path d="M3 13v-2a9 9 0 0 1 18 0v2M3 13v6h4v-6H3Zm14 0v6h4v-6h-4Z"/>',share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14M12 5v14"/>'};
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
};
function urlImage(p,i=0){return esc(photo(p,i));}
function image(p,i=0,extra=''){return `<img src="${urlImage(p,i)}" alt="${esc(p.title||'Khung cảnh thơ')}" loading="lazy" onerror="this.onerror=null;this.src='./assets/images/image-05.webp'" ${extra}>`;}
function getSaved(){return bookmarks();}
function nav(){return `<header class="header"><div class="shell header-inner"><a class="logo" href="./index.html" aria-label="Sakalis, trang chủ"><span class="logo-glyph" aria-hidden="true">✽</span><span>sakalis</span></a><nav class="nav-links" aria-label="Điều hướng"><a href="./index.html" ${page==='home'?'aria-current="page"':''}>Trang đầu</a><a href="./list.html" ${page==='list'?'aria-current="page"':''}>Thư viện thơ</a><a href="./collection.html?type=collection" ${page==='collection'&&args.get('type')!=='topic'?'aria-current="page"':''}>Tập thơ</a><a href="./collection.html?type=topic" ${page==='collection'&&args.get('type')==='topic'?'aria-current="page"':''}>Chủ đề</a></nav><div class="nav-right"><a class="nav-saved" href="./list.html?filter=saved" title="Bài đã lưu" aria-label="Bài thơ đã lưu">${svg('save',19)}<span id="saved-count">0</span></a><button class="nav-menu" id="nav-menu" type="button" aria-label="Mở menu" aria-expanded="false">${svg('menu',21)}</button></div></div><nav class="nav-mobile" id="nav-mobile" aria-label="Điều hướng trên điện thoại"><a href="./index.html">Trang đầu</a><a href="./list.html">Thư viện thơ</a><a href="./collection.html?type=collection">Tập thơ</a><a href="./collection.html?type=topic">Chủ đề</a><a href="./list.html?filter=saved">Bài đã lưu</a></nav></header>`;}
function footer(){return `<footer class="footer"><div class="shell footer-main"><div><a class="footer-logo" href="./index.html">✽ sakalis</a><p>Một nơi nhỏ, để câu thơ được ở lại.</p></div><div class="footer-linksets"><div><small>GHÉ THĂM</small><a href="./list.html">Thư viện thơ</a><a href="./collection.html?type=collection">Những tập thơ</a></div><div><small>GÓC CỦA BẠN</small><a href="./list.html?filter=saved">Thơ đã lưu</a><a href="./collection.html?type=topic">Theo cảm xúc</a></div></div></div><div class="shell footer-under"><span>© ${new Date().getFullYear()} Sakalis</span><span>Chữ nghĩa đôi khi là một mái nhà.</span></div></footer>`;}
function mount(content,cls=''){root.innerHTML=nav()+`<main class="${cls}">${content}</main>`+footer()+`<div class="toast" role="status" aria-live="polite" id="toast"></div>`;initChrome();}
function initChrome(){const navButton=document.getElementById('nav-menu');const mobile=document.getElementById('nav-mobile');navButton?.addEventListener('click',()=>{const opened=mobile.classList.toggle('open');navButton.setAttribute('aria-expanded',String(opened));navButton.innerHTML=svg(opened?'close':'menu',21);});updateSavedCount();window.addEventListener('sakalis:bookmarks',updateSavedCount);
 const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}})},{threshold:.08,rootMargin:'0px 0px 55px 0px'});
 const watch=()=>document.querySelectorAll('.appear:not(.appear-ready)').forEach(el=>{el.classList.add('appear-ready');observer.observe(el)});watch();new MutationObserver(watch).observe(document.querySelector('main'),{subtree:true,childList:true});
 // Parallax rất nhẹ, chỉ dùng trong ảnh đầu trang, tắt khi giảm chuyển động.
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){window.addEventListener('pointermove',e=>{const target=document.querySelector('.hero-photo img');if(!target)return;const rect=target.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;const x=(e.clientX/innerWidth-.5)*9,y=(e.clientY/innerHeight-.5)*7;target.style.setProperty('--px',`${x}px`);target.style.setProperty('--py',`${y}px`);},{passive:true});}
}
function updateSavedCount(){const target=document.getElementById('saved-count');if(target)target.textContent=getSaved().size;}
let timer;function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('visible'),2800);}
function errorMarkup(e){return `<div class="notice"><span class="minor">MỘT CHÚT GIÁN ĐOẠN</span><h2>Thư viện đang tạm khép.</h2><p>Chưa thể tải thơ từ Google Sheets. Hãy kiểm tra kết nối rồi thử lại.</p><button onclick="location.reload()" class="pill-btn">Tải lại ${svg('arrow',16)}</button><small>${esc(e?.message||'Không thể kết nối')}</small></div>`;}
function loading(){return `<div class="loading"><span class="loading-flower">✽</span><p>Đang tìm những dòng thơ…</p></div>`;}
function bookmarkButton(p,extra=''){const saved=getSaved().has(String(p.id));return `<button type="button" class="save-btn ${extra} ${saved?'saved':''}" data-save-id="${esc(p.id)}" aria-label="${saved?'Bỏ lưu':'Lưu bài thơ'}" aria-pressed="${saved}">${svg('save',19)}</button>`;}
function bindBookmarks(scope=document){scope.addEventListener('click',e=>{const button=e.target.closest('[data-save-id]');if(!button)return;e.preventDefault();e.stopPropagation();const active=toggleBookmark(button.dataset.saveId);document.querySelectorAll('[data-save-id]').forEach(el=>{if(el.dataset.saveId===button.dataset.saveId){el.classList.toggle('saved',active);el.setAttribute('aria-pressed',String(active));el.setAttribute('aria-label',active?'Bỏ lưu':'Lưu bài thơ');}});toast(active?'Đã cất bài thơ vào mục Đã lưu.':'Đã bỏ khỏi mục Đã lưu.');});}
const heading=(kicker,title,link,href)=>`<div class="section-heading"><div><span class="minor">${kicker}</span><h2>${title}</h2></div>${link?`<a class="quiet-link" href="${href}">${link} ${svg('arrow',17)}</a>`:''}</div>`;
const poemLead=p=>String(p?.content||'').split(/\n/).map(s=>s.trim()).filter(Boolean).slice(0,4);
function poemCard(p,i=0){return `<article class="poem-card appear" style="--delay:${(i%6)*45}ms"><a href="${poemURL(p)}" class="poem-thumb"><span class="poem-thumb-glow"></span>${image(p,i)}<span class="poem-thumb-number">${String(i+1).padStart(2,'0')}</span></a><div class="poem-card-copy"><span class="minor">${esc(p.collection||p.topics[0]||'BÀI THƠ')} · ${esc(p.year||'')}</span><div class="poem-card-head"><h3><a href="${poemURL(p)}">${esc(p.title)}</a></h3>${bookmarkButton(p)}</div><p>${esc(excerpt(p,105)||'Mời bạn đọc một chút tĩnh lặng…')}</p><a class="inline-more" href="${poemURL(p)}">Đọc bài thơ ${svg('arrow',15)}</a></div></article>`;}
function bookCard(group,i=0){const p=group.poems[0];const coverChoices=[6,4,3,10,7,9,8,2];const coverPhoto=p.image?urlImage(p):`./assets/images/image-${String(coverChoices[i%coverChoices.length]).padStart(2,'0')}.webp`;const variants=['book-ink','book-pale','book-silver','book-mist','book-dark'];return `<a class="book-card appear" href="${collectionURL(group.name)}" style="--delay:${(i%6)*65}ms"><div class="book-object ${variants[i%variants.length]}"><div class="book-photo"><img src="${coverPhoto}" loading="lazy" alt="Ảnh bìa ${esc(group.name)}" onerror="this.onerror=null;this.src='./assets/images/image-06.webp'"></div><span class="book-grain"></span><span class="book-spine"></span><div class="book-cover-writing"><span class="book-imprint">SAKALIS · THƠ</span><strong>${esc(group.name)}</strong><span class="book-cover-rule"></span><small>BNA <span>✽</span></small></div></div><div class="book-caption"><span>${esc(group.name)}</span><small>${formatNumber(group.poems.length)} bài thơ ${svg('north',13)}</small></div></a>`;}
function topicPill(name,i=0){return `<a href="${topicURL(name)}" class="topic-pill">${String(i+1).padStart(2,'0')} <span>${esc(name)}</span>${svg('north',15)}</a>`;}

async function home(){mount(`<div class="shell"><div id="home-content">${loading()}</div></div>`,'home-page');const slot=document.getElementById('home-content');try{const poems=newest(await loadPoems());if(!poems.length){slot.innerHTML='<div class="notice"><h2>Chưa có bài thơ nào.</h2></div>';return;}const feat=poems.find(p=>p.featured)||poems[0];const groups=collectionGroups(poems).slice(0,4);const topics=topicGroups(poems).slice(0,6);const more=poems.filter(p=>p.id!==feat.id).slice(0,6);
 const nextFeature=poems.find(p=>String(p.id)!==String(feat.id))||feat;const firstLines=poemLead(nextFeature).map(line=>`<span>${esc(line)}</span>`).join('');const heroLines=poemLead(feat).slice(0,3).map(line=>`<span>${esc(line)}</span>`).join('');
 slot.innerHTML=`<section class="home-opening"><div class="opening-intro appear"><div class="eyebrow-line"><span class="eyebrow-star">✽</span><span>GỢI MỞ · MỘT BÀI THƠ HÔM NAY</span></div><h1 class="hero-poem-title">${esc(feat.title)}</h1><div class="hero-poem-lines">${heroLines}</div><a href="${poemURL(feat)}" class="quiet-button">Đọc trọn bài thơ <span>${svg('arrow',18)}</span></a></div><div class="hero-photo appear"><div class="hero-photo-mask">${image(feat,0,'fetchpriority="high"')}</div><div class="hero-photo-caption"><span>SAKALIS COLLECTION</span><span>BÀI THƠ / 01</span></div></div></section>
 <section class="featured-reading appear"><div class="featured-side"><span class="minor">MỞ ĐẦU BẰNG MỘT BÀI THƠ</span><span class="feature-squiggle">✳</span><span class="featured-vertical">MỘT NGÀY · MỘT TRANG THƠ</span></div><div class="featured-body"><span class="minor">TIẾP MỘT TRANG KHÁC</span><h2><a href="${poemURL(nextFeature)}">${esc(nextFeature.title)}</a></h2><div class="feature-lines">${firstLines}</div><div class="featured-foot"><span>trích từ ${esc(nextFeature.collection||'Sakalis')}</span><a class="quiet-link" href="${poemURL(nextFeature)}">Đọc trọn bài ${svg('arrow',17)}</a></div></div><div class="featured-picture">${image(poems[2]||feat,2)}<span>Để lại đôi dòng cho một ngày.</span></div></section>
 <section class="home-section">${heading('NHỮNG ĐIỀU VỪA ĐƯỢC VIẾT','Thơ mới bên cửa sổ','Xem toàn bộ','./list.html')}<div class="poem-grid">${(more.length?more:[feat]).map(poemCard).join('')}</div></section>
 ${groups.length?`<section class="home-section book-section">${heading('MỖI TẬP THƠ LÀ MỘT CÂU CHUYỆN','Chọn một cuốn, mở một lòng','Xem tất cả','./collection.html?type=collection')}<div class="book-shelf">${groups.map(bookCard).join('')}</div></section>`:''}
 <section class="breathing-section appear"><div class="breathing-image"><img src="./assets/images/image-03.webp" alt="Con thuyền giữa dòng sông tĩnh lặng" loading="lazy"></div><div><span class="minor">GÓC NHỎ CỦA NHỮNG CẢM XÚC</span><h2>Đôi khi, ta tìm đến thơ<br>không phải để <em>hiểu,</em><br>mà để được <em>thấu hiểu.</em></h2><p>Buồn, nhớ, thương hay một ngày bình yên. Chọn cảm xúc của bạn, những câu thơ sẽ kể tiếp.</p><a href="./collection.html?type=topic" class="quiet-button button-light">Tìm thơ theo cảm xúc ${svg('arrow',18)}</a></div></section>
 ${topics.length?`<section class="home-section topic-section">${heading('DÀNH CHO TÂM TRẠNG HÔM NAY','Bạn đang muốn đọc về…','Khám phá chủ đề','./collection.html?type=topic')}<div class="topic-list">${topics.map((t,i)=>topicPill(t.name,i)).join('')}</div></section>`:''}`;
 bindBookmarks();document.title='Sakalis · Một khoảng lặng dành cho thơ';
 }catch(e){console.error(e);slot.innerHTML=errorMarkup(e);}}

async function list(){mount(`<div class="shell content-page"><div class="page-intro"><span class="minor">THƯ VIỆN / SAKALIS</span><h1>Mỗi bài thơ,<br><em>một nơi để trở về.</em></h1><p>Một thư viện nhỏ của những cảm xúc rất thật. Tìm bài thơ dành cho ngày hôm nay.</p></div><section class="library-controls"><label class="search-box">${svg('search',19)}<input id="search-input" placeholder="Tìm tên bài thơ, một câu chữ…" autocomplete="off" aria-label="Tìm bài thơ"></label><div class="select-wrap"><select id="collection-filter" aria-label="Lọc tập thơ"><option value="">Mọi tập thơ</option></select><select id="topic-filter" aria-label="Lọc chủ đề"><option value="">Mọi cảm xúc</option></select><select id="sort-filter" aria-label="Sắp xếp"><option value="new">Mới nhất</option><option value="popular">Đọc nhiều</option><option value="old">Cũ nhất</option></select></div></section><div class="result-line"><span id="result-count"></span><label class="saved-only"><input id="saved-only" type="checkbox"> Chỉ xem bài đã lưu</label></div><div id="poem-list">${loading()}</div></div>`,'library-page');
 try{const poems=await loadPoems(),groups=collectionGroups(poems),topics=topicGroups(poems);const select=document.getElementById('collection-filter'),topic=document.getElementById('topic-filter'),inp=document.getElementById('search-input'),sort=document.getElementById('sort-filter'),saved=document.getElementById('saved-only');select.innerHTML+=groups.map(g=>`<option value="${esc(g.name)}">${esc(g.name)}</option>`).join('');topic.innerHTML+=topics.map(g=>`<option value="${esc(g.name)}">${esc(g.name)}</option>`).join('');if(args.get('collection'))select.value=args.get('collection');if(args.get('topic'))topic.value=args.get('topic');if(args.get('sort')==='popular')sort.value='popular';if(args.get('filter')==='saved')saved.checked=true;
 const render=()=>{let all=[...poems],q=query(inp.value);if(q)all=all.filter(p=>query([p.title,p.content,p.collection,...p.topics].join(' ')).includes(q));if(select.value)all=all.filter(p=>p.collection===select.value);if(topic.value)all=all.filter(p=>p.topics.includes(topic.value));if(saved.checked)all=all.filter(p=>getSaved().has(String(p.id)));all=sort.value==='popular'?popular(all):newest(all);if(sort.value==='old')all.reverse();document.getElementById('result-count').textContent=`${formatNumber(all.length)} bài thơ`;document.getElementById('poem-list').innerHTML=all.length?`<div class="poem-grid library-grid">${all.map(poemCard).join('')}</div>`:'<div class="empty-state"><span>✽</span><h2>Chưa tìm thấy bài thơ phù hợp.</h2><p>Thử tìm bằng một từ khác nhé.</p></div>';};
 [inp,select,topic,sort,saved].forEach(el=>el.addEventListener(el===inp?'input':'change',render));window.addEventListener('sakalis:bookmarks',render);render();bindBookmarks();
 }catch(e){document.getElementById('poem-list').innerHTML=errorMarkup(e);}}

async function collection(){const isTopic=args.get('type')==='topic';mount(`<div class="shell content-page"><div class="page-intro collection-intro"><span class="minor">SAKALIS / ${isTopic?'CẢM XÚC':'TỦ SÁCH'}</span><h1>${isTopic?'Một miền <em>cảm xúc.</em>':'Những tập thơ<br><em>đang chờ được mở.</em>'}</h1><p>${isTopic?'Tìm câu chữ đồng điệu với lòng mình.':'Mỗi cuốn là một khoảng thời gian, một vùng ký ức được giữ lại bằng thơ.'}</p></div><div class="collection-tools"><label class="search-box">${svg('search',19)}<input id="collection-search" placeholder="Tìm ${isTopic?'chủ đề':'tập thơ'}…"></label><div class="collection-switch"><a href="./collection.html?type=collection" ${!isTopic?'aria-current="page"':''}>Tập thơ</a><a href="./collection.html?type=topic" ${isTopic?'aria-current="page"':''}>Chủ đề</a></div></div><div class="result-line"><span id="collection-count"></span></div><div id="collection-results">${loading()}</div></div>`,'collections-page');
 try{const poems=await loadPoems(),groups=isTopic?topicGroups(poems):collectionGroups(poems),inp=document.getElementById('collection-search');const render=()=>{const q=query(inp.value),filtered=groups.filter(g=>query(g.name).includes(q));document.getElementById('collection-count').textContent=`${formatNumber(filtered.length)} ${isTopic?'chủ đề':'tập thơ'}`;document.getElementById('collection-results').innerHTML=filtered.length?(isTopic?`<div class="mood-grid">${filtered.map((g,i)=>`<a class="mood-card appear" href="${topicURL(g.name)}"><span>0${i+1} / CẢM XÚC</span><strong>${esc(g.name)}</strong><small>${formatNumber(g.poems.length)} bài thơ ${svg('north',15)}</small><img src="./assets/images/image-${String((i*3+2)%11+1).padStart(2,'0')}.webp" alt="" loading="lazy"></a>`).join('')}</div>`:`<div class="book-shelf collection-books">${filtered.map(bookCard).join('')}</div>`):'<div class="empty-state"><h2>Không có kết quả nào.</h2></div>';};inp.addEventListener('input',render);render();
 }catch(e){document.getElementById('collection-results').innerHTML=errorMarkup(e);}}

function stanzaHtml(content){const stanzas=String(content||'').trim().split(/\n\s*\n/);return stanzas.map(stanza=>`<p class="stanza">${stanza.split('\n').map(line=>`<span class="verse">${esc(line)||'&nbsp;'}</span>`).join('')}</p>`).join('');}
function readingFit(){const holder=document.querySelector('#poem-detail-layout .poem-body');if(!holder)return;const computed=getComputedStyle(holder);const base=Number.parseFloat(computed.fontSize)||20;const available=holder.clientWidth;const canvas=document.createElement('canvas');const context=canvas.getContext('2d');document.querySelectorAll('.verse').forEach(el=>{el.style.fontSize='';const text=el.textContent||'';context.font=`${computed.fontWeight} ${base}px ${computed.fontFamily}`;const width=context.measureText(text).width;if(width>available-2){el.style.fontSize=`${Math.max(11.2,base*(available-2)/width)}px`;} });}
function flipMarkup(){return `<section class="flipbook-reader" id="flipbook-reader" hidden tabindex="0" aria-label="Đọc thơ dạng lật sách"><div class="flipbook-reader-intro"><span class="flipbook-reader-kicker">SAKALIS · TRANG GIẤY</span><span id="flipbook-reader-name" class="flipbook-reader-name"></span><button id="flipbook-fullscreen" class="flipbook-fullscreen" type="button">${svg('expand',17)} <span class="flipbook-fullscreen-label">Toàn màn hình</span></button></div><div class="flipbook-stage" id="flipbook-stage"><div class="flipbook-book" id="flipbook-book"><div class="flipbook-static flipbook-static-left" id="flipbook-left"></div><div class="flipbook-static flipbook-static-right" id="flipbook-right"></div><div class="flipbook-curl-layer" id="flipbook-curl-layer" hidden></div></div></div><div class="flipbook-navigation"><button id="flipbook-previous" type="button">← Trước</button><span id="flipbook-page-label">Trang 1 / 1</span><button id="flipbook-next" type="button">Tiếp →</button></div><input class="flipbook-seek" type="range" min="1" max="1" value="1" id="flipbook-seek"><p class="reader-tip">Kéo mép trang giấy hoặc dùng phím mũi tên.</p></section>`;}
async function detail(){mount(`<div class="shell detail-shell"><div id="detail-loading">${loading()}</div><div id="detail-container" hidden></div></div>`,'detail-page');
 const area=document.getElementById('detail-container'),busy=document.getElementById('detail-loading');try{const poems=newest(await loadPoems()),id=args.get('id'),s=args.get('slug');const p=poems.find(p=>id&&String(p.id)===String(id))||poems.find(p=>s&&slug(p.slug)===slug(s));if(!p)throw new Error('Không tìm được bài thơ theo đường dẫn này.');const ind=poems.findIndex(q=>String(q.id)===String(p.id)),prev=poems[(ind-1+poems.length)%poems.length],next=poems[(ind+1)%poems.length];const yt=youtubeId(p.youtube);
 document.title=`${p.title} · Sakalis`;const desc=document.querySelector('meta[name="description"]');if(desc)desc.content=excerpt(p,155);
 area.innerHTML=`<div class="detail-top"><div class="crumb"><a href="./index.html">Sakalis</a><span> / </span><a href="./list.html">Thư viện thơ</a></div><span class="minor">${esc(p.collection||'MỘT TRANG THƠ')} ${p.year?'· '+esc(p.year):''}</span><h1>${esc(p.title)}</h1><div class="detail-meta"><span>Viết bởi BNA</span><span class="sep">·</span><span>${esc(compositionDate(p))}</span><span class="sep">·</span><span>${formatNumber(p.views)} lượt đọc</span></div></div>
 <div class="detail-layout"><aside class="detail-aside"><div class="detail-portrait">${image(p,0)}<span>GIỮ LẠI MỘT KHOẢNH KHẮC</span></div><div class="detail-aside-info"><span class="minor">TRONG THƯ VIỆN</span><a href="${p.collection?collectionURL(p.collection):'./list.html'}">${esc(p.collection||'Sakalis')} ${svg('north',14)}</a>${p.topics.length?`<div class="aside-tags">${p.topics.map(t=>`<a href="${topicURL(t)}">${esc(t)}</a>`).join('')}</div>`:''}</div><div class="aside-quote">“Một câu thơ có thể đi cùng ta rất lâu.”</div></aside>
 <div class="reading-area"><div class="reading-toolbar"><div class="reading-modes" aria-label="Chọn chế độ đọc"><button type="button" data-reader-mode="scroll" class="detail-reading-option is-active" aria-pressed="true">${svg('book',16)} Đọc thơ</button><button type="button" data-reader-mode="flip" class="detail-reading-option" aria-pressed="false">Lật sách 3D</button></div><div class="reading-tools"><button type="button" class="tool-button" id="smaller-font" aria-label="Giảm cỡ chữ">A−</button><button type="button" class="tool-button" id="larger-font" aria-label="Tăng cỡ chữ">A+</button><button type="button" class="tool-button" id="music-toggle" aria-pressed="false" title="Nhạc nền">${svg('headphones',17)}</button>${bookmarkButton(p,'toolbar-save')}<button type="button" class="tool-button" id="share-poem" title="Chia sẻ bài thơ">${svg('share',17)}</button></div></div>
 <article class="poem-paper" id="poem-detail-layout"><div class="poem-paper-top"><span>SAKALIS / THƠ</span><span>✽</span></div><div class="poem-text-block"><span class="paper-kicker">MỘT BÀI THƠ CỦA BNA</span><div class="paper-poem-title">${esc(p.title)}</div><div class="poem-body" id="poem-body">${stanzaHtml(p.content)}</div><div class="poem-signature"><span>❦</span><strong>BNA</strong><small>${esc(compositionDate(p))}</small></div></div><div class="poem-paper-bottom"><span>Đọc chậm một chút.</span><span>SAKALIS · ${String(ind+1).padStart(3,'0')}</span></div></article>
 ${flipMarkup()}
 ${yt?`<section class="video-section"><div class="video-heading"><div><span class="minor">GIAI ĐIỆU CỦA BÀI THƠ</span><h2>Nghe tác phẩm</h2></div><span>▶ YOUTUBE</span></div><div class="video-frame"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${yt}?rel=0" title="Video: ${esc(p.title)}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div></section>`:''}
 <div class="poem-actions"><span>Giữ lại một dòng chữ, giữ lại một cảm xúc.</span><button id="share-bottom" type="button">Chia sẻ bài thơ ${svg('north',15)}</button></div></div></div>
 <section class="related-wrap">${heading('CÓ THỂ BẠN SẼ MUỐN ĐỌC TIẾP','Một vài bài thơ khác','Xem thư viện','./list.html')}<div class="poem-grid related-grid">${poems.filter(q=>String(q.id)!==String(p.id)).sort((a,b)=>(Number(b.collection===p.collection)-Number(a.collection===p.collection))).slice(0,3).map(poemCard).join('')}</div></section>
 <div class="detail-next"><a href="${poemURL(prev)}"><span>← BÀI TRƯỚC</span><strong>${esc(prev.title)}</strong></a><span>✽</span><a href="${poemURL(next)}"><span>BÀI TIẾP →</span><strong>${esc(next.title)}</strong></a></div>`;
 busy.remove();area.hidden=false;bindBookmarks();
 // Luôn khởi đầu bằng đọc thơ bình thường, kể cả khi lần trước có chọn lật sách.
 const flip=initializeFlipbookReader();flip.setPoem(p);
 let font=Number(localStorage.getItem('sakalis-font-size')||20);const apply=()=>{font=Math.max(15,Math.min(28,font));document.querySelector('#poem-body').style.fontSize=`${font}px`;requestAnimationFrame(readingFit);};apply();document.fonts?.ready.then(readingFit);window.addEventListener('resize',readingFit,{passive:true});
 document.getElementById('smaller-font').addEventListener('click',()=>{font--;localStorage.setItem('sakalis-font-size',font);apply();});document.getElementById('larger-font').addEventListener('click',()=>{font++;localStorage.setItem('sakalis-font-size',font);apply();});
 const share=async()=>{try{if(navigator.share)await navigator.share({title:p.title,url:location.href});else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(location.href);toast('Đã sao chép liên kết.');}else toast('Hãy sao chép địa chỉ trên trình duyệt.');}catch(e){if(e.name!=='AbortError')toast('Không thể chia sẻ lúc này.');}};
 document.getElementById('share-poem').addEventListener('click',share);document.getElementById('share-bottom').addEventListener('click',share);
 const music=new Audio('./assets/audio/background.mp3');music.loop=true;music.preload='none';music.volume=.28;const mb=document.getElementById('music-toggle');mb.addEventListener('click',async()=>{if(music.paused){try{await music.play();}catch{toast('Chưa thể phát nhạc.');}}else music.pause();});music.addEventListener('play',()=>{mb.classList.add('playing');mb.setAttribute('aria-pressed','true')});music.addEventListener('pause',()=>{mb.classList.remove('playing');mb.setAttribute('aria-pressed','false')});window.addEventListener('pagehide',()=>music.pause(),{once:true});
 trackView(p.id);
 }catch(e){console.error('[Sakalis] detail:',e);busy.innerHTML=errorMarkup(e);}}

(async function boot(){try{if(page==='home')await home();else if(page==='list')await list();else if(page==='collection')await collection();else if(page==='detail')await detail();else await home();}catch(e){console.error('[Sakalis] Startup',e);if(root)root.innerHTML=`<main class="fatal-fallback">${errorMarkup(e)}</main>`;}})();
