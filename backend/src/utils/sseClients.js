// In-memory stores:
//   clients     familyId (string) → Set of response objects  (family-wide updates)
//   userClients userId   (string) → Set of response objects  (personal: notifications)
const clients = new Map();
const userClients = new Map();

const addTo = (map, key, res) => {
  const k = String(key);
  if (!map.has(k)) map.set(k, new Set());
  map.get(k).add(res);
};

const removeFrom = (map, key, res) => {
  const k = String(key);
  if (map.has(k)) {
    map.get(k).delete(res);
    if (map.get(k).size === 0) map.delete(k);
  }
};

const writeTo = (map, key, eventName, data) => {
  const k = String(key);
  if (!map.has(k)) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  map.get(k).forEach(res => { try { res.write(payload); } catch { /* closed */ } });
};

const addClient     = (familyId, res) => addTo(clients, familyId, res);
const removeClient  = (familyId, res) => removeFrom(clients, familyId, res);
const addUserClient    = (userId, res) => addTo(userClients, userId, res);
const removeUserClient = (userId, res) => removeFrom(userClients, userId, res);

// Sends a named SSE event to every connected member of a family
const broadcast = (familyId, eventName, data) => writeTo(clients, familyId, eventName, data);

// Sends a named SSE event to every open connection of one user (any device)
const sendToUser = (userId, eventName, data) => writeTo(userClients, userId, eventName, data);

module.exports = { addClient, removeClient, addUserClient, removeUserClient, broadcast, sendToUser };
