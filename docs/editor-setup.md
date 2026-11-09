# サイト管理画面

管理画面：https://lovot.pages.dev/admin/

## 最初に1回だけ行う設定

1. GitHubにログインして https://github.com/settings/applications/new を開きます。
2. Application nameを「LOVOTサイト編集」、Homepage URLを `https://lovot.pages.dev`、Authorization callback URLを `https://lovot.pages.dev/api/callback` にします。
3. OAuth Appを作成し、Client IDを確認。Client Secretを生成します。
4. Cloudflare → Workers & Pages → lovot → Settings → Variables and Secretsで、本番環境に次を追加します。
   - `GITHUB_OAUTH_CLIENT_ID`：Client ID（テキスト）
   - `GITHUB_OAUTH_CLIENT_SECRET`：Client Secret（Secretとして暗号化）
5. Cloudflare Pagesの最新デプロイを再実行し、管理画面を再読み込みします。

Client SecretをGitHub・チャットへ貼らないでください。設定はCloudflareの管理画面で行います。

この構成はCloudflare Pages Functionsを使用します。追加のWorker作成やサーバー契約は不要です。Functionsを含む最新デプロイが成功している必要があります。独自ドメインがあっても、管理画面は上記のpages.dev URLから開いてください。

## 日々の編集

1. 管理画面でGitHubログイン。`yuseimorishima/rabot-project.com` に書き込みできるアカウントが必要です。
2. 「サイトを編集」でページを選択し、文章を変更します。
3. 「写真・動画・写真館」で動画・写真を差し替え。写真館の展示は追加・並べ替え・削除ができます。動画欄を空にした写真は、クリックすると写真を拡大します。
4. 保存・公開するとGitHubのmainへコミットされ、Cloudflareの自動デプロイが動きます。実サイトを再読み込みして確認します。

本文はプレーンテキストです。HTMLを入力しても実行されません。改行を利用できます。レイアウトそのものの変更はコード側で行います。

## 写真と動画

- 写真はJPEG・PNG・WebPがおすすめです。
- 動画はブラウザ互換性のあるH.264/AACのMP4を使ってください。MOVのままでは端末によって再生できません。
- Cloudflare Pagesの静的ファイル上限は1ファイル25MiBです。余裕を持って24MB未満に圧縮してアップロードしてください。
- アップロード先は `assets/uploads/` です。公開してよい素材だけアップロードしてください。
- ぼかしなどの編集処理は管理画面では行いません。必要な処理を済ませたファイルを選んでください。
- 本文のリンクやナビゲーションの行き先は管理画面の対象外です。

## 認証と権限

GitHub OAuthのrepoスコープを利用します。認可画面のアクセス範囲を確認してください。認証用FunctionsはGitHub上の対象リポジトリへの書き込み権限を検査します。秘密のClient Secretはサーバーのみで使用します。認証後のユーザートークンはDecap CMSに渡るため、共有端末では使用後に管理画面からログアウトしてください。

## 保存の仕組み

- ページごとの文章：`content/index.json` など
- 写真・動画の指定、写真館の展示：`content/media.json`
- 編集画面の設定：`admin/config.yml`
- 認証：`functions/api/[[route]].js`
- Decap CMS 3.17.3の公式npm配布物を同梱。配布物の整合性ハッシュを照合済み。ライセンスは `admin/vendor/decap-cms.js.LICENSE.txt` にあります。

設定前は、管理画面に設定案内が表示されます。現在のサイトの表示にはログインを必要としません。認証設定前でも、既存HTMLとJSONによって公開サイトは動作します。
