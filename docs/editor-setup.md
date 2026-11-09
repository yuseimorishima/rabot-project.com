# サイト管理画面（パスワード方式）

## 入り方

写真館の検索欄に `admin` または `管理者` と入力して検索します。管理画面の「管理者パスワードで入る」を押し、パスワードを入力します。GitHubのログイン操作は不要です。

検索経由の入口状態は同じタブで30分間有効です。直接 /admin/ を開くと写真館へ戻ります。この入口制御は認証の代わりではなく、サーバーがパスワードを検証します。

## 最初に1回だけ行う設定

Cloudflare Pages → lovot → Settings → Variables and Secrets → 本番環境で、以下の2項目を **Secret** として設定してください。

- `ADMIN_PASSWORD`：管理者が決めたパスワード。値を公開ファイルに書かないでください。
- `GITHUB_CMS_TOKEN`：GitHubの保存用接続キー。

保存用接続キーはGitHubのFine-grained personal access tokenを作成し、Repository accessで `yuseimorishima/rabot-project.com` のみを選択。Repository permissions → Contents を Read and writeにします。Metadataの読み取りはGitHubが自動付与します。期限切れ時はCloudflareの値を更新します。

このキーは管理者が最初に用意するもので、日々の編集者はGitHubログイン不要です。秘密の値はCloudflareの設定欄に直接入力し、チャットやGitHubへ貼らないでください。

値を保存したら、Cloudflare Pagesの最新デプロイを再実行します。以前のOAuth App、`GITHUB_OAUTH_CLIENT_ID`、`GITHUB_OAUTH_CLIENT_SECRET` は使用しません。

公開サイトの保存にはGitHubへ書き込む権限が必要なため、この接続キーの設定は省略できません。現時点で、CloudflareへのSecret設定・実パスワード認証・実保存の検証は未完了です。

## 日々の編集

1. 写真館の検索から管理画面へ入り、管理者パスワードを入力。
2. 「サイトを編集」でページを選んで文章を変更。
3. 「写真・動画・写真館」で素材を差し替え。写真館の展示を追加・並べ替え・削除できます。検索用キーワードも設定できます。
4. 保存・公開するとGitHubのmainへコミットされ、Cloudflareの自動デプロイが動きます。
5. 使用後は管理画面からログアウト。パスワード認証後はDecap CMSが保存用接続キーをブラウザの認証状態として利用します。共有端末ではログアウトしてください。

動画はH.264/AACのMP4、画像はJPEG・PNG・WebPをおすすめします。Cloudflare Pagesの1ファイル25MiB上限に収まるよう、動画は余裕を持って24MB未満に圧縮してください。ぼかし等はアップロード前に処理してください。

文章はプレーンテキスト。レイアウトやリンク先そのものの変更はコード側で行います。

## 実装

- `content/*.json`：文章、写真・動画の参照、写真館の展示。
- `admin/config.yml`：管理画面の編集項目。
- `functions/api/[[route]].js`：サーバー側のパスワード認証。CSRF用Cookieと署名、送信元、保存用接続キーの書き込み権限を確認します。
- `tests/editor-auth.test.mjs`：認証の正常系・異常系テスト（GitHubへの接続はモック）。
- 管理画面はDecap CMS 3.17.3。GitHubバックエンドの認証受け渡しにパスワード画面を接続しています。
