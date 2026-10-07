import React, { createContext, useContext, useEffect, useRef } from "react";
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
    myTasks, setMyTasks,
    selectedGroups,
    pendingInvitations, setPendingInvitations,
    pendingTasks, setPendingTasks,
    taskNotifications, setTaskNotifications,
    assigneeNotifications, setAssigneeNotifications,
  } = useUI();

  //
  //
  const fetchEvents = async () => {
    try {
      const res = await API.get("/events");
      setEvents(res.data.events);
      setSelectedEvent(null);
      try {
        const inv = await API.get('/events/invitations');
        setPendingInvitations(inv.data.invitations);
      } catch { /* silent */ }
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

      if (selectedGroups.length > 0) {
        await Promise.all(
          selectedGroups.map(groupId =>
            API.post(`/groups/events/${res.data.event.id}/share`, { group_id: groupId })
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
  const updateTaskDueDate = async (taskId, dueDate) => {
    try {
      await API.patch(`/tasks/${taskId}/due-date`, { due_date: dueDate });
      if (selectedEvent) await fetchTasks(selectedEvent.id);
      await fetchMyTasks();
    } catch (err) {
      setError(err.response?.data?.message || 'Update due date failed');
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

  const completeTask = async taskId => {
    try {
      await API.patch(`/tasks/${taskId}/complete`);
      await fetchMyTasks();
    } catch (err) {
      setError(err.response?.data?.message || "Complete task failed");
    }
  };
  //
  //
  const addSubTask = async (taskId, title) => {
    try {
      await API.post(`/events/${selectedEvent.id}/tasks/${taskId}/subtasks`, {
        title
      });
      await fetchTasks(selectedEvent.id);
      await fetchMyTasks(); // task may have flipped back to pending for the assignee
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
  const fetchPendingTasks = async () => {
    try {
      const res = await API.get(`/tasks/pending?t=${Date.now()}`);
      setPendingTasks(res.data.tasks);
    } catch {
      setPendingTasks([]);
    }
  };
  //
  //
  const respondToTask = async (taskId, response, counterOffer = null) => {
    await API.patch(`/tasks/${taskId}/respond`, { response, counter_offer: counterOffer });
    await Promise.all([fetchPendingTasks(), fetchMyTasks(), fetchTaskNotifications()]);
  };
  //
  //
  const fetchTaskNotifications = async () => {
    try {
      const res = await API.get('/tasks/notifications');
      setTaskNotifications(res.data.notifications);
    } catch {
      setTaskNotifications([]);
    }
  };
  //
  //
  const fetchAssigneeNotifications = async () => {
    try {
      const res = await API.get('/tasks/assignee-notifications');
      setAssigneeNotifications(res.data.notifications);
    } catch {
      setAssigneeNotifications([]);
    }
  };
  //
  //
  const acknowledgeAssigneeNotification = async taskId => {
    await API.patch(`/tasks/${taskId}/assignee-acknowledge`);
    await Promise.all([fetchAssigneeNotifications(), fetchMyTasks(), fetchPendingTasks()]);
  };
  //
  //
  const acknowledgeTaskResponse = async taskId => {
    await API.patch(`/tasks/${taskId}/acknowledge`);
    await fetchTaskNotifications();
  };
  //
  //
  // Creator responds to a counter — accept or counter back
  const respondToCounter = async (taskId, response, counterOffer = null) => {
    await API.patch(`/tasks/${taskId}/respond`, { response, counter_offer: counterOffer });
    await Promise.all([fetchTaskNotifications(), fetchPendingTasks(), fetchMyTasks()]);
  };
  //
  //
  const fetchPendingInvitations = async () => {
    try {
      const res = await API.get('/events/invitations');
      setPendingInvitations(res.data.invitations);
    } catch {
      setPendingInvitations([]);
    }
  };
  //
  //
  const respondToEventInvitation = async (eventId, response) => {
    await API.put(`/events/invitations/${eventId}`, { response });
    await Promise.all([fetchPendingInvitations(), fetchEvents()]);
  };
  //
  //
  // ── Notifications inbox ───────────────────────────────────────────────────
  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      return { notifications: res.data.notifications || [], unread_count: res.data.unread_count || 0 };
    } catch {
      return { notifications: [], unread_count: 0 };
    }
  };

  const markAllNotificationsRead = async () => {
    try { await API.patch('/notifications/read-all'); } catch {}
  };

  const markNotificationRead = async (id) => {
    try { await API.patch(`/notifications/${id}/read`); } catch {}
  };
  //
  //
  const fetchMessages = async () => {
    try {
      const res = await API.get('/chat');
      return res.data.messages || [];
    } catch {
      return [];
    }
  };

  const sendMessage = async (body) => {
    try {
      const res = await API.post('/chat', { body });
      return res.data.message || null;
    } catch {
      return null;
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
  // SSE — real-time updates (18.4 + 18.5)
  //
  const sseRef = useRef(null);
  const selectedEventRef = useRef(null);
  selectedEventRef.current = selectedEvent;

  // chat_message SSE handler calls this to push the new message into chat panels
  const chatMessageCallbackRef = useRef(null);
  const onChatMessage = (cb) => { chatMessageCallbackRef.current = cb; };

  const connectSSE = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (sseRef.current) sseRef.current.close();

    const sseBase = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    const es = new EventSource(`${sseBase}/stream?token=${token}`);
    sseRef.current = es;

    es.addEventListener('task_update', () => {
      fetchPendingTasks();
      fetchTaskNotifications();
      fetchAssigneeNotifications();
      if (selectedEventRef.current) {
        fetchTasks(selectedEventRef.current.id);
      }
    });

    es.addEventListener('event_update', () => {
      fetchEvents();
    });

    es.addEventListener('chat_message', (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (chatMessageCallbackRef.current) chatMessageCallbackRef.current(msg);
      } catch { /* silent */ }
    });

    es.onerror = () => {
      es.close();
      sseRef.current = null;
    };
  };

  useEffect(() => {
    connectSSE();

    // 18.5 — reconnect when tab comes back into focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !sseRef.current) {
        connectSSE();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sseRef.current) sseRef.current.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
        updateTaskDueDate,
        completeTask,
        addSubTask,
        deleteSubTask,
        getMemberTask,
        fetchPendingInvitations,
        respondToEventInvitation,
        fetchPendingTasks,
        respondToTask,
        fetchTaskNotifications,
        acknowledgeTaskResponse,
        respondToCounter,
        fetchAssigneeNotifications,
        acknowledgeAssigneeNotification,
        fetchNotifications,
        markAllNotificationsRead,
        markNotificationRead,
        fetchMessages,
        sendMessage,
        onChatMessage,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => useContext(EventContext);

export default EventContext;
