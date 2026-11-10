const SITE = 'https://lovot.pages.dev';
const REPO = 'yuseimorishima/rabot-project.com';
const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const response=(text,status=200,extra={})=>new Response(text,{status,headers:{...headers,...extra}});
const htmlHeaders={'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"};
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');}
async function equalSecret(a,b){const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const [x,y]=await Promise.all([hash(a),hash(b)]);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
async function loginForm(env,error='',status=200){
 const nonce=crypto.randomUUID(),value=nonce+'.'+Date.now(),state=value+'.'+await sign(value,env.GITHUB_CMS_TOKEN);
 const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>管理者パスワード</title><style>body{font-family:sans-serif;background:#f6f0e6;color:#65452e;margin:0;display:grid;place-items:center;min-height:100vh}main{width:min(80%,360px)}h1{font-size:24px}input,button{box-sizing:border-box;width:100%;padding:14px;margin-top:16px;border:1px solid #cbb69a;border-radius:12px;font:inherit}button{background:#8d593b;color:white;cursor:pointer}p{line-height:1.8;font-size:13px}</style><main><h1>サイトを編集</h1><p>管理者パスワードを入力してください。</p><p role="alert">${error}</p><form action="/api/password" method="post"><input type="hidden" name="state" value="${state}"><label for="password">パスワード</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="256" required autofocus><button>編集画面へ</button></form></main></html>`;
 return response(html,status,{...htmlHeaders,'Set-Cookie':`lovot_login=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/api/; Max-Age=600`});
}
export async function onRequest({request,env}){
 const url=new URL(request.url),ready=Boolean(env.ADMIN_PASSWORD&&env.GITHUB_CMS_TOKEN);
 if(url.pathname==='/api/editor-status')return response(JSON.stringify({ready}),200,{'Content-Type':'application/json'});
 if(!['/api/auth','/api/password'].includes(url.pathname))return response('Not found',404);
 if(url.origin!==SITE)return response('編集画面は https://lovot.pages.dev/admin/ から開いてください。',400);
 if(!ready)return response('管理者パスワードと保存用接続キーの設定が必要です。',503);
 if(url.pathname==='/api/auth')return request.method==='GET'?loginForm(env):response('Method not allowed',405);
 if(request.method!=='POST')return response('Method not allowed',405);
 // Some browsers omit Origin when the login form uses a no-referrer policy.
 // The signed state and matching SameSite cookie below still protect the form.
 const origin=request.headers.get('Origin');
 if(origin && origin!==SITE)return response('Invalid origin',403);
 if(Number(request.headers.get('Content-Length')||0)>4096)return response('Too large',413);
 try{
  const body=await request.text();if(body.length>4096)return response('Too large',413);
  const form=new URLSearchParams(body),state=form.get('state')||'',[nonce,time,sig]=state.split('.');
  const cookie=(request.headers.get('Cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('lovot_login='))?.slice(12);
  if(!nonce||cookie!==nonce||!/^\d+$/.test(time)||Date.now()-Number(time)>600000||Date.now()<Number(time)||sig!==await sign(nonce+'.'+time,env.GITHUB_CMS_TOKEN))return loginForm(env,'入力画面の有効期限が切れました。もう一度入力してください。',403);
  const password=form.get('password')||'';
  if(!password||password.length>256||!await equalSecret(password,env.ADMIN_PASSWORD))return loginForm(env,'パスワードが違います。',401);
  const check=await fetch('https://api.github.com/repos/'+REPO,{headers:{Authorization:'Bearer '+env.GITHUB_CMS_TOKEN,Accept:'application/vnd.github+json','User-Agent':'LOVOT-editor'}});
  const repo=await check.json();if(!check.ok||!repo.permissions?.push)return response('保存用接続キーの権限を確認してください。',503);
  const payload=JSON.stringify('authorization:github:success:'+JSON.stringify({token:env.GITHUB_CMS_TOKEN,provider:'github'})).replaceAll('<','\\u003c');
  const page=`<!doctype html><html lang="ja"><meta charset="utf-8"><title>認証完了</title><p>認証しました。この画面は自動で閉じます。</p><script>const origin=${JSON.stringify(SITE)};function receive(e){if(e.origin!==origin||e.source!==window.opener)return;window.opener.postMessage(${payload},origin);window.removeEventListener('message',receive);window.close()}window.addEventListener('message',receive);if(window.opener)window.opener.postMessage('authorizing:github',origin);</script></html>`;
  return response(page,200,{...htmlHeaders,'Set-Cookie':'lovot_login=; HttpOnly; Secure; SameSite=Lax; Path=/api/; Max-Age=0'});
 }catch{return response('認証処理に失敗しました。時間をおいてお試しください。',502);}
}
