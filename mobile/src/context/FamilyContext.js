import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../api/axios';
import { useAuth } from './AuthContext';

const FamilyContext = createContext();

export const FamilyProvider = ({ children }) => {
  const { token } = useAuth();
  const [members, setMembers] = useState([]);
  const [family, setFamily] = useState(null);

  // Fetch family whenever the token changes (login/logout)
  useEffect(() => {
    if (token) {
      fetchFamily();
    } else {
      // Logged out — clear family data
      setMembers([]);
      setFamily(null);
    }
  }, [token]);

  const fetchFamily = async () => {
    try {
      const res = await API.get('/family');
      setFamily(res.data.family);
      setMembers(res.data.members);
    } catch (err) {
      setMembers([]);
    }
  };

  return (
    <FamilyContext.Provider value={{ family, members, fetchFamily }}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);

export default FamilyContext;
