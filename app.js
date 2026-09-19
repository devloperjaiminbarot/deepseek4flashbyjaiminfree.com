// DeepSeek AI Chat
const API_BASE = "https://anshapi.vercel.app/api/deepseek";
const API_KEY  = "ansh";
const MODEL    = "deepseek-v4-flash";

const form   = document.getElementById("chat-form");
const input  = document.getElementById("prompt-input");
const btn    = document.getElementById("send-btn");
const chat   = document.getElementById("chat");
const status = document.getElementById("status");

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

function addMessage(text, kind = "bot") {
  const el = document.createElement("div");
  el.className = `msg ${kind}`;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

function setStatus(msg, kind = "error") {
  if (!msg) { status.hidden = true; return; }
  status.textContent = msg;
  status.className = `status ${kind}`;
  status.hidden = false;
}

function setLoading(loading) {
  btn.disabled = loading;
  input.disabled = loading;
  btn.textContent = loading ? "…" : "Send";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setStatus("");

  const prompt = input.value.trim();
  if (!prompt) return;

  addMessage(prompt, "user");
  input.value = "";
  setLoading(true);

  // Show animated "typing" bubble
  const typing = addMessage("Thinking", "bot typing");

  try {
    const url = `${API_BASE}?key=${encodeURIComponent(API_KEY)}` +
                `&prompt=${encodeURIComponent(prompt)}` +
                `&model=${encodeURIComponent(MODEL)}`;

    const res = await fetch(url);
    const data = await res.json();

    typing.remove();

    if (!res.ok || !data.status || data.data?.status !== "success") {
      addMessage(data.error || data.message || "Something went wrong. Try again.", "error");
      return;
    }

    addMessage(data.data.response || "(empty response)", "bot");

  } catch (err) {
    typing.remove();
    addMessage(`Network error: ${err.message}`, "error");
  } finally {
    setLoading(false);
    input.focus();
  }
});

// Greet on load
addMessage("Hi! Ask me anything 👋", "bot");
