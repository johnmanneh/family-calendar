import React, { useState, useRef, useEffect } from "react";
import "./TimeRoller.css";

const Drum = ({ values, selected, onChange }) => {
  const idx = values.indexOf(selected);

  const shift = dir => {
    const next = (idx + dir + values.length) % values.length;
    onChange(values[next]);
  };

  const handleWheel = e => {
    e.preventDefault();
    shift(e.deltaY > 0 ? 1 : -1);
  };

  return (
    <div className="time-roller-drum" onWheel={handleWheel}>
      <button className="time-roller-arrow" onClick={() => shift(-1)}>▲</button>
      <span className="time-roller-value">{selected}</span>
      <button className="time-roller-arrow" onClick={() => shift(1)}>▼</button>
    </div>
  );
};

const hours   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

const TimeRoller = ({ value, onChange }) => {
  const parse = v => {
    if (!v) return { h: "08", m: "00" };
    const [h, m] = v.split(":");
    const snapped = String(Math.round(parseInt(m) / 5) * 5 % 60).padStart(2, "0");
    return { h: h.padStart(2, "0"), m: snapped };
  };

  const [time, setTime] = useState(() => parse(value));
  const debounceRef = useRef(null);

  const update = next => {
    setTime(next);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(`${next.h}:${next.m}`);
    }, 800);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className="time-roller">
      <Drum values={hours}   selected={time.h} onChange={h => update({ ...time, h })} />
      <span className="time-roller-colon">:</span>
      <Drum values={minutes} selected={time.m} onChange={m => update({ ...time, m })} />
    </div>
  );
};

export default TimeRoller;
