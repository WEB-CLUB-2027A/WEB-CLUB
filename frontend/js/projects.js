"use strict";

const projectsGrid = document.getElementById("projectsGrid");
const { createElement, createIcon, fetchList, safeWebUrl, showCollectionState } =
    window.WebClubFrontend;

function addProjectLink(container, label, value, className, iconClass) {
    const url = safeWebUrl(value);
    if (!url) return;

    const link = createElement("a", className);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const icon = createIcon(iconClass);
    link.append(icon, document.createTextNode(label));
    container.appendChild(link);
}

function createProjectCard(project) {
    const card = createElement("article", "project-card");
    const imageUrl = safeWebUrl(project.image);

    if (imageUrl) {
        const image = createElement("img", "project-image");
        image.src = imageUrl;
        image.alt = project.title ? `${project.title} preview` : "Project preview";
        image.loading = "lazy";
        image.addEventListener("error", () => image.remove(), { once: true });
        card.appendChild(image);
    } else {
        const placeholder = createElement("div", "project-image-placeholder");
        placeholder.appendChild(createIcon("bx-code-alt"));
        placeholder.setAttribute("aria-hidden", "true");
        card.appendChild(placeholder);
    }

    const content = createElement("div", "project-content");
    content.appendChild(createElement("h2", "", project.title || "Untitled project"));
    content.appendChild(createElement(
        "p",
        "project-description",
        project.description || "No project description provided."
    ));

    if (project.creator_name) {
        const creator = createElement("p", "project-creator");
        creator.append(
            document.createTextNode("Created by "),
            createElement("strong", "", project.creator_name)
        );
        content.appendChild(creator);
    }

    const links = createElement("div", "project-links");
    addProjectLink(links, "GitHub", project.github_url, "github-link", "bxl-github");
    addProjectLink(links, "Live demo", project.demo_url, "demo-link", "bx-link-external");
    if (links.childElementCount) content.appendChild(links);

    card.appendChild(content);
    return card;
}

async function loadProjects() {
    projectsGrid.setAttribute("aria-busy", "true");

    try {
        const projects = await fetchList("/projects", "projects");
        if (!projects.length) {
            showCollectionState(
                projectsGrid,
                "no-projects",
                "No projects yet",
                "Check back soon to see what WEB-CLUB members create."
            );
            return;
        }

        projectsGrid.replaceChildren(...projects.map(createProjectCard));
    } catch (error) {
        console.error("Projects loading error:", error);
        showCollectionState(
            projectsGrid,
            "error-message",
            "Projects are unavailable right now",
            error.message
        );
    } finally {
        projectsGrid.setAttribute("aria-busy", "false");
    }
}

loadProjects();
