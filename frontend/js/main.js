"use strict";

const menuToggle = document.querySelector(".nav-toggle");
const navMenu = document.querySelector(".nav-menu");
const communityMenu = document.querySelector(".community-menu");
const communityToggle = document.querySelector(".community-toggle");
const communityDropdown = document.querySelector(".community-dropdown");
const themeChoices = document.querySelectorAll("[data-theme-choice]");

(() => {
    const navActions = document.querySelector(".nav-actions");
    const navTools = document.querySelector(".nav-tools");
    if (!navTools) return;

    const token = localStorage.getItem("webclub_token");
    if (!token) {
        const navMenu = document.querySelector(".nav-menu");
        const responsiveNav = window.matchMedia("(max-width: 1350px)");
        const placeGuestActions = () => {
            const destination = responsiveNav.matches ? navMenu : navTools;
            if (navActions && destination && navActions.parentElement !== destination) {
                destination.appendChild(navActions);
            }
        };

        placeGuestActions();
        responsiveNav.addEventListener("change", placeGuestActions);
        return;
    }

    let user = {};
    try {
        user = JSON.parse(localStorage.getItem("webclub_user") || "{}");
    } catch (error) {
        console.error("Saved WEB-CLUB account could not be read:", error);
    }

    const logo = document.querySelector(".logo");
    const isNestedPage = logo && logo.getAttribute("href").startsWith("../");
    const profilePath = isNestedPage ? "profile.html" : "pages/profile.html";
    const profileLink = document.createElement("a");
    profileLink.className = "btn btn-outline nav-profile-link";
    profileLink.href = profilePath;
    profileLink.setAttribute("aria-label", "My Account");
    const profileIcon = document.createElement("i");
    profileIcon.className = "bx bx-user-circle nav-profile-fallback";
    profileIcon.setAttribute("aria-hidden", "true");
    profileLink.append(profileIcon);
    const profileLabel = document.createElement("span");
    profileLabel.textContent = "My Account";
    profileLink.append(profileLabel);

    navActions?.replaceChildren();
    navTools.appendChild(profileLink);
    if (navActions) navActions.dataset.role = user.role === "admin" ? "admin" : "member";
    let profileImageGeneration = 0;

    function safeProfileImage(value) {
        if (typeof value !== "string" || !value.trim()) return null;
        try {
            const url = new URL(value.trim(), window.location.href);
            return ["http:", "https:"].includes(url.protocol) ? url.href : null;
        } catch (error) {
            console.error("Saved account profile image URL is invalid:", error);
            return null;
        }
    }

    function showProfileImage(value) {
        const imageUrl = safeProfileImage(value);
        const generation = ++profileImageGeneration;
        if (!imageUrl) {
            profileLink.querySelector(".nav-profile-avatar")?.replaceWith(profileIcon);
            return;
        }

        const image = document.createElement("img");
        image.className = "nav-profile-avatar";
        image.alt = "";
        image.addEventListener("load", () => {
            if (generation === profileImageGeneration) {
                profileLink.querySelector(".nav-profile-avatar, .nav-profile-fallback")?.replaceWith(image);
            }
        }, { once: true });
        image.addEventListener("error", () => {
            console.error("Navbar account profile image could not be loaded.");
        }, { once: true });
        image.src = imageUrl;
        if (image.complete && image.naturalWidth > 0 && generation === profileImageGeneration) {
            profileLink.querySelector(".nav-profile-avatar, .nav-profile-fallback")?.replaceWith(image);
        }
    }

    showProfileImage(user.profile_image);

    async function loadProfileImage() {
        const endpoint = user.role === "admin" ? "/users/profile" : "/members/me";
        try {
            const response = await fetch(`http://localhost:5000/api${endpoint}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.status === 404 && user.role !== "admin") return;
            if (!response.ok) {
                throw new Error(`Profile request failed (${response.status}).`);
            }

            const data = await response.json();
            const profile = user.role === "admin" ? data.user : data.member;
            if (!profile) throw new Error("The server did not return the account profile.");

            showProfileImage(profile.profile_image);
            try {
                localStorage.setItem("webclub_user", JSON.stringify({
                    ...user,
                    name: profile.name || user.name,
                    profile_image: profile.profile_image || ""
                }));
            } catch (error) {
                console.error("Account profile image could not be cached:", error);
            }
        } catch (error) {
            console.error("Load navbar account profile image error:", error);
        }
    }

    loadProfileImage();
})();

if (menuToggle && navMenu) {
    menuToggle.addEventListener("click", () => {
        const isOpen = navMenu.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute(
            "aria-label",
            isOpen ? "Close navigation menu" : "Open navigation menu"
        );
    });

    navMenu.addEventListener("click", event => {
        if (event.target.closest("a")) {
            navMenu.classList.remove("is-open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Open navigation menu");
        }
    });
}

if (communityMenu && communityToggle && communityDropdown) {
    const setCommunityOpen = isOpen => {
        communityMenu.classList.toggle("is-open", isOpen);
        communityToggle.setAttribute("aria-expanded", String(isOpen));
        communityDropdown.hidden = !isOpen;
    };

    communityToggle.addEventListener("click", () => {
        setCommunityOpen(communityDropdown.hidden);
    });

    document.addEventListener("pointerdown", event => {
        if (!communityMenu.contains(event.target)) {
            setCommunityOpen(false);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") {
            return;
        }

        if (!communityDropdown.hidden) {
            setCommunityOpen(false);
            communityToggle.focus();
            return;
        }

        if (menuToggle && navMenu?.classList.contains("is-open")) {
            navMenu.classList.remove("is-open");
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Open navigation menu");
            menuToggle.focus();
        }
    });
}

if (themeChoices.length) {
    const savedTheme = window.localStorage.getItem("webClubTheme")
        || window.localStorage.getItem("webClubNavbarStyle")
        || "light";

    const setTheme = theme => {
        const isLight = theme === "light";
        document.body.dataset.theme = isLight ? "light" : "dark";

        themeChoices.forEach(choice => {
            const isActive = choice.dataset.themeChoice === theme;
            choice.classList.toggle("is-active", isActive);
            choice.setAttribute("aria-pressed", String(isActive));
        });
    };

    setTheme(savedTheme === "dark" ? "dark" : "light");

    themeChoices.forEach(choice => {
        choice.addEventListener("click", () => {
            const theme = choice.dataset.themeChoice;
            setTheme(theme);
            window.localStorage.setItem("webClubTheme", theme);
        });
    });
}