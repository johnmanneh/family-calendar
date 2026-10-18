import React, { createContext, useState, useContext, useEffect } from "react";
import API from "../api/axios";
import { useAuth } from "./AuthContext";

const FamilyContext = createContext();

export const FamilyProvider = ({ children }) => {
  const { token } = useAuth();

  const [family, setFamily]   = useState(null); // active family
  const [families, setFamilies] = useState([]); // all families the user belongs to
  const [members, setMembers] = useState([]);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchFamily();
    } else {
      setFamily(null);
      setFamilies([]);
      setMembers([]);
    }
  }, [token]);

  const fetchFamily = async () => {
    try {
      const [activeRes, allRes] = await Promise.all([
        API.get("/family"),
        API.get("/family/all"),
      ]);
      setFamily(activeRes.data.family);
      setMembers(activeRes.data.members);
      setFamilies(allRes.data.families || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load family");
    } finally {
      setLoading(false);
    }
  };

  // Switch the active family — calls the backend, then refreshes context
  const switchFamily = async (familyId) => {
    try {
      const res = await API.patch("/family/active", { family_id: familyId });
      setFamily(res.data.family);
      setMembers(res.data.members);
      setFamilies(prev =>
        prev.map(f => ({ ...f, is_active: Number(f.id) === Number(familyId) }))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not switch family");
    }
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
    }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);

export default FamilyContext;
