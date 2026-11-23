/* Sakalis v9: portrait poetry postcards. The next/previous page is fully rendered
   under the top sheet BEFORE the first drag frame. No late text injection. */
export function initializePaperStack(){
 const reader=document.getElementById('paper-stack-reader'),deck=document.getElementById('stack-deck'),stage=document.getElementById('stack-stage'),normal=document.getElementById('poem-detail-layout');
 const prev=document.getElementById('stack-prev'),next=document.getElementById('stack-next'),label=document.getElementById('stack-label'),seek=document.getElementById('stack-seek'),full=document.getElementById('stack-fullscreen');
 const layout=reader.closest('.detail-layout'),modes=[...document.querySelectorAll('[data-reader-mode]')];
 const ctrl=new AbortController(),signal=ctrl.signal;
 const on=(el,type,fn,opts={})=>el?.addEventListener(type,fn,{...opts,signal});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let pages=[],index=0,poem=null,active=false,busy=false,drag=null,animationTimer=null,resize=null,fontScale=1;
 const bound=(n,a,b)=>Math.max(a,Math.min(b,n));
 const parseLines=text=>{
  const lines=String(text||'').normalize('NFC').replace(/\r\n?/g,'\n').split('\n');
  const output=[];let current=[],count=0;
  for(const line of lines){
   if(!line.trim()){if(current.length&&current.at(-1)!=='')current.push('');continue;}
   if(count===6){while(current.at(-1)==='')current.pop();output.push(current);current=[];count=0;}
   current.push(line);count++;
  }
  while(current.at(-1)==='')current.pop();if(current.length)output.push(current);
  return output.length?output:[['Bài thơ chưa có nội dung.']];
 };
 function sheet(i,role='top'){
  const element=document.createElement('article');element.className=`stack-sheet stack-sheet--${role}`;element.dataset.index=i;element.dataset.design=String(i%3);
  if(role!=='top')element.setAttribute('aria-hidden','true');
  const lines=pages[i].map(line=>line?`<span class="stack-line">${esc(line)}</span>`:'<span class="stack-stanza-gap" aria-hidden="true"></span>').join('');
  const stamp=esc(photo(poem,i));
  element.innerHTML=`<div class="postcard-art" aria-hidden="true"></div><header class="postcard-heading"><div><span class="postcard-edition">SAKALIS · THIỆP THƠ</span><h2>${esc(poem.title)}</h2></div><div class="postcard-stamp" aria-hidden="true"><img src="${stamp}" alt="" draggable="false" onerror="this.onerror=null;this.src='./assets/images/image-05.webp'"><span>✳</span></div></header><div class="stack-paper-content"><div class="stack-lines">${lines}</div></div><footer class="stack-paper-foot"><span class="postcard-collection">${esc(poem.collection||'Sakalis')}</span><span class="postcard-index">${String(i+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}</span>${i===pages.length-1?'<span class="stack-signature">BNA</span>':'<span class="postcard-symbol" aria-hidden="true">❦</span>'}</footer>`;
  return element;
 }
 function fit(){
  if(!active||!deck.isConnected)return;
  const top=deck.querySelector('.stack-sheet--top');if(!top)return;
  deck.style.removeProperty('--stack-font-size');
  const content=top.querySelector('.stack-paper-content'),holder=top.querySelector('.stack-lines');
  if(!holder||!content.clientHeight||!holder.clientWidth)return;
  const css=getComputedStyle(holder),base=parseFloat(css.fontSize)*fontScale;
  const ctx=document.createElement('canvas').getContext('2d');if(!ctx||!base)return;
  ctx.font=`400 ${base}px ${css.fontFamily}`;
  let factor=1;
  for(const group of pages)for(const line of group){if(!line)continue;const width=ctx.measureText(line).width;if(width>holder.clientWidth-6)factor=Math.min(factor,(holder.clientWidth-6)/width);}
  const heightRequirement=Math.max(...pages.map(group=>group.reduce((sum,line)=>sum+(line?1.55:.6),0)));
  factor=Math.min(factor,(content.clientHeight-10)/Math.max(1,base*heightRequirement));
  deck.style.setProperty('--stack-font-size',`${Math.max(11,base*Math.min(1,factor))}px`);
 }
 function render(){
  if(!pages.length)return;
  deck.replaceChildren();deck.classList.remove('stack-is-backward');
  // Paint text, artwork and footer on EVERY visible sheet, including those underneath.
  if(index>0)deck.append(sheet(index-1,'previous'));
  if(index+2<pages.length)deck.append(sheet(index+2,'back2'));
  if(index+1<pages.length)deck.append(sheet(index+1,'back1'));
  deck.append(sheet(index,'top'));
  label.textContent=`Trang ${index+1} / ${pages.length}`;
  seek.max=String(pages.length);seek.value=String(index+1);
  prev.disabled=index===0;next.disabled=index===pages.length-1;
  requestAnimationFrame(fit);
 }
 function go(target,dragX=0){
  target=bound(target,0,pages.length-1);
  if(!active||busy||target===index)return false;
  const goingForward=target>index,old=deck.querySelector('.stack-sheet--top');
  if(reduced){index=target;render();return true;}
  busy=true;index=target;render();
  const entering=deck.querySelector('.stack-sheet--top');
  old.className='stack-sheet stack-sheet--top stack-exit';old.dataset.index=String(goingForward?index-1:index+1);
  old.setAttribute('aria-hidden','true');old.style.transition='none';old.style.transform=`translateX(${dragX}px) rotate(${dragX/28}deg)`;
  deck.append(old);
  entering.classList.add('stack-under-enter');
  // The new page was already rendered underneath during the gesture.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   old.style.transition='transform .54s cubic-bezier(.2,.8,.25,1),opacity .54s ease';
   old.style.transform=`translateX(${(goingForward?-1:1)*(stage.clientWidth+120)}px) rotate(${goingForward?-12:12}deg)`;
   old.style.opacity='0';
  }));
  animationTimer=setTimeout(()=>{old.remove();entering.classList.remove('stack-under-enter');busy=false;fit();},580);
  return true;
 }
 function setMode(stack){
  active=stack;layout?.classList.toggle('is-paper-reading',stack);normal.hidden=stack;reader.hidden=!stack;
  modes.forEach(button=>{const selected=button.dataset.readerMode===(stack?'stack':'scroll');button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));});
  if(stack){render();requestAnimationFrame(fit);}else{
   drag=null;clearTimeout(animationTimer);busy=false;
   if(document.fullscreenElement===reader)document.exitFullscreen?.().catch(()=>{});
   document.documentElement.classList.remove('sakalis-stack-fullscreen');
   if(typeof readingFit==='function')requestAnimationFrame(readingFit);
  }
 }
 modes.forEach(b=>on(b,'click',()=>setMode(b.dataset.readerMode==='stack')));
 on(prev,'click',()=>go(index-1));on(next,'click',()=>go(index+1));
 on(seek,'input',()=>{if(busy){clearTimeout(animationTimer);busy=false;}index=bound(Number(seek.value)-1,0,pages.length-1);render();});
 on(stage,'pointerdown',e=>{
  if(!active||busy||!e.isPrimary||e.button!==0||e.target.closest('button,a,input'))return;
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,dx:0,horizontal:false};stage.setPointerCapture?.(e.pointerId);
 });
 on(stage,'pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.horizontal&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy))drag.horizontal=true;
  if(!drag.horizontal)return;
  const blocked=(dx>0&&index===0)||(dx<0&&index===pages.length-1);
  drag.dx=dx*(blocked?.18:1);
  deck.classList.toggle('stack-is-backward',dx>0);
  const top=deck.querySelector('.stack-sheet--top');if(top){top.style.transition='none';top.style.transform=`translateX(${drag.dx}px) rotate(${drag.dx/28}deg)`;}
 });
 function release(e,cancel=false){
  if(!drag||e.pointerId!==drag.id)return;
  const {dx,horizontal}=drag;drag=null;
  const top=deck.querySelector('.stack-sheet--top');
  if(top)top.style.transition='';
  if(!cancel&&horizontal&&Math.abs(dx)>Math.min(80,stage.clientWidth*.14)&&go(index+(dx<0?1:-1),dx))return;
  if(top)top.style.transform='';
  deck.classList.remove('stack-is-backward');
 }
 on(stage,'pointerup',e=>release(e));on(stage,'pointercancel',e=>release(e,true));on(stage,'lostpointercapture',e=>release(e,true));
 on(document,'keydown',e=>{if(!active||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(index+(e.key==='ArrowRight'?1:-1));}});
 on(full,'click',async()=>{
  if(document.fullscreenElement===reader){await document.exitFullscreen();return;}
  if(document.documentElement.classList.contains('sakalis-stack-fullscreen')){document.documentElement.classList.remove('sakalis-stack-fullscreen');return;}
  try{if(!reader.requestFullscreen)throw Error();await reader.requestFullscreen();}
  catch{document.documentElement.classList.add('sakalis-stack-fullscreen');}
  requestAnimationFrame(fit);
 });
 on(document,'fullscreenchange',()=>{full.querySelector('span').textContent=document.fullscreenElement===reader?'Thoát toàn màn hình':'Toàn màn hình';requestAnimationFrame(fit);});
 on(document,'keydown',e=>{if(e.key==='Escape')document.documentElement.classList.remove('sakalis-stack-fullscreen');});
 if(typeof ResizeObserver!=='undefined'){resize=new ResizeObserver(fit);resize.observe(stage);}else on(window,'resize',fit);
 document.fonts?.ready.then(()=>{if(!signal.aborted)fit();});
 return {
  setFont(value){fontScale=value/24;fit();},setPoem(p){poem=p;pages=parseLines(p.content);index=0;setMode(false);},
  refresh:fit,
  destroy(){ctrl.abort();clearTimeout(animationTimer);resize?.disconnect();document.documentElement.classList.remove('sakalis-stack-fullscreen');}
 };
}
