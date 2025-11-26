const STORAGE_KEY = "promptVault_v1";

let prompts = [];
let deferredPrompt = null;

// DOM elements
const promptForm = document.getElementById("promptForm");
const promptIdInput = document.getElementById("promptId");
const promptTitleInput = document.getElementById("promptTitle");
const promptTextInput = document.getElementById("promptText");
const promptTagInput = document.getElementById("promptTag");
const clearFormBtn = document.getElementById("clearFormBtn");
const promptListEl = document.getElementById("promptList");
const searchInput = document.getElementById("searchInput");
const installBtn = document.getElementById("installBtn");

/* ---------- Storage helpers ---------- */

function loadPrompts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    prompts = raw ? JSON.parse(raw) : [];
  } catch {
    prompts = [];
  }
}

function savePrompts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
}

/* ---------- UI rendering ---------- */

function renderPrompts() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = prompts.filter((p) => {
    if (!query) return true;
    const combined = `${p.title} ${p.text} ${p.tag || ""}`.toLowerCase();
    return combined.includes(query);
  });

  promptListEl.innerHTML = "";

  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.textContent = query
      ? "No prompts match your search."
      : "No prompts saved yet. Add one above.";
    empty.style.fontSize = "0.85rem";
    empty.style.color = "#9ca3af";
    promptListEl.appendChild(empty);
    return;
  }

  filtered
    .slice()
    .reverse() // newest first
    .forEach((prompt) => {
      const item = document.createElement("article");
      item.className = "prompt-item";

      const header = document.createElement("div");
      header.className = "prompt-item-header";

      const titleSpan = document.createElement("div");
      titleSpan.className = "prompt-title";
      titleSpan.textContent = prompt.title;

      header.appendChild(titleSpan);

      if (prompt.tag) {
        const tagSpan = document.createElement("span");
        tagSpan.className = "prompt-tag";
        tagSpan.textContent = prompt.tag;
        header.appendChild(tagSpan);
      }

      const preview = document.createElement("div");
      preview.className = "prompt-text-preview";
      preview.textContent = prompt.text;

      const actions = document.createElement("div");
      actions.className = "prompt-item-actions";

      const copyBtn = document.createElement("button");
      copyBtn.className = "btn secondary";
      copyBtn.type = "button";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => copyPrompt(prompt));

      const editBtn = document.createElement("button");
      editBtn.className = "btn subtle";
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => loadPromptIntoForm(prompt));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn subtle";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", () => deletePrompt(prompt.id));

      actions.append(copyBtn, editBtn, deleteBtn);

      item.append(header, preview, actions);
      promptListEl.appendChild(item);
    });
}

/* ---------- Form handling ---------- */

function clearForm() {
  promptIdInput.value = "";
  promptTitleInput.value = "";
  promptTextInput.value = "";
  promptTagInput.value = "";
}

function loadPromptIntoForm(prompt) {
  promptIdInput.value = prompt.id;
  promptTitleInput.value = prompt.title;
  promptTextInput.value = prompt.text;
  promptTagInput.value = prompt.tag || "";
  promptTitleInput.focus();
}

function upsertPromptFromForm(event) {
  event.preventDefault();

  const id = promptIdInput.value;
  const title = promptTitleInput.value.trim();
  const text = promptTextInput.value.trim();
  const tag = promptTagInput.value.trim();

  if (!title || !text) return;

  if (id) {
    // update
    const index = prompts.findIndex((p) => p.id === id);
    if (index !== -1) {
      prompts[index] = { ...prompts[index], title, text, tag };
    }
  } else {
    // create
    const newPrompt = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      title,
      text,
      tag,
      createdAt: Date.now(),
    };
    prompts.push(newPrompt);
  }

  savePrompts();
  renderPrompts();
  clearForm();
}

function deletePrompt(id) {
  const confirmed = confirm("Delete this prompt?");
  if (!confirmed) return;

  prompts = prompts.filter((p) => p.id !== id);
  savePrompts();
  renderPrompts();
}

/* ---------- Copy ---------- */

async function copyPrompt(prompt) {
  const fullText = `${prompt.text}`;

  try {
    await navigator.clipboard.writeText(fullText);
  } catch {
    // fallback: select in a hidden textarea if clipboard API fails
    const tmp = document.createElement("textarea");
    tmp.value = fullText;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand("copy");
    document.body.removeChild(tmp);
  }
}

/* ---------- Search ---------- */

searchInput.addEventListener("input", renderPrompts);

/* ---------- PWA: install + service worker ---------- */

// Capture install prompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/Prompt-Organiser/service-worker.js")
      .then(reg => console.log("Service worker registered", reg))
      .catch(err => console.error("SW registration failed", err));
  });
}

/* ---------- Init ---------- */

promptForm.addEventListener("submit", upsertPromptFromForm);
clearFormBtn.addEventListener("click", clearForm);

loadPrompts();
renderPrompts();
