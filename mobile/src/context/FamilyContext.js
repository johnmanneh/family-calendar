import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from './AuthContext';

const FamilyContext = createContext();

export const FamilyProvider = ({ children }) => {
  const { token } = useAuth();
  const [families, setFamilies]   = useState([]);   // all families the user belongs to
  const [family, setFamily]       = useState(null);  // active family (alias: activeFamily)
  const [members, setMembers]     = useState([]);    // members of the active family

  useEffect(() => {
    if (token) {
      fetchFamily();
    } else {
      setFamilies([]);
      setFamily(null);
      setMembers([]);
    }
  }, [token]);

  const fetchFamily = async () => {
    try {
      const [activeRes, allRes] = await Promise.all([
        API.get('/family'),
        API.get('/family/all'),
      ]);
      setFamily(activeRes.data.family);
      setMembers(activeRes.data.members);
      setFamilies(allRes.data.families || []);
    } catch (err) {
      setFamily(null);
      setMembers([]);
      setFamilies([]);
    }
  };

  // Switch the active family — calls the backend, then refreshes context
  const switchFamily = async (familyId) => {
    try {
      const res = await API.patch('/family/active', { family_id: familyId });
      setFamily(res.data.family);
      setMembers(res.data.members);
      // Update is_active flag in the families list locally
      setFamilies(prev =>
        prev.map(f => ({ ...f, is_active: Number(f.id) === Number(familyId) }))
      );
    } catch (err) {
      console.error('switchFamily error:', err.message);
    }
  };

  return (
    <FamilyContext.Provider value={{
      family,           // active family
      activeFamily: family,  // alias
      families,         // all families
      members,
      fetchFamily,
      switchFamily,
    }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);

export default FamilyContext;
