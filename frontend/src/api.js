// Small fetch wrapper for calls to the Preroll Plus backend.
//
//   const settings = await api.get("backend/load");
//   await api.post("backend/save", settings);
//
// - URLs are relative, so they work under any URL base (see <base href> in app.js).
// - Options: { timeout } in milliseconds, { headers } for extra request headers.
// - Bodies are sent as JSON. Responses are parsed as JSON when possible, otherwise returned as text.
// - Failed requests (network error, timeout, or a non-2xx status) throw an Error with `status` and `body`
//   (the response text) so callers can show the server's message.
// - A 401 from the backend also fires SIGNED_OUT_EVENT on window, so App can show the sign-in page.

export const SIGNED_OUT_EVENT = "prerollplus:signed-out";

async function request(method, url, { body, timeout, headers } = {}) {
  const options = { method, headers: { ...headers } };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json;charset=UTF-8";
    options.body = JSON.stringify(body);
  }
  if (timeout) options.signal = AbortSignal.timeout(timeout);

  const res = await fetch(url, options);
  const text = await res.text();

  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON: keep the text
  }

  // Our own backend says this browser isn't signed in (e.g. the session ended): App shows the sign-in page
  if (res.status === 401 && !/^https?:/i.test(url)) window.dispatchEvent(new Event(SIGNED_OUT_EVENT));

  if (!res.ok) {
    const err = new Error(
      typeof data === "object" && data?.error ? data.error : text || `Request failed (${res.status})`,
    );
    err.status = res.status;
    err.body = text;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (url, options) => request("GET", url, options),
  post: (url, body, options) => request("POST", url, { ...options, body }),
  /** Save the whole settings object. */
  saveSettings: (settings) => request("POST", "backend/save", { body: settings }),
  /** Pick today's sequence again and send Plex a new preroll list (after sequences/buckets change). */
  updatePrerolls: () => request("GET", "webhook"),
};
