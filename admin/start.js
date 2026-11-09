(async()=>{
  try {
    const res=await fetch('/api/editor-status',{cache:'no-store'});
    const data=res.ok?await res.json():{ready:false};
    if(!data.ready){document.querySelector('#status').textContent='GitHubログインの設定が必要です。';document.querySelector('#instructions').hidden=false;return;}
    const script=document.createElement('script');script.src='/admin/vendor/decap-cms.js';
    script.onerror=()=>{document.querySelector('#status').textContent='管理画面を読み込めませんでした。再読み込みしてください。';};
    script.onload=()=>{document.querySelector('#setup').hidden=true;};document.body.append(script);
  }catch{document.querySelector('#status').textContent='設定を確認できませんでした。接続を確認して再読み込みしてください。';}
})();
