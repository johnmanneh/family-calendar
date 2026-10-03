import React, { createContext, useContext } from "react";
import API from "../api/axios";
import { sanitizeData } from "../utils/dataUtils";
import { useUI } from "./UIContext";

const EventContext = createContext();

export const EventProvider = ({ children }) => {

  const {
    loading,
    setLoading,
    error, setError,
    events, setEvents,
    attendees, setAttendees,
    selectedAttendees,
    modalTasks,
    resetModal,
    setMemberTasks,
    selectedEvent, setSelectedEvent,
    tasks, setTasks,
    myTasks, setMyTasks
  } = useUI();

  //
  //
  const fetchEvents = async () => {
    try {
      const res = await API.get("/events");
      setEvents(res.data.events);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "fetching events went wrong");
    } finally {
      setLoading(false);
    }
  };
  //
  //
  const createEvent = async eventData => {
    setLoading(true);

    try {
      const res = await API.post("/events/create", sanitizeData(eventData));
      //setEvents([...events, res.data.event]);
      if (selectedAttendees.length > 0) {
        await Promise.all(
          selectedAttendees.map(userId =>
            API.post(`/events/${res.data.event.id}/attendees`, {
              user_id: userId
            })
          )
        );
      }
      const validTasks = modalTasks.filter(t => t.title && t.assigned_to);
      if (validTasks.length > 0) {
        await Promise.all(
          validTasks.map(task =>
            API.post(`/events/${res.data.event.id}/tasks`, task)
          )
        );
      }

      await fetchEvents();
      resetModal();
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "fetching events went wrong");
    } finally {
      setLoading(false);
    }
  };
  //
  //
  const fetchAttendees = async eventId => {
    try {
      const res = await API.get(`/events/${eventId}/attendees`);
      setAttendees(res.data.attendees);
    } catch (err) {
      setAttendees([]);
    }
  };
  //
  //
  const fetchTasks = async eventId => {
    try {
      const res = await API.get(`/events/${eventId}/tasks?t=${Date.now()}`);
      setTasks(res.data.tasks);
    } catch (err) {
      setTasks([]);
    }
  };
  //
  //
  const selectEvent = event => {
    setSelectedEvent(event);
    fetchAttendees(event.id);
    fetchTasks(event.id);
  };
  //
  //
  const fetchMyTasks = async () => {
    try {
      const res = await API.get("/events/my-tasks");
      setMyTasks(res.data.tasks);
    } catch (err) {
      setMyTasks([]);
    }
  };
  //
  //
  const createStandaloneTask = async taskData => {
    try {
      const res = await API.post("/tasks/standalone", taskData);
      await fetchMyTasks(); // refresh sidebar
      return res.data;
    } catch (err) {
      setError(err.response?.data?.message || "Add standalone failed");
    }
  };
  //
  //
  const deleteEvent = async eventId => {
    try {
      await API.delete(`/events/${eventId}`);
      setEvents(events.filter(e => e.id !== eventId));
      setSelectedEvent(null);
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed");
    }
  };
  //
  //
  const updateEvent = async (eventId, eventData) => {
    try {
      await API.put(`/events/${eventId}`, sanitizeData(eventData));

      // Sync attendees
      const currentAttendeeIds = attendees.map(a => parseInt(a.id));
      const normalizedSelected = selectedAttendees.map(id => parseInt(id));

      await Promise.all(
        currentAttendeeIds
          .filter(id => !normalizedSelected.includes(id))
          .map(id => API.delete(`/events/${eventId}/attendees/${id}`))
      );

      await Promise.all(
        normalizedSelected
          .filter(id => !currentAttendeeIds.includes(id))
          .map(id => API.post(`/events/${eventId}/attendees`, { user_id: id }))
      );

      //  Sync tasks — add new tasks
      const validTasks = modalTasks.filter(t => t.title && t.assigned_to);
      if (validTasks.length > 0) {
        await Promise.all(
          validTasks.map(task => API.post(`/events/${eventId}/tasks`, task))
        );
      }

      await fetchEvents();
      await fetchTasks(eventId); //  refresh tasks in EventDetails
      setSelectedEvent(null);
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };
  //
  //
  const deleteTask = async taskId => {
    try {
      await API.delete(`/events/${selectedEvent.id}/tasks/${taskId}`);
      await fetchTasks(selectedEvent.id); // refresh tasks
    } catch (err) {
      setError(err.response?.data?.message || "Delete task failed");
    }
  };
  //
  //
  const addSubTask = async (taskId, title) => {
    try {
      await API.post(`/events/${selectedEvent.id}/tasks/${taskId}/subtasks`, {
        title
      });
      await fetchTasks(selectedEvent.id); // refresh
    } catch (err) {
      setError(err.response?.data?.message || "Add subtask failed");
    }
  };
  //
  //
  const deleteSubTask = async (taskId, subTaskId) => {
    try {
      await API.delete(
        `/events/${selectedEvent.id}/tasks/${taskId}/subtasks/${subTaskId}`
      );
      await fetchTasks(selectedEvent.id); // refresh
    } catch (err) {
      setError(err.response?.data?.message || "Delete subtask failed");
    }
  };
  //
  //
  const getMemberTask = async member => {
    setLoading(true);
    try {
      const res = await API.get(`/family/members/${member.id}/tasks`);
      setMemberTasks(res.data.tasks);
    } catch (err) {
      setMemberTasks([]);
    } finally {
      setLoading(false);
    }
  };
  //
  //
  return (
    <EventContext.Provider
      value={{
        events,
        selectedEvent,
        selectEvent,
        attendees,
        tasks,
        fetchTasks,
        myTasks,
        fetchMyTasks,
        error,
        loading,
        fetchEvents,
        createEvent,
        createStandaloneTask,
        deleteEvent,
        updateEvent,
        deleteTask,
        addSubTask,
        deleteSubTask,
        getMemberTask,
        
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => useContext(EventContext);

export default EventContext;
