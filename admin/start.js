(async()=>{
  // This hides the entrance; the server password check protects editor access.
  let entered = false;
  try {
    const time = Number(sessionStorage.getItem('lovot-editor-entry'));
    entered = time > 0 && Date.now() >= time && Date.now() - time < 30 * 60 * 1000;
  } catch {}
  if (!entered) { location.replace('/videos.html'); return; }

  // Safari may open the authorization window as a separate tab without an opener.
  // Decap uses this same storage key for its authenticated user.
  window.addEventListener('storage', event => {
    if (event.key === 'decap-cms-user' && event.newValue) location.reload();
  });

  try {
    const res=await fetch('/api/editor-status',{cache:'no-store'});
    const data=res.ok?await res.json():{ready:false};
    if(!data.ready){document.querySelector('#status').textContent='パスワード認証の設定が必要です。';document.querySelector('#instructions').hidden=false;return;}
    const labels = new MutationObserver(() => {
      document.querySelectorAll('button').forEach(button => {
        if (/GitHub.*ログイン|Login with GitHub/i.test(button.textContent)) button.textContent = '管理者パスワードで入る';
      });
    });
    labels.observe(document.body,{childList:true,subtree:true});
    const script=document.createElement('script');script.src='/admin/vendor/decap-cms.js';
    script.onerror=()=>{document.querySelector('#status').textContent='管理画面を読み込めませんでした。再読み込みしてください。';};
    script.onload=()=>{document.querySelector('#setup').hidden=true;};document.body.append(script);
  }catch{document.querySelector('#status').textContent='設定を確認できませんでした。接続を確認して再読み込みしてください。';}
})();
