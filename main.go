package main

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// LocationData represents the location data sent by clients
type LocationData struct {
	Username  string  `json:"username"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Timestamp int64   `json:"timestamp"`
}

// Message represents a WebSocket message
type Message struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// Client represents a connected WebSocket client
type Client struct {
	ID       string
	Username string
	Conn     *websocket.Conn
	Send     chan []byte
}

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe operations
	mutex sync.RWMutex

	// Store current locations of all users
	locations map[string]LocationData
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		locations:  make(map[string]LocationData),
	}
}

func (h *Hub) run() {
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			h.mutex.Unlock()
			
			log.Printf("Client %s (%s) connected", client.ID, client.Username)
			
			// Send current locations to the new client
			h.sendCurrentLocations(client)
			
			// Notify all clients about the new connection
			message := Message{
				Type: "user_connected",
				Data: map[string]string{
					"username": client.Username,
					"message":  client.Username + " が接続しました",
				},
			}
			h.broadcastMessage(message)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				
				// Remove user's location data
				delete(h.locations, client.Username)
				
				log.Printf("Client %s (%s) disconnected", client.ID, client.Username)
				
				// Notify all clients about the disconnection
				message := Message{
					Type: "user_disconnected",
					Data: map[string]string{
						"username": client.Username,
						"message":  client.Username + " が切断しました",
					},
				}
				h.broadcastMessage(message)
			}
			h.mutex.Unlock()

		case message := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *Hub) sendCurrentLocations(client *Client) {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	
	if len(h.locations) > 0 {
		message := Message{
			Type: "current_locations",
			Data: h.locations,
		}
		
		data, err := json.Marshal(message)
		if err != nil {
			log.Printf("Error marshaling current locations: %v", err)
			return
		}
		
		select {
		case client.Send <- data:
		default:
			close(client.Send)
		}
	}
}

func (h *Hub) broadcastMessage(message Message) {
	data, err := json.Marshal(message)
	if err != nil {
		log.Printf("Error marshaling message: %v", err)
		return
	}
	
	select {
	case h.broadcast <- data:
	default:
		log.Println("Broadcast channel is full")
	}
}

func (h *Hub) updateLocation(username string, location LocationData) {
	h.mutex.Lock()
	h.locations[username] = location
	h.mutex.Unlock()
	
	// Broadcast the location update to all clients
	message := Message{
		Type: "location_update",
		Data: location,
	}
	h.broadcastMessage(message)
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin (for development)
		// In production, you should implement proper origin checking
		return true
	},
}

func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()
	
	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			
			c.Conn.WriteMessage(websocket.TextMessage, message)
		}
	}
}

func (c *Client) readPump(hub *Hub) {
	defer func() {
		hub.unregister <- c
		c.Conn.Close()
	}()
	
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		
		var msg Message
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}
		
		switch msg.Type {
		case "location_update":
			var locationData LocationData
			dataBytes, err := json.Marshal(msg.Data)
			if err != nil {
				log.Printf("Error marshaling location data: %v", err)
				continue
			}
			
			if err := json.Unmarshal(dataBytes, &locationData); err != nil {
				log.Printf("Error unmarshaling location data: %v", err)
				continue
			}
			
			// Update the username to match the client's username
			locationData.Username = c.Username
			
			log.Printf("Received location update from %s: lat=%f, lon=%f", 
				c.Username, locationData.Latitude, locationData.Longitude)
			
			hub.updateLocation(c.Username, locationData)
		}
	}
}

func handleWebSocket(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	
	// Get username from query parameter
	username := r.URL.Query().Get("username")
	if username == "" {
		username = "Anonymous"
	}
	
	client := &Client{
		ID:       generateClientID(),
		Username: username,
		Conn:     conn,
		Send:     make(chan []byte, 256),
	}
	
	hub.register <- client
	
	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump(hub)
}

func generateClientID() string {
	return uuid.New().String()
}

func main() {
	hub := newHub()
	go hub.run()
	
	// WebSocket endpoint
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		handleWebSocket(hub, w, r)
	})
	
	// Health check endpoint
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
	
	// Serve static files for CORS preflight
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OpenMap WebSocket Server"))
	})
	
	port := ":8080"
	log.Printf("WebSocket server starting on port %s", port)
	log.Printf("WebSocket endpoint: ws://localhost%s/ws?username=<your_username>", port)
	
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}