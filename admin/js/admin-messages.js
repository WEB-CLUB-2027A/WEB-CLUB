const API_URL = "http://localhost:5000/api";

const messagesList = document.getElementById("messagesList");
const statusMessage = document.getElementById("statusMessage");

const totalMessages = document.getElementById("totalMessages");
const unreadMessages = document.getElementById("unreadMessages");
const readMessages = document.getElementById("readMessages");

const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

const token = localStorage.getItem("webclub_token");
const loginRedirectPath = "../public/login.html";


// ========================================
// CHECK LOGIN
// ========================================

if (!token) {
    window.location.href = loginRedirectPath;
}


// ========================================
// API REQUEST
// ========================================

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,

        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error(`The server returned an invalid response (${response.status}).`);
    }

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("webclub_token");
            localStorage.removeItem("webclub_user");

            if (response.status === 401) {
                window.location.href = loginRedirectPath;
            }
        }

        throw new Error(
            data.message || `Request failed (${response.status}).`
        );
    }

    return data;
}

function appendIcon(container, iconName) {
    const icon = document.createElement("i");
    icon.className = `bx ${iconName}`;
    icon.setAttribute("aria-hidden", "true");
    container.appendChild(icon);
}

function renderDashboardLogo(value) {
    let logoUrl = null;
    if (typeof value === "string" && value.trim()) {
        try {
            const url = new URL(value.trim(), window.location.href);
            if (["http:", "https:"].includes(url.protocol)) logoUrl = url.href;
        } catch (error) {
            console.error("Admin dashboard logo URL is invalid:", error);
        }
    }

    document.querySelectorAll(".brand-mark").forEach(mark => {
        if (!logoUrl) {
            mark.replaceChildren(document.createTextNode("W"));
            return;
        }
        const image = document.createElement("img");
        image.className = "brand-logo-image";
        image.alt = "";
        image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
        image.addEventListener("error", () => {
            mark.replaceChildren(document.createTextNode("W"));
        }, { once: true });
        image.src = logoUrl;
        if (image.complete && image.naturalWidth > 0) image.classList.add("is-loaded");
        mark.replaceChildren(image);
    });
}

function renderAdminProfile(user) {
    const name = user.name || user.email || "Administrator";
    const nameElement = document.getElementById("sidebarAdminName");
    const avatar = document.getElementById("adminAvatar");
    if (nameElement) nameElement.textContent = name;
    if (!avatar) return;

    const initial = name.trim().charAt(0).toUpperCase() || "A";
    let imageUrl = null;
    if (typeof user.profile_image === "string" && user.profile_image.trim()) {
        try {
            const url = new URL(user.profile_image.trim(), window.location.href);
            if (["http:", "https:"].includes(url.protocol)) imageUrl = url.href;
        } catch (error) {
            console.error("Admin profile image URL is invalid:", error);
        }
    }

    avatar.replaceChildren();
    if (!imageUrl) {
        avatar.textContent = initial;
        return;
    }

    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.addEventListener("error", () => {
        avatar.replaceChildren(document.createTextNode(initial));
    }, { once: true });
    avatar.appendChild(image);
}


// ========================================
// SHOW STATUS
// ========================================

function showStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = `message-status-line ${type}`.trim();
}

