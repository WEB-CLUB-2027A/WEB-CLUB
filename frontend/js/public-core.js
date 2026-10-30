"use strict";

(function () {
    const API_URL = "http://localhost:5000/api";

    function createElement(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) {
            node.textContent = String(text);
        }
        return node;
    }

    async function fetchList(endpoint, property) {
        const response = await fetch(`${API_URL}${endpoint}`);
        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(`The server returned an invalid response (${response.status}).`);
        }

        if (!response.ok) {
            throw new Error(data.message || `Request failed (${response.status}).`);
        }

        if (!data || !Array.isArray(data[property])) {
            throw new Error(`The server returned an invalid ${property} list.`);
        }

        return data[property];
    }

    function safeWebUrl(value) {
        if (typeof value !== "string" || !value.trim()) return null;

        try {
            const url = new URL(value, window.location.href);
            return ["http:", "https:"].includes(url.protocol) ? url.href : null;
        } catch {
            return null;
        }
    }

    function createIcon(className) {
        const icon = createElement("i", `bx ${className}`);
        icon.setAttribute("aria-hidden", "true");
        return icon;
    }

    function showCollectionState(container, className, title, message) {
        const state = createElement("div", className);
        state.append(
            createElement("h3", "", title),
            createElement("p", "", message)
        );
        container.replaceChildren(state);
    }

    window.WebClubFrontend = {
        createElement,
        createIcon,
        fetchList,
        safeWebUrl,
        showCollectionState
    };
})();
