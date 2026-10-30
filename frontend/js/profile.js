"use strict";

(() => {
    const API_URL = "http://localhost:5000/api";
    const token = localStorage.getItem("webclub_token");
    const loginPath = "../../admin/public/login.html";
    const statusElement = document.getElementById("profilePageStatus");
    const editor = document.getElementById("profileEditDialog");
    const form = document.getElementById("profileEditForm");
    const saveButton = document.getElementById("profileSaveButton");
    const formStatus = document.getElementById("profileFormStatus");
    let currentUser = null;
    let memberProfile = null;
    let hasMemberProfile = true;

    function showPageStatus(message, isError = false) {
        statusElement.textContent = message;
        statusElement.classList.toggle("is-error", isError);
    }

    function showFormStatus(message, type = "") {
        formStatus.textContent = message;
        formStatus.classList.remove("error", "success");
        if (type) formStatus.classList.add(type);
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
            const requestError = new Error(data.message || `Request failed (${response.status}).`);
            requestError.status = response.status;
            throw requestError;
        }
        return data;
    }

    function safeWebUrl(value) {
        if (typeof value !== "string" || !value.trim()) return null;
        try {
            const url = new URL(value.trim(), window.location.href);
            return ["http:", "https:"].includes(url.protocol) ? url.href : null;
        } catch (error) {
            return null;
        }
    }

    function setText(id, value, fallback = "—") {
        const element = document.getElementById(id);
        if (element) element.textContent = value === undefined || value === null || value === "" ? fallback : String(value);
    }

    function formatDate(value) {
        if (!value) return "Date not available";
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
        const date = match
            ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
            : new Date(value);
        if (Number.isNaN(date.getTime())) return "Date not available";
        return new Intl.DateTimeFormat("en", {
            year: "numeric",
            month: "short",
            day: "numeric"
        }).format(date);
    }

    function formatEventTime(value) {
        const match = /^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(String(value || ""));
        if (!match) return "Time to be announced";

        const date = new Date();
        date.setHours(Number(match[1]), Number(match[2]), 0, 0);
        return new Intl.DateTimeFormat("en", {
            hour: "numeric",
            minute: "2-digit"
        }).format(date);
    }

    function setComputerIcon(avatar) {
        const icon = document.createElement("i");
        icon.className = "bx bx-desktop";
        icon.setAttribute("aria-hidden", "true");
        avatar.replaceChildren(icon);
    }

    function renderAvatar(value) {
        const avatar = document.getElementById("publicProfileAvatar");
        const imageUrl = safeWebUrl(value);
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

    function renderCover(value) {
        const cover = document.getElementById("publicProfileCover");
        const coverUrl = safeWebUrl(value);
        const editCoverButton = document.getElementById("profileCoverEdit");
        editCoverButton.hidden = false;
        cover.classList.toggle("has-image", Boolean(coverUrl));
        if (!coverUrl) {
            cover.style.removeProperty("--public-profile-cover");
            cover.style.removeProperty("background-image");
            return;
        }
        const safeCssUrl = coverUrl.replace(/[()'"\\\n\r]/g, character => encodeURIComponent(character));
        cover.style.setProperty("--public-profile-cover", `url("${safeCssUrl}")`);
        cover.style.backgroundImage = `linear-gradient(90deg, rgba(2, 15, 33, .14), rgba(2, 15, 33, .08) 60%, rgba(2, 15, 33, .3)), url("${safeCssUrl}")`;
    }

    function renderSocials(profile) {
        const socials = document.getElementById("publicProfileSocials");
        socials.replaceChildren();
        [
            { value: profile.github_url, icon: "bxl-github", label: "GitHub" },
            { value: profile.linkedin_url, icon: "bxl-linkedin", label: "LinkedIn" }
        ].forEach(item => {
            const url = safeWebUrl(item.value);
            if (!url) return;
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.title = item.label;
            link.setAttribute("aria-label", item.label);
            const icon = document.createElement("i");
            icon.className = `bx ${item.icon}`;
            icon.setAttribute("aria-hidden", "true");
            link.appendChild(icon);
            socials.appendChild(link);
        });
    }

    function renderSkills(skillsValue) {
        const skillList = document.getElementById("profileSkillChips");
        const skills = typeof skillsValue === "string"
            ? skillsValue.split(",").map(skill => skill.trim()).filter(Boolean)
            : [];
        skillList.replaceChildren();
        skills.forEach(skill => {
            const chip = document.createElement("span");
            chip.textContent = skill;
            skillList.appendChild(chip);
        });
        setText("profileSkillCount", skills.length, "0");
        return skills;
    }

    function renderProfile() {
        const isAdmin = currentUser.role === "admin";
        const profile = memberProfile || {};
        const name = currentUser.name || currentUser.email || "WEB-CLUB Member";
        const position = isAdmin ? "WEB-CLUB Administrator" : profile.position || "WEB-CLUB Member";
        const joined = profile.joined_at || currentUser.created_at;

        setText("publicProfileName", name);
        setText("publicProfilePosition", position);
        setText("publicProfileEmail", currentUser.email);
        setText("profileContactEmail", currentUser.email);
        setText("profileContactPosition", position);
        setText("publicProfileJoined", formatDate(joined));
        document.getElementById("profileVerified").hidden = !isAdmin;
        document.getElementById("profileDashboardButton").hidden = !isAdmin;
        document.getElementById("profileEditButton").setAttribute(
            "aria-label",
            isAdmin ? "Edit administrator profile" : "Edit member profile"
        );

        renderAvatar(isAdmin ? currentUser.profile_image : profile.profile_image);
        renderCover(isAdmin ? currentUser.cover_image : profile.cover_image);
        const socialProfile = isAdmin ? currentUser : profile;
        renderSocials(socialProfile);
        renderSkills(profile.skills || "");
        setText(
            "profileAboutText",
            isAdmin
                ? "Administrator of the WEB-CLUB workspace."
                : profile.bio || "Add an introduction to tell the community about yourself.",
            ""
        );

        const githubUrl = safeWebUrl(socialProfile.github_url);
        const githubRow = document.getElementById("profileGithubRow");
        githubRow.hidden = !githubUrl;
        if (githubUrl) {
            const githubLink = document.getElementById("profileGithub");
            githubLink.href = githubUrl;
            githubLink.textContent = socialProfile.github_url;
        }
        const linkedinUrl = safeWebUrl(socialProfile.linkedin_url);
        const linkedinRow = document.getElementById("profileLinkedinRow");
        linkedinRow.hidden = !linkedinUrl;
        if (linkedinUrl) {
            const linkedinLink = document.getElementById("profileLinkedin");
            linkedinLink.href = linkedinUrl;
            linkedinLink.textContent = socialProfile.linkedin_url;
        }
    }

    function createDetail(iconName, text) {
        const detail = document.createElement("span");
        const icon = document.createElement("i");
        icon.className = `bx ${iconName}`;
        icon.setAttribute("aria-hidden", "true");
        detail.append(icon, document.createTextNode(text));
        return detail;
    }

    function createWorkCard(item, type) {
        const isEvent = type === "event";
        const card = document.createElement("article");
        card.className = "profile-work-card";
        const media = document.createElement("div");
        media.className = "profile-work-image";
        const imageUrl = safeWebUrl(item.image);
        if (imageUrl) {
            const image = document.createElement("img");
            image.src = imageUrl;
            image.alt = "";
            image.loading = "lazy";
            image.addEventListener("error", () => {
                image.remove();
                const icon = document.createElement("i");
                icon.className = `bx ${isEvent ? "bx-calendar-event" : "bx-code-alt"}`;
                icon.setAttribute("aria-hidden", "true");
                media.appendChild(icon);
            }, { once: true });
            media.appendChild(image);
        } else {
            const icon = document.createElement("i");
            icon.className = `bx ${isEvent ? "bx-calendar-event" : "bx-code-alt"}`;
            icon.setAttribute("aria-hidden", "true");
            media.appendChild(icon);
        }

        const copy = document.createElement("div");
        copy.className = "profile-work-copy";
        const title = document.createElement("h3");
        title.textContent = item.title || (isEvent ? "WEB-CLUB event" : "Untitled project");
        const description = document.createElement("p");
        description.textContent = item.description || (isEvent ? "Community event" : "Community project");
        const meta = document.createElement("div");
        meta.className = "profile-work-meta";
        if (isEvent) {
            meta.append(
                createDetail("bx-calendar", formatDate(item.event_date)),
                createDetail("bx-time-five", formatEventTime(item.event_time)),
                createDetail("bx-map-pin", item.location || "Location to be announced")
            );
        } else {
            meta.append(
                createDetail("bx-user", item.creator_name || currentUser.name || "Community member"),
                createDetail("bx-calendar", formatDate(item.created_at))
            );
        }
        copy.append(title, description, meta);
        card.append(media, copy);
        return card;
    }

    function renderWorkItems(containerId, items, type, emptyMessage) {
        const container = document.getElementById(containerId);
        container.replaceChildren();
        if (!items.length) {
            const empty = document.createElement("p");
            empty.className = "profile-empty-state";
            empty.textContent = emptyMessage;
            container.appendChild(empty);
            return;
        }
        items.slice(0, 4).forEach(item => container.appendChild(createWorkCard(item, type)));
    }

    function renderCommunityMembers(members, error) {
        const container = document.getElementById("profileMembers");
        container.replaceChildren();
        if (error) {
            const empty = document.createElement("p");
            empty.className = "profile-empty-state";
            empty.textContent = "Community members could not be loaded.";
            container.appendChild(empty);
            return;
        }

        if (!members.length) {
            const empty = document.createElement("p");
            empty.className = "profile-empty-state";
            empty.textContent = "No public member profiles have been added yet.";
            container.appendChild(empty);
            return;
        }

        members.slice(0, 4).forEach(member => {
            const card = document.createElement("article");
            card.className = "profile-member-preview";
            const imageUrl = safeWebUrl(member.profile_image);
            const avatar = document.createElement("div");
            avatar.className = "profile-member-preview-avatar";
            const initial = (member.name || "M").trim().charAt(0).toUpperCase() || "M";
            if (imageUrl) {
                const image = document.createElement("img");
                image.src = imageUrl;
                image.alt = "";
                image.loading = "lazy";
                image.decoding = "async";
                image.addEventListener("error", () => {
                    image.remove();
                    avatar.textContent = initial;
                }, { once: true });
                avatar.appendChild(image);
            } else {
                avatar.textContent = initial;
            }

            const content = document.createElement("div");
            content.className = "profile-member-preview-copy";
            const name = document.createElement("h3");
            name.textContent = member.name || "WEB-CLUB Member";
            const position = document.createElement("p");
            position.textContent = member.position || "Member";
            const bio = document.createElement("p");
            bio.textContent = member.bio || "WEB-CLUB community member.";
            const skills = document.createElement("div");
            skills.className = "profile-skill-chips";
            String(member.skills || "")
                .split(",")
                .map(skill => skill.trim())
                .filter(Boolean)
                .slice(0, 4)
                .forEach(skill => {
                    const chip = document.createElement("span");
                    chip.textContent = skill;
                    skills.appendChild(chip);
                });
            content.append(name, position, bio, skills);
            card.append(avatar, content);
            container.appendChild(card);
        });
    }

    function renderActivity(projects, events) {
        const container = document.getElementById("profileActivity");
        const activities = [
            ...projects.map(item => ({ type: "project", item, date: new Date(item.created_at) })),
            ...events.map(item => ({ type: "event", item, date: new Date(item.created_at || item.event_date) }))
        ].filter(activity => !Number.isNaN(activity.date.getTime()))
            .sort((first, second) => second.date - first.date)
            .slice(0, 5);

        container.replaceChildren();
        if (!activities.length) {
            const empty = document.createElement("p");
            empty.className = "profile-empty-state";
            empty.textContent = "Your project and event activity will appear here.";
            container.appendChild(empty);
            return;
        }

        activities.forEach(activity => {
            const isProject = activity.type === "project";
            const row = document.createElement("div");
            row.className = "profile-activity-item";
            const icon = document.createElement("span");
            icon.className = "profile-activity-icon";
            const iconElement = document.createElement("i");
            iconElement.className = `bx ${isProject ? "bx-code-alt" : "bx-calendar-event"}`;
            iconElement.setAttribute("aria-hidden", "true");
            icon.appendChild(iconElement);
            const copy = document.createElement("span");
            copy.className = "profile-activity-copy";
            const title = document.createElement("strong");
            title.textContent = `${isProject ? "Community project" : "Community event"}: ${activity.item.title || "Untitled"}`;
            const date = document.createElement("small");
            date.textContent = formatDate(activity.date);
            copy.append(title, date);
            row.append(icon, copy);
            container.appendChild(row);
        });
    }

    async function loadWorkItems() {
        const [projectResult, eventResult, memberResult] = await Promise.allSettled([
            apiRequest("/projects"),
            apiRequest("/events"),
            apiRequest("/members")
        ]);

        const projectError = projectResult.status === "rejected"
            ? projectResult.reason
            : Array.isArray(projectResult.value.projects)
                ? null
                : new Error("The server returned an invalid project list.");
        const eventError = eventResult.status === "rejected"
            ? eventResult.reason
            : Array.isArray(eventResult.value.events)
                ? null
                : new Error("The server returned an invalid event list.");
        const memberError = memberResult.status === "rejected"
            ? memberResult.reason
            : Array.isArray(memberResult.value.members)
            ? null
            : new Error("The server returned an invalid member list.");
        const projects = projectError ? [] : projectResult.value.projects;
        const events = eventError ? [] : eventResult.value.events;
        const members = memberError ? [] : memberResult.value.members;
        setText("profileMemberCount", memberError ? "—" : members.length, "0");
        setText("profileProjectCount", projectError ? "—" : projects.length, "0");
        setText("profileEventCount", eventError ? "—" : events.length, "0");
        renderWorkItems(
            "profileProjects",
            projects,
            "project",
            projectError
                ? "Community projects could not be loaded."
                : "No community projects have been shared yet."
        );
        renderWorkItems(
            "profileEvents",
            events,
            "event",
            eventError
                ? "Community events could not be loaded."
                : "No community events have been announced yet."
        );
        renderCommunityMembers(members, memberError);
        renderActivity(projects, events);

        if (projectError) {
            console.error("Load profile projects error:", projectError);
        }
        if (eventError) {
            console.error("Load profile events error:", eventError);
        }
        if (memberError) {
            console.error("Load community members error:", memberError);
        }
    }

    function openEditor(focusElement) {
        if (!currentUser) return;
        const isAdmin = currentUser.role === "admin";
        const memberFields = document.getElementById("memberProfileFields");
        const adminFields = document.getElementById("adminProfileFields");
        memberFields.hidden = isAdmin;
        adminFields.hidden = !isAdmin;
        memberFields.querySelectorAll("input, textarea, select, button").forEach(control => {
            control.disabled = isAdmin;
        });
        adminFields.querySelectorAll("input, textarea, select, button").forEach(control => {
            control.disabled = !isAdmin;
        });
        showFormStatus("");

        if (isAdmin) {
            document.getElementById("adminProfileName").value = currentUser.name || "";
            document.getElementById("adminProfileImage").value = currentUser.profile_image || "";
            document.getElementById("adminCoverImage").value = currentUser.cover_image || "";
            document.getElementById("adminGithub").value = currentUser.github_url || "";
            document.getElementById("adminLinkedin").value = currentUser.linkedin_url || "";
        } else {
            const profile = memberProfile || {};
            document.getElementById("memberBio").value = profile.bio || "";
            document.getElementById("memberSkills").value = profile.skills || "";
            document.getElementById("memberProfileImage").value = profile.profile_image || "";
            document.getElementById("memberCoverImage").value = profile.cover_image || "";
            document.getElementById("memberGithub").value = profile.github_url || "";
            document.getElementById("memberLinkedin").value = profile.linkedin_url || "";
        }

        editor.showModal();
        (focusElement || (isAdmin
            ? document.getElementById("adminProfileName")
            : document.getElementById("memberBio"))).focus();
    }

    async function saveProfile(event) {
        event.preventDefault();
        if (!currentUser) return;
        showFormStatus("");
        saveButton.disabled = true;

        try {
            if (currentUser.role === "admin") {
                const result = await apiRequest("/users/profile", {
                    method: "PATCH",
                    body: JSON.stringify({
                        name: document.getElementById("adminProfileName").value.trim(),
                        profile_image: document.getElementById("adminProfileImage").value.trim(),
                        cover_image: document.getElementById("adminCoverImage").value.trim(),
                        github_url: document.getElementById("adminGithub").value.trim(),
                        linkedin_url: document.getElementById("adminLinkedin").value.trim()
                    })
                });
                currentUser = result.user;
                try {
                    const savedUser = JSON.parse(localStorage.getItem("webclub_user") || "{}");
                    localStorage.setItem("webclub_user", JSON.stringify({
                        ...savedUser,
                        name: currentUser.name,
                        profile_image: currentUser.profile_image,
                        cover_image: currentUser.cover_image,
                        github_url: currentUser.github_url,
                        linkedin_url: currentUser.linkedin_url
                    }));
                } catch (error) {
                    console.error("Saved account details could not be refreshed:", error);
                }
            } else {
                const profileValues = {
                    bio: document.getElementById("memberBio").value.trim(),
                    skills: document.getElementById("memberSkills").value.trim(),
                    profile_image: document.getElementById("memberProfileImage").value.trim(),
                    cover_image: document.getElementById("memberCoverImage").value.trim(),
                    github_url: document.getElementById("memberGithub").value.trim(),
                    linkedin_url: document.getElementById("memberLinkedin").value.trim()
                };
                if (hasMemberProfile) {
                    await apiRequest("/members/me", {
                        method: "PUT",
                        body: JSON.stringify(profileValues)
                    });
                } else {
                    await apiRequest("/members", {
                        method: "POST",
                        body: JSON.stringify(profileValues)
                    });
                    hasMemberProfile = true;
                }
                memberProfile = {
                    ...memberProfile,
                    ...profileValues,
                    position: memberProfile?.position || "WEB-CLUB Member",
                    joined_at: memberProfile?.joined_at || currentUser.created_at
                };
            }

            renderProfile();
            showFormStatus("Your profile has been saved.", "success");
            showPageStatus("Profile updated.");
            window.setTimeout(() => editor.close(), 650);
        } catch (error) {
            console.error("Save profile error:", error);
            showFormStatus(error.message, "error");
        } finally {
            saveButton.disabled = false;
        }
    }

    async function loadProfile() {
        if (!token) {
            window.location.assign(loginPath);
            return;
        }

        try {
            const result = await apiRequest("/users/profile");
            if (!result.user) throw new Error("The server did not return your profile.");
            currentUser = result.user;

            if (currentUser.role !== "admin") {
                try {
                    const memberResult = await apiRequest("/members/me");
                    if (!memberResult.member) {
                        throw new Error("The server did not return your member profile.");
                    }
                    memberProfile = memberResult.member;
                } catch (error) {
                    if (error.status !== 404) throw error;
                    hasMemberProfile = false;
                    memberProfile = null;
                    showPageStatus("Complete your public member profile to introduce yourself to the community.");
                }
            }

            renderProfile();
            await loadWorkItems();
            if (!statusElement.textContent.includes("Complete your public member profile")) {
                showPageStatus("");
            }
        } catch (error) {
            console.error("Load profile error:", error);
            showPageStatus(error.message, true);
        }
    }

    document.getElementById("profileEditButton").addEventListener("click", () => openEditor());
    document.querySelectorAll("[data-open-profile-editor]").forEach(button => {
        button.addEventListener("click", () => openEditor());
    });
    document.getElementById("profileAvatarEdit").addEventListener("click", () => openEditor(
        currentUser?.role === "admin"
            ? document.getElementById("adminProfileImage")
            : document.getElementById("memberProfileImage")
    ));
    document.getElementById("profileCoverEdit").addEventListener("click", () => openEditor(
        currentUser?.role === "admin"
            ? document.getElementById("adminCoverImage")
            : document.getElementById("memberCoverImage")
    ));
    document.getElementById("profileDialogClose").addEventListener("click", () => editor.close());
    document.getElementById("profileDialogCancel").addEventListener("click", () => editor.close());
    document.getElementById("profileLogoutButton").addEventListener("click", () => {
        localStorage.removeItem("webclub_token");
        localStorage.removeItem("webclub_user");
        window.location.assign("../index.html");
    });
    form.addEventListener("submit", saveProfile);
    editor.addEventListener("click", event => {
        if (event.target === editor) editor.close();
    });

    loadProfile();
})();
