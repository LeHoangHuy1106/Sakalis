/* Paper stack: single face, staggered pages, bidirectional swiping. */
export function initializePaperStack(){
 const reader=document.getElementById('paper-stack-reader'),deck=document.getElementById('stack-deck'),stage=document.getElementById('stack-stage'),normal=document.getElementById('poem-detail-layout');
 const prev=document.getElementById('stack-prev'),next=document.getElementById('stack-next'),label=document.getElementById('stack-label'),seek=document.getElementById('stack-seek'),full=document.getElementById('stack-fullscreen');
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
  pg.innerHTML=`<header class="stack-paper-head"><span>SAKALIS / ${esc(poem.collection||'THƠ')}</span><span>❦</span></header><div class="stack-paper-content"><h2>${esc(poem.title)}</h2><div class="stack-lines">${lines}</div></div><footer class="stack-paper-foot"><span>BNA</span><span>${String(i+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}</span></footer>`;return pg;
 }
 function fit(){if(!active)return;const paper=deck.querySelector('.stack-sheet--top');if(!paper)return;const lines=paper.querySelectorAll('.stack-line');lines.forEach(el=>{el.style.transform='';const avail=el.clientWidth;const natural=el.scrollWidth;if(natural>avail&&avail>0)el.style.transform=`scaleX(${avail/natural})`;});}
 function render(){deck.replaceChildren();if(index+2<pages.length)deck.append(sheet(index+2,'back2'));if(index+1<pages.length)deck.append(sheet(index+1,'back1'));if(index>0&&index===pages.length-1)deck.append(sheet(index-1,'back1'));deck.append(sheet(index));label.textContent=`Trang ${index+1} / ${pages.length}`;seek.max=String(pages.length);seek.value=String(index+1);prev.disabled=index===0;next.disabled=index===pages.length-1;fit();}
 function go(to,fromDrag=0){to=bound(to,0,pages.length-1);if(busy||!active||to===index)return false;const old=deck.querySelector('.stack-sheet--top'),dir=to>index?-1:1;index=to;if(reduced){render();return true;}busy=true;render();const incoming=deck.querySelector('.stack-sheet--top');incoming.classList.add('stack-enter');old.classList.add('stack-exit');old.style.transform=`translateX(${fromDrag}px) rotate(${fromDrag/24}deg)`;old.setAttribute('aria-hidden','true');deck.append(old);requestAnimationFrame(()=>{old.style.transform=`translateX(${dir*(stage.clientWidth+60)}px) rotate(${dir*13}deg)`;old.style.opacity='0';});timer=setTimeout(()=>{old.remove();incoming.classList.remove('stack-enter');busy=false;},420);return true;}
 function mode(stack){active=stack;normal.hidden=stack;reader.hidden=!stack;modes.forEach(b=>{const selected=b.dataset.readerMode===(stack?'stack':'scroll');b.classList.toggle('is-active',selected);b.setAttribute('aria-pressed',String(selected));});if(stack){render();requestAnimationFrame(fit);}else{drag=null;clearTimeout(timer);busy=false;if(document.fullscreenElement===reader)document.exitFullscreen?.().catch(()=>{});document.documentElement.classList.remove('sakalis-stack-fullscreen');}}
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
