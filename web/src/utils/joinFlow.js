/**
 * Run the "Join with code" flow (family OR group) with the move-over confirm.
 * Returns the server response, or null if the user cancelled the switch.
 */
export async function runJoinFlow(code, joinWithCode, fetchFamily) {
  try {
    const data = await joinWithCode(code, false);
    if (data.type === "family" || data.family) await fetchFamily();
    return data;
  } catch (err) {
    const body = err.response?.data;
    if (err.response?.status === 409 && body?.code === "IN_OTHER_FAMILY") {
      const ok = window.confirm(
        `${body.message}\n\nTip: to stay connected with your old family, create a group together.`
      );
      if (!ok) return null;
      const data = await joinWithCode(code, true);
      await fetchFamily();
      return data;
    }
    throw err;
  }
}
