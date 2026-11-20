/* SAKALIS · Bundle cổ điển cho web hosting và file:// */
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
        storedMode = localStorage.getItem(READING_MODE_KEY) === "flip" ? "flip" : "scroll";
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




const root=document.querySelector('#app');
const page=(document.body.dataset.page==='index'?'home':document.body.dataset.page)||'home';
const params=new URLSearchParams(location.search);
const icon=(name,size=20)=>{
 const p={search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',north:'<path d="M5 19 19 5M7 5h12v12"/>',bookmark:'<path d="M6 3.7h12v17l-6-4-6 4z"/>',heart:'<path d="M20.8 8.6c0 4.6-8.8 10.3-8.8 10.3S3.2 13.2 3.2 8.6A5.2 5.2 0 0 1 12 5.1a5.2 5.2 0 0 1 8.8 3.5Z"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',close:'<path d="M5 5 19 19M19 5 5 19"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',moon:'<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',share:'<path d="M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"/>',play:'<path d="m8 5 11 7-11 7z"/>',pause:'<path d="M8 5v14M16 5v14"/>',book:'<path d="M4 5.5c3-1.4 6-1.3 8 0 2-1.3 5-1.4 8 0v14c-3-1.4-6-1.3-8 0-2-1.3-5-1.4-8 0zM12 5.5v14"/>',minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14M12 5v14"/>',chev:'<path d="m9 5 7 7-7 7"/>',expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',headphones:'<path d="M3 13v-2a9 9 0 0 1 18 0v2M3 13v6h4v-6H3Zm14 0v6h4v-6h-4Z"/>'};
 return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p[name]||p.arrow}</svg>`;
};
const header=()=>`<div class="announcement"><span class="announcement-dot"></span> MỘT KHOẢNG LẶNG DÀNH CHO NHỮNG TÂM HỒN YÊU THƠ <span class="announcement-star">✳</span></div>
<header class="site-header"><div class="nav-wrap wrap"><a href="./index.html" class="brand" aria-label="Sakalis — về trang chủ"><span class="brand-symbol">✳</span><span>sakalis<span class="brand-period">.</span></span></a>
<nav class="desktop-nav" aria-label="Điều hướng chính"><a class="nav-link ${page==='home'?'active':''}" href="./index.html">Trang chủ</a><a class="nav-link ${page==='list'?'active':''}" href="./list.html">Kho thơ</a><a class="nav-link ${page==='collection' && params.get('type')!=='topic'?'active':''}" href="./collection.html?type=collection">Tập thơ</a><a class="nav-link ${page==='collection'&&params.get('type')==='topic'?'active':''}" href="./collection.html?type=topic">Chủ đề</a></nav>
<div class="nav-actions"><a href="./list.html?filter=saved" class="icon-action saved-action" aria-label="Bài thơ đã lưu">${icon('bookmark',18)}<span class="saved-count" id="saved-count">0</span></a><a href="./list.html" class="nav-discover">Khám phá ${icon('north',16)}</a><button class="icon-action nav-menu-button" id="mobile-toggle" aria-label="Mở menu" aria-expanded="false">${icon('menu',23)}</button></div></div>
<nav class="mobile-nav" id="mobile-nav" aria-label="Menu trên điện thoại"><a href="./index.html">Trang chủ</a><a href="./list.html">Kho thơ</a><a href="./collection.html?type=collection">Tập thơ</a><a href="./collection.html?type=topic">Chủ đề</a><a href="./list.html?filter=saved">Đã lưu</a></nav></header>`;
const footer=()=>`<footer class="site-footer"><div class="wrap footer-main"><div><div class="footer-ornament">✳</div><h2>Để những con chữ<br><em>được ở lại.</em></h2><p>Một góc nhỏ dành cho thơ, ký ức và những điều chưa kịp nói thành lời.</p></div><div class="footer-links"><div><span>KHÁM PHÁ</span><a href="./index.html">Trang chủ</a><a href="./list.html">Kho thơ</a><a href="./collection.html?type=collection">Tập thơ</a><a href="./collection.html?type=topic">Chủ đề</a></div><div><span>GÓC CỦA BẠN</span><a href="./list.html?filter=saved">Bài đã lưu</a><a href="./list.html?sort=popular">Được đọc nhiều</a></div></div></div><div class="wrap footer-bottom"><span>© ${new Date().getFullYear()} SAKALIS. ALL WORDS, ALL FEELINGS.</span><span>ĐỌC CHẬM MỘT CHÚT, THẤY ĐỜI DỊU HƠN. ✳</span></div></footer>`;
function renderShell(content,extraClass=''){root.innerHTML=header()+`<main class="${extraClass}" id="main">${content}</main>`+footer()+`<div class="toast" id="toast" role="status" aria-live="polite"></div>`;initShell();}
function initShell(){
 const button=document.querySelector('#mobile-toggle'),nav=document.querySelector('#mobile-nav');button?.addEventListener('click',()=>{const open=nav.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.innerHTML=icon(open?'close':'menu',23);});
 const update=()=>{document.querySelector('#saved-count').textContent=bookmarks().size;};update();window.addEventListener('sakalis:bookmarks',update);
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('revealed');observer.unobserve(e.target);}}),{threshold:.08});
 const observeNew=()=>document.querySelectorAll('.reveal:not(.observed)').forEach(el=>{el.classList.add('observed');observer.observe(el);});observeNew();new MutationObserver(observeNew).observe(document.querySelector('main'),{childList:true,subtree:true});
}
function toast(msg){const el=document.querySelector('#toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600);}
const loader=(label='Đang mở những trang thơ…')=>`<div class="loader"><span class="loader-mark">✳</span><p>${label}</p></div>`;
const fail=(e)=>`<section class="data-error"><span>✳ DỮ LIỆU CHƯA SẴN SÀNG</span><h2>Những trang thơ đang tạm khép.</h2><p>Không kết nối được Google Sheets. Vui lòng kiểm tra kết nối mạng hoặc quyền xuất bản bảng tính.</p><button class="button button-dark" onclick="location.reload()">Thử tải lại ${icon('arrow',16)}</button><small>${esc(e.message||'Lỗi không xác định')}</small></section>`;
function img(p,index=0){return `src="${esc(photo(p,index))}" loading="lazy" onerror="this.onerror=null;this.src='./assets/images/image-05.webp'"`;} // địa chỉ từ nguồn đã được lọc bởi data.js
function bookmarkButton(p,extra=''){const active=bookmarks().has(String(p.id));return `<button type="button" class="bookmark-button ${active?'is-saved':''} ${extra}" data-save-id="${esc(p.id)}" aria-label="${active?'Bỏ lưu':'Lưu bài thơ'}" title="${active?'Bỏ lưu':'Lưu bài thơ'}">${icon('bookmark',18)}</button>`;}
function registerBookmarks(scope=document){scope.addEventListener('click',e=>{const btn=e.target.closest('[data-save-id]');if(!btn)return;e.preventDefault();const active=toggleBookmark(btn.dataset.saveId);document.querySelectorAll(`[data-save-id="${CSS.escape(btn.dataset.saveId)}"]`).forEach(b=>{b.classList.toggle('is-saved',active);b.setAttribute('aria-label',active?'Bỏ lưu':'Lưu bài thơ');});toast(active?'Đã lưu vào góc thơ của bạn.':'Đã bỏ khỏi danh sách đã lưu.');});}
function poemCard(p,i=0){return `<article class="poem-card reveal" style="--delay:${i%5*55}ms"><div class="card-cover"><a href="${poemURL(p)}" class="card-image-link"><img ${img(p,i)} alt="Ảnh minh họa cho ${esc(p.title)}"></a><span class="card-index">${String(i+1).padStart(2,'0')} / POEM</span>${bookmarkButton(p,'card-save')}</div><div class="card-info"><a class="card-category" href="${p.collection?collectionURL(p.collection):'./list.html'}">${esc(p.collection||'SAKALIS JOURNAL')}</a><h3><a href="${poemURL(p)}">${esc(p.title)}</a></h3><p>${esc(excerpt(p,110)||'Một bài thơ đang đợi bạn đọc…')}</p><div class="card-bottom"><span>${esc(p.year||'KHÔNG ĐỀ NGÀY')} <span class="mini-dot">·</span> ${formatNumber(p.views)} lượt đọc</span><a href="${poemURL(p)}" aria-label="Đọc ${esc(p.title)}">${icon('north',19)}</a></div></div></article>`;}
function horizontalRow(p,i=0){return `<article class="poem-row reveal" style="--delay:${i*45}ms"><span class="row-number">${String(i+1).padStart(2,'0')}</span><div class="row-main"><span class="eyebrow">${esc(p.collection||p.topics[0]||'TẢN THƠ')} <i> / </i> ${esc(p.year||'KHÔNG ĐỀ NGÀY')}</span><h3><a href="${poemURL(p)}">${esc(p.title)}</a></h3></div><p class="row-excerpt">${esc(excerpt(p,85))}</p><a href="${poemURL(p)}" class="row-arrow" aria-label="Đọc bài thơ">${icon('north',22)}</a></article>`;}
const textAnchor=(title='SANG TRANG TIẾP')=>`<span class="text-anchor">${title} ${icon('north',17)}</span>`;

async function home(){renderShell(`<div class="home-hero"><div class="wrap hero-grid"><div class="hero-copy"><div class="overline"><span class="line-em"></span> NHỮNG NGÀY ĐƯỢC VIẾT BẰNG THƠ <span class="ornament">✳</span></div><h1>Có những điều<br><em>chỉ thơ</em><br>mới nói hộ<span class="period">.</span></h1><p>Một không gian dành cho những câu chữ chậm rãi, những miền ký ức và cả những điều chưa thể gọi thành tên.</p><div class="hero-actions"><a class="button button-dark" href="./list.html">Bắt đầu đọc ${icon('north',17)}</a><a class="text-link" href="./collection.html?type=collection">Khám phá tập thơ ${icon('arrow',17)}</a></div><div class="hero-footnote"><span class="tiny-star">✦</span> SCROLL TO FEEL SOMETHING <span class="footnote-line"></span> 01 / 04</div></div><div class="hero-art"><div class="hero-art-frame"><img src="./assets/images/image-05.webp" alt="Cảnh hồ và núi tĩnh lặng" fetchpriority="high"><div class="hero-overlay-label"><span>FRAGMENTS OF STILLNESS</span><span>SAKALIS ARCHIVE · 2026</span></div></div><div class="hero-side-note">THE ART OF FEELING · VOL. 01</div><div class="hero-floating-note"><span class="quote-mark">“</span><span>Giữa những xô bồ,<br>ta vẫn cần một khoảng lặng.</span><span class="floating-sign">SAKALIS ✳</span></div></div></div></div>
<div class="home-marquee"><div class="wrap marquee-inner"><span>THƠ LÀ NƠI CẢM XÚC CÓ HÌNH HÀI</span><span>✳</span><span>NHỮNG CÂU CHỮ KHÔNG VỘI VÃ</span><span>✳</span><span>WORDS THAT STAY WITH YOU</span></div></div>
<section class="section section-poems wrap" id="recent"><div class="section-head reveal"><div><div class="section-label">01 <span class="dash"></span> NHỮNG TRANG MỚI NHẤT</div><h2>Chạm vào <em>câu chữ.</em></h2><p>Những bài thơ được viết, được giữ lại, và chờ một người đọc.</p></div><a class="outline-link" href="./list.html">Xem toàn bộ ${icon('north',18)}</a></div><div id="home-poems">${loader()}</div></section>
<section class="editorial-section"><div class="wrap editorial-grid"><div class="editorial-visual"><img src="./assets/images/image-09.webp" loading="lazy" alt="Hồ nước phản chiếu những ngọn núi"><span class="editorial-photo-caption">A MOMENT TO BREATHE · SAKALIS</span></div><div class="editorial-copy reveal"><span class="section-label">02 <span class="dash"></span> VỀ SAKALIS</span><span class="editorial-star">❋</span><h2>Thơ không cần<br>phải ồn ào<br><em>để được nghe.</em></h2><p>Có những bài viết cho một người. Có những bài viết cho chính mình. Rồi một ngày, chúng tìm đến những người đồng điệu.</p><a href="./collection.html?type=collection" class="text-link">Bước vào thế giới thơ ${icon('north',18)}</a></div></div></section>
<section class="section wrap collection-section"><div class="section-head reveal"><div><div class="section-label">03 <span class="dash"></span> NHỮNG CUỐN SỔ CẢM XÚC</div><h2>Mỗi tập thơ, <em>một thế giới.</em></h2></div><a class="outline-link" href="./collection.html?type=collection">Tất cả tập thơ ${icon('north',18)}</a></div><div id="home-collections" class="collection-strip">${loader('Đang mở các tập thơ…')}</div></section>
<section class="mood-section"><div class="wrap mood-inner"><div><span class="section-label">04 <span class="dash"></span> THE MOOD INDEX</span><h2>Hôm nay, bạn<br><em>mang tâm trạng gì?</em></h2></div><div id="home-topics" class="mood-tags">${loader('Đang tìm những cảm xúc…')}</div></div></section>`, 'page-home');
 try{const poems=newest(await loadPoems());const recent=poems.slice(0,6);
 document.querySelector('#home-poems').innerHTML=recent.length?`<div class="poem-list">${recent.map(horizontalRow).join('')}</div>`:'<p>Chưa có bài thơ nào trong nguồn dữ liệu.</p>';
 const groups=collectionGroups(poems).slice(0,4);
 document.querySelector('#home-collections').innerHTML=groups.length?groups.map((g,i)=>`<a class="collection-tile reveal" href="${collectionURL(g.name)}"><img src="./assets/images/image-${String([3,4,7,8][i%4]).padStart(2,'0')}.webp" alt=""><div class="collection-tile-wash"></div><div class="collection-tile-top">COLLECTION / ${String(i+1).padStart(2,'0')}</div><div class="collection-tile-bottom"><span>${g.poems.length} BÀI THƠ</span><h3>${esc(g.name)}</h3><span class="collection-circle">${icon('north',19)}</span></div></a>`).join(''):'<p>Chưa có tập thơ được phân loại.</p>';
 const tags=topicGroups(poems).slice(0,12);document.querySelector('#home-topics').innerHTML=tags.length?tags.map((g,i)=>`<a class="mood-tag" href="${topicURL(g.name)}"><small>${String(i+1).padStart(2,'0')}</small>${esc(g.name)} ${icon('north',16)}</a>`).join(''):'<p>Chưa có chủ đề trong nguồn dữ liệu.</p>';
 }catch(e){document.querySelector('#home-poems').innerHTML=fail(e);document.querySelector('#home-collections').innerHTML='';document.querySelector('#home-topics').innerHTML='';}
 registerBookmarks();
}

async function list(){const collection=params.get('collection'),topic=params.get('topic'),saved=params.get('filter')==='saved';const initial=params.get('q')||'';const label=collection?`TẬP THƠ / ${esc(collection)}`:topic?`CHỦ ĐỀ / ${esc(topic)}`:saved?'GÓC THƠ CỦA BẠN':'THƯ VIỆN CẢM XÚC';
 renderShell(`<section class="listing-hero"><div class="wrap listing-header"><div><div class="section-label">SAKALIS ARCHIVE <span class="dash"></span> ${label}</div><h1>${collection||topic?esc(collection||topic):saved?'Những câu thơ<br><em>đã giữ lại.</em>':'Một bài thơ cho<br><em>mỗi ngày.</em>'}</h1><p>${saved?'Những câu chữ bạn muốn trở lại thêm lần nữa.':'Gõ một câu chuyện, tìm một cảm xúc, rồi để những dòng thơ dẫn lối.'}</p></div><div class="listing-hero-deco"><span>✳</span><div>WORDS ARE<br>THE QUIETEST<br>FORM OF ART.</div></div></div></section>
<section class="archive-section wrap"><div class="archive-tools"><label class="search-field" for="archive-search">${icon('search',22)}<input id="archive-search" type="search" placeholder="Tìm một bài thơ, một ký ức..." autocomplete="off" value="${esc(initial)}"><kbd>/</kbd></label><div class="archive-selects"><select id="archive-sort" aria-label="Sắp xếp"><option value="newest">Mới nhất</option><option value="popular">Đọc nhiều</option><option value="oldest">Cũ nhất</option><option value="az">Tên A–Z</option></select><button id="archive-saved" class="filter-saved ${saved?'selected':''}" aria-pressed="${saved}">${icon('bookmark',16)} Đã lưu</button></div></div>
<div class="archive-subtools"><div id="archive-topics" class="topic-filters"></div><div class="archive-result" id="archive-result">ĐANG TẢI…</div></div><div id="archive-grid" class="poem-grid archive-grid">${loader()}</div><div class="load-more-wrap" id="load-more-wrap" hidden><button class="button button-outline" id="load-more">Xem thêm bài thơ ${icon('arrow',17)}</button></div></section>`, 'page-list');
 const input=document.querySelector('#archive-search'),sort=document.querySelector('#archive-sort'),save=document.querySelector('#archive-saved'),grid=document.querySelector('#archive-grid'),topicBar=document.querySelector('#archive-topics'),result=document.querySelector('#archive-result'),more=document.querySelector('#load-more-wrap');
 sort.value=['newest','popular','oldest','az'].includes(params.get('sort'))?params.get('sort'):'newest';
 let poems=[],visible=12,selectedTopic=topic||'',onlySaved=saved;
 const filter=()=>{let arr=poems;if(collection)arr=arr.filter(p=>query(p.collection)===query(collection));if(selectedTopic)arr=arr.filter(p=>p.topics.some(t=>query(t)===query(selectedTopic)));if(onlySaved){const all=bookmarks();arr=arr.filter(p=>all.has(String(p.id)));}
 const term=query(input.value);if(term)arr=arr.filter(p=>query([p.title,p.collection,p.topics.join(' '),p.content].join(' ')).includes(term));
 if(sort.value==='popular')arr=popular(arr);else if(sort.value==='oldest')arr=newest(arr).reverse();else if(sort.value==='az')arr=[...arr].sort((a,b)=>a.title.localeCompare(b.title,'vi'));else arr=newest(arr);
 return arr;};
 const draw=()=>{const arr=filter();result.innerHTML=`<strong>${formatNumber(arr.length)}</strong> BÀI THƠ ĐƯỢC TÌM THẤY`;grid.innerHTML=arr.length?arr.slice(0,visible).map(poemCard).join(''):`<div class="empty-state"><span>✳</span><h3>Chưa tìm được câu thơ phù hợp.</h3><p>Thử đổi từ khóa hoặc bộ lọc để khám phá những trang khác.</p><button class="text-link" id="clear-filter">Xóa bộ lọc ${icon('arrow',17)}</button></div>`;more.hidden=arr.length<=visible;document.querySelector('#clear-filter')?.addEventListener('click',()=>{input.value='';selectedTopic='';onlySaved=false;save.classList.remove('selected');renderTopics();draw();});};
 const renderTopics=()=>{if(topic){topicBar.innerHTML=`<a href="./list.html" class="topic-chip active">${esc(topic)} ${icon('close',13)}</a>`;return;}
 const groups=topicGroups(poems).slice(0,7);topicBar.innerHTML=`<button data-topic="" class="topic-chip ${!selectedTopic?'active':''}">Tất cả</button>`+groups.map(g=>`<button data-topic="${esc(g.name)}" class="topic-chip ${selectedTopic===g.name?'active':''}">${esc(g.name)}</button>`).join('');};
 try{poems=await loadPoems();renderTopics();draw();}catch(e){grid.innerHTML=fail(e);result.textContent='KHÔNG TẢI ĐƯỢC DỮ LIỆU';}
 input.addEventListener('input',()=>{visible=12;draw();});sort.addEventListener('change',draw);
 save.addEventListener('click',()=>{onlySaved=!onlySaved;save.classList.toggle('selected',onlySaved);save.setAttribute('aria-pressed',String(onlySaved));draw();});
 topicBar.addEventListener('click',e=>{const b=e.target.closest('button[data-topic]');if(!b)return;selectedTopic=b.dataset.topic;visible=12;renderTopics();draw();});
 document.querySelector('#load-more').addEventListener('click',()=>{visible+=12;draw();});window.addEventListener('sakalis:bookmarks',()=>{if(onlySaved)draw();});
 document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement?.tagName!=='INPUT'){e.preventDefault();input.focus();}});
 registerBookmarks();
}

async function collection(){const isTopic=params.get('type')==='topic';renderShell(`<section class="catalog-intro wrap"><div class="section-label">THƯ VIỆN SAKALIS <span class="dash"></span> 01 / 02</div><div class="catalog-intro-grid"><h1>Mỗi miền nhớ,<br><em>một ngăn thơ.</em></h1><div><p>Những bài thơ được xếp cạnh nhau vì cùng một khoảng thời gian, một câu chuyện hay một nhịp cảm xúc.</p><div class="catalog-switch"><a href="./collection.html?type=collection" class="${!isTopic?'active':''}">Tập thơ <span>↗</span></a><a href="./collection.html?type=topic" class="${isTopic?'active':''}">Chủ đề <span>↗</span></a></div></div></div></section><section class="catalog-content wrap"><div class="catalog-controls"><span id="catalog-count">ĐANG TẢI…</span><label class="catalog-search">${icon('search',18)}<input id="catalog-search-input" placeholder="Tìm ${isTopic?'chủ đề':'tập thơ'}..." type="search"></label></div><div class="catalog-grid" id="catalog-grid">${loader()}</div></section>`, 'page-collection');let groups=[];const inp=document.querySelector('#catalog-search-input'),grid=document.querySelector('#catalog-grid'),counter=document.querySelector('#catalog-count');
 const render=()=>{const term=query(inp.value);const arr=groups.filter(g=>query(g.name).includes(term));counter.textContent=`${arr.length} ${isTopic?'CHỦ ĐỀ':'TẬP THƠ'} ĐƯỢC LƯU GIỮ`;grid.innerHTML=arr.length?arr.map((g,i)=>`<a class="catalog-tile reveal" href="${isTopic?topicURL(g.name):collectionURL(g.name)}"><div class="catalog-tile-image"><img src="./assets/images/image-${String([5,3,7,9,4,8,6,10,2,1,11][i%11]).padStart(2,'0')}.webp" loading="lazy" alt=""><span class="catalog-tile-sticker">${String(i+1).padStart(2,'0')} / ${isTopic?'MOOD':'VOLUME'}</span></div><div class="catalog-tile-copy"><span>${g.poems.length} BÀI THƠ</span><h2>${esc(g.name)}</h2><div>${icon('north',21)}</div></div></a>`).join(''):'<div class="empty-state"><span>✳</span><h3>Chưa có kết quả phù hợp.</h3></div>';};
 try{const poems=await loadPoems();groups=(isTopic?topicGroups(poems):collectionGroups(poems));render();}catch(e){grid.innerHTML=fail(e);counter.textContent='KHÔNG TẢI ĐƯỢC';}
 inp.addEventListener('input',render);
}

function linesMarkup(content){return esc(content||'Chưa có nội dung bài thơ.').split(/\n\s*\n/).map(stanza=>`<p>${stanza.split('\n').map(line=>`<span class="poetry-line">${line||'&nbsp;'}</span>`).join('')}</p>`).join('');}
function detail(){renderShell(`<div class="detail-loading wrap" id="detail-loading">${loader('Đang mở một trang ký ức…')}</div><div id="detail-content" hidden></div>`, 'page-detail');initDetail();}
async function initDetail(){const wrap=document.querySelector('#detail-content'),loading=document.querySelector('#detail-loading');try{const poems=newest(await loadPoems());const id=params.get('id'),s=params.get('slug');const p=poems.find(item=>id&&String(item.id)===String(id))||poems.find(item=>s&&slug(item.slug)===slug(s));if(!p)throw Error('Bài thơ không tồn tại hoặc đường dẫn không hợp lệ.');document.title=`${p.title} | Sakalis`;
 const desc=document.querySelector('meta[name=description]');if(desc)desc.content=excerpt(p,160);
 const idx=poems.findIndex(item=>String(item.id)===String(p.id)),prev=poems[(idx-1+poems.length)%poems.length],next=poems[(idx+1)%poems.length];
 wrap.innerHTML=`<div class="detail-breadcrumb wrap"><a href="./index.html">Trang chủ</a>${icon('chev',13)}<a href="./list.html">Kho thơ</a>${icon('chev',13)}<span>${esc(p.title)}</span></div>
 <div class="detail-heading wrap"><div class="section-label">${esc(p.collection||'BÀI THƠ')} <span class="dash"></span> ${esc(p.year||'KHÔNG GHI NĂM')}</div><h1>${esc(p.title)}<span>.</span></h1><div class="detail-heading-bottom"><div><span class="tiny-star">✳</span><span>SAKALIS / BNA</span><span class="mini-dot">·</span><span>${esc(compositionDate(p))}</span><span class="mini-dot">·</span><span>${formatNumber(p.views+1)} lượt đọc</span></div><div class="detail-controls"><button type="button" class="control-link" id="share-poem">${icon('share',17)} Chia sẻ</button>${bookmarkButton(p,'detail-save')}</div></div></div>
 <div class="detail-main wrap"><aside class="detail-sidebar"><div class="detail-photo"><img ${img(p)} alt="Hình minh họa cho bài thơ ${esc(p.title)}"><span class="photo-label">S A K A L I S · A R C H I V E</span></div><div class="sidebar-metadata"><div><span>THUỘC TẬP THƠ</span><a href="${p.collection?collectionURL(p.collection):'./list.html'}">${esc(p.collection||'Chưa phân tập')} ${icon('north',15)}</a></div><div><span>THỜI GIAN SÁNG TÁC</span><strong>${esc(compositionDate(p))}</strong></div>${p.topics.length?`<div><span>CHỦ ĐỀ</span><div class="sidebar-tags">${p.topics.map(t=>`<a href="${topicURL(t)}">${esc(t)}</a>`).join('')}</div></div>`:''}</div></aside>
 <article class="reading-content"><div class="reader-toolbar"><div class="reader-tabs" aria-label="Chế độ đọc"><button data-reader-mode="scroll" class="detail-reading-option is-active" aria-pressed="true">${icon('book',17)} Đọc thơ</button><button data-reader-mode="flip" class="detail-reading-option" aria-pressed="false">✳ Lật sách 3D</button></div><div class="reader-utilities"><button id="font-down" title="Giảm cỡ chữ" aria-label="Giảm cỡ chữ">A−</button><button id="font-up" title="Tăng cỡ chữ" aria-label="Tăng cỡ chữ">A+</button><button id="music-toggle" title="Phát nhạc nền" aria-pressed="false">${icon('headphones',18)} <span>Nhạc nền</span></button></div></div>
 <div class="reading-paper" id="poem-detail-layout"><div class="reading-paper-top"><span>POETRY JOURNAL</span><span>✳</span><span>NO. ${String(idx+1).padStart(3,'0')}</span></div><div class="reading-paper-inner"><div class="paper-divider">❋</div><div class="reading-poem" id="reading-poem">${linesMarkup(p.content)}</div><div class="reading-signature"><span class="signature-mark">✳</span><span>BNA</span><small>${esc(compositionDate(p))}</small></div></div><div class="reading-paper-foot"><span>SAKALIS / Những điều chưa nói</span><span>${String(idx+1).padStart(2,'0')}</span></div></div>
 <section class="flipbook-reader" id="flipbook-reader" hidden aria-label="Đọc thơ dạng sách lật trang" tabindex="0"><div class="flipbook-reader-intro"><span class="flipbook-reader-kicker">SAKALIS · 3D READER</span><span id="flipbook-reader-name" class="flipbook-reader-name"></span><button type="button" class="flipbook-fullscreen" id="flipbook-fullscreen" title="Mở toàn màn hình">${icon('expand',16)} <span class="flipbook-fullscreen-label">Toàn màn hình</span></button></div><div class="flipbook-stage" id="flipbook-stage"><div class="flipbook-book" id="flipbook-book"><div class="flipbook-static flipbook-static-left" id="flipbook-left"></div><div class="flipbook-static flipbook-static-right" id="flipbook-right"></div><div class="flipbook-curl-layer" id="flipbook-curl-layer" hidden></div></div></div><div class="flipbook-navigation"><button type="button" class="flipbook-nav-button" id="flipbook-previous">← Trước</button><span class="flipbook-page-label" id="flipbook-page-label">Trang 1 / 1</span><button type="button" class="flipbook-nav-button" id="flipbook-next">Tiếp →</button></div><input type="range" class="flipbook-seek" id="flipbook-seek" value="1" min="1" max="1" aria-label="Chọn trang sách"><p class="reader-tip">Kéo góc giấy để lật. Dùng phím ← → để chuyển trang.</p></section>
 ${youtubeId(p.youtube)?`<div class="poem-video"><div class="section-label">✳ PHỔ THƠ / ÂM NHẠC</div><button id="youtube-open" type="button" class="video-thumb"><span>${icon('play',28)}</span><strong>Nghe tác phẩm</strong></button><div id="youtube-container" hidden></div></div>`:''}
 <div class="reading-after"><p>“Có những điều, chỉ câu chữ mới giữ lại được.”</p><div class="reading-share"><button class="text-link" id="share-poem-bottom">Chia sẻ bài thơ này ${icon('north',17)}</button></div></div></article></div>
 <section class="related-section wrap"><div class="section-head"><div><div class="section-label">TIẾP NỐI MẠCH CẢM XÚC</div><h2>Có thể bạn <em>cũng sẽ thích.</em></h2></div><a href="./list.html" class="outline-link">Khám phá thêm ${icon('north',18)}</a></div><div class="related-grid">${selectRelated(poems,p).map(poemCard).join('')}</div></section>
 <section class="detail-bottom-nav"><div class="wrap poem-next-prev"><a href="${poemURL(prev)}"><span>← BÀI TRƯỚC</span><strong>${esc(prev.title)}</strong></a><div class="detail-bottom-mark">✳</div><a href="${poemURL(next)}"><span>BÀI TIẾP THEO →</span><strong>${esc(next.title)}</strong></a></div></section>`;
 loading.remove();wrap.hidden=false;
 // Giữ lại bộ máy flipbook v2: tờ giấy cong 24 dải 3D, bìa/cuối và fullscreen.
 const flip=initializeFlipbookReader();flip.setPoem(p);
 let font=Number(localStorage.getItem('sakalis-font-size')||20);const applyFont=()=>{document.querySelector('#reading-poem').style.fontSize=`${font}px`;};applyFont();
 document.querySelector('#font-down').addEventListener('click',()=>{font=Math.max(15,font-1);localStorage.setItem('sakalis-font-size',String(font));applyFont();});document.querySelector('#font-up').addEventListener('click',()=>{font=Math.min(30,font+1);localStorage.setItem('sakalis-font-size',String(font));applyFont();});
 const share=async()=>{try{if(navigator.share)await navigator.share({title:p.title,url:location.href});else {await navigator.clipboard.writeText(location.href);toast('Đã sao chép liên kết bài thơ.');}}catch(e){if(e.name!=='AbortError')toast('Chưa thể chia sẻ.');}};
 document.querySelector('#share-poem').addEventListener('click',share);document.querySelector('#share-poem-bottom').addEventListener('click',share);
 const video=youtubeId(p.youtube);document.querySelector('#youtube-open')?.addEventListener('click',()=>{const box=document.querySelector('#youtube-container');box.hidden=false;box.innerHTML=`<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${video}?rel=0&autoplay=1" title="${esc(p.title)}" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;document.querySelector('#youtube-open').hidden=true;});
 const music=new Audio('./assets/audio/background.mp3');music.loop=true;music.volume=.32;music.preload='none';const mb=document.querySelector('#music-toggle');mb.addEventListener('click',async()=>{if(music.paused){try{await music.play();}catch{toast('Không thể phát nhạc nền.');}}else music.pause();});const updateMusic=()=>{const playing=!music.paused;mb.classList.toggle('playing',playing);mb.setAttribute('aria-pressed',String(playing));mb.querySelector('span').textContent=playing?'Tắt nhạc':'Nhạc nền';};music.addEventListener('play',updateMusic);music.addEventListener('pause',updateMusic);window.addEventListener('pagehide',()=>music.pause(),{once:true});
 trackView(p.id);registerBookmarks();
 }catch(e){console.error('[Sakalis] Không mở được bài thơ:',e);if(loading.isConnected)loading.innerHTML=fail(e);else{wrap.hidden=false;wrap.innerHTML=fail(e);}}
}
function selectRelated(poems,p){const others=poems.filter(q=>String(q.id)!==String(p.id));return [...others].sort((a,b)=>{const score=q=>(p.collection&&q.collection===p.collection?6:0)+q.topics.filter(t=>p.topics.includes(t)).length*3;return score(b)-score(a)||b.timestamp-a.timestamp;}).slice(0,3);}

async function boot(){
 try {
  if(page==='home') await home();
  else if(page==='list') await list();
  else if(page==='collection') await collection();
  else if(page==='detail') await detail();
  else await home();
 }catch(e){
  console.error('[Sakalis] Không thể khởi động giao diện:',e);
  if(root&&!root.querySelector('.site-header'))root.innerHTML='<main class="boot-error"><h1>Không thể mở Sakalis</h1><p>Vui lòng tải lại trang. Nếu lỗi tiếp diễn, hãy kiểm tra trình duyệt và kết nối mạng.</p><button type="button" onclick="location.reload()">Tải lại</button></main>';
 }
}
boot();

