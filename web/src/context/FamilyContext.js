import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import API from "../api/axios";
import { useAuth } from "./AuthContext";

const FamilyContext = createContext();

// Overlay only writes confirmed after this read started; later reads remain
// authoritative, including changes made on another device.
const mergeConsent = (entry, readRevision, settings) => {
  const saved = settings.get(Number(entry?.id));
  return saved && saved.revision > readRevision
    ? { ...entry, share_availability: saved.shared } : entry;
};

export const FamilyProvider = ({ children }) => {
  const { token } = useAuth();
  const generation = useRef(0); // family reads and active-family switches only
  const session = useRef(0); // consent writes survive reads, never authentication changes
  const consent = useRef({ revision: 0, settings: new Map(), writes: new Map() });

  const [family, setFamily]   = useState(null); // active family
  const [families, setFamilies] = useState([]); // all families the user belongs to
  const [members, setMembers] = useState([]);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generation.current += 1;
    session.current += 1;
    consent.current = { revision: 0, settings: new Map(), writes: new Map() };
    if (token) {
      fetchFamily();
    } else {
      setFamily(null);
      setFamilies([]);
      setMembers([]);
    }
    return () => { generation.current += 1; session.current += 1; };
  }, [token]);


  const fetchFamily = async () => {
    const request = ++generation.current;
    const readRevision = consent.current.revision;
    try {
      const [activeRes, allRes] = await Promise.all([
        API.get("/family"),
        API.get("/family/all"),
      ]);
      if (request !== generation.current) return;
      setFamily(mergeConsent(activeRes.data.family, readRevision, consent.current.settings));
      setMembers(activeRes.data.members);
      setFamilies((allRes.data.families || []).map(f => mergeConsent(f, readRevision, consent.current.settings)));
    } catch (err) {
      if (request !== generation.current) return;
      setError(err.response?.data?.message || "Could not load family");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  };

  // Switch the active family — calls the backend, then refreshes context
  const switchFamily = async (familyId) => {
    const request = ++generation.current;
    const readRevision = consent.current.revision;
    try {
      const res = await API.patch("/family/active", { family_id: familyId });
      if (request !== generation.current) return;
      setFamily(mergeConsent(res.data.family, readRevision, consent.current.settings));
      setMembers(res.data.members);
      setFamilies(prev =>
        prev.map(f => ({ ...f, is_active: Number(f.id) === Number(familyId) }))
      );
    } catch (err) {
      if (request !== generation.current) return;
      setError(err.response?.data?.message || "Could not switch family");
    }
  };

  // Opt in/out of sharing own busy times with a receiving family (own membership only)
  const setAvailabilitySharing = (familyId, shareAvailability) => {
    const lifetime = session.current;
    const state = consent.current;
    const key = Number(familyId);
    const save = async () => {
      if (!token || lifetime !== session.current) return;
      const res = await API.patch("/family/availability", {
        family_id: familyId, share_availability: shareAvailability,
      });
      if (lifetime !== session.current) return;
      const setting = res.data.setting;
      const shared = setting.share_availability === true;
      state.settings.set(Number(setting.family_id), {
        revision: ++state.revision, shared,
      });
      setFamily(prev => Number(prev?.id) === Number(setting.family_id)
        ? { ...prev, share_availability: shared } : prev);
      setFamilies(prev => prev.map(f => Number(f.id) === Number(setting.family_id)
        ? { ...f, share_availability: shared } : f));
      return setting;
    };
    // Serialize only this family's writes, including reversals after failures.
    // Other families and active-family switches remain independent.
    const previous = state.writes.get(key);
    const pending = previous ? previous.catch(() => {}).then(save) : save();
    state.writes.set(key, pending);
    return pending.finally(() => {
      if (state.writes.get(key) === pending) state.writes.delete(key);
    });
  };

  return (
    <FamilyContext.Provider value={{
      family,
      activeFamily: family,  // alias
      families,
      members,
      error,
      loading,
      fetchFamily,
      switchFamily,
      setAvailabilitySharing,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);

export default FamilyContext;
