// In-memory stores:
//   clients     familyId (string) → Set of response objects  (family-wide updates)
//   userClients userId   (string) → Set of response objects  (personal: notifications)
const clients = new Map();
const userClients = new Map();
// userId → familyId → responses, so revocation covers every device but
// leaves the user's other family subscriptions intact.
const userFamilyClients = new Map();
// Retain only in-flight lookups, so revocation covers stale query results too.
const pendingSubscriptions = new Map();

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

const beginSubscription = userId => {
  const snapshot = { revokedFamilies: new Set() };
  addTo(pendingSubscriptions, userId, snapshot);
  return snapshot;
};
const finishSubscription = (userId, snapshot) => removeFrom(pendingSubscriptions, userId, snapshot);

const addClient = (familyId, res, userId) => {
  addTo(clients, familyId, res);
  const key = String(userId);
  if (!userFamilyClients.has(key)) userFamilyClients.set(key, new Map());
  addTo(userFamilyClients.get(key), familyId, res);
};
const removeClient = (familyId, res, userId) => {
  removeFrom(clients, familyId, res);
  const key = String(userId);
  const families = userFamilyClients.get(key);
  if (families) {
    removeFrom(families, familyId, res);
    if (!families.size) userFamilyClients.delete(key);
  }
};
const revokeFamily = (userId, familyId) => {
  pendingSubscriptions.get(String(userId))?.forEach(snapshot => snapshot.revokedFamilies.add(String(familyId)));
  const responses = userFamilyClients.get(String(userId))?.get(String(familyId));
  if (responses) [...responses].forEach(res => removeClient(familyId, res, userId));
};
const addUserClient    = (userId, res) => addTo(userClients, userId, res);
const removeUserClient = (userId, res) => removeFrom(userClients, userId, res);
const revokeUser = userId => {
  pendingSubscriptions.get(String(userId))?.forEach(snapshot => { snapshot.revoked = true; });
  const families = userFamilyClients.get(String(userId));
  if (families) [...families.keys()].forEach(id => revokeFamily(userId, id));
  const responses = userClients.get(String(userId));
  if (responses) [...responses].forEach(res => {
    removeUserClient(userId, res);
    res.end();
  });
};

// Sends a named SSE event to every connected member of a family
const broadcast = (familyId, eventName, data) => writeTo(clients, familyId, eventName, data);

// Sends a named SSE event to every open connection of one user (any device)
const sendToUser = (userId, eventName, data) => writeTo(userClients, userId, eventName, data);

module.exports = { addClient, removeClient, addUserClient, removeUserClient, beginSubscription, finishSubscription, revokeFamily, revokeUser, broadcast, sendToUser };
