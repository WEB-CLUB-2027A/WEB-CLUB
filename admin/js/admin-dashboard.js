
"use strict";

const API_URL = "http://localhost:5000/api";

const token = localStorage.getItem("webclub_token");

const statusBox = document.getElementById("adminStatus");
const statusText = document.getElementById("statusText");
const refreshBtn = document.getElementById("refreshBtn");

const statElements = {
    members: document.getElementById("totalMembers"),
    projects: document.getElementById("totalProjects"),
    events: document.getElementById("totalEvents"),
    messages: document.getElementById("totalMessages")
};

// Set the current year.
const yearElement = document.getElementById("currentYear");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// Display status messages.
function showStatus(message, type) {
    if (statusText) {
        statusText.textContent = message;
    } else if (statusBox) {
        statusBox.textContent = message;
    }

    if (statusBox) {
        statusBox.classList.remove("success", "error");

        if (type) {
            statusBox.classList.add(type);
        }
    }
}

// Update all statistic cards.
function setAllStats(value) {
    Object.values(statElements).forEach(function (element) {
        if (element) {
            element.textContent = value;
        }
    });
}

function setComputerIcon(element) {
    const icon = document.createElement("i");
    icon.className = "bx bx-desktop";
    icon.setAttribute("aria-hidden", "true");
    element.replaceChildren(icon);
}

function setAvatarContent(element, imageUrl) {
    if (!element) return;
    element.replaceChildren();
    if (typeof imageUrl === "string" && imageUrl.trim()) {
        try {
            const image = new URL(imageUrl, window.location.href);
            if (["http:", "https:"].includes(image.protocol)) {
                const imageElement = document.createElement("img");
                imageElement.src = image.href;
                imageElement.alt = "";
                imageElement.addEventListener("error", () => {
                    setComputerIcon(element);
                }, { once: true });
                element.appendChild(imageElement);
                return;
            }
        } catch (error) {
            console.error("Admin profile image URL is invalid:", error);
        }
    }
    setComputerIcon(element);
}

