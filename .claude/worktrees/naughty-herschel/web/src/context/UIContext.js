import React, { createContext, useState, useContext } from "react";

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState([]);
  const [modalTasks, setModalTasks] = useState([]);
  const [subTaskInputs, setSubTaskInputs] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTasks, setMemberTasks] = useState([]);
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
  const resetModal = () => {
    setSelectedAttendees([]);
    setModalTasks([]);
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
        toggleMember,
        resetModal,
        subTaskInputs,
        updateSubTaskInput,
        clearSubTaskInput,
        selectedMember,
        setSelectedMember,
        memberTasks,
        setMemberTasks
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => useContext(UIContext);
export default UIContext;
