import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import GaugeComponent from "react-gauge-component";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(200);
  const playRef = useRef(null);

  // Parse uploaded CSV
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        let rows = results.data.filter((row) => row.time !== undefined);

        // Normalize GPS (shift & scale so it fills the chart)
        const latMin = Math.min(...rows.map((r) => r.lat || 0));
        const latMax = Math.max(...rows.map((r) => r.lat || 0));
        const longMin = Math.min(...rows.map((r) => r.long || 0));
        const longMax = Math.max(...rows.map((r) => r.long || 0));

        rows = rows.map((r) => ({
          ...r,
          latNorm:
            ((r.lat - latMin) / (latMax - latMin || 1)) * 100, // 0 → 100
          longNorm:
            ((r.long - longMin) / (longMax - longMin || 1)) * 100, // 0 → 100
        }));

        setData(rows);
        setCurrentIndex(0);
      },
    });
  };

  // Scrubber
  const handleScrub = (e) => {
    setCurrentIndex(Number(e.target.value));
    setIsPlaying(false);
  };

  // Play/Pause loop
  useEffect(() => {
    if (isPlaying && data.length > 0) {
      playRef.current = setInterval(() => {
        setCurrentIndex((prev) =>
          prev < data.length - 1 ? prev + 1 : prev
        );
      }, playbackSpeed);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying, playbackSpeed, data.length]);

  const current = data[currentIndex] || {
    time: 0,
    throttle: 0,
    speed: 0,
    rpm: 0,
    latNorm: 0,
    longNorm: 0,
  };

  return (
    <div className="app">
      <h1 className="title">🏎️ Ravens Racing Telemetry Dashboard</h1>

      <div className="upload">
        <input type="file" accept=".csv" onChange={handleFileUpload} />
      </div>

      {data.length > 0 && (
        <>
          {/* Controls */}
          <div className="controls">
            <button onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>
            <input
              type="range"
              min="0"
              max={data.length - 1}
              value={currentIndex}
              onChange={handleScrub}
            />
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            >
              <option value={500}>0.5x</option>
              <option value={200}>1x</option>
              <option value={100}>2x</option>
              <option value={50}>4x</option>
            </select>
            <p>Time: {current.time}s</p>
          </div>

          {/* Gauges */}
          <div className="gauges">
            <div className="card">
              <h2>Throttle (%)</h2>
              <GaugeComponent
                value={current.throttle || 0}
                minValue={0}
                maxValue={100}
                type="semicircle"
              />
              <p>{current.throttle || 0}%</p>
            </div>
            <div className="card">
              <h2>Speed (km/h)</h2>
              <GaugeComponent
                value={current.speed || 0}
                minValue={0}
                maxValue={300}
                type="semicircle"
              />
              <p>{current.speed || 0} km/h</p>
            </div>
            <div className="card">
              <h2>Engine RPM</h2>
              <GaugeComponent
                value={current.rpm || 0}
                minValue={0}
                maxValue={14000}
                type="semicircle"
              />
              <p>{current.rpm || 0}</p>
            </div>
          </div>

          {/* GPS Track */}
          <div className="charts">
            <div className="card">
              <h2>GPS Track</h2>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <XAxis type="number" dataKey="longNorm" hide />
                  <YAxis type="number" dataKey="latNorm" hide />
                  <Tooltip />
                  {/* Full lap path */}
                  <Scatter data={data} fill="#8884d8" line shape="circle" />
                  {/* Current position */}
                  <Scatter data={[current]} fill="red" shape="circle" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Throttle Chart */}
          <div className="charts">
            <div className="card">
              <h2>Throttle vs Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="throttle"
                    stroke="#3b82f6"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
