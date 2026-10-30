"use strict";

(() => {
    const messageBadge = document.getElementById("messageCountBadge");
    const token = localStorage.getItem("webclub_token");
    if (!messageBadge || !token) return;

    async function loadUnreadMessageCount() {
        try {
            const response = await fetch("http://localhost:5000/api/messages", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            let data;
            try {
                data = await response.json();
            } catch (error) {
                throw new Error(`The server returned an invalid response (${response.status}).`);
            }

            if (!response.ok) {
                throw new Error(data.message || `Request failed (${response.status}).`);
            }
            if (!data || !Array.isArray(data.messages)) {
                throw new Error("The server returned an invalid messages list.");
            }

            const unreadCount = data.messages.filter(
                message => (message.status || "unread") === "unread"
            ).length;
            messageBadge.textContent = unreadCount > 99 ? "99+" : String(unreadCount);
            messageBadge.hidden = unreadCount === 0;
        } catch (error) {
            console.error("Load admin message badge error:", error);
        }
    }

    loadUnreadMessageCount();
})();
