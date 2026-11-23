/* Sakalis Studio · Rich text editor and SVG cover lab. No persistence, no API calls. */
(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const app = $('#studio-app');
  const editor = $('#editor');
  const paper = $('#paper');
  const coverBook = $('#cover-book');
  const coverArt = $('#cover-art');
  const gallery = $('#cover-gallery');
  const paletteGrid = $('#palette-grid');
  const titleInput = $('#work-title');
  const subtitleInput = $('#work-subtitle');
  const authorInput = $('#work-author');
  let toastTimer = 0;
  let lastRange = null;
  let preview = false;
  let focusMode = false;

  // Every illustration is a genuine inline vector. No bitmap, external image,
  // framework, fetch, or remote drawing service is involved.
  const svgStart = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 540" preserveAspectRatio="xMidYMid slice" aria-hidden="true">';
  const svgEnd = '</svg>';
  const background = '<rect width="400" height="540" fill="var(--cover-base)"/>';
  const covers = [
    { id:'horizon', name:'Bên kia đồi', number:'01', art: `
      <circle cx="298" cy="172" r="91" fill="var(--cover-accent)" opacity=".2"/>
      <circle cx="298" cy="172" r="60" fill="#fff" opacity=".49"/>
      <path d="M-20 275Q90 182 177 256T420 245V560H-20Z" fill="var(--cover-accent)" opacity=".25"/>
      <path d="M-20 324Q110 232 216 311T420 285V560H-20Z" fill="var(--cover-accent)" opacity=".45"/>
      <path d="M-10 390Q92 321 215 376T420 353V550H-10Z" fill="var(--cover-accent)" opacity=".73"/>
      <path d="M0 449Q97 404 222 444T400 428V540H0Z" fill="var(--cover-accent)" opacity=".44"/>
      <g stroke="#fff" opacity=".65" stroke-width="1.3" fill="none"><path d="M28 404Q119 363 203 403T374 377"/><path d="M-9 428Q116 394 223 430T399 406"/><path d="M20 458Q150 434 270 462"/></g>
      <g fill="var(--cover-accent)" opacity=".67"><circle cx="50" cy="90" r="2"/><circle cx="79" cy="70" r="1"/><circle cx="350" cy="93" r="2"/></g>` },
    { id:'botanical', name:'Khu vườn', number:'02', art: `
      <ellipse cx="204" cy="314" rx="144" ry="215" fill="#fff" opacity=".24"/>
      <g fill="none" stroke="var(--cover-accent)" stroke-width="2.2" stroke-linecap="round" opacity=".68"><path d="M210 535Q215 400 174 328T145 155"/><path d="M230 540Q217 415 276 296T289 99"/><path d="M188 470Q100 376 84 279"/><path d="M213 444Q301 404 339 353"/><path d="M143 223Q153 227 169 249"/></g>
      <g fill="var(--cover-accent)" opacity=".36"><ellipse cx="115" cy="226" rx="23" ry="47" transform="rotate(-35 115 226)"/><ellipse cx="194" cy="291" rx="24" ry="50" transform="rotate(40 194 291)"/><ellipse cx="250" cy="244" rx="25" ry="55" transform="rotate(35 250 244)"/><ellipse cx="309" cy="162" rx="25" ry="49" transform="rotate(25 309 162)"/><ellipse cx="85" cy="313" rx="19" ry="43" transform="rotate(-40 85 313)"/><ellipse cx="297" cy="387" rx="23" ry="46" transform="rotate(53 297 387)"/></g>
      <g stroke="var(--cover-accent)" stroke-width="1.2" fill="none" opacity=".5"><circle cx="143" cy="151" r="29"/><circle cx="143" cy="151" r="20"/><circle cx="281" cy="107" r="34"/><circle cx="281" cy="107" r="25"/><path d="M113 151h60M143 121v60M247 107h68M281 73v68"/></g>
      <g fill="#fff" opacity=".6"><circle cx="143" cy="151" r="9"/><circle cx="281" cy="107" r="11"/></g>` },
    { id:'celestial', name:'Dải ngân hà', number:'03', art: `
      <circle cx="230" cy="213" r="130" fill="#fff" opacity=".08"/>
      <circle cx="230" cy="213" r="108" fill="var(--cover-accent)" opacity=".47"/>
      <circle cx="265" cy="181" r="89" fill="var(--cover-base)"/>
      <g fill="none" stroke="#fff" opacity=".43" stroke-width="1"><ellipse cx="203" cy="230" rx="172" ry="76" transform="rotate(-29 203 230)"/><ellipse cx="203" cy="230" rx="185" ry="92" transform="rotate(-29 203 230)"/><circle cx="205" cy="206" r="151" stroke-dasharray="3 10"/></g>
      <g fill="#fff" opacity=".78"><circle cx="62" cy="119" r="3"/><circle cx="91" cy="269" r="2"/><circle cx="332" cy="84" r="2"/><circle cx="343" cy="328" r="4"/><circle cx="116" cy="371" r="1.7"/><circle cx="288" cy="387" r="1.7"/></g>
      <g stroke="#fff" stroke-width="1.6" opacity=".63"><path d="M95 104v22M84 115h22M324 270v31M308 285h31M95 336v17M87 344h17"/></g>
      <path d="M0 459Q103 406 213 458T400 442V540H0Z" fill="var(--cover-accent)" opacity=".3"/>` },
    { id:'window', name:'Ô cửa mùa thu', number:'04', art: `
      <rect x="69" y="60" width="264" height="421" rx="128" fill="var(--cover-accent)" opacity=".27"/>
      <path d="M87 477V200a113 113 0 0 1 226 0v277Z" fill="#fff" opacity=".61"/>
      <path d="M94 470V200a106 106 0 0 1 212 0v270Z" fill="var(--cover-accent)" opacity=".17"/>
      <circle cx="247" cy="241" r="47" fill="#fff" opacity=".76"/>
      <path d="M94 360Q170 276 239 349T306 350V470H94Z" fill="var(--cover-accent)" opacity=".3"/>
      <path d="M94 400Q180 350 250 398T306 391V470H94Z" fill="var(--cover-accent)" opacity=".62"/>
      <path d="M94 470V200a106 106 0 0 1 212 0v270M200 95v375M94 280h212" fill="none" stroke="var(--cover-accent)" stroke-width="6" opacity=".55"/>
      <g fill="#fff" opacity=".65"><circle cx="125" cy="232" r="4"/><circle cx="151" cy="191" r="2"/><circle cx="291" cy="331" r="3"/></g>` },
    { id:'paperflow', name:'Dòng ký ức', number:'05', art: `
      <path d="M-40 128Q74 17 177 122T444 59" stroke="var(--cover-accent)" stroke-width="85" opacity=".39" fill="none"/>
      <path d="M-35 190Q71 84 176 180T446 124" stroke="#fff" stroke-width="48" opacity=".63" fill="none"/>
      <path d="M-20 291Q118 212 216 309T420 254" stroke="var(--cover-accent)" stroke-width="79" opacity=".62" fill="none"/>
      <path d="M-40 360Q90 286 207 370T440 328" stroke="#fff" stroke-width="47" opacity=".35" fill="none"/>
      <path d="M-40 450Q100 380 219 456T442 403" stroke="var(--cover-accent)" stroke-width="100" opacity=".4" fill="none"/>
      <g fill="none" stroke="#fff" stroke-width="1.4" opacity=".68"><path d="M5 99Q71 45 147 123T343 108"/><path d="M-20 252Q118 190 212 260T420 220"/><path d="M-20 418Q96 357 209 420T420 382"/></g>` },
    { id:'gardenmoon', name:'Trăng trong vườn', number:'06', art: `
      <circle cx="246" cy="165" r="118" fill="#fff" opacity=".58"/>
      <circle cx="245" cy="165" r="97" fill="var(--cover-accent)" opacity=".14"/>
      <g stroke="var(--cover-accent)" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M69 540Q161 385 150 257"/><path d="M133 540Q214 402 282 251"/><path d="M320 540Q257 430 319 313"/></g>
      <g fill="var(--cover-accent)" opacity=".54"><ellipse cx="112" cy="355" rx="25" ry="61" transform="rotate(-55 112 355)"/><ellipse cx="181" cy="341" rx="27" ry="63" transform="rotate(43 181 341)"/><ellipse cx="246" cy="353" rx="25" ry="62" transform="rotate(46 246 353)"/><ellipse cx="328" cy="389" rx="24" ry="60" transform="rotate(-40 328 389)"/><ellipse cx="80" cy="470" rx="25" ry="61" transform="rotate(-50 80 470)"/></g>
      <g fill="none" stroke="#fff" opacity=".74" stroke-width="1.8"><path d="M290 120h42m-21-21v42M77 172h23m-11-11v23"/><circle cx="229" cy="162" r="26" stroke-dasharray="3 7"/></g>` },
    { id:'abstract', name:'Nhịp hình học', number:'07', art: `
      <circle cx="212" cy="251" r="146" fill="var(--cover-accent)" opacity=".28"/>
      <circle cx="212" cy="251" r="99" fill="var(--cover-base)"/>
      <rect x="28" y="56" width="201" height="256" rx="100" fill="#fff" opacity=".49" transform="rotate(19 128 184)"/>
      <path d="M-43 419 418 137" stroke="var(--cover-accent)" stroke-width="67" opacity=".6"/>
      <path d="M-43 487 418 205" stroke="#fff" stroke-width="19" opacity=".78"/>
      <path d="M96 45 339 456" stroke="var(--cover-accent)" stroke-width="12" opacity=".24"/>
      <circle cx="316" cy="114" r="18" fill="var(--cover-accent)" opacity=".82"/>
      <circle cx="89" cy="423" r="11" fill="#fff" opacity=".82"/>` },
    { id:'rain', name:'Ngày có mưa', number:'08', art: `
      <ellipse cx="210" cy="168" rx="168" ry="60" fill="#fff" opacity=".39"/>
      <ellipse cx="280" cy="223" rx="132" ry="53" fill="#fff" opacity=".35"/>
      <ellipse cx="97" cy="237" rx="110" ry="48" fill="var(--cover-accent)" opacity=".19"/>
      <g stroke="var(--cover-accent)" stroke-linecap="round" stroke-width="3" opacity=".52"><path d="M80 279 48 350M150 294l-31 64M225 275l-33 69M301 295l-34 71M356 263l-31 65M108 393l-32 68M204 384l-32 68M293 393l-32 68"/></g>
      <g stroke="#fff" stroke-linecap="round" opacity=".81" stroke-width="2"><path d="M90 285 58 349M161 290l-31 64M241 269l-32 70M318 300l-32 68M121 398l-32 68"/></g>
      <path d="M0 478Q70 464 137 480T263 480T400 477V540H0Z" fill="var(--cover-accent)" opacity=".38"/>` }
    ,{ id:'riversong', name:'Dòng sông mực', number:'09', art: `
      <circle cx="283" cy="142" r="67" fill="#fff" opacity=".44"/>
      <path d="M-25 350Q48 255 150 292T425 221V560H-25Z" fill="var(--cover-accent)" opacity=".32"/>
      <path d="M-20 409Q127 319 212 382T421 338V550H-20Z" fill="var(--cover-accent)" opacity=".55"/>
      <path d="M-23 483Q67 444 161 457T419 421V560H-23Z" fill="var(--cover-accent)" opacity=".81"/>
      <g fill="none" stroke="#fff" stroke-width="2" opacity=".67"><path d="M100 489Q225 438 373 470"/><path d="M21 510Q177 475 350 506"/><path d="M40 347q54-25 127 11"/></g>
      <path d="M62 318l19-56 19 56m-14-18h36" stroke="var(--cover-accent)" opacity=".5" fill="none" stroke-width="3"/>` }
    ,{ id:'lotus', name:'Hoa sen tĩnh lặng', number:'10', art: `
      <ellipse cx="220" cy="365" rx="180" ry="54" fill="var(--cover-accent)" opacity=".19"/>
      <g fill="none" stroke="var(--cover-accent)" opacity=".33" stroke-width="2"><ellipse cx="200" cy="396" rx="182" ry="52"/><ellipse cx="200" cy="426" rx="209" ry="69"/><path d="M201 353v171"/></g>
      <g fill="var(--cover-accent)" opacity=".43"><ellipse cx="201" cy="282" rx="30" ry="96"/><ellipse cx="165" cy="302" rx="27" ry="92" transform="rotate(-31 165 302)"/><ellipse cx="240" cy="302" rx="27" ry="92" transform="rotate(31 240 302)"/><ellipse cx="134" cy="342" rx="24" ry="89" transform="rotate(-55 134 342)"/><ellipse cx="274" cy="342" rx="24" ry="89" transform="rotate(55 274 342)"/></g>
      <circle cx="316" cy="120" r="64" fill="#fff" opacity=".55"/>
      <g fill="var(--cover-accent)" opacity=".21"><circle cx="76" cy="96" r="4"/><circle cx="103" cy="66" r="2"/><circle cx="90" cy="163" r="2"/></g>` }
    ,{ id:'hourglass', name:'Cát thời gian', number:'11', art: `
      <g stroke="var(--cover-accent)" fill="none" stroke-width="5" opacity=".69"><path d="M118 96h170M118 452h170M137 108q0 110 65 157-65 56-65 180M270 108q0 110-68 157 68 56 68 180"/></g>
      <path d="M152 164Q198 201 255 164L204 260Z" fill="var(--cover-accent)" opacity=".33"/>
      <path d="M152 416Q201 350 256 416Z" fill="var(--cover-accent)" opacity=".43"/>
      <circle cx="204" cy="288" r="4" fill="var(--cover-accent)"/><circle cx="202" cy="320" r="3" fill="var(--cover-accent)"/><circle cx="205" cy="340" r="2" fill="var(--cover-accent)"/>
      <g stroke="#fff" fill="none" opacity=".65"><circle cx="202" cy="260" r="169" stroke-dasharray="2 11"/><path d="M40 490h320M40 505h320"/></g>` }
    ,{ id:'windleaf', name:'Lá trong gió', number:'12', art: `
      <path d="M-30 441Q136 300 428 85" stroke="var(--cover-accent)" fill="none" stroke-width="4" opacity=".67"/>
      <g fill="var(--cover-accent)" opacity=".42"><ellipse cx="105" cy="337" rx="25" ry="66" transform="rotate(45 105 337)"/><ellipse cx="163" cy="302" rx="27" ry="76" transform="rotate(-38 163 302)"/><ellipse cx="208" cy="258" rx="21" ry="60" transform="rotate(52 208 258)"/><ellipse cx="283" cy="185" rx="26" ry="65" transform="rotate(-32 283 185)"/><ellipse cx="329" cy="130" rx="17" ry="48" transform="rotate(42 329 130)"/></g>
      <g fill="none" stroke="#fff" stroke-width="1.5" opacity=".58"><path d="M95 390l23-104M154 361l26-116M204 310l20-95M267 236l32-101"/></g>
      <path d="M36 480Q120 430 206 481T371 480" fill="none" stroke="var(--cover-accent)" stroke-width="2" opacity=".42"/>` }
    ,{ id:'citylights', name:'Những ô cửa sáng', number:'13', art: `
      <circle cx="288" cy="106" r="74" fill="#fff" opacity=".28"/>
      <rect x="33" y="249" width="76" height="290" fill="var(--cover-accent)" opacity=".31"/>
      <rect x="113" y="171" width="101" height="368" fill="var(--cover-accent)" opacity=".56"/>
      <rect x="223" y="221" width="65" height="318" fill="var(--cover-accent)" opacity=".43"/>
      <rect x="295" y="132" width="73" height="408" fill="var(--cover-accent)" opacity=".24"/>
      <g fill="#fff" opacity=".57"><rect x="51" y="290" width="14" height="26"/><rect x="78" y="341" width="14" height="26"/><rect x="137" y="215" width="17" height="29"/><rect x="177" y="275" width="17" height="29"/><rect x="145" y="353" width="17" height="29"/><rect x="247" y="261" width="13" height="25"/><rect x="247" y="331" width="13" height="25"/><rect x="318" y="180" width="18" height="31"/><rect x="318" y="273" width="18" height="31"/></g>
      <path d="M0 513Q100 483 200 514T400 492V540H0Z" fill="var(--cover-accent)" opacity=".46"/>` }

  ];
  const palettes = [
    {name:'Sương sớm',base:'#dce8df',accent:'#365f5f'},
    {name:'Đêm xanh',base:'#303d58',accent:'#c9baa0'},
    {name:'Hồng tro',base:'#e2ced2',accent:'#8d6479'},
    {name:'Đất nung',base:'#deb49f',accent:'#8b5144'},
    {name:'Rêu xanh',base:'#afc5ac',accent:'#38644e'},
    {name:'Đêm mực',base:'#292f3b',accent:'#c5a67f'},
    {name:'Nắng cũ',base:'#efdfb4',accent:'#ad8053'},
    {name:'Giấy xám',base:'#d9d6d0',accent:'#5c6465'}
  ];
  const coverState = { template:0, base:palettes[0].base, accent:palettes[0].accent, palette:0 };
  const luminance = hex => {
    const rgb = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));
    return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
  };
  function svgCover(template) { return svgStart + background + template.art + svgEnd; }
  function buildGallery() {
    gallery.innerHTML = covers.map((cover,i)=>`<button type="button" class="gallery-card" data-cover="${i}" aria-pressed="${i===0}" title="Bìa ${cover.name}"><span class="gallery-visual" style="--cover-base:${palettes[i].base};--cover-accent:${palettes[i].accent}">${svgCover(cover)}</span><span>${cover.name}<small>${cover.number}</small></span></button>`).join('');
    paletteGrid.innerHTML = palettes.map((p,i)=>`<button type="button" class="palette-button" data-palette="${i}" aria-pressed="${i===0}" style="--swatch:${p.base}" title="Bảng màu ${p.name}" aria-label="Bảng màu ${p.name}"></button>`).join('');
    gallery.addEventListener('click',e=>{const btn=e.target.closest('[data-cover]');if(!btn)return;coverState.template=Number(btn.dataset.cover);$$('[data-cover]',gallery).forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));updateCover();});
    paletteGrid.addEventListener('click',e=>{const btn=e.target.closest('[data-palette]');if(!btn)return;const idx=Number(btn.dataset.palette),p=palettes[idx];coverState.palette=idx;coverState.base=p.base;coverState.accent=p.accent;$('#cover-base').value=p.base;$('#cover-accent').value=p.accent;updateCover();});
    [['cover-base','base'],['cover-accent','accent']].forEach(([id,key])=>$('#'+id).addEventListener('input',e=>{coverState[key]=e.target.value;coverState.palette=-1;updateCover();}));
    updateCover();
  }
  function updateCover() {
    coverBook.style.setProperty('--cover-base',coverState.base);
    coverBook.style.setProperty('--cover-accent',coverState.accent);
    coverBook.style.setProperty('--cover-ink',luminance(coverState.base)<.18?'#fffdf7':'#243431');
    coverArt.innerHTML=svgCover(covers[coverState.template]);
    $$('[data-palette]',paletteGrid).forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.palette)===coverState.palette)));
  }
  function updateIdentity() {
    const title=titleInput.value.trim() || 'Tác phẩm chưa đặt tên';
    const subtitle=subtitleInput.value.trim() || 'Một câu chuyện đang được viết';
    const author=authorInput.value.trim() || 'Tác giả chưa ghi tên';
    $('#cover-display-title').textContent=title;
    $('#cover-display-subtitle').textContent=subtitle;
    $('#cover-display-author').textContent=author;
    $('#document-display-title').textContent=title;
    $('#paper-author').textContent=author;
  }
  [titleInput,subtitleInput,authorInput].forEach(input=>input.addEventListener('input',updateIdentity));
  const count = () => {
    const text=(editor.innerText||'').replace(/\u00a0/g,' ').trim();
    const words=text?text.split(/\s+/).filter(Boolean).length:0;
    $('#word-count').textContent=words.toLocaleString('vi-VN');
    $('#char-count').textContent=text.length.toLocaleString('vi-VN');
  };
  function isEditorRange(range) {return range&&editor.contains(range.commonAncestorContainer);}
  function rememberSelection() {
    const sel=window.getSelection();
    if(sel&&sel.rangeCount&&isEditorRange(sel.getRangeAt(0)))lastRange=sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    editor.focus({preventScroll:true});
    const sel=window.getSelection();
    if(lastRange&&lastRange.startContainer.isConnected){
      try{sel.removeAllRanges();sel.addRange(lastRange);return;}catch{}
    }
    const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);sel.removeAllRanges();sel.addRange(range);
  }
  function command(name,value) {
    if(preview)return;
    restoreSelection();
    // execCommand remains useful for native rich-text selection, undo/redo and paste.
    // We avoid third-party editors, saving and external runtime dependencies.
    document.execCommand(name,false,value??null);
    rememberSelection();count();syncToolbar();
  }
  function setInlineSize(px){
    if(preview)return;
    restoreSelection();
    const n=Math.max(11,Math.min(72,parseInt(px,10)||18));
    document.execCommand('fontSize',false,'7');
    editor.querySelectorAll('font[size="7"]').forEach(el=>{
      const span=document.createElement('span');span.style.fontSize=n+'px';while(el.firstChild)span.appendChild(el.firstChild);el.replaceWith(span);
    });
    rememberSelection();count();
  }
  function textFont(value){command('fontName',value);}
  function formatBlock(value) {command('formatBlock','<'+value.toLowerCase()+'>');}
  function syncToolbar() {
    $$('[data-command]', $('#format-toolbar')).forEach(btn=>{
      const c=btn.dataset.command;
      if(!['bold','italic','underline','strikeThrough','justifyLeft','justifyCenter','justifyRight','insertOrderedList','insertUnorderedList'].includes(c))return;
      try{btn.classList.toggle('active',document.queryCommandState(c));}catch{}
    });
  }
  function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2800);}
  function addLink() {
    if(preview)return;
    rememberSelection();
    const entered=prompt('Nhập đường dẫn liên kết (https://...):','https://');
    if(entered===null)return;
    let value=entered.trim();
    if(!value){toast('Chưa nhập liên kết.');return;}
    if(!/^https?:\/\//i.test(value))value='https://'+value;
    try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol))throw Error();value=url.href;}catch{toast('Đường dẫn không hợp lệ.');return;}
    restoreSelection();
    const sel=window.getSelection();
    if(sel&&sel.toString().trim())document.execCommand('createLink',false,value);
    else{
      const a=document.createElement('a');a.href=value;a.textContent=value;a.target='_blank';a.rel='noopener noreferrer';
      const range=sel?.getRangeAt(0);if(range){range.deleteContents();range.insertNode(a);range.setStartAfter(a);range.collapse(true);sel.removeAllRanges();sel.addRange(range);}
    }
    rememberSelection();count();toast('Đã chèn liên kết.');
  }
  function initToolbar() {
    const bar=$('#format-toolbar');
    bar.addEventListener('pointerdown',e=>{if(e.target.closest('button[data-command],#quote-button,#link-button'))e.preventDefault();});
    bar.addEventListener('click',e=>{
      const btn=e.target.closest('button[data-command]');
      if(btn){command(btn.dataset.command);return;}
      if(e.target.closest('#quote-button'))formatBlock('BLOCKQUOTE');
      if(e.target.closest('#link-button'))addLink();
    });
    $('#block-format').addEventListener('change',e=>formatBlock(e.target.value));
    $('#inline-font').addEventListener('change',e=>textFont(e.target.value));
    $('#inline-size').addEventListener('change',e=>setInlineSize(e.target.value));
    $('#font-color').addEventListener('input',e=>command('foreColor',e.target.value));
    $('#highlight-color').addEventListener('input',e=>command('hiliteColor',e.target.value));
    editor.addEventListener('input',()=>{rememberSelection();count();});
    editor.addEventListener('keyup',()=>{rememberSelection();syncToolbar();});
    editor.addEventListener('mouseup',()=>{rememberSelection();syncToolbar();});
    editor.addEventListener('focus',rememberSelection);
    document.addEventListener('selectionchange',()=>{rememberSelection();});
    // Pasting text without scripts/foreign HTML keeps the editor lightweight and safe.
    editor.addEventListener('paste',e=>{
      const text=e.clipboardData?.getData('text/plain');
      if(text===undefined)return;
      e.preventDefault();document.execCommand('insertText',false,text);
      count();
    });
    editor.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        e.preventDefault();addLink();
      }
    });
    count();
  }
  function initPaper() {
    $$('.paper-color-button').forEach(btn=>btn.addEventListener('click',()=>{
      paper.dataset.paper=btn.dataset.paper;
      $$('.paper-color-button').forEach(b=>b.classList.toggle('selected',b===btn));
    }));
    $('#body-font-size').addEventListener('input',e=>{
      editor.style.fontSize=e.target.value+'px';$('#body-font-size-label').textContent=e.target.value+'px';
    });
    $('#line-spacing').addEventListener('input',e=>{
      const val=Number(e.target.value).toFixed(2).replace(/0$/,'').replace(/\.$/,'');
      editor.style.lineHeight=val;$('#line-spacing-label').textContent=val;
    });
    $('#document-font').addEventListener('change',e=>{
      const fonts={literata:'"Literata",Georgia,serif',georgia:'Georgia,"Times New Roman",serif',sans:'"Be Vietnam Pro","Segoe UI",sans-serif'};
      editor.style.fontFamily=fonts[e.target.value]||fonts.literata;
    });
  }
  function initViewModes() {
    const previewBtn=$('#preview-button'),focusBtn=$('#focus-button');
    previewBtn.addEventListener('click',()=>{
      preview=!preview;app.classList.toggle('previewing',preview);editor.contentEditable=String(!preview);
      previewBtn.setAttribute('aria-pressed',String(preview));
      previewBtn.querySelector('span').textContent=preview?'Tiếp tục viết':'Xem trước';
      previewBtn.title=preview?'Tiếp tục soạn thảo':'Xem trước tác phẩm';
      if(!preview)editor.focus({preventScroll:true});
      toast(preview?'Đang xem trước, nội dung tạm khóa chỉnh sửa.':'Đã trở lại chế độ viết.');
    });
    focusBtn.addEventListener('click',()=>{
      focusMode=!focusMode;app.classList.toggle('focus-mode',focusMode);
      focusBtn.setAttribute('aria-pressed',String(focusMode));
      focusBtn.querySelector('span').textContent=focusMode?'Thoát tập trung':'Tập trung';
      focusBtn.title=focusMode?'Thoát chế độ tập trung':'Chế độ tập trung';
      toast(focusMode?'Đã ẩn các bảng điều khiển.':'Đã mở lại các bảng điều khiển.');
    });
  }
  buildGallery();updateIdentity();initToolbar();initPaper();initViewModes();
})();
