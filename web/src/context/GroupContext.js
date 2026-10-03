import React, { createContext, useState, useContext, useEffect } from "react";
import API from "../api/axios";
import { useAuth } from "./AuthContext";

const GroupContext = createContext();

export const GroupProvider = ({ children }) => {
  const { token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);

  useEffect(() => {
    if (token) {
      fetchGroups();
      fetchInvitations();
    }
  }, [token]);

  const fetchGroups = async () => {
    try {
      const res = await API.get("/groups");
      setGroups(res.data.groups);
    } catch {
      setGroups([]);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await API.get("/groups/invitations");
      setInvitations(res.data.invitations);
    } catch {
      setInvitations([]);
    }
  };

  const respondToInvitation = async (invitationId, response) => {
    await API.put(`/groups/invitations/${invitationId}`, { response });
    await Promise.all([fetchInvitations(), fetchGroups()]);
  };

  const createGroup = async (name) => {
    const res = await API.post("/groups/create", { name });
    await fetchGroups();
    return res.data.group;
  };

  const joinGroup = async (invite_code) => {
    const res = await API.post("/groups/join", { invite_code });
    await fetchGroups();
    return res.data.group;
  };

  const fetchGroupEvents = async (groupId) => {
    const res = await API.get(`/groups/${groupId}/events`);
    return res.data.events;
  };

  const shareEvent = async (eventId, groupId) => {
    await API.post(`/groups/events/${eventId}/share`, { group_id: groupId });
  };

  const unshareEvent = async (eventId, groupId) => {
    await API.delete(`/groups/events/${eventId}/share/${groupId}`);
  };

  const deleteGroup = async (groupId) => {
    await API.delete(`/groups/${groupId}`);
    await fetchGroups();
  };

  return (
    <GroupContext.Provider value={{
      groups,
      fetchGroups,
      createGroup,
      joinGroup,
      fetchGroupEvents,
      shareEvent,
      unshareEvent,
      deleteGroup,
      invitations,
      fetchInvitations,
      respondToInvitation,
    }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroups = () => useContext(GroupContext);
export default GroupContext;
