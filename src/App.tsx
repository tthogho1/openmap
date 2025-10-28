import React from 'react';
import MapComponentWithWebSocket from './components/MapComponentWithWebSocket';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <MapComponentWithWebSocket />
    </div>
  );
};

export default App;
