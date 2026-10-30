"use strict";

const eventsGrid = document.getElementById("eventsGrid");
const { createElement, createIcon, fetchList, safeWebUrl, showCollectionState } =
    window.WebClubFrontend;

function formatEventDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    if (!match) return "Date to be announced";

    const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
    );
    if (Number.isNaN(date.getTime())) return "Date to be announced";

    return new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric"
    }).format(date);
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

function addEventInfo(container, iconName, value) {
    const row = createElement("div", "event-info-item");
    const icon = createElement("span", "event-info-icon");
    icon.appendChild(createIcon(iconName));
    icon.setAttribute("aria-hidden", "true");
    row.append(icon, createElement("span", "", value));
    container.appendChild(row);
}

function createEventCard(event) {
    const card = createElement("article", "event-card");
    card.setAttribute("aria-label", event.title || "WEB-CLUB event");

    const imageUrl = safeWebUrl(event.image);
    if (imageUrl) {
        const image = createElement("img", "event-image");
        image.src = imageUrl;
        image.alt = event.title ? `${event.title} event` : "WEB-CLUB event";
        image.loading = "lazy";
        image.addEventListener("error", () => image.remove(), { once: true });
        card.appendChild(image);
    } else {
        const placeholder = createElement("div", "event-image-placeholder");
        placeholder.appendChild(createIcon("bx-calendar-event"));
        placeholder.setAttribute("aria-hidden", "true");
        card.appendChild(placeholder);
    }

    const content = createElement("div", "event-content");
    content.append(
        createElement("h2", "", event.title || "Untitled event"),
        createElement("p", "", event.description || "More details coming soon.")
    );

    const details = createElement("div", "event-info");
    addEventInfo(details, "bx-calendar", formatEventDate(event.event_date));
    addEventInfo(details, "bx-time-five", formatEventTime(event.event_time));
    addEventInfo(details, "bx-map-pin", event.location || "Location to be announced");
    content.appendChild(details);

    if (event.creator_name) {
        const creator = createElement("p", "event-creator");
        creator.append(
            document.createTextNode("Organized by "),
            createElement("strong", "", event.creator_name)
        );
        content.appendChild(creator);
    }

    card.appendChild(content);
    return card;
}

async function loadEvents() {
    eventsGrid.setAttribute("aria-busy", "true");

    try {
        const events = await fetchList("/events", "events");
        if (!events.length) {
            showCollectionState(
                eventsGrid,
                "no-events",
                "No events yet",
                "Check back soon for upcoming WEB-CLUB events."
            );
            return;
        }

        eventsGrid.replaceChildren(...events.map(createEventCard));
    } catch (error) {
        console.error("Events loading error:", error);
        showCollectionState(
            eventsGrid,
            "error-message",
            "Events are unavailable right now",
            error.message
        );
    } finally {
        eventsGrid.setAttribute("aria-busy", "false");
    }
}

loadEvents();
