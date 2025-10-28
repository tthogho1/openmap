# OpenMap - リアルタイム位置共有アプリケーション

OpenMap は、React TypeScript と Go で構築されたリアルタイム位置共有アプリケーションです。WebSocket を使用して複数のユーザー間で位置情報をリアルタイムで共有できます。

## 構成

このプロジェクトは 2 つの主要なコンポーネントから構成されています：

### 1. フロントエンド (React TypeScript)

- **場所**: `c:\temp\SourceCode\openmap`
- **技術**: React 18, TypeScript, OpenLayers, Vite
- **機能**:
  - ブラウザの位置情報 API を使用した現在地取得
  - OpenLayers によるインタラクティブなマップ表示
  - WebSocket クライアントによるリアルタイム通信
  - 複数ユーザーの位置をマップ上に表示

### 2. バックエンド (Go WebSocket サーバー)

- **場所**: `c:\temp\SourceCode\openmap-server`
- **技術**: Go, Gorilla WebSocket
- **機能**:
  - WebSocket サーバーによるリアルタイム通信
  - ユーザー接続・切断の管理
  - 位置情報のブロードキャスト

## セットアップと実行

### 前提条件

- Node.js (v18 以上)
- Go (v1.19 以上)
- モダンブラウザ（位置情報 API サポート必須）

### バックエンドサーバーの起動

1. サーバーディレクトリに移動:

```bash
cd c:\temp\SourceCode\openmap-server
```

2. 依存関係の取得:

```bash
go mod tidy
```

3. サーバーの起動:

```bash
go run main.go
```

サーバーは `http://localhost:8080` で起動します。

### フロントエンドアプリケーションの起動

1. アプリケーションディレクトリに移動:

```bash
cd c:\temp\SourceCode\openmap
```

2. 依存関係のインストール:

```bash
npm install
```

3. 開発サーバーの起動:

```bash
npm run dev
```

アプリケーションは `http://localhost:5173` で起動します。

## 使用方法

1. **両方のサーバーを起動**: Go サーバーと React 開発サーバーの両方を起動してください。

2. **ブラウザでアクセス**: `http://localhost:5173` にアクセスします。

3. **ユーザー名入力**: 任意のユーザー名を入力し、「接続」ボタンをクリックします。

4. **位置情報許可**: ブラウザの位置情報へのアクセスを許可してください。

5. **位置共有**: 自分の位置がマップに表示され、他の接続中ユーザーと位置が共有されます。

## 機能詳細

### マップ機能

- **現在地表示**: ブラウザの位置情報 API を使用して現在地を取得・表示
- **マルチユーザー表示**: 接続中の全ユーザーの位置をリアルタイムで表示
- **ユーザー識別**: 自分（赤色）と他のユーザー（青色）を色分けして表示
- **ユーザー名表示**: 各マーカーにユーザー名を表示

### WebSocket 通信

- **リアルタイム同期**: 位置情報の変更を即座に全ユーザーに配信
- **接続管理**: ユーザーの接続・切断を管理
- **メッセージ形式**: JSON 形式でのメッセージ交換

### セキュリティ注意事項

- 本アプリケーションは開発・デモ用です
- 本番環境では適切な認証・認可機能の実装が必要です
- CORS 設定は開発用に緩く設定されています

## 技術スタック

### フロントエンド

- **React 18**: UI ライブラリ
- **TypeScript**: 型安全性
- **OpenLayers**: 地図ライブラリ
- **Vite**: ビルドツール
- **WebSocket API**: リアルタイム通信

### バックエンド

- **Go**: サーバーサイド言語
- **Gorilla WebSocket**: WebSocket 実装
- **UUID**: クライアント ID 生成

## API 仕様

### WebSocket エンドポイント

```
ws://localhost:8080/ws?username=<ユーザー名>
```

### メッセージ形式

詳細は `openmap-server/README.md` を参照してください。

## 開発

### プロジェクト構造

```
openmap/                    # React TypeScript アプリケーション
├── src/
│   ├── components/
│   │   ├── MapComponent.tsx           # 基本マップコンポーネント
│   │   ├── MapComponentWithWebSocket.tsx  # WebSocket対応マップコンポーネント
│   │   └── MapComponent.css          # スタイル
│   ├── App.tsx                       # メインアプリケーション
│   └── main.tsx                      # エントリーポイント
└── package.json

openmap-server/             # Go WebSocketサーバー
├── main.go                 # メインサーバーファイル
├── go.mod                  # Go モジュール定義
└── README.md               # サーバー仕様
```

### ビルド

#### フロントエンド

```bash
npm run build
```

#### バックエンド

```bash
go build
```

## ライセンス

このプロジェクトは学習・デモ用途で作成されています。

## 作者

GitHub Copilot による自動生成プロジェクト
