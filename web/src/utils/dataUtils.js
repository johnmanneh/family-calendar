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
// Format a date as local datetime "YYYY-MM-DDTHH:MM" (avoids UTC offset shifting)
const toLocalDatetime = date => {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Format a date as local date-only "YYYY-MM-DD"
const toLocalDate = date => {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

export const mapEventToForm = event => {
  const isAllDay = event.extendedProps?.is_all_day || false;
  return {
    title: event.title || "",
    description: event.description || "",
    start_date: event.start
      ? (isAllDay ? toLocalDate(event.start) : toLocalDatetime(event.start))
      : "",
    end_date: event.end
      ? (isAllDay ? toLocalDate(event.end) : toLocalDatetime(event.end))
      : (event.start ? (isAllDay ? toLocalDate(event.start) : toLocalDatetime(event.start)) : ""),
    color: event.backgroundColor || "#1a8fa8",
    location: event.extendedProps?.location || "",
    category: event.extendedProps?.category || "",
    priority: event.extendedProps?.priority || "medium",
    notes: event.extendedProps?.notes || "",
    video_call_link: event.extendedProps?.video_call_link || "",
    is_all_day: isAllDay,
    is_private: event.extendedProps?.is_private || false,
    recurrence: event.extendedProps?.recurrence || "",
    recurrence_end_date: event.extendedProps?.recurrence_end_date
      ? toLocalDate(event.extendedProps.recurrence_end_date)
      : "",
    reminder: "",
    status: event.extendedProps?.status || "confirmed"
  };
};
