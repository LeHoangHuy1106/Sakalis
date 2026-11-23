/* Sakalis SVG Art Library — 13 original cover styles, stable title-based variation.
   These are SVG shapes, never fetched photos. Browser and editor use the same art. */
const sakalisCoverShapes=[

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
const sakalisCoverPalettes=[
 ['#e8dfd1','#7e7263','#282622'],['#2c3342','#9eafba','#f8f4ed'],
 ['#d7d9d4','#66706e','#262b2a'],['#e9d7cc','#ad7a73','#352822'],
 ['#b7c8bf','#52776d','#1e2927'],['#292e36','#c5b99c','#f8f2e8'],
 ['#e8e0c3','#a89978','#312c25'],['#c8c7c5','#5d626a','#2b2b2b'],
 ['#e9dfd5','#718087','#242c30'],['#302f33','#c6ad9f','#f7ede5'],
 ['#e2d6c4','#927b68','#342b24'],['#c3c7bd','#55716b','#1f2928'],
 ['#37333c','#a6a2b8','#f3eeea']
];
function sakalisHash(name){let h=2166136261;for(const char of String(name||'SAKALIS'))h=Math.imul(h^char.charCodeAt(0),16777619);return h>>>0;}
function sakalisCoverTheme(name){const h=sakalisHash(name);const palette=sakalisCoverPalettes[(h>>>8)%sakalisCoverPalettes.length];return {art:sakalisCoverShapes[h%sakalisCoverShapes.length],base:palette[0],accent:palette[1],ink:palette[2]};}
function sakalisCoverSVG(name){const theme=sakalisCoverTheme(name);return `<svg viewBox="0 0 400 540" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Tranh bìa SVG ${esc(name)}" style="--cover-base:${theme.base};--cover-accent:${theme.accent}"><rect width="400" height="540" fill="var(--cover-base)"/>${theme.art.art}</svg>`;}
