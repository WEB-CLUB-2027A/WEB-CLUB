"use strict";

const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("webclub_token");
const loginPath = "../public/login.html";
const profileStatus = document.getElementById("profileStatus");
const refreshButton = document.getElementById("refreshBtn");
const editor = document.getElementById("profileEditor");
const profileForm = document.getElementById("profileForm");
const nameInput = document.getElementById("editName");
const profileImageInput = document.getElementById("editProfileImage");
const coverImageInput = document.getElementById("editCoverImage");
const dashboardLogoInput = document.getElementById("editDashboardLogo");
const githubUrlInput = document.getElementById("editGithubUrl");
const linkedinUrlInput = document.getElementById("editLinkedinUrl");
const saveButton = document.getElementById("saveProfileBtn");
const editorStatus = document.getElementById("editorStatus");
let currentUser = null;

function showStatus(message, type = "") {
    profileStatus.textContent = message;
    profileStatus.classList.remove("success", "error");
    if (type) profileStatus.classList.add(type);
}

function showEditorStatus(message, type = "") {
    editorStatus.textContent = message;
    editorStatus.classList.remove("success", "error");
    if (type) editorStatus.classList.add(type);
}

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });

    let data;
    try {
        data = await response.json();
    } catch (error) {
        throw new Error(`The server returned an invalid response (${response.status}).`);
    }

    if (response.status === 401) {
        localStorage.removeItem("webclub_token");
        localStorage.removeItem("webclub_user");
        window.location.assign(loginPath);
    }

    if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status}).`);
    }

    return data;
}

function formatDate(value) {
    if (!value) return "Not available";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Not available"
        : date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value === undefined || value === null || value === "" ? "—" : String(value);
}

function safeImageUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value.trim(), window.location.href);
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch (error) {
        return null;
    }
}

function safeWebUrl(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
        const url = new URL(value.trim());
        return ["http:", "https:"].includes(url.protocol) ? url.href : null;
    } catch (error) {
        return null;
    }
}

function renderProfileLink(id, emptyId, value) {
    const link = document.getElementById(id);
    const empty = document.getElementById(emptyId);
    const url = safeWebUrl(value);
    link.hidden = !url;
    empty.hidden = Boolean(url);
    if (!url) {
        link.removeAttribute("href");
        link.textContent = "";
        return;
    }
    link.href = url;
    link.textContent = value;
}

function renderAvatar(user) {
    const avatar = document.getElementById("profileAvatar");
    const imageUrl = safeImageUrl(user.profile_image);
    setAvatarContent(avatar, imageUrl);
}

function setComputerIcon(avatar) {
    const icon = document.createElement("i");
    icon.className = "bx bx-desktop";
    icon.setAttribute("aria-hidden", "true");
    avatar.replaceChildren(icon);
}

function setAvatarContent(avatar, imageUrl) {
    if (!avatar) return;
    avatar.replaceChildren();
    if (!imageUrl) {
        setComputerIcon(avatar);
        return;
    }

    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.addEventListener("error", () => {
        setComputerIcon(avatar);
    }, { once: true });
    avatar.appendChild(image);
}

function renderDashboardLogo(value) {
    const logoUrl = safeImageUrl(value);
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

function renderProfile(user) {
    const name = user.name || user.email || "Administrator";
    const role = user.role || "Administrator";

    setText("profileName", name);
    setText("profileRole", role);
    setText("profileEmail", user.email || "Email unavailable");
    renderAvatar(user);
    renderDashboardLogo(user.dashboard_logo);
    const cover = document.getElementById("profileCover");
    const coverUrl = safeImageUrl(user.cover_image);
    cover.classList.toggle("has-background-image", Boolean(coverUrl));
    if (coverUrl) {
        const safeCssUrl = coverUrl.replace(/[()'"\\\n\r]/g, character => encodeURIComponent(character));
        cover.style.setProperty("--profile-cover-image", `url("${safeCssUrl}")`);
    } else {
        cover.style.removeProperty("--profile-cover-image");
    }
    setText("infoName", name);
    setText("infoEmail", user.email || "Email unavailable");
    setText("infoRole", role);
    setText("infoJoined", formatDate(user.created_at));
    setText("infoId", user.id);
    renderProfileLink("infoGithub", "infoGithubEmpty", user.github_url);
    renderProfileLink("infoLinkedin", "infoLinkedinEmpty", user.linkedin_url);
    renderHeroSocialLink("profileGithubLink", user.github_url);
    renderHeroSocialLink("profileLinkedinLink", user.linkedin_url);
    setText("sidebarAdminName", name);
    setAvatarContent(document.getElementById("adminAvatar"), safeImageUrl(user.profile_image));
}

function renderHeroSocialLink(id, value) {
    const link = document.getElementById(id);
    const url = safeWebUrl(value);
    link.hidden = !url;
    if (url) {
        link.href = url;
    } else {
        link.removeAttribute("href");
    }
}

function updateImagePreview(input, imageElement, placeholderElement) {
    const url = safeImageUrl(input.value);
    placeholderElement.hidden = Boolean(url);
    imageElement.hidden = !url;
    if (!url) {
        imageElement.removeAttribute("src");
        return;
    }

    imageElement.src = url;
    imageElement.onerror = () => {
        imageElement.hidden = true;
        placeholderElement.hidden = false;
        showEditorStatus("One of the image URLs could not be loaded. Check that it links directly to an image.", "error");
    };
}

async function loadCount(endpoint, property, targetId) {
    const data = await apiRequest(endpoint);
    const list = Array.isArray(data)
        ? data
        : data && Array.isArray(data[property])
            ? data[property]
            : null;
    if (!list) throw new Error(`The server returned an invalid list for ${endpoint}.`);
    setText(targetId, list.length);
    return list;
}

function renderProjects(projects) {
    const grid = document.getElementById("profileProjectGrid");
    grid.replaceChildren();

    const makeDetail = (iconName, text) => {
        const detail = document.createElement("span");
        const icon = document.createElement("i");
        icon.className = `bx ${iconName}`;
        icon.setAttribute("aria-hidden", "true");
        detail.append(icon, document.createTextNode(text));
        return detail;
    };

    if (!projects.length) {
        const empty = document.createElement("p");
        empty.className = "profile-project-empty";
        empty.textContent = "No community projects have been shared yet.";
        grid.appendChild(empty);
        return;
    }

    projects.slice(0, 3).forEach(project => {
        const card = document.createElement("article");
        card.className = "profile-project-card";

        const media = document.createElement("div");
        media.className = "profile-project-media";
        const imageUrl = safeImageUrl(project.image);
        if (imageUrl) {
            const image = document.createElement("img");
            image.src = imageUrl;
            image.alt = "";
            image.loading = "lazy";
            image.addEventListener("error", () => {
                image.remove();
                media.classList.add("has-placeholder");
                const icon = document.createElement("i");
                icon.className = "bx bx-code-alt";
                icon.setAttribute("aria-hidden", "true");
                media.appendChild(icon);
            }, { once: true });
            media.appendChild(image);
        } else {
            media.classList.add("has-placeholder");
            const icon = document.createElement("i");
            icon.className = "bx bx-code-alt";
            icon.setAttribute("aria-hidden", "true");
            media.appendChild(icon);
        }

        const content = document.createElement("div");
        content.className = "profile-project-content";
        const title = document.createElement("h3");
        title.textContent = project.title || "Untitled project";
        const description = document.createElement("p");
        description.textContent = project.description || "Explore this project from the WEB-CLUB community.";
        const details = document.createElement("div");
        details.className = "profile-project-details";
        const creator = makeDetail("bx-user", project.creator_name || "Community member");
        const date = makeDetail("bx-calendar", formatDate(project.created_at));
        details.append(creator, date);
        content.append(title, description, details);
        card.append(media, content);
        grid.appendChild(card);
    });
}

async function loadProjects() {
    try {
        const projects = await loadCount("/projects", "projects", "profileProjectCount");
        renderProjects(projects);
    } catch (error) {
        const grid = document.getElementById("profileProjectGrid");
        grid.replaceChildren();
        const message = document.createElement("p");
        message.className = "profile-project-empty";
        message.textContent = "Projects could not be loaded. Please refresh to try again.";
        grid.appendChild(message);
        throw error;
    }
}

function formatEventDate(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        const [year, month, day] = value.slice(0, 10).split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
    }
    return formatDate(value);
}

function formatEventTime(value) {
    const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
    if (!match) return "Time to be announced";

    const date = new Date();
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
    return new Intl.DateTimeFormat("en", {
        hour: "numeric",
        minute: "2-digit"
    }).format(date);
}

function renderEvents(events) {
    const grid = document.getElementById("profileEventGrid");
    grid.replaceChildren();

    const createDetail = (iconClass, text) => {
        const detail = document.createElement("span");
        const icon = document.createElement("i");
        icon.className = `bx ${iconClass}`;
        icon.setAttribute("aria-hidden", "true");
        detail.append(icon, document.createTextNode(text));
        return detail;
    };

    if (!events.length) {
        const empty = document.createElement("p");
        empty.className = "profile-project-empty";
        empty.textContent = "No community events have been announced yet.";
        grid.appendChild(empty);
        return;
    }

    events.slice(0, 3).forEach(event => {
        const card = document.createElement("article");
        card.className = "profile-project-card profile-event-card";

        const media = document.createElement("div");
        media.className = "profile-project-media";
        const imageUrl = safeImageUrl(event.image);
        if (imageUrl) {
            const image = document.createElement("img");
            image.src = imageUrl;
            image.alt = "";
            image.loading = "lazy";
            image.addEventListener("error", () => {
                image.remove();
                media.classList.add("has-placeholder");
                const icon = document.createElement("i");
                icon.className = "bx bx-calendar-event";
                icon.setAttribute("aria-hidden", "true");
                media.appendChild(icon);
            }, { once: true });
            media.appendChild(image);
        } else {
            media.classList.add("has-placeholder");
            const icon = document.createElement("i");
            icon.className = "bx bx-calendar-event";
            icon.setAttribute("aria-hidden", "true");
            media.appendChild(icon);
        }

        const content = document.createElement("div");
        content.className = "profile-project-content";
        const title = document.createElement("h3");
        title.textContent = event.title || "WEB-CLUB event";
        const description = document.createElement("p");
        description.textContent = event.description || "Join the WEB-CLUB community for this event.";
        const details = document.createElement("div");
        details.className = "profile-project-details profile-event-details";
        details.append(
            createDetail("bx-calendar", formatEventDate(event.event_date)),
            createDetail("bx-time-five", formatEventTime(event.event_time)),
            createDetail("bx-map-pin", event.location || "Location to be announced"),
            createDetail("bx-user", event.creator_name || "WEB-CLUB")
        );
        content.append(title, description, details);
        card.append(media, content);
        grid.appendChild(card);
    });
}

async function loadEvents() {
    try {
        const events = await loadCount("/events", "events", "profileEventCount");
        renderEvents(events);
    } catch (error) {
        const grid = document.getElementById("profileEventGrid");
        grid.replaceChildren();
        const message = document.createElement("p");
        message.className = "profile-project-empty";
        message.textContent = "Events could not be loaded. Please refresh to try again.";
        grid.appendChild(message);
        throw error;
    }
}

function selectProfileTab(tabName, focusTab = false) {
    const tabs = Array.from(document.querySelectorAll(".profile-tab[data-profile-tab]"));
    const activeTab = tabs.find(tab => tab.dataset.profileTab === tabName);
    if (!activeTab) return;

    tabs.forEach(tab => {
        const isSelected = tab === activeTab;
        tab.classList.toggle("active", isSelected);
        tab.setAttribute("aria-selected", String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        if (panel) panel.hidden = !isSelected;
    });

    const viewAllLink = document.getElementById("profileViewAllLink");
    if (tabName === "projects") {
        viewAllLink.href = "admin-projects.html";
        viewAllLink.replaceChildren(
            document.createTextNode("View all projects"),
            Object.assign(document.createElement("i"), {
                className: "bx bx-right-arrow-alt",
                ariaHidden: "true"
            })
        );
        viewAllLink.hidden = false;
    } else if (tabName === "events") {
        viewAllLink.href = "admin-events.html";
        viewAllLink.replaceChildren(
            document.createTextNode("View all events"),
            Object.assign(document.createElement("i"), {
                className: "bx bx-right-arrow-alt",
                ariaHidden: "true"
            })
        );
        viewAllLink.hidden = false;
    } else {
        viewAllLink.hidden = true;
    }
    if (focusTab) activeTab.focus();
}

async function loadProfile() {
    if (!token) {
        window.location.assign(loginPath);
        return;
    }

    refreshButton.disabled = true;
    showStatus("Loading administrator profile...");

    try {
        const result = await apiRequest("/users/profile");
        if (!result.user) throw new Error("The server did not return your profile.");
        if (result.user.role !== "admin") {
            showStatus("Administrator access is required to view this page.", "error");
            return;
        }

        currentUser = result.user;
        renderProfile(currentUser);

        const statisticTasks = [
            loadProjects(),
            loadEvents(),
            loadCount("/messages", "messages", "profileMessageCount"),
            apiRequest("/users/count").then(data => {
                if (typeof data.totalMembers !== "number") {
                    throw new Error("The server returned an invalid member count.");
                }
                setText("profileMemberCount", data.totalMembers);
            })
        ];
        const results = await Promise.allSettled(statisticTasks);
        const failures = results.filter(result => result.status === "rejected");
        failures.forEach(result => console.error("Profile statistic error:", result.reason));

        showStatus(
            failures.length
                ? `Profile loaded; ${failures.length} dashboard statistic${failures.length === 1 ? "" : "s"} could not be loaded.`
                : "Administrator profile loaded.",
            failures.length ? "error" : "success"
        );
    } catch (error) {
        console.error("Load administrator profile error:", error);
        showStatus(error.message, "error");
    } finally {
        refreshButton.disabled = false;
    }
}

function openEditor(focusTarget = nameInput) {
    if (!currentUser) return;
    nameInput.value = currentUser.name || "";
    profileImageInput.value = currentUser.profile_image || "";
    coverImageInput.value = currentUser.cover_image || "";
    updateImagePreview(profileImageInput, document.getElementById("profileImagePreview"), document.getElementById("profileImagePlaceholder"));
    updateImagePreview(coverImageInput, document.getElementById("coverImagePreview"), document.getElementById("coverImagePlaceholder"));
    dashboardLogoInput.value = currentUser.dashboard_logo || "";
    githubUrlInput.value = currentUser.github_url || "";
    linkedinUrlInput.value = currentUser.linkedin_url || "";
    updateImagePreview(dashboardLogoInput, document.getElementById("dashboardLogoPreview"), document.getElementById("dashboardLogoPlaceholder"));
    showEditorStatus("");
    editor.showModal();
    focusTarget.focus();
}

async function saveProfile(event) {
    event.preventDefault();
    showEditorStatus("");
    saveButton.disabled = true;

    try {
        const result = await apiRequest("/users/profile", {
            method: "PATCH",
            body: JSON.stringify({
                name: nameInput.value.trim(),
                profile_image: profileImageInput.value.trim(),
                cover_image: coverImageInput.value.trim(),
                dashboard_logo: dashboardLogoInput.value.trim(),
                github_url: githubUrlInput.value.trim(),
                linkedin_url: linkedinUrlInput.value.trim()
            })
        });
        currentUser = result.user || {
            ...currentUser,
            name: result.name || nameInput.value.trim(),
            profile_image: result.profile_image ?? profileImageInput.value.trim(),
            cover_image: result.cover_image ?? coverImageInput.value.trim(),
            dashboard_logo: result.dashboard_logo ?? dashboardLogoInput.value.trim(),
            github_url: result.github_url ?? githubUrlInput.value.trim(),
            linkedin_url: result.linkedin_url ?? linkedinUrlInput.value.trim()
        };
        renderProfile(currentUser);

        try {
            const savedUser = localStorage.getItem("webclub_user");
            const user = savedUser ? JSON.parse(savedUser) : {};
            localStorage.setItem("webclub_user", JSON.stringify({
                ...user,
                name: currentUser.name,
                profile_image: currentUser.profile_image,
                cover_image: currentUser.cover_image,
                dashboard_logo: currentUser.dashboard_logo,
                github_url: currentUser.github_url,
                linkedin_url: currentUser.linkedin_url
            }));
        } catch (error) {
            console.error("Saved user information could not be updated:", error);
        }

        showEditorStatus(result.message || "Profile updated successfully.", "success");
        showStatus("Administrator profile updated.", "success");
        window.setTimeout(() => editor.close(), 650);
    } catch (error) {
        console.error("Update administrator profile error:", error);
        showEditorStatus(error.message, "error");
    } finally {
        saveButton.disabled = false;
    }
}

document.getElementById("editProfileBtn").addEventListener("click", openEditor);
document.getElementById("changeCoverBtn").addEventListener("click", () => openEditor(coverImageInput));
document.getElementById("changeAvatarBtn").addEventListener("click", () => openEditor(profileImageInput));
document.querySelectorAll(".profile-tab[data-profile-tab]").forEach((tab, index, tabs) => {
    tab.addEventListener("click", () => selectProfileTab(tab.dataset.profileTab));
    tab.addEventListener("keydown", event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;
        selectProfileTab(tabs[nextIndex].dataset.profileTab, true);
    });
});
document.getElementById("closeProfileEditor").addEventListener("click", () => editor.close());
document.getElementById("cancelProfileEdit").addEventListener("click", () => editor.close());
profileImageInput.addEventListener("input", () => updateImagePreview(
    profileImageInput,
    document.getElementById("profileImagePreview"),
    document.getElementById("profileImagePlaceholder")
));
coverImageInput.addEventListener("input", () => updateImagePreview(
    coverImageInput,
    document.getElementById("coverImagePreview"),
    document.getElementById("coverImagePlaceholder")
));
dashboardLogoInput.addEventListener("input", () => updateImagePreview(
    dashboardLogoInput,
    document.getElementById("dashboardLogoPreview"),
    document.getElementById("dashboardLogoPlaceholder")
));
profileForm.addEventListener("submit", saveProfile);
refreshButton.addEventListener("click", loadProfile);
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("webclub_token");
    localStorage.removeItem("webclub_user");
    window.location.assign(loginPath);
});

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const currentDate = document.getElementById("currentDate");

if (currentDate) {
    currentDate.textContent = new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(new Date());
}

if (sidebar && menuToggle) {
    const setSidebarOpen = isOpen => {
        sidebar.classList.toggle("open", isOpen);
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    };

    menuToggle.addEventListener("click", () => setSidebarOpen(!sidebar.classList.contains("open")));
    sidebar.querySelectorAll(".sidebar-link").forEach(link => {
        link.addEventListener("click", () => setSidebarOpen(false));
    });
    document.addEventListener("click", event => {
        if (sidebar.classList.contains("open") && !sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
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

editor.addEventListener("click", event => {
    if (event.target === editor) editor.close();
});

loadProfile();
