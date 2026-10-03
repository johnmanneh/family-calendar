// In-memory store: familyId (string) → Set of response objects
const clients = new Map();

const addClient = (familyId, res) => {
  const key = String(familyId);
  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);
};

const removeClient = (familyId, res) => {
  const key = String(familyId);
  if (clients.has(key)) {
    clients.get(key).delete(res);
    if (clients.get(key).size === 0) clients.delete(key);
  }
};

// Sends a named SSE event to every connected member of a family
const broadcast = (familyId, eventName, data) => {
  const key = String(familyId);
  if (!clients.has(key)) return;
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.get(key).forEach(res => res.write(payload));
};

module.exports = { addClient, removeClient, broadcast };
