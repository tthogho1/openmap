package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gorilla/websocket"
)

type LocationData struct {
	Username  string  `json:"username"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timestamp int64   `json:"timestamp"`
}

type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func main() {
	username := flag.String("username", "testuser", "ユーザ名")
	lat := flag.Float64("lat", 35.0, "緯度")
	lon := flag.Float64("lon", 135.0, "経度")
	server := flag.String("server", "ws://localhost:8080/ws", "WebSocketサーバURL")
	flag.Parse()

	url := fmt.Sprintf("%s?username=%s", *server, *username)
	log.Printf("接続先: %s", url)

	c, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		log.Fatal("WebSocket接続失敗:", err)
	}
	defer c.Close()

	location := LocationData{
		Username:  *username,
		Latitude:  *lat,
		Longitude: *lon,
		Timestamp: time.Now().UnixMilli(),
	}

	msg := Message{
		Type: "location_update",
		Data: location,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Fatal("JSON変換失敗:", err)
	}

	if err := c.WriteMessage(websocket.TextMessage, data); err != nil {
		log.Fatal("送信失敗:", err)
	}
	log.Printf("送信完了: %+v", location)

	// サーバからの応答を1回だけ受信
	c.SetReadDeadline(time.Now().Add(3 * time.Second))
	_, message, err := c.ReadMessage()
	if err != nil {
		log.Printf("応答受信失敗: %v", err)
		os.Exit(0)
	}
	log.Printf("サーバ応答: %s", string(message))
}