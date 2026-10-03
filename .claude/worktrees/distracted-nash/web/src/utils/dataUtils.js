export const sanitizeData = data =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value === "" || value === undefined ? null : value
    ])
  );
//
//
export const emptyForm = {
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  location: "",
  is_all_day: false,
  is_private: false,
  recurrence: "",
  recurrence_end_date: "",
  color: "#1a8fa8",
  category: "",
  priority: "medium",
  notes: "",
  video_call_link: "",
  reminder: "",
  status: "confirmed"
};
//
//
export const mapEventToForm = event => ({
  title: event.title || "",
  description: event.description || "",
  start_date: event.start ? new Date(event.start).toISOString().substring(0, 16) : "",
  end_date: event.end ? new Date(event.end).toISOString().substring(0, 16) : "",
  color: event.backgroundColor || "#1a8fa8",
  location: event.extendedProps?.location || "",
  category: event.extendedProps?.category || "",
  priority: event.extendedProps?.priority || "medium",
  notes: event.extendedProps?.notes || "",
  video_call_link: event.extendedProps?.video_call_link || "",
  is_all_day: event.extendedProps?.is_all_day || false,
  is_private: event.extendedProps?.is_private || false,
  recurrence: event.extendedProps?.recurrence || "",
  recurrence_end_date: event.extendedProps?.recurrence_end_date
    ? new Date(event.extendedProps.recurrence_end_date).toISOString().substring(0, 10)
    : "",
  reminder: "",
  status: event.extendedProps?.status || "confirmed"
});
