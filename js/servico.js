(() => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('servico');
  const service = (window.MCR_SERVICES || []).find(item => item.id === id);
  const fallback = (window.MCR_SERVICES || [])[0];
  const item = service || fallback;
  if(!item){ return; }
  document.title = `${item.title} | MCR Serralheria`;
  const set=(id,text)=>{ const el=document.getElementById(id); if(el) el.textContent=text; };
  set('detailBreadcrumb', item.title);
  set('detailCategory', item.catlabel);
  set('detailTitle', item.title);
  set('detailLead', item.short);
  set('detailHeading', item.title);
  set('detailDescription', item.long);
  const highlights=document.getElementById('detailHighlights');
  if(highlights){ highlights.innerHTML=item.highlights.map((h,i)=>`<li><span class="list-marker ${i===1?'weld':i===2?'arrow':'angle'}"></span>${h}</li>`).join(''); }
  const main=document.getElementById('detailMainImage');
  if(main){ main.innerHTML=`<img alt="${item.title}" data-fallback="img/placeholder-metal.svg" src="${item.images[0]}">`; }
  const gallery=document.getElementById('detailGallery');
  if(gallery){ gallery.innerHTML=item.images.map((src,i)=>`<figure class="reveal detail-gallery-item"><img alt="${item.title} - referência ${i+1}" data-fallback="img/placeholder-metal.svg" loading="lazy" src="${src}"><figcaption>${i===0?'Exemplo do serviço':i===1?'Processo e fabricação':'Referência de acabamento'}</figcaption></figure>`).join(''); }
  const order=document.getElementById('detailOrderButton');
  if(order){ order.dataset.order=item.order; order.innerHTML='Pedir este serviço <svg aria-hidden="true" class="icon-line" viewBox="0 0 24 24"><path d="M5 12h14M14 7l5 5-5 5"></path></svg>'; }
})();
