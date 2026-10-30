"use strict";

(function () {
    const API_URL = "http://localhost:5000/api";
    const token = localStorage.getItem("webclub_token");
    const pageStatus = document.getElementById("pageStatus");
    const loginPath = "../public/login.html";

    function showStatus(message, type) {
        if (!pageStatus) return;
        pageStatus.textContent = message;
        pageStatus.classList.remove("success", "error");
        if (type) pageStatus.classList.add(type);
    }

    async function request(path, options = {}) {
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

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem("webclub_token");
                localStorage.removeItem("webclub_user");
                window.location.assign(loginPath);
            }
            throw new Error(data.message || `Request failed (${response.status}).`);
        }

        return data;
    }

    function setupShell() {
        const currentDate = document.getElementById("currentDate");
        if (currentDate) {
            currentDate.textContent = new Intl.DateTimeFormat("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            }).format(new Date());
        }

        const logoutButton = document.getElementById("logoutBtn");
        logoutButton?.addEventListener("click", () => {
            localStorage.removeItem("webclub_token");
            localStorage.removeItem("webclub_user");
            window.location.assign(loginPath);
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
    }

    function updateAdminProfile(user) {
        const displayName = user.name || user.email || "Administrator";
        const nameElement = document.getElementById("sidebarAdminName");
        const avatarElement = document.getElementById("adminAvatar");
        const logoUrl = safeWebUrl(user.dashboard_logo);
        document.querySelectorAll(".brand-mark").forEach(mark => {
            if (!logoUrl) {
                mark.replaceChildren(document.createTextNode("W"));
                return;
            }
            const image = element("img", "brand-logo-image");
            image.alt = "";
            image.addEventListener("load", () => image.classList.add("is-loaded"), { once: true });
            image.addEventListener("error", () => {
                mark.replaceChildren(document.createTextNode("W"));
            }, { once: true });
            image.src = logoUrl;
            if (image.complete && image.naturalWidth > 0) image.classList.add("is-loaded");
            mark.replaceChildren(image);
        });
        if (nameElement) nameElement.textContent = displayName;
        if (!avatarElement) return;

        const initial = displayName.trim().charAt(0).toUpperCase() || "A";
        const imageUrl = safeWebUrl(user.profile_image);
        avatarElement.replaceChildren();
        if (!imageUrl) {
            avatarElement.textContent = initial;
            return;
        }

        const image = element("img");
        image.src = imageUrl;
        image.alt = "";
        image.addEventListener("error", () => {
            avatarElement.replaceChildren(document.createTextNode(initial));
        }, { once: true });
        avatarElement.appendChild(image);
    }

    async function requireAdmin() {
        if (!token) {
            window.location.assign(loginPath);
            return false;
        }

        try {
            const data = await request("/users/profile");
            if (!data.user || data.user.role !== "admin") {
                showStatus("Admin access is required to view this page.", "error");
                document.getElementById("collectionGrid")?.replaceChildren();
                return false;
            }
            updateAdminProfile(data.user);
            return true;
        } catch (error) {
            console.error("Admin access check failed:", error);
            showStatus(error.message, "error");
            return false;
        }
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function appendIcon(container, iconName) {
        const icon = element("i", `bx ${iconName}`);
        icon.setAttribute("aria-hidden", "true");
        container.appendChild(icon);
    }

    function setText(id, value) {
        const target = document.getElementById(id);
        if (target) target.textContent = value === undefined || value === null || value === "" ? "—" : String(value);
    }

    function safeWebUrl(value) {
        if (typeof value !== "string" || !value.trim()) return null;
        try {
            const url = new URL(value, window.location.href);
            return ["http:", "https:"].includes(url.protocol) ? url.href : null;
        } catch (error) {
            return null;
        }
    }

    function addActionLink(container, label, value) {
        const url = safeWebUrl(value);
        if (!url) return;
        const iconName = label === "GitHub"
            ? "bxl-github"
            : label === "LinkedIn"
                ? "bxl-linkedin"
                : "bx-link-external";
        const link = element("a", "project-link");
        appendIcon(link, iconName);
        link.append(label);
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        container.appendChild(link);
    }

    function createCardImage(value, title, iconName, imageClass) {
        const media = element("div", "collection-card-media");
        const imageUrl = safeWebUrl(value);
        if (!imageUrl) {
            media.classList.add("is-placeholder");
            appendIcon(media, iconName);
            return media;
        }

        const image = element("img", imageClass);
        image.src = imageUrl;
        image.alt = title ? `${title} image` : "Card image";
        image.loading = "lazy";
        image.addEventListener("error", () => {
            image.remove();
            media.classList.add("is-placeholder");
            appendIcon(media, iconName);
        }, { once: true });
        media.appendChild(image);
        return media;
    }

    function formattedDate(value, options = { year: "numeric", month: "short", day: "numeric" }) {
        if (!value) return "Date not set";
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en", options);
    }

    function createDeleteButton(resource, item, load, deleteEndpoint, confirmationMessage) {
        const button = element("button", "delete-button");
        appendIcon(button, "bx-trash");
        button.append(" Delete");
        button.type = "button";
        button.addEventListener("click", async () => {
            const label = item.title || item.name || `#${item.id}`;
            if (!window.confirm(confirmationMessage || `Delete "${label}"? This cannot be undone.`)) return;
            button.disabled = true;
            button.textContent = "Deleting...";
            try {
                const result = await request(
                    deleteEndpoint || `/${resource}/${encodeURIComponent(item.id)}`,
                    {
                        method: "DELETE"
                    }
                );
                showStatus(result.message || "Item deleted successfully.", "success");
                await load();
            } catch (error) {
                console.error(`Delete ${resource} error:`, error);
                showStatus(error.message, "error");
                button.disabled = false;
                button.replaceChildren();
                appendIcon(button, "bx-trash");
                button.append(" Delete");
            }
        });
        return button;
    }

    function createEditButton(item, openEditor) {
        const button = element("button", "edit-button");
        appendIcon(button, "bx-edit-alt");
        button.append(" Edit");
        button.type = "button";
        button.addEventListener("click", () => openEditor(item));
        return button;
    }

    function createIdBadge(item) {
        const button = element("button", "item-id-badge", `ID #${item.id}`);
        button.type = "button";
        button.title = `Copy card ID ${item.id}`;
        button.setAttribute("aria-label", `Copy card ID ${item.id}`);
        button.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(String(item.id));
                button.textContent = "Copied!";
                window.setTimeout(() => {
                    button.textContent = `ID #${item.id}`;
                }, 1200);
            } catch (error) {
                console.error("Copy card ID failed:", error);
                button.title = `Card ID ${item.id}`;
            }
        });
        return button;
    }

    function normalizeDate(value) {
        const rawValue = String(value || "");
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) return rawValue;

        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return rawValue.slice(0, 10);

        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${date.getFullYear()}-${month}-${day}`;
    }

    function localToday() {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${today.getFullYear()}-${month}-${day}`;
    }

    function buildEventCard(item, load, openEditor) {
        const card = element("article", "collection-card visual-collection-card event-card");
        const date = normalizeDate(item.event_date);
        card.appendChild(createCardImage(item.image, item.title, "bx-calendar-event", "event-image"));
        const content = element("div", "collection-card-content");
        const header = element("div", "event-header");
        const title = element("h2", "item-title", item.title || "Untitled event");
        const eventDate = element("p", "event-date", formattedDate(item.event_date));
        header.append(title, eventDate);
        content.appendChild(header);
        content.appendChild(element("p", "item-description", item.description || "No description provided."));

        const metadata = element("div", "item-meta");
        metadata.append(
            element("span", "", `Time: ${(item.event_time || "Not set").toString().slice(0, 5)}`),
            element("span", "", `Location: ${item.location || "Not set"}`),
            element("span", "", `Hosted by: ${item.creator_name || "WEB-CLUB"}`)
        );
        content.appendChild(metadata);

        const actions = element("div", "item-actions");
        actions.appendChild(createIdBadge(item));
        actions.appendChild(createEditButton(item, openEditor));
        actions.appendChild(createDeleteButton("events", item, load));
        content.appendChild(actions);
        card.appendChild(content);
        card.dataset.eventDate = date;
        return card;
    }

    function buildMemberCard(item, load, openEditor) {
        const card = element("article", "collection-card member-card");
        const header = element("div", "member-header");
        const avatar = element("div", "member-avatar");
        const imageUrl = safeWebUrl(item.profile_image);
        if (imageUrl) {
            const image = element("img");
            image.src = imageUrl;
            image.alt = "";
            image.addEventListener("error", () => {
                image.remove();
                avatar.textContent = (item.name || "M").trim().charAt(0).toUpperCase();
            }, { once: true });
            avatar.appendChild(image);
        } else {
            avatar.textContent = (item.name || "M").trim().charAt(0).toUpperCase();
        }

        const memberTitle = element("div", "member-title-content");
        const joined = formattedDate(item.joined_at);
        const memberDetails = element("div", "member-details");
        const joinedDate = element("span", "member-date");
        appendIcon(joinedDate, "bx-calendar");
        joinedDate.append(joined === "Date not set" ? joined : `Joined ${joined}`);
        const position = element("span", "member-position");
        appendIcon(position, "bx-award");
        position.append(item.position || "Member");
        memberTitle.append(
            element("h2", "item-title", item.name || "WEB-CLUB member"),
            memberDetails
        );
        memberDetails.append(joinedDate, position);
        header.append(avatar, memberTitle);
        card.append(header);

        if (item.bio) {
            const bio = element("p", "item-description member-bio");
            appendIcon(bio, "bx-message-square-detail");
            bio.append(item.bio);
            card.appendChild(bio);
        }
        const skills = typeof item.skills === "string"
            ? item.skills.split(",").map(skill => skill.trim()).filter(Boolean)
            : [];
        const skillSection = element("div", "member-skills-section");
        const skillHeading = element("p", "member-section-label");
        appendIcon(skillHeading, "bx-code-alt");
        skillHeading.append("Skills");
        skillSection.appendChild(skillHeading);
        if (skills.length) {
            const skillList = element("div", "member-skills");
            skills.forEach(skill => skillList.appendChild(element("span", "skill-chip", skill)));
            skillSection.appendChild(skillList);
        } else {
            skillSection.appendChild(element("p", "member-empty-skills", "No skills listed yet."));
        }
        card.appendChild(skillSection);

        const actions = element("div", "item-actions member-actions");
        actions.appendChild(createIdBadge(item));
        const github = element("div", "member-links");
        addActionLink(github, "GitHub", item.github_url);
        addActionLink(github, "LinkedIn", item.linkedin_url);
        actions.appendChild(github);
        actions.appendChild(createEditButton(item, openEditor));
        actions.appendChild(createDeleteButton(
            "members",
            item,
            load,
            `/members/admin/${encodeURIComponent(item.id)}`,
            `Remove ${item.name || "this member"}'s member profile? Their registered account will remain active.`
        ));
        card.appendChild(actions);
        return card;
    }

    function buildProjectCard(item, load, openEditor) {
        const card = element("article", "collection-card visual-collection-card project-card");
        card.appendChild(createCardImage(item.image, item.title, "bx-code-alt", "project-image"));
        const content = element("div", "collection-card-content");
        content.appendChild(element("h2", "item-title", item.title || "Untitled project"));
        content.appendChild(element("p", "item-subtitle", `Created by ${item.creator_name || "WEB-CLUB"} · ${formattedDate(item.created_at)}`));
        content.appendChild(element("p", "item-description", item.description || "No description provided."));

        const actions = element("div", "item-actions project-actions");
        actions.appendChild(createIdBadge(item));
        const links = element("div", "project-links");
        addActionLink(links, "GitHub", item.github_url);
        addActionLink(links, "Live demo", item.demo_url);
        actions.appendChild(links);
        actions.appendChild(createEditButton(item, openEditor));
        actions.appendChild(createDeleteButton("projects", item, load));
        content.appendChild(actions);
        card.appendChild(content);
        return card;
    }

    const settings = {
        events: {
            endpoint: "/events",
            property: "events",
            loadLabel: "events",
            singularLabel: "event",
            fields: [
                { name: "title", label: "Title", required: true, maxLength: 200 },
                { name: "description", label: "Description", type: "textarea", required: true, maxLength: 10000 },
                { name: "event_date", label: "Date", type: "date", required: true },
                { name: "event_time", label: "Time", type: "time", required: true },
                { name: "location", label: "Location", required: true, maxLength: 255 },
                { name: "image", label: "Image URL or path", maxLength: 2048 }
            ],
            buildCard: buildEventCard,
            searchFields: item => [item.title, item.description, item.location, item.creator_name],
            updateSummary(items) {
                const today = localToday();
                setText("totalCount", items.length);
                setText("upcomingCount", items.filter(item => normalizeDate(item.event_date) >= today).length);
                setText("pastCount", items.filter(item => normalizeDate(item.event_date) < today).length);
            },
            filterItem(item) {
                const selected = document.getElementById("eventFilter")?.value || "all";
                const date = normalizeDate(item.event_date);
                const today = localToday();
                return selected === "all" || (selected === "upcoming" ? date >= today : date < today);
            }
        },
        members: {
            endpoint: "/members",
            property: "members",
            loadLabel: "members",
            singularLabel: "member profile",
            createEndpoint: "/members/admin",
            updateEndpoint: item => `/members/admin/${encodeURIComponent(item.id)}`,
            eligibleUsersEndpoint: "/members/admin/eligible-users",
            fields: [
                { name: "name", label: "Member name", required: true, maxLength: 100 },
                { name: "user_id", label: "Registered account", type: "account", required: true },
                { name: "position", label: "Club role / position", maxLength: 100 },
                { name: "bio", label: "Bio", type: "textarea", maxLength: 2000 },
                { name: "skills", label: "Skills (comma-separated)", maxLength: 1000 },
                { name: "github_url", label: "GitHub URL", type: "url", maxLength: 2048 },
                { name: "linkedin_url", label: "LinkedIn URL", type: "url", maxLength: 2048 },
                { name: "profile_image", label: "Profile image URL", type: "url", maxLength: 2048 }
            ],
            buildCard: buildMemberCard,
            searchFields: item => [item.name, item.bio, item.skills],
            updateSummary(items) {
                setText("totalCount", items.length);
                setText("skillsCount", items.filter(item => typeof item.skills === "string" && item.skills.trim()).length);
                const datedMembers = items.filter(item => item.joined_at);
                const newest = [...datedMembers].sort((a, b) => new Date(b.joined_at) - new Date(a.joined_at))[0];
                setText("newestMember", newest?.name || "—");
            },
            filterItem: () => true
        },
        projects: {
            endpoint: "/projects",
            property: "projects",
            loadLabel: "projects",
            singularLabel: "project",
            fields: [
                { name: "title", label: "Title", required: true, maxLength: 200 },
                { name: "description", label: "Description", type: "textarea", required: true, maxLength: 10000 },
                { name: "image", label: "Image URL or path", maxLength: 2048 },
                { name: "github_url", label: "GitHub URL", type: "url", maxLength: 2048 },
                { name: "demo_url", label: "Live demo URL", type: "url", maxLength: 2048 }
            ],
            buildCard: buildProjectCard,
            searchFields: item => [item.title, item.description, item.creator_name],
            updateSummary(items) {
                setText("totalCount", items.length);
                setText("githubCount", items.filter(item => safeWebUrl(item.github_url)).length);
                setText("demoCount", items.filter(item => safeWebUrl(item.demo_url)).length);
            },
            filterItem: () => true
        }
    };

    async function start(pageName) {
        setupShell();
        const config = settings[pageName];
        if (!config) {
            showStatus("This admin page is not configured.", "error");
            return;
        }

        const grid = document.getElementById("collectionGrid");
        const searchInput = document.getElementById("searchInput");
        const refreshButton = document.getElementById("refreshBtn");
        const addButton = document.getElementById("addItemBtn");
        let items = [];

        const dialog = element("dialog", "admin-editor-dialog");
        const form = element("form", "admin-editor-form");
        const heading = element("h2", "admin-editor-title");
        const description = element("p", "admin-editor-description");
        const fieldList = element("div", "admin-editor-fields");
        const formStatus = element("p", "admin-editor-status");
        formStatus.setAttribute("role", "status");
        const buttons = element("div", "admin-editor-actions");
        const cancelButton = element("button", "editor-cancel-button", "Cancel");
        cancelButton.type = "button";
        const submitButton = element("button", "editor-submit-button");
        appendIcon(submitButton, "bx-save");
        submitButton.append(" Save");
        submitButton.type = "submit";
        buttons.append(cancelButton, submitButton);
        form.append(heading, description, fieldList, formStatus, buttons);
        dialog.appendChild(form);
        document.body.appendChild(dialog);

        function addEditorField(field, value = "") {
            const label = element("label", "admin-editor-field");
            label.appendChild(element("span", "", field.label));

            let input;
            if (field.type === "textarea") {
                input = element("textarea");
                input.rows = 4;
            } else if (field.type === "account") {
                input = element("select");
                input.appendChild(new Option("Choose a registered account", ""));
            } else {
                input = element("input");
                input.type = field.type || "text";
            }

            input.name = field.name;
            if (field.required) input.required = true;
            if (field.maxLength) input.maxLength = field.maxLength;
            if (field.min !== undefined) input.min = String(field.min);
            if (field.step !== undefined) input.step = String(field.step);
            if (field.type !== "account") input.value = value ?? "";
            label.appendChild(input);
            if (field.hint) label.appendChild(element("small", "admin-editor-hint", field.hint));
            fieldList.appendChild(label);
            return input;
        }

        async function openEditor(item = null) {
            form.reset();
            fieldList.replaceChildren();
            formStatus.textContent = "";
            formStatus.className = "admin-editor-status";
            let canSubmit = true;
            heading.textContent = `${item ? "Edit" : "Add"} ${config.singularLabel}`;
            description.textContent = pageName === "members" && !item
                ? "Create a public profile for an existing registered account. You may set a profile ID; this does not create a user account."
                : item
                    ? "You can change this card's ID. Existing links using its old ID will need updating."
                    : "Leave the ID blank to let the database choose one, or enter a positive whole number.";

            addEditorField({
                name: "id",
                label: "Card ID",
                type: "number",
                min: 1,
                step: 1,
                required: Boolean(item),
                hint: item ? "Changing the ID updates this card's database ID." : "Optional. Leave blank for an automatic ID."
            }, item?.id);
            for (const field of config.fields) {
                if (item && field.type === "account") continue;
                if (!item && pageName === "members" && field.name === "name") continue;
                const input = addEditorField(field, item?.[field.name]);
                if (field.name === "event_date" && item?.[field.name]) {
                    input.value = normalizeDate(item[field.name]);
                }
                if (field.name === "event_time" && item?.[field.name]) {
                    input.value = String(item[field.name]).slice(0, 5);
                }
            }

            if (!item && config.eligibleUsersEndpoint) {
                const accountField = form.elements.namedItem("user_id");
                try {
                    const data = await request(config.eligibleUsersEndpoint);
                    if (!Array.isArray(data.users)) {
                        throw new Error("The server returned an invalid account list.");
                    }
                    data.users.forEach(user => {
                        accountField.appendChild(new Option(
                            `${user.name} (${user.email})`,
                            String(user.id)
                        ));
                    });
                    if (!data.users.length) {
                        formStatus.textContent = "Every registered account already has a member profile.";
                        formStatus.classList.add("error");
                        canSubmit = false;
                    }
                } catch (error) {
                    formStatus.textContent = error.message;
                    formStatus.classList.add("error");
                    canSubmit = false;
                }
            }

            submitButton.disabled = !canSubmit;
            dialog.dataset.itemId = item ? String(item.id) : "";
            dialog.showModal();
        }

        cancelButton.addEventListener("click", () => dialog.close());
        form.addEventListener("submit", async event => {
            event.preventDefault();
            formStatus.textContent = "";
            formStatus.className = "admin-editor-status";
            submitButton.disabled = true;
            const itemId = dialog.dataset.itemId;
            const payload = Object.fromEntries(new FormData(form).entries());
            if (itemId && String(payload.id) !== itemId && !window.confirm(
                `Change this card's ID from ${itemId} to ${payload.id}? Existing links with the old ID will stop working.`
            )) {
                submitButton.disabled = false;
                return;
            }
            const endpoint = itemId
                ? config.updateEndpoint
                    ? config.updateEndpoint({ id: itemId })
                    : `${config.endpoint}/${encodeURIComponent(itemId)}`
                : config.createEndpoint || config.endpoint;

            try {
                const result = await request(endpoint, {
                    method: itemId ? "PUT" : "POST",
                    body: JSON.stringify(payload)
                });
                dialog.close();
                await load();
                showStatus(result.message || `${config.singularLabel} saved successfully.`, "success");
            } catch (error) {
                console.error(`Save ${config.singularLabel} error:`, error);
                formStatus.textContent = error.message;
                formStatus.classList.add("error");
            } finally {
                submitButton.disabled = false;
            }
        });

        function render() {
            const query = (searchInput?.value || "").trim().toLowerCase();
            const filtered = items.filter(item => {
                const matchesSearch = config.searchFields(item)
                    .some(value => String(value || "").toLowerCase().includes(query));
                return matchesSearch && config.filterItem(item);
            });

            grid.replaceChildren();
            if (!filtered.length) {
                const message = items.length
                    ? "No items match your search or filter."
                    : `No ${config.loadLabel} found yet.`;
                grid.appendChild(element("div", "collection-empty", message));
                return;
            }
            filtered.forEach(item => grid.appendChild(config.buildCard(item, load, openEditor)));
        }

        async function load() {
            grid.replaceChildren(element("div", "collection-empty", `Loading ${config.loadLabel}...`));
            refreshButton.disabled = true;
            showStatus(`Loading ${config.loadLabel}...`);
            try {
                const data = await request(config.endpoint);
                if (!data || !Array.isArray(data[config.property])) {
                    throw new Error(`The server returned an invalid ${config.loadLabel} list.`);
                }
                items = data[config.property];
                config.updateSummary(items);
                render();
                showStatus(`${items.length} ${config.loadLabel} loaded.`, "success");
            } catch (error) {
                console.error(`Load ${config.loadLabel} error:`, error);
                grid.replaceChildren(element("div", "collection-empty", error.message));
                showStatus(error.message, "error");
            } finally {
                refreshButton.disabled = false;
            }
        }

        if (!await requireAdmin()) return;
        searchInput?.addEventListener("input", render);
        document.getElementById("eventFilter")?.addEventListener("change", render);
        refreshButton?.addEventListener("click", load);
        addButton?.addEventListener("click", () => openEditor());
        await load();
        if (new URLSearchParams(window.location.search).get("action") === "create") {
            window.history.replaceState({}, "", window.location.pathname);
            await openEditor();
        }
    }

    window.AdminCollection = { start };
})();