function createMessageEditor() {
    const dialog = document.createElement("dialog");
    dialog.className = "message-editor-dialog";
    const form = document.createElement("form");
    form.className = "message-editor-form";
    const heading = document.createElement("h2");
    heading.className = "message-editor-title";
    const description = document.createElement("p");
    description.className = "message-editor-description";
    const fields = document.createElement("div");
    fields.className = "message-editor-fields";
    const formStatus = document.createElement("p");
    formStatus.className = "message-editor-status";
    formStatus.setAttribute("role", "status");

    const fieldDefinitions = [
        { name: "name", label: "Name", type: "text", maxLength: 100 },
        { name: "email", label: "Email", type: "email", maxLength: 254 },
        { name: "subject", label: "Subject", type: "text", maxLength: 200 },
        { name: "message", label: "Message", type: "textarea", maxLength: 5000 }
    ];
    const controls = {};
    fieldDefinitions.forEach(field => {
        const label = document.createElement("label");
        label.className = "message-editor-field";
        const labelText = document.createElement("span");
        labelText.textContent = field.label;
        const control = document.createElement(field.type === "textarea" ? "textarea" : "input");
        if (field.type !== "textarea") control.type = field.type;
        control.name = field.name;
        control.required = true;
        control.maxLength = field.maxLength;
        if (field.type === "textarea") control.rows = 5;
        label.append(labelText, control);
        fields.appendChild(label);
        controls[field.name] = control;
    });

    const actions = document.createElement("div");
    actions.className = "message-editor-actions";
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "message-editor-cancel";
    cancelButton.textContent = "Cancel";
    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "message-editor-save";
    saveButton.textContent = "Save message";
    actions.append(cancelButton, saveButton);
    form.append(heading, description, fields, formStatus, actions);
    dialog.appendChild(form);
    document.body.appendChild(dialog);

    cancelButton.addEventListener("click", () => dialog.close());
    form.addEventListener("submit", async event => {
        event.preventDefault();
        formStatus.textContent = "";
        formStatus.className = "message-editor-status";
        saveButton.disabled = true;
        const messageId = dialog.dataset.messageId;
        const body = Object.fromEntries(new FormData(form).entries());
        try {
            const result = await apiRequest(
                messageId ? `/messages/${encodeURIComponent(messageId)}` : "/messages",
                {
                    method: messageId ? "PATCH" : "POST",
                    body: JSON.stringify(body)
                }
            );
            dialog.close();
            await loadMessages();
            showStatus(result.message, "success");
        } catch (error) {
            console.error("Save message error:", error);
            formStatus.textContent = error.message;
            formStatus.classList.add("error");
        } finally {
            saveButton.disabled = false;
        }
    });

    return function openMessageEditor(message = null) {
        form.reset();
        formStatus.textContent = "";
        formStatus.className = "message-editor-status";
        heading.textContent = message ? "Edit message" : "Add inbox message";
        description.textContent = message
            ? "Update the message details shown in the inbox."
            : "This adds a message record to the inbox; it does not send an email.";
        Object.entries(controls).forEach(([key, control]) => {
            control.value = message?.[key] || "";
        });
        dialog.dataset.messageId = message ? String(message.id) : "";
        dialog.showModal();
    };
}

const openMessageEditor = createMessageEditor();

// ========================================
// CREATE MESSAGE CARD
// ========================================

