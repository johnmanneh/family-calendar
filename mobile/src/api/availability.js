import API from './axios';

// Keep event API calls out of presentation components.
export async function checkAvailability(payload) {
  const res = await API.post('/events/availability', payload);
  return res.data;
}
