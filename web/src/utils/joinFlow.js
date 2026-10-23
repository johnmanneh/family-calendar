import API from '../api/axios';

/**
 * Run the "Join with code" flow (family OR group).
 * Family invites preview the name and confirm before joining.
 * Returns the server response, or null if the user cancelled.
 */
export async function runJoinFlow(code, joinWithCode, fetchFamily) {
  const trimmed = String(code || '').trim();
  let previewName;
  try {
    const preview = await API.get(`/public/join/${encodeURIComponent(trimmed)}`);
    previewName = preview.data?.family?.name;
  } catch {
    previewName = null;
  }

  if (previewName) {
    const ok = window.confirm(`Join ${previewName}?`);
    if (!ok) return null;
  }

  try {
    const data = await joinWithCode(trimmed, false);
    if (data.type === 'family' || data.family) await fetchFamily();
    return data;
  } catch (err) {
    const body = err.response?.data;
    if (err.response?.status === 409 && body?.code === 'IN_OTHER_FAMILY') {
      const ok = window.confirm(
        `${body.message}\n\nTip: to stay connected with your old family, create a group together.`
      );
      if (!ok) return null;
      const data = await joinWithCode(trimmed, true);
      await fetchFamily();
      return data;
    }
    throw err;
  }
}
