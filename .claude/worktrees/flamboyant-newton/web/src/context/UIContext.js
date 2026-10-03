import React, { createContext, useState, useContext } from "react";

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  //
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  //
  const [attendees, setAttendees] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  //
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalTasks, setModalTasks] = useState([]);
  //
  const [selectedDate, setSelectedDate] = useState("");
  //
  const [subTaskInputs, setSubTaskInputs] = useState({});
  //
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTasks, setMemberTasks] = useState([]);
  //
  const [tasks, setTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  //
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  //
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  //
  //
  const openNewEvent = (date = "") => {
    setIsEditMode(false);
    setSelectedDate(date);
    setIsEventModalOpen(true);
  };
  //
  //
  const openEditEvent = () => {
    setIsEditMode(true);
    setIsEventModalOpen(true);
  };
  //
  //
  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setIsEditMode(false);
    setSelectedDate("");
  };
  //
  //
  const openTaskModal = () => setIsTaskModalOpen(true);
  const closeTaskModal = () => setIsTaskModalOpen(false);
  //
  //
  const toggleAttendee = userId => {
    setSelectedAttendees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  //
  //
  const openViewEvent = () => setIsViewModalOpen(true);
  const closeViewModal = () => setIsViewModalOpen(false);
  //
  const toggleMember = member => {
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
      setMemberTasks([]);
      return;
    }
    setSelectedMember(member);
  };
  //
  //
  const toggleGroup = groupId => {
    setSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const resetModal = () => {
    setSelectedAttendees([]);
    setModalTasks([]);
    setSelectedGroups([]);
  };
  //
  //
  const updateSubTaskInput = (taskId, value) => {
    setSubTaskInputs(prev => ({ ...prev, [taskId]: value }));
  };
  //
  //
  const clearSubTaskInput = taskId => {
    setSubTaskInputs(prev => ({ ...prev, [taskId]: "" }));
  };
  //
  //
  return (
    <UIContext.Provider
      value={{
        loading,
        setLoading,
        error,
        setError,
        events,
        setEvents,
        attendees,
        setAttendees,
        isEventModalOpen,
        isTaskModalOpen,
        isEditMode,
        selectedDate,
        openNewEvent,
        openEditEvent,
        closeEventModal,
        openTaskModal,
        closeTaskModal,
        selectedAttendees,
        setSelectedAttendees,
        modalTasks,
        setModalTasks,
        toggleAttendee,
        isViewModalOpen,
        openViewEvent,
        closeViewModal,
        toggleMember,
        resetModal,
        subTaskInputs,
        updateSubTaskInput,
        clearSubTaskInput,
        selectedMember,
        setSelectedMember,
        memberTasks,
        setMemberTasks,
        selectedEvent,
        setSelectedEvent,
        tasks,
        setTasks,
        myTasks,
        setMyTasks,
        selectedGroups,
        setSelectedGroups,
        toggleGroup,
        pendingInvitations,
        setPendingInvitations,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);
export default UIContext;
