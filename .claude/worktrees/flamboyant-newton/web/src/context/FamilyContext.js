import React, { createContext, useState, useContext, useEffect } from "react";
import API from "../api/axios";
import { useAuth } from "./AuthContext";

const FamilyContext = createContext();

export const FamilyProvider = ({ children }) => {
  const { token } = useAuth();

  const [family, setFamily] = useState(null); // family details
  const [members, setMembers] = useState([]); // family members
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Restore user on refresh
  useEffect(() => {
    const restoreUser = async () => {
      if (token) {
        fetchFamily();
      }
    };
    restoreUser();
  }, [token]);

  const fetchFamily = async familyData => {
    try {
      const res = await API.get("/family");
      setFamily(res.data.family);
      setMembers(res.data.members);
    } catch (err) {
      setError(err.response?.data?.message || "fetch family api call  went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FamilyContext.Provider
      value={{ family, error, loading, members, fetchFamily }}
    >
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamily = () => useContext(FamilyContext);

export default FamilyContext;
