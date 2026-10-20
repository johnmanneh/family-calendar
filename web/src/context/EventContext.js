import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import API from "../api/axios";
import { sanitizeData } from "../utils/dataUtils";
import { formatDateTime } from "../utils/dateUtils";
import { useUI } from "./UIContext";
import { useAuth } from "./AuthContext";
import { useFamily } from "./FamilyContext";

const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const { user, token } = useAuth();
  const { family: activeFamily } = useFamily();
  const scope = `${token ?? ''}:${activeFamily?.id ?? ''}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const eventRequest = useRef(0);
  const taskRequest = useRef(0);
  const availabilityRequest = useRef(0);
  useEffect(() => () => { eventRequest.current += 1; taskRequest.current += 1; availabilityRequest.current += 1; }, []);
  // Bumps whenever the server pings this user about a new notification
  const [notifTick, setNotifTick] = useState(0);

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
    const request = ++eventRequest.current;
    const requestScope = scopeRef.current;
    const isCurrent = () => request === eventRequest.current && requestScope === scopeRef.current;
    try {
      const res = await API.get("/events");
      if (!isCurrent()) return;
      setEvents(res.data.events);
      setSelectedEvent(null);
      try {
        const inv = await API.get('/events/invitations');
        if (isCurrent()) setPendingInvitations(inv.data.invitations);
      } catch { /* silent */ }
      return res.data;
    } catch (err) {
      if (isCurrent()) setError(err.response?.data?.message || "fetching events went wrong");
    } finally {
      if (isCurrent()) setLoading(false);
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
      setError(err.response?.data?.message || "Creating event failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };
  //
  // Busy / not-shared lookup for invitees. Errors are thrown so callers never
  // treat a failure as free. Stale responses after family switch, logout, or
  // unmount are dropped.
  const checkAvailability = async ({ start, end, user_ids, exclude_event_id, tz, family_id }) => {
    const request = ++availabilityRequest.current;
    const requestScope = scopeRef.current;
    const isCurrent = () => request === availabilityRequest.current && requestScope === scopeRef.current;
    try {
      const res = await API.post("/events/availability", {
        start,
        end,
        user_ids,
        exclude_event_id,
        tz,
        family_id,
      });
      if (!isCurrent()) return null;
      return res.data;
    } catch (err) {
      if (!isCurrent()) return null;
      throw err;
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
  // Open an event by id (e.g. from a notification) — also works for events that
  // aren't in the calendar yet, like an invitation still waiting for an answer.
  // Builds the same shape FullCalendar gives selectEvent().
  const openEventById = async (eventId) => {
    const res = await API.get(`/events/${eventId}`);
    const e = res.data.event;
    const me = (e.attendees || []).find(a => Number(a.user_id) === Number(user?.id));
    const ev = {
      id: String(e.id),
      title: e.title,
      start: e.start_date,
      end: e.end_date,
      backgroundColor: e.color || "#1a8fa8",
      extendedProps: {
        ...e,
        attendees: (e.attendees || []).map(a => ({ ...a, id: a.user_id })),
        group_ids: e.group_ids || [],
        invite_pending: me?.status === "pending",
      },
    };
    selectEvent(ev);
    return ev;
  };

  const selectEvent = event => {
    setSelectedEvent(event);
    fetchAttendees(event.id);
    fetchTasks(event.id);
  };
  //
  //
  const fetchMyTasks = async () => {
    const request = ++taskRequest.current;
    const requestScope = scopeRef.current;
    const isCurrent = () => request === taskRequest.current && requestScope === scopeRef.current;
    try {
      const res = await API.get("/events/my-tasks");
      if (isCurrent()) setMyTasks(res.data.tasks);
    } catch (err) {
      if (isCurrent()) setMyTasks([]);
    }
  };
  //
  //
  const createStandaloneTask = async taskData => {
    try {
      const res = await API.post("/tasks/standalone", {
        ...taskData,
        due_date: formatDateTime(taskData.due_date) || null,
      });
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
  const shareEvent = async (eventId, options = {}) => {
    try {
      const res = await API.post(`/events/${eventId}/share`, options);
      return res.data.share;
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create share link');
      return null;
    }
  };

  const assignPickup = async (eventId, childId, personId) => {
    try {
      await API.post(`/events/${eventId}/pickup`, { child_id: childId, person_id: personId });
      await openEventById(eventId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign pickup');
    }
  };

  const cancelPickup = async (eventId) => {
    try {
      await API.delete(`/events/${eventId}/pickup`);
      await openEventById(eventId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel pickup');
    }
  };

  const respondToPickup = async (pickupId, action, eventId) => {
    try {
      await API.post(`/pickups/${pickupId}/respond`, { action });
      await openEventById(eventId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to respond to pickup');
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

      // Sync shared groups (same event, no copy) — tick = share, untick = unshare
      const before = (selectedEvent?.extendedProps?.group_ids || []).map(Number);
      const after  = selectedGroups.map(Number);
      try {
        await Promise.all([
          ...after.filter(id => !before.includes(id))
            .map(id => API.post(`/groups/events/${eventId}/share`, { group_id: id })),
          ...before.filter(id => !after.includes(id))
            .map(id => API.delete(`/groups/events/${eventId}/share/${id}`)),
        ]);
      } catch {
        setError("Event saved, but sharing with a group failed");
      }

      await fetchEvents();
      await fetchTasks(eventId); //  refresh tasks in EventDetails
      setSelectedEvent(null);
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
      throw err;
    }
  };
  //
  //
  const updateTaskDueDate = async (taskId, dueDate) => {
    try {
      await API.patch(`/tasks/${taskId}/due-date`, { due_date: formatDateTime(dueDate) || null });
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

  useEffect(() => {
    let disposed = false;
    let retryTimer = null;
    const connectSSE = () => {
      if (disposed) return;
      if (!token) return;
      clearTimeout(retryTimer);
      if (sseRef.current) sseRef.current.close();

      const sseBase = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      const es = new EventSource(`${sseBase}/stream?token=${encodeURIComponent(token)}`);
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

      es.addEventListener('notification', () => {
        setNotifTick(t => t + 1);
      });

      es.addEventListener('chat_message', (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (chatMessageCallbackRef.current) chatMessageCallbackRef.current(msg);
        } catch { /* silent */ }
      });

      es.onerror = () => {
        if (disposed || sseRef.current !== es) return;
        es.close();
        sseRef.current = null;
        retryTimer = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    // 18.5 — reconnect when tab comes back into focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !sseRef.current) {
        connectSSE();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (sseRef.current) sseRef.current.close();
      sseRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  // Switching family reloads family-scoped data.
  const lastFamilyId = useRef(undefined); // undefined = effect hasn't run yet; null = seen a null family
  useEffect(() => {
    const id = activeFamily?.id ?? null;
    if (lastFamilyId.current !== undefined && id !== null && id !== lastFamilyId.current) {
      fetchEvents();
      fetchMyTasks();
    }
    lastFamilyId.current = id;
  }, [activeFamily?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  //
  //
  return (
    <EventContext.Provider
      value={{
        events,
        selectedEvent,
        selectEvent,
        openEventById,
        notifTick,
        setSelectedEvent,
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
        shareEvent,
        assignPickup,
        cancelPickup,
        respondToPickup,
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
        checkAvailability,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvents = () => useContext(EventContext);

export default EventContext;
