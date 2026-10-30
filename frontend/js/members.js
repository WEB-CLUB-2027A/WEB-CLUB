"use strict";

const membersGrid = document.getElementById("membersGrid");
const { createElement, createIcon, fetchList, safeWebUrl, showCollectionState } =
    window.WebClubFrontend;

function createMemberLink(label, value, className, iconClass) {
    const url = safeWebUrl(value);
    if (!url) return null;

    const link = createElement("a", className);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.append(createIcon(iconClass), document.createTextNode(label));
    return link;
}

function createSkillTag(skill) {
    const skillStyles = {
        html: { icon: "bxl-html5", className: "skill-html" },
        css: { icon: "bxl-css3", className: "skill-css" },
        javascript: { icon: "bxl-javascript", className: "skill-javascript" },
        git: { icon: "bxl-git", className: "skill-git" }
    };
    const style = skillStyles[skill.trim().toLowerCase()]
        || { icon: "bx-chip", className: "skill-default" };
    const tag = createElement("span", `skill-tag ${style.className}`);
    tag.append(createIcon(style.icon), document.createTextNode(skill));
    return tag;
}

function createMemberCard(member) {
    const card = createElement("article", "member-card");
    const imageUrl = safeWebUrl(member.profile_image);

    if (imageUrl) {
        const image = createElement("img", "member-image");
        image.src = imageUrl;
        image.alt = member.name ? `${member.name} profile` : "Member profile";
        image.loading = "lazy";
        image.addEventListener("error", () => {
            image.replaceWith(createElement(
                "div",
                "member-avatar",
                (member.name || "?").trim().charAt(0).toUpperCase()
            ));
        }, { once: true });
        card.appendChild(image);
    } else {
        card.appendChild(createElement(
            "div",
            "member-avatar",
            (member.name || "?").trim().charAt(0).toUpperCase()
        ));
    }

    card.appendChild(createElement("h2", "", member.name || "WEB-CLUB member"));
    card.appendChild(createElement(
        "span",
        "member-role",
        member.position || "Member"
    ));

    if (member.bio) {
        card.appendChild(createElement("p", "member-bio", member.bio));
    }

    const skills = typeof member.skills === "string"
        ? member.skills.split(",").map(skill => skill.trim()).filter(Boolean)
        : [];
    if (skills.length) {
        const skillList = createElement("div", "member-skills");
        skills.forEach(skill => {
            skillList.appendChild(createSkillTag(skill));
        });
        card.appendChild(skillList);
    }

    const links = createElement("div", "member-links");
    const github = createMemberLink("GitHub", member.github_url, "github-link", "bxl-github");
    const linkedin = createMemberLink("LinkedIn", member.linkedin_url, "linkedin-link", "bxl-linkedin");
    if (github) links.appendChild(github);
    if (linkedin) links.appendChild(linkedin);
    if (links.childElementCount) card.appendChild(links);

    return card;
}

async function loadMembers() {
    membersGrid.setAttribute("aria-busy", "true");

    try {
        const members = await fetchList("/members", "members");
        if (!members.length) {
            showCollectionState(
                membersGrid,
                "no-members",
                "No members yet",
                "Check back soon to meet the WEB-CLUB community."
            );
            return;
        }

        membersGrid.replaceChildren(...members.map(createMemberCard));
    } catch (error) {
        console.error("Members loading error:", error);
        showCollectionState(
            membersGrid,
            "error-message",
            "Members are unavailable right now",
            error.message
        );
    } finally {
        membersGrid.setAttribute("aria-busy", "false");
    }
}

loadMembers();
