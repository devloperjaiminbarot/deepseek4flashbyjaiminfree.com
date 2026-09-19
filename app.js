/* =========================================================
   AI Chat — CORS-safe version
   ========================================================= */

const API_BASE = "https://anshapi.vercel.app/api/deepseek";
const API_KEY  = "ansh";
const MODEL    = "deepseek-v4-flash";
const TIMEOUT_MS = 25000;

// Proxy list — tried in order until one works
const PROXIES = [
  (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  (u) => "https://thingproxy.freeboard.io/fetch/" + u,
  (u) => "https://cors.eu.org/" + u,
];

const form     = document.getElementById("chat-form");
const input    = document.getElementById("prompt-input");
const btn      = document.getElementById("send-btn");
const chat     = document.getElementById("chat");
const statusEl = document.getElementById("status");
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
  if (!msg) { statusEl.hidden = true; statusEl.textContent = ""; return; }
  statusEl.textContent = msg;
  statusEl.hidden = false;
}

function setLoading(loading) {
  btn.disabled = loading;
  input.disabled = loading;
  btn.textContent = loading ? "…" : "Send";
}

async function fetchWithTimeout(url, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/* Try each proxy until one returns valid JSON */
async function fetchWithFallback(targetUrl) {
  let lastErr;
  for (let i = 0; i < PROXIES.length; i++) {
    const url = PROXIES[i](targetUrl);
    try {
      console.log(`[AI] attempt ${i + 1}:`, url);
      const res = await fetchWithTimeout(url, TIMEOUT_MS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Non-JSON response");
      }
    } catch (e) {
      lastErr = e;
      console.warn(`[AI] attempt ${i + 1} failed:`, e.message);
    }
  }
  throw lastErr || new Error("All attempts failed");
}

/* ---------- submit ---------- */
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

    const payload = data?.data ?? data;
    const reply   = payload?.response ?? payload?.message ?? null;
    const ok      = data?.status === true || payload?.status === "success";

    if (!ok || !reply) {
      addMessage(data?.error || payload?.error || "Empty response from AI.", "error");
      return;
    }

    addMessage(reply, "bot");

  } catch (err) {
    typing.remove();
    const msg =
      err.name === "AbortError"
        ? "Request timed out. Try again."
        : `Network error: ${err.message}. The AI proxy may be slow or down.`;
    addMessage(msg, "error");
  } finally {
    setLoading(false);
    input.focus();
  }
});

/* ---------- clear ---------- */
clearBtn.addEventListener("click", () => {
  chat.innerHTML = "";
  addMessage("Chat cleared. Ask me anything 👋", "bot");
});

/* ---------- greet ---------- */
addMessage("Hi! Ask me anything 👋", "bot");
