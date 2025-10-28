import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Icon, Style } from 'ol/style';
import 'ol/ol.css';
import './MapComponent.css';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

const MapComponent: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  // 位置情報を取得する関数
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation((prev: LocationState) => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
        loading: false,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          error: null,
          loading: false,
        });
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
        setLocation((prev: LocationState) => ({
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
  };

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

  // 位置情報取得
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // 位置情報が取得できたらマップを更新
  useEffect(() => {
    if (location.latitude && location.longitude && mapInstanceRef.current) {
      const coordinates = fromLonLat([location.longitude, location.latitude]);

      // ビューを現在地に移動
      mapInstanceRef.current.getView().setCenter(coordinates);
      mapInstanceRef.current.getView().setZoom(15);

      // 現在地マーカーを追加
      const markerFeature = new Feature({
        geometry: new Point(coordinates),
      });

      // マーカーのスタイルを設定
      markerFeature.setStyle(
        new Style({
          image: new Icon({
            src:
              'data:image/svg+xml;base64,' +
              btoa(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="8" fill="#ff4444" stroke="#ffffff" stroke-width="2"/>
                <circle cx="16" cy="16" r="3" fill="#ffffff"/>
              </svg>
            `),
            scale: 1.5,
            anchor: [0.5, 0.5],
          }),
        })
      );

      // ベクターレイヤーを作成してマーカーを追加
      const vectorSource = new VectorSource({
        features: [markerFeature],
      });

      const vectorLayer = new VectorLayer({
        source: vectorSource,
      });

      // 既存のマーカーレイヤーを削除
      const layers = mapInstanceRef.current.getLayers().getArray();
      layers.forEach((layer: any) => {
        if (layer instanceof VectorLayer) {
          mapInstanceRef.current?.removeLayer(layer);
        }
      });

      // 新しいマーカーレイヤーを追加
      mapInstanceRef.current.addLayer(vectorLayer);
    }
  }, [location.latitude, location.longitude]);

  return (
    <div className="map-container">
      <div className="map-header">
        <h1>OpenMap - Current Location</h1>
        <div className="location-info">
          {location.loading && <p>位置情報を取得中...</p>}
          {location.error && <p className="error">エラー: {location.error}</p>}
          {location.latitude && location.longitude && (
            <p className="coordinates">
              緯度: {location.latitude.toFixed(6)}, 経度: {location.longitude.toFixed(6)}
            </p>
          )}
          <button onClick={getCurrentLocation} disabled={location.loading}>
            位置情報を再取得
          </button>
        </div>
      </div>
      <div ref={mapRef} className="map" />
    </div>
  );
};

export default MapComponent;
