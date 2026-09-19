/* =========================================================
   AI Chat — fixed version
   Handles: CORS, timeouts, retries, proxy fallback, parsing
   ========================================================= */

const API_BASE = "https://anshapi.vercel.app/api/deepseek";
const API_KEY  = "ansh";
const MODEL    = "deepseek-v4-flash";
const TIMEOUT_MS = 20000;

// CORS proxy fallbacks (tried in order if direct fetch fails)
const PROXIES = [
  (u) => u,                                                    // direct
  (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u), // proxy 1
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u), // proxy 2
];

const form   = document.getElementById("chat-form");
const input  = document.getElementById("prompt-input");
const btn    = document.getElementById("send-btn");
const chat   = document.getElementById("chat");
const status = document.getElementById("status");
const clearBtn = document.getElementById("clear-btn");

/* ---------- helpers ---------- */
function addMessage(text, kind = "bot") {
  const el = document.createElement("div");
  el.className = `msg ${kind}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

function setStatus(msg) {
  if (!msg) { status.hidden = true; status.textContent = ""; return; }
  status.textContent = msg;
  status.hidden = false;
}

function setLoading(loading) {
  btn.disabled = loading;
  input.disabled = loading;
  btn.textContent = loading ? "…" : "Send";
}

/* fetch with timeout + abort */
async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
  } finally {
    clearTimeout(timer);
  }
}

/* try direct then proxies */
async function fetchWithFallback(targetUrl) {
  let lastErr;
  for (let i = 0; i < PROXIES.length; i++) {
    const url = PROXIES[i](targetUrl);
    try {
      const res = await fetchWithTimeout(url, TIMEOUT_MS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // Some proxies return HTML error pages — validate JSON
      try { return JSON.parse(text); }
      catch { throw new Error("Non-JSON response"); }
    } catch (e) {
      lastErr = e;
      console.warn(`[AI] attempt ${i + 1} failed:`, e.message);
    }
  }
  throw lastErr || new Error("All attempts failed");
}

/* ---------- main handler ---------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  const prompt = input.value.trim();
  if (!prompt) return;

  addMessage(prompt, "user");
  input.value = "";
  setLoading(true);

  const typing = addMessage("Thinking", "bot typing");

  try {
    const target =
      `${API_BASE}?key=${encodeURIComponent(API_KEY)}` +
      `&prompt=${encodeURIComponent(prompt)}` +
      `&model=${encodeURIComponent(MODEL)}`;

    const data = await fetchWithFallback(target);

    typing.remove();

    // Normalize response shape (this endpoint wraps data twice)
    const payload   = data?.data ?? data;
    const reply     = payload?.response ?? payload?.message ?? null;
    const okFlag    = data?.status === true || payload?.status === "success";

    if (!okFlag || !reply) {
      const errMsg = data?.error || payload?.error || "Empty response from AI.";
      addMessage(errMsg, "error");
      return;
    }

    addMessage(reply, "bot");

  } catch (err) {
    typing.remove();
    const msg =
      err.name === "AbortError"
        ? "Request timed out. The AI server is slow or unreachable."
        : `Network error: ${err.message}. The AI endpoint may be down.`;
    addMessage(msg, "error");
  } finally {
    setLoading(false);
    input.focus();
  }
});

/* ---------- clear chat ---------- */
clearBtn.addEventListener("click", () => {
  chat.innerHTML = "";
  addMessage("Chat cleared. Ask me anything 👋", "bot");
});

/* ---------- greet ---------- */
addMessage("Hi! Ask me anything 👋", "bot");