function createMessageCard(message) {
    const card = document.createElement("article");

    card.className = "message-card";

    const status = message.status || "unread";

    if (status === "unread") {
        card.classList.add("unread");
    }

    const top = document.createElement("div");
    top.className = "message-top";

    const heading = document.createElement("div");

    const title = document.createElement("h3");
    title.textContent = message.subject;

    const sender = document.createElement("p");
    sender.className = "message-sender";
    sender.textContent =
        `${message.name} • ${message.email}`;

    heading.append(title, sender);

    const badge = document.createElement("span");
    badge.className = "message-status";
    badge.textContent = status.toUpperCase();

    if (status === "read") {
        badge.classList.add("read");
    }

    top.append(heading, badge);

    const body = document.createElement("p");
    body.className = "message-body";
    body.textContent = message.message;

    const date = document.createElement("p");
    date.className = "message-date";

    const parsedDate = new Date(message.created_at);

    date.textContent = Number.isNaN(parsedDate.getTime())
        ? `Message ID: ${message.id}`
        : `Received: ${parsedDate.toLocaleString()}`;

    const actions = document.createElement("div");
    actions.className = "message-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "edit-message-btn";
    appendIcon(editBtn, "bx-edit-alt");
    editBtn.append(" Edit Message");
    editBtn.addEventListener("click", () => openMessageEditor(message));

    const statusBtn = document.createElement("button");

    if (status === "unread") {
        statusBtn.className = "mark-read-btn";
        appendIcon(statusBtn, "bx-check");
        statusBtn.append(" Mark as Read");
    } else {
        statusBtn.className = "mark-unread-btn";
        appendIcon(statusBtn, "bx-envelope");
        statusBtn.append(" Mark as Unread");
    }

    statusBtn.addEventListener("click", async () => {
        statusBtn.disabled = true;
        const updated = await updateMessageStatus(
            message.id,
            status === "unread" ? "read" : "unread"
        );
        if (!updated) statusBtn.disabled = false;
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-message-btn";
    appendIcon(deleteBtn, "bx-trash");
    deleteBtn.append(" Delete Message");

    deleteBtn.addEventListener("click", async () => {
        const confirmed = confirm(
            `Are you sure you want to delete message #${message.id}?`
        );

        if (!confirmed) {
            return;
        }

        deleteBtn.disabled = true;
        const deleted = await deleteMessage(message.id);
        if (!deleted) deleteBtn.disabled = false;
    });

    actions.append(editBtn, statusBtn, deleteBtn);

    card.append(top, body, date, actions);

    return card;
}


// ========================================
// LOAD MESSAGES
// ========================================

async function loadMessages() {
    messagesList.replaceChildren();

    showStatus("Loading messages...");

    refreshBtn.disabled = true;

    try {
        const data = await apiRequest("/messages");

        if (!data || !Array.isArray(data.messages)) {
            throw new Error("The server returned an invalid messages list.");
        }

        const messages = data.messages;
        const unreadCount = messages.filter(
            message => (message.status || "unread") === "unread"
        ).length;
        const readCount = messages.filter(
            message => message.status === "read"
        ).length;

        totalMessages.textContent = messages.length;
        unreadMessages.textContent = unreadCount;
        readMessages.textContent = readCount;

        const messageCountBadge = document.getElementById("messageCountBadge");

        if (messageCountBadge) {
            messageCountBadge.textContent = unreadCount;
            messageCountBadge.hidden = unreadCount === 0;
        }

        if (messages.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-messages";
            empty.textContent = "No messages have been received yet.";

            messagesList.appendChild(empty);

            showStatus("Messages loaded successfully!", "success");
            return;
        }

        messages.forEach(message => {
            messagesList.appendChild(
                createMessageCard(message)
            );
        });

        showStatus("Messages loaded successfully!", "success");

    } catch (error) {
        console.error("Load messages error:", error);

        showStatus(error.message, "error");

    } finally {
        refreshBtn.disabled = false;
    }
}


// ========================================
// UPDATE MESSAGE STATUS
// ========================================

async function updateMessageStatus(id, status) {
    try {
        const data = await apiRequest(`/messages/${id}/status`, {
            method: "PATCH",

            body: JSON.stringify({
                status
            })
        });

        showStatus(data.message, "success");

        await loadMessages();
        return true;

    } catch (error) {
        console.error("Update message error:", error);
        showStatus(error.message, "error");
        return false;
    }
}


// ========================================
// DELETE MESSAGE
// ========================================

async function deleteMessage(id) {
    try {
        const data = await apiRequest(`/messages/${id}`, {
            method: "DELETE"
        });

        showStatus(data.message, "success");

        await loadMessages();
        return true;

    } catch (error) {
        console.error("Delete message error:", error);
        showStatus(error.message, "error");
        return false;
    }
}


// ========================================
// BUTTON EVENTS
// ========================================

refreshBtn.addEventListener("click", loadMessages);
document.getElementById("addMessageBtn").addEventListener("click", () => openMessageEditor());

logoutBtn.addEventListener("click", event => {
    event.preventDefault();

    localStorage.removeItem("webclub_token");
    localStorage.removeItem("webclub_user");

    window.location.href = loginRedirectPath;
});

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");

if (sidebar && menuToggle) {
    const setSidebarOpen = isOpen => {
        sidebar.classList.toggle("open", isOpen);
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    };

    menuToggle.addEventListener("click", () => {
        setSidebarOpen(!sidebar.classList.contains("open"));
    });

    sidebar.querySelectorAll(".sidebar-link").forEach(link => {
        link.addEventListener("click", () => setSidebarOpen(false));
    });

    document.addEventListener("click", event => {
        if (
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            setSidebarOpen(false);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && sidebar.classList.contains("open")) {
            setSidebarOpen(false);
            menuToggle.focus();
        }
    });
}

const currentDate = document.getElementById("currentDate");

if (currentDate) {
    currentDate.textContent = new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(new Date());
}

const savedUser = localStorage.getItem("webclub_user");

if (savedUser) {
    try {
        const user = JSON.parse(savedUser);
        const name = user.name || user.email;

        if (name) {
            document.getElementById("sidebarAdminName").textContent = name;
            const avatar = document.getElementById("adminAvatar");
            const initial = name.trim().charAt(0).toUpperCase() || "A";
            const imageUrl = typeof user.profile_image === "string" ? user.profile_image.trim() : "";
            if (imageUrl) {
                try {
                    const image = new URL(imageUrl, window.location.href);
                    if (!["http:", "https:"].includes(image.protocol)) {
                        throw new Error("Unsupported image protocol.");
                    }
                    const imageElement = document.createElement("img");
                    imageElement.src = image.href;
                    imageElement.alt = "";
                    imageElement.addEventListener("error", () => {
                        avatar.replaceChildren(document.createTextNode(initial));
                    }, { once: true });
                    avatar.replaceChildren(imageElement);
                } catch (error) {
                    console.error("Saved admin profile image URL is invalid:", error);
                    avatar.textContent = initial;
                }
            } else {
                avatar.textContent = initial;
            }
        }
    } catch (error) {
        console.error("Saved user information could not be read:", error);
    }
}

async function loadAdminProfile() {
    try {
        const data = await apiRequest("/users/profile");
        if (!data.user) throw new Error("The server did not return the administrator profile.");

        renderAdminProfile(data.user);
        renderDashboardLogo(data.user.dashboard_logo);
        try {
            localStorage.setItem("webclub_user", JSON.stringify(data.user));
        } catch (error) {
            console.error("Updated admin profile could not be cached:", error);
        }
    } catch (error) {
        console.error("Load admin sidebar profile error:", error);
    }
}


// ========================================
// START
// ========================================

if (token) {
    loadMessages();
    loadAdminProfile();
}
