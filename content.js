// Content saved by the editor is plain text and media paths, never executable HTML.
window.lovotContentReady = (async()=>{
  const page=location.pathname.split('/').pop()?.replace(/\.html$/,'')||'index';
  if(!['index','about','life','visit','videos'].includes(page))return;
  const mediaPath=value=>{
    if(typeof value!=='string')return null;
    try{const u=new URL(value,location.href);return u.origin===location.origin&&u.pathname.startsWith('/assets/')?u.pathname:null;}catch{return null;}
  };
  const read=async path=>{try{const r=await fetch(path,{cache:'no-cache'});return r.ok?await r.json():null;}catch{return null;}};
  const [copy,media]=await Promise.all([read('/content/'+page+'.json'),read('/content/media.json')]);
  document.querySelectorAll('[data-edit]').forEach(el=>{const value=copy?.texts?.[el.dataset.edit];if(typeof value==='string'&&value!==el.dataset.default){el.textContent=value;el.classList.add('content-edited');}});
  if(!media)return;
  const setVideo=(el,key,poster)=>{const src=mediaPath(media[key]),img=mediaPath(media[poster]);if(!el)return;if(src){el.src=src;}if(img)el.poster=img;};
  if(page==='index'){const videos=document.querySelectorAll('main video');setVideo(videos[0],'home_video','home_poster');setVideo(videos[1],'second_video','second_poster');}
  if(page==='life')setVideo(document.querySelector('video'),'life_video','life_poster');
  for(const [selector,key]of [['.real-photo img','about_photo'],['.life-still img','life_photo']]){const img=document.querySelector(selector),src=mediaPath(media[key]);if(img&&src)img.src=src;}
  const room=document.querySelector('.orbit-photos');
  if(room&&Array.isArray(media.photos)&&media.photos.length){
    const cards=media.photos.slice(0,30).map(photo=>{const imgPath=mediaPath(photo.image);if(!imgPath)return null;const card=document.createElement('button');card.className='orbit-photo';card.dataset.title=String(photo.title||'LOVOT');card.dataset.searchKeywords=String(photo.keywords||'');card.dataset.galleryVideo=mediaPath(photo.video)||'';card.setAttribute('aria-label',card.dataset.title+(card.dataset.galleryVideo?'の動画を開く':'の写真を開く'));const print=document.createElement('span');print.className='photo-print';const img=document.createElement('img');img.src=imgPath;img.alt=card.dataset.title;const caption=document.createElement('span');caption.className='print-caption';caption.textContent=card.dataset.title;print.append(img,caption);const hint=document.createElement('span');hint.className='photo-video-tag';hint.textContent=card.dataset.galleryVideo?'動画を見る ↗':'写真を大きく見る ↗';card.append(print,hint);return card;}).filter(Boolean);
    if(cards.length){room.replaceChildren(...cards);const note=document.querySelector('.museum-note');if(note)note.textContent=cards.length+'枚の写真を展示しています。';}
  }
})();
