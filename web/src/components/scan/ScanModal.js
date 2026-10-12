import React, { useEffect, useRef, useState } from "react";
import API from "../../api/axios";
import Icon from "../common/Icon/Icon";
import { useEvents } from "../../context/EventContext";
import SpringFlower from "../common/SpringFlower/SpringFlower";
import "./ScanModal.css";

// Scan a schedule: photo → the server reads it (nothing saved) → review,
// choose whose calendar, label → Add. Only then are events created.

const shrink = file => new Promise(resolve => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const max = 1600;
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob(b => resolve(b ? new File([b], "schedule.jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.82);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

const fmt = e => {
  const day = d => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  if (e.all_day) {
    const s = new Date(`${e.start_date}T00:00:00`);
    return e.end_date && e.end_date !== e.start_date
      ? `${day(s)} – ${new Date(`${e.end_date}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
      : `${day(s)} · all day`;
  }
  const s = new Date(e.start_date), en = new Date(e.end_date);
  const t = d => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day(s)} · ${t(s)}–${t(en)}`;
};

const ScanModal = ({ open, onClose, ownerId: initialOwner }) => {
  const { fetchEvents } = useEvents();
  const fileRef = useRef(null);
  const [stage, setStage] = useState("pick");
  const [items, setItems] = useState([]);
  const [targets, setTargets] = useState([]);
  const [ownerId, setOwnerId] = useState(initialOwner || null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (!open) return;
    setStage("pick"); setItems([]); setError(""); setDone(""); setLabel("");
    API.get("/events/targets").then(r => {
      const list = r.data.targets || [];
      setTargets(list);
      setOwnerId(initialOwner || list.find(x => x.is_self)?.id || null);
    }).catch(() => {});
  }, [open, initialOwner]);

  if (!open) return null;

  const onFile = async e => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setStage("reading");
    try {
      const small = await shrink(file);
      const form = new FormData();
      form.append("image", small);
      form.append("tz", tz);
      if (ownerId) form.append("owner_id", String(ownerId));
      const r = await API.post("/scan", form, { timeout: 90000 });
      const evs = (r.data.events || []).map((x, i) => ({ ...x, key: i, on: true }));
      if (!evs.length) { setError("No dates found on this photo. Try a sharper, straight photo."); setStage("pick"); return; }
      setItems(evs);
      setStage("review");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      setStage("pick");
    }
  };

  const save = async () => {
    const chosen = items.filter(i => i.on);
    if (!chosen.length) return;
    setStage("saving");
    try {
      const r = await API.post("/scan/import", {
        owner_id: ownerId, tz, category: label || null,
        events: chosen.map(({ title, all_day, start_date, end_date, notes }) => ({ title, all_day, start_date, end_date, notes })),
      });
      await fetchEvents();
      setDone(`${r.data.created} event${r.data.created === 1 ? "" : "s"} added${r.data.skipped ? ` · ${r.data.skipped} already there` : ""}.`);
      setStage("done");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      setStage("review");
    }
  };

  const upd = (key, patch) => setItems(l => l.map(i => (i.key === key ? { ...i, ...patch } : i)));
  const count = items.filter(i => i.on).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container scan-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><SpringFlower size={26} /> Scan schedule</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <p className="modal-error">{error}</p>}

        {stage === "pick" && (
          <div className="scan-pick">
            <SpringFlower size={64} />
            <p>Take or choose a photo of a kindergarten or school plan — one or two weeks. You check everything before it's added.</p>
            <button className="scan-primary" onClick={() => fileRef.current?.click()}>
              <Icon name="camera" size={16} /> Choose photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
            <p className="scan-small">The photo is read once to find the dates and is not stored.</p>
          </div>
        )}

        {(stage === "reading" || stage === "saving") && (
          <div className="scan-pick"><div className="scan-spinner" /><p>{stage === "reading" ? "Reading the schedule…" : "Adding events…"}</p></div>
        )}

        {stage === "done" && (
          <div className="scan-pick">
            <p className="scan-done">{done}</p>
            <button className="scan-primary" onClick={onClose}>Done</button>
          </div>
        )}

        {stage === "review" && (
          <div className="scan-review">
            {targets.length > 1 && (
              <>
                <p className="scan-section">Add to</p>
                <div className="scan-chips">
                  {targets.map(t => (
                    <button key={t.id} className={`scan-chip${Number(ownerId) === Number(t.id) ? " on" : ""}`}
                      style={{ "--chip": t.color || "#1a8fa8" }} onClick={() => setOwnerId(t.id)}>
                      <span className="scan-dot" />{t.is_self ? "My calendar" : t.first_name}
                    </button>
                  ))}
                </div>
              </>
            )}
            <p className="scan-section">Label</p>
            <div className="scan-chips">
              {["Kindergarten", "School", ""].map(l => (
                <button key={l || "none"} className={`scan-chip${label === l ? " on" : ""}`} style={{ "--chip": "#4a9a3b" }}
                  onClick={() => setLabel(l)}>{l || "No label"}</button>
              ))}
            </div>
            <p className="scan-section">{items.length} entr{items.length === 1 ? "y" : "ies"} found</p>
            <div className="scan-list">
              {items.map(it => (
                <div key={it.key} className={`scan-item${it.on ? "" : " off"}`}>
                  <input type="checkbox" checked={it.on} onChange={() => upd(it.key, { on: !it.on })} />
                  <div className="scan-item-body">
                    <input className="scan-title" value={it.title} maxLength={120} onChange={e => upd(it.key, { title: e.target.value })} />
                    <span className="scan-when">{fmt(it)}</span>
                    {it.notes && <span className="scan-notes">{it.notes}</span>}
                    {it.ambiguous && <span className="scan-warn">Please check this date</span>}
                  </div>
                </div>
              ))}
            </div>
            <button className="scan-primary" disabled={!count} onClick={save}>Add {count} event{count === 1 ? "" : "s"}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanModal;
