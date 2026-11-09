const SITE = 'https://lovot.pages.dev';
const REPO = 'yuseimorishima/rabot-project.com';
const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const response = (text, status=200, extra={}) => new Response(text,{status,headers:{...headers,...extra}});
async function signature(value, secret) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
}
export async function onRequest({request,env}) {
  const url=new URL(request.url), path=url.pathname;
  const ready=Boolean(env.GITHUB_OAUTH_CLIENT_ID&&env.GITHUB_OAUTH_CLIENT_SECRET);
  if(path==='/api/editor-status')return response(JSON.stringify({ready}),200,{'Content-Type':'application/json'});
  if(!['/api/auth','/api/callback'].includes(path))return response('Not found',404);
  if(request.method!=='GET')return response('Method not allowed',405);
  if(url.origin!==SITE)return response('編集は https://lovot.pages.dev/admin/ から開いてください。',400);
  if(!ready)return response('GitHubログインの設定がまだ完了していません。',503);
  if(path==='/api/auth') {
    const nonce=crypto.randomUUID(), value=nonce+'.'+Date.now();
    const state=value+'.'+await signature(value,env.GITHUB_OAUTH_CLIENT_SECRET);
    const dest=new URL('https://github.com/login/oauth/authorize');
    dest.search=new URLSearchParams({client_id:env.GITHUB_OAUTH_CLIENT_ID,redirect_uri:SITE+'/api/callback',scope:'repo',state}).toString();
    return response('',302,{Location:dest.href,'Set-Cookie':`lovot_oauth=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/api/; Max-Age=600`});
  }
  try {
    const state=url.searchParams.get('state')||'', [nonce,time,sig]=state.split('.');
    const cookie=(request.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('lovot_oauth='))?.slice(12);
    if(!nonce||cookie!==nonce||!/^\d+$/.test(time)||Date.now()-Number(time)>600000||Date.now()<Number(time)||sig!==await signature(nonce+'.'+time,env.GITHUB_OAUTH_CLIENT_SECRET))return response('ログインの有効期限が切れました。管理画面からやり直してください。',403);
    const code=url.searchParams.get('code');if(!code)return response('ログインがキャンセルされました。',400);
    const tokenResponse=await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_OAUTH_CLIENT_ID,client_secret:env.GITHUB_OAUTH_CLIENT_SECRET,code,redirect_uri:SITE+'/api/callback'})});
    const token=await tokenResponse.json();if(!tokenResponse.ok||!token.access_token)return response('GitHub認証に失敗しました。再度お試しください。',403);
    const permissions=await fetch('https://api.github.com/repos/'+REPO,{headers:{Authorization:'Bearer '+token.access_token,Accept:'application/vnd.github+json','User-Agent':'LOVOT-editor'}});
    const repo=await permissions.json();if(!permissions.ok||!repo.permissions?.push)return response('このリポジトリを編集できるGitHubアカウントでログインしてください。',403);
    const payload=JSON.stringify('authorization:github:success:'+JSON.stringify({token:token.access_token,provider:'github'})).replaceAll('<','\\u003c');
    // Decap CMS uses the `authorization` handshake with its OAuth popup.
    const page=`<!doctype html><html lang="ja"><meta charset="utf-8"><title>ログイン完了</title><p>ログインしました。この画面は自動で閉じます。</p><script>const origin=${JSON.stringify(SITE)};function receive(e){if(e.origin!==origin||e.source!==window.opener)return;window.opener.postMessage(${payload},origin);window.removeEventListener('message',receive);window.close()}window.addEventListener('message',receive);if(window.opener)window.opener.postMessage('authorizing:github',origin);</script></html>`;
    return response(page,200,{'Content-Type':'text/html; charset=utf-8','Referrer-Policy':'no-referrer','Set-Cookie':'lovot_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/api/; Max-Age=0','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});
  }catch{return response('ログイン処理に失敗しました。時間をおいてやり直してください。',502);}
}
