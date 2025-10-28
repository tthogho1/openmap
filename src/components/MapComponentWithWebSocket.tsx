import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Icon, Style, Text, Fill, Stroke } from 'ol/style';
import 'ol/ol.css';
import './MapComponent.css';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

interface UserLocation {
  username: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface WebSocketMessage {
  type: string;
  data: any;
}

const MapComponent: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const locationLayerRef = useRef<VectorLayer<VectorSource> | null>(null);

  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  const [username, setUsername] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [users, setUsers] = useState<{ [key: string]: UserLocation }>({});
  const [connectionStatus, setConnectionStatus] = useState<string>('切断');

  // WebSocket接続を確立
  const connectWebSocket = useCallback((username: string) => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }

    const ws = new WebSocket(`ws://localhost:8080/ws?username=${encodeURIComponent(username)}`);

    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
      setIsConnected(true);
      setConnectionStatus('接続中');
    };

    ws.onmessage = event => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        console.log('受信メッセージ:', message);

        switch (message.type) {
          case 'location_update':
            const userLocation: UserLocation = message.data;
            setUsers(prev => ({
              ...prev,
              [userLocation.username]: userLocation,
            }));
            break;

          case 'current_locations':
            setUsers(message.data);
            break;

          case 'user_connected':
            console.log(message.data.message);
            break;

          case 'user_disconnected':
            const disconnectedUser = message.data.username;
            setUsers(prev => {
              const newUsers = { ...prev };
              delete newUsers[disconnectedUser];
              return newUsers;
            });
            console.log(message.data.message);
            break;
        }
      } catch (error) {
        console.error('メッセージ解析エラー:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket接続が閉じられました');
      setIsConnected(false);
      setConnectionStatus('切断');
    };

    ws.onerror = error => {
      console.error('WebSocketエラー:', error);
      setConnectionStatus('エラー');
    };

    websocketRef.current = ws;
  }, []);

  // 位置情報をサーバーに送信
  const sendLocationUpdate = useCallback(
    (lat: number, lon: number) => {
      if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN && username) {
        const message = {
          type: 'location_update',
          data: {
            username,
            latitude: lat,
            longitude: lon,
            timestamp: Date.now(),
          },
        };

        websocketRef.current.send(JSON.stringify(message));
        console.log('位置情報を送信:', message.data);
      }
    },
    [username]
  );

  // 位置情報を取得する関数
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
        loading: false,
      }));
      return;
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      position => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setLocation({
          latitude: lat,
          longitude: lon,
          error: null,
          loading: false,
        });

        // WebSocketで位置情報を送信
        sendLocationUpdate(lat, lon);
      },
      error => {
        let errorMessage = 'Unknown error occurred';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'User denied the request for Geolocation.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get user location timed out.';
            break;
        }
        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [sendLocationUpdate]);

  // マップ初期化
  useEffect(() => {
    if (!mapRef.current) return;

    // デフォルト位置（東京）
    const defaultLat = 35.6762;
    const defaultLon = 139.6503;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat([defaultLon, defaultLat]),
        zoom: 10,
      }),
    });

    mapInstanceRef.current = map;

    return () => {
      map.setTarget(undefined);
    };
  }, []);

  // ユーザー位置をマップに表示
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // 既存の位置レイヤーを削除
    if (locationLayerRef.current) {
      mapInstanceRef.current.removeLayer(locationLayerRef.current);
    }

    const features: Feature[] = [];

    // 全ユーザーの位置を表示
    Object.values(users).forEach(user => {
      const coordinates = fromLonLat([user.longitude, user.latitude]);
      const feature = new Feature({
        geometry: new Point(coordinates),
      });

      // 自分と他のユーザーで異なるスタイル
      const isCurrentUser = user.username === username;
      const color = isCurrentUser ? '#ff4444' : '#4444ff';

      feature.setStyle(
        new Style({
          image: new Icon({
            src:
              'data:image/svg+xml;base64,' +
              btoa(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="10" fill="${color}" stroke="#ffffff" stroke-width="2"/>
                <circle cx="16" cy="16" r="4" fill="#ffffff"/>
              </svg>
            `),
            scale: 1.2,
            anchor: [0.5, 1],
          }),
          text: new Text({
            text: user.username,
            offsetY: -40,
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
            font: '12px Arial',
          }),
        })
      );

      features.push(feature);
    });

    // 自分の現在位置も表示
    if (location.latitude && location.longitude) {
      const coordinates = fromLonLat([location.longitude, location.latitude]);

      // 自分の位置が他のユーザー位置に含まれていない場合のみ追加
      if (!users[username] && username) {
        const myFeature = new Feature({
          geometry: new Point(coordinates),
        });

        myFeature.setStyle(
          new Style({
            image: new Icon({
              src:
                'data:image/svg+xml;base64,' +
                btoa(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="10" fill="#ff4444" stroke="#ffffff" stroke-width="3"/>
                  <circle cx="16" cy="16" r="4" fill="#ffffff"/>
                  <text x="16" y="6" text-anchor="middle" fill="#ffffff" font-size="8">YOU</text>
                </svg>
              `),
              scale: 1.5,
              anchor: [0.5, 1],
            }),
            text: new Text({
              text: username || 'You',
              offsetY: -45,
              fill: new Fill({ color: '#ff4444' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
              font: 'bold 12px Arial',
            }),
          })
        );

        features.push(myFeature);
      }

      // ビューを現在地に移動（初回のみ）
      if (Object.keys(users).length === 0) {
        mapInstanceRef.current.getView().setCenter(coordinates);
        mapInstanceRef.current.getView().setZoom(15);
      }
    }

    // 新しいレイヤーを作成して追加
    if (features.length > 0) {
      const vectorSource = new VectorSource({ features });
      const vectorLayer = new VectorLayer({ source: vectorSource });

      mapInstanceRef.current.addLayer(vectorLayer);
      locationLayerRef.current = vectorLayer;
    }
  }, [users, location.latitude, location.longitude, username]);

  // WebSocket接続処理
  const handleConnect = () => {
    if (username.trim()) {
      connectWebSocket(username.trim());
      getCurrentLocation(); // 接続時に位置情報を取得
    }
  };

  // WebSocket切断処理
  const handleDisconnect = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    setUsers({});
  };

  // コンポーネントアンマウント時の清掃
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="map-container">
      <div className="map-header">
        <h1>OpenMap - リアルタイム位置共有</h1>
        <div className="connection-controls">
          <input
            type="text"
            placeholder="ユーザー名を入力"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={isConnected}
          />
          {!isConnected ? (
            <button onClick={handleConnect} disabled={!username.trim()}>
              接続
            </button>
          ) : (
            <button onClick={handleDisconnect}>切断</button>
          )}
          <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
            {connectionStatus}
          </span>
        </div>
        <div className="location-info">
          {location.loading && <p>位置情報を取得中...</p>}
          {location.error && <p className="error">エラー: {location.error}</p>}
          {location.latitude && location.longitude && (
            <p className="coordinates">
              現在地: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </p>
          )}
          {isConnected && (
            <button onClick={getCurrentLocation} disabled={location.loading}>
              位置情報を更新
            </button>
          )}
        </div>
        <div className="users-info">
          <p>接続中のユーザー: {Object.keys(users).length}人</p>
          {Object.keys(users).length > 0 && (
            <div className="users-list">
              {Object.keys(users).map(user => (
                <span
                  key={user}
                  className={`user-badge ${user === username ? 'current-user' : ''}`}
                >
                  {user}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div ref={mapRef} className="map" />
    </div>
  );
};

export default MapComponent;
