# OpenMap WebSocket Server

WebSocket を使用してユーザの位置情報をリアルタイムで共有する Go サーバーです。

## 機能

- WebSocket 接続でリアルタイム通信
- ユーザ名と位置情報の受信・配信
- 接続中の全ユーザに位置情報をブロードキャスト
- 新規接続・切断の通知
- 現在の全ユーザ位置情報の送信

## API 仕様

### WebSocket エンドポイント

```
ws://localhost:8080/ws?username=<ユーザ名>
```

### メッセージ形式

#### クライアントからサーバへ送信

```json
{
  "type": "location_update",
  "data": {
    "username": "ユーザ名",
    "latitude": 35.6762,
    "longitude": 139.6503,
    "timestamp": 1640995200000
  }
}
```

#### サーバからクライアントへ送信

##### 位置情報更新

```json
{
  "type": "location_update",
  "data": {
    "username": "ユーザ名",
    "latitude": 35.6762,
    "longitude": 139.6503,
    "timestamp": 1640995200000
  }
}
```

##### ユーザ接続通知

```json
{
  "type": "user_connected",
  "data": {
    "username": "ユーザ名",
    "message": "ユーザ名 が接続しました"
  }
}
```

##### ユーザ切断通知

```json
{
  "type": "user_disconnected",
  "data": {
    "username": "ユーザ名",
    "message": "ユーザ名 が切断しました"
  }
}
```

##### 現在の全ユーザ位置情報

```json
{
  "type": "current_locations",
  "data": {
    "ユーザ1": {
      "username": "ユーザ1",
      "latitude": 35.6762,
      "longitude": 139.6503,
      "timestamp": 1640995200000
    },
    "ユーザ2": {
      "username": "ユーザ2",
      "latitude": 35.6762,
      "longitude": 139.6503,
      "timestamp": 1640995200000
    }
  }
}
```

## 使用方法

### サーバー起動

```bash
go run main.go
```

サーバーは `http://localhost:8080` で起動します。

### ヘルスチェック

```bash
curl http://localhost:8080/health
```

## 開発用 CORS 設定

開発環境では、全てのオリジンからの接続を許可しています。
本番環境では適切なオリジンチェックを実装してください。

## 依存関係

- [gorilla/websocket](https://github.com/gorilla/websocket) - WebSocket 実装
- [google/uuid](https://github.com/google/uuid) - UUID 生成

## セキュリティ考慮事項

本サンプルは開発用です。本番環境では以下を検討してください：

- 適切なオリジンチェック
- 認証・認可機能
- レート制限
- 入力検証の強化
- HTTPS/WSS 接続