function setDashboardLogo(value) {
    let logoUrl = null;
    if (typeof value === "string" && value.trim()) {
        try {
            const image = new URL(value, window.location.href);
            if (["http:", "https:"].includes(image.protocol)) logoUrl = image.href;
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

// Log out.
const loginRedirectPath = "public/login.html";

function logout() {
    localStorage.removeItem("webclub_token");
    localStorage.removeItem("webclub_user");
    window.location.href = loginRedirectPath;
}

// Make an API request.
async function apiRequest(endpoint) {
    const response = await fetch(API_URL + endpoint, {
        method: "GET",
        headers: {
            Authorization: "Bearer " + token
        }
    });

    let data;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error(
            "Invalid server response. HTTP " + response.status
        );
    }

    if (!response.ok) {
        if (response.status === 401) {
            logout();
        }

        throw new Error(
            data.message || "Request failed: " + response.status
        );
    }

    return data;
}

// Load the member count.
async function loadMemberCount() {
    try {
        const data = await apiRequest("/users/count");

        if (typeof data.totalMembers !== "number") {
            throw new Error(
                'Expected a numeric "totalMembers" value.'
            );
        }

        statElements.members.textContent = data.totalMembers;
        return true;
    } catch (error) {
        console.error("Member count error:", error);
        statElements.members.textContent = "—";
        return false;
    }
}

// Load a list and count its items.
async function loadListCount(endpoint, property, element) {
    try {
        const data = await apiRequest(endpoint);

        let list;

        if (Array.isArray(data)) {
            list = data;
        } else if (data && Array.isArray(data[property])) {
            list = data[property];
        } else {
            throw new Error(
                "Expected an array from " + endpoint
            );
        }

        element.textContent = list.length;

        if (endpoint === "/messages") {
            const messageBadge = document.getElementById("messageCountBadge");

            if (messageBadge) {
                const unreadCount = list.filter(
                    message => (message.status || "unread") === "unread"
                ).length;
                messageBadge.textContent = unreadCount;
                messageBadge.hidden = unreadCount === 0;
            }
        }

        return true;
    } catch (error) {
        console.error("API error for " + endpoint + ":", error);
        element.textContent = "—";
        return false;
    }
}

// Load the dashboard.
async function loadDashboard() {
    if (!token) {
        window.location.href = loginRedirectPath;
        return;
    }

    if (refreshBtn) {
        refreshBtn.disabled = true;
    }

    setAllStats("...");
    showStatus("Checking administrator account...");

    try {
        const profileData = await apiRequest("/users/profile");
        const user = profileData.user;

        if (!user) {
            throw new Error("Could not load your user profile.");
        }

        if (user.role !== "admin") {
            setAllStats("—");

            showStatus(
                "Access denied. Please sign in with an admin account.",
                "error"
            );

            return;
        }

        const displayName = user.name || user.email || "Administrator";
        setDashboardLogo(user.dashboard_logo);

        const welcomeName = document.getElementById("welcomeName");
        const sidebarAdminName = document.getElementById("sidebarAdminName");
        const adminAvatar = document.getElementById("adminAvatar");
        const profilePanel = document.getElementById("adminProfilePanel");
        const profileName = document.getElementById("dashboardProfileName");
        const profileEmail = document.getElementById("dashboardProfileEmail");
        const profileJoined = document.getElementById("dashboardProfileJoined");
        const profileAvatar = document.getElementById("dashboardProfileAvatar");

        if (welcomeName) {
            welcomeName.textContent = "Welcome back, " + displayName + "!";
        }

        if (sidebarAdminName) {
            sidebarAdminName.textContent = displayName;
        }

        setAvatarContent(adminAvatar, user.profile_image);

        if (profileName) {
            profileName.textContent = displayName;
        }

        if (profileEmail) {
            profileEmail.textContent = user.email || "Email not available";
        }

        if (profileJoined) {
            const createdAt = user.created_at ? new Date(user.created_at) : null;
            profileJoined.textContent = createdAt && !Number.isNaN(createdAt.getTime())
                ? "Account created " + createdAt.toLocaleDateString("en", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                })
                : "Account date unavailable";
        }

        setAvatarContent(profileAvatar, user.profile_image);

        if (profilePanel) {
            profilePanel.hidden = false;
        }

        showStatus("Administrator verified. Loading statistics...", "success");

        const results = await Promise.all([
            loadMemberCount(),

            loadListCount(
                "/projects",
                "projects",
                statElements.projects
            ),

            loadListCount(
                "/events",
                "events",
                statElements.events
            ),

            loadListCount(
                "/messages",
                "messages",
                statElements.messages
            )
        ]);

        const successCount = results.filter(Boolean).length;

        if (successCount === results.length) {
            showStatus(
                "All four statistics loaded successfully!",
                "success"
            );
        } else {
            showStatus(
                successCount + " of 4 statistics loaded. Check the browser console for errors.",
                "error"
            );
        }
    } catch (error) {
        console.error("Dashboard error:", error);
        setAllStats("—");
        showStatus(error.message, "error");
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
        }
    }
}

// Refresh button.
if (refreshBtn) {
    refreshBtn.onclick = loadDashboard;
}

// Logout button.
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.onclick = logout;
}

// Mobile sidebar.
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");

if (sidebar && menuToggle) {
    const setSidebarOpen = function (isOpen) {
        sidebar.classList.toggle("open", isOpen);
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    };

    menuToggle.onclick = function () {
        setSidebarOpen(!sidebar.classList.contains("open"));
    };

    sidebar.querySelectorAll(".sidebar-link").forEach(function (link) {
        link.addEventListener("click", function () {
            setSidebarOpen(false);
        });
    });

    document.addEventListener("click", function (event) {
        if (
            sidebar.classList.contains("open") &&
            !sidebar.contains(event.target) &&
            !menuToggle.contains(event.target)
        ) {
            setSidebarOpen(false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && sidebar.classList.contains("open")) {
            setSidebarOpen(false);
            menuToggle.focus();
        }
    });
}

const dateElement = document.getElementById("currentDate");

if (dateElement) {
    dateElement.textContent = new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(new Date());
}

const storedUser = localStorage.getItem("webclub_user");

if (storedUser) {
    try {
        const user = JSON.parse(storedUser);
        const displayName = user.name || user.email;

        if (displayName) {
            const nameElement = document.getElementById("sidebarAdminName");
            const avatarElement = document.getElementById("adminAvatar");

            if (nameElement) {
                nameElement.textContent = displayName;
            }

            if (avatarElement) {
                avatarElement.textContent = displayName.charAt(0).toUpperCase();
            }
        }
    } catch (error) {
        console.error("Saved user information could not be read:", error);
    }
}

// Start the dashboard.
loadDashboard();
