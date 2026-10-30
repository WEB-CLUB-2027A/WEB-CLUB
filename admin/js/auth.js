"use strict";

const API_URL = "http://localhost:5000/api";

function showFormMessage(element, text, type) {
    element.className = `form-message${type ? ` ${type}` : ""}`;
    element.textContent = text;
}

async function submitAuthRequest(endpoint, payload) {
    const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
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

    return data;
}

document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        if (!input) return;

        const isVisible = input.type === "text";
        input.type = isVisible ? "password" : "text";
        button.setAttribute("aria-pressed", String(!isVisible));
        button.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
        button.querySelector(".bx").className = `bx ${isVisible ? "bx-show" : "bx-hide"}`;
        input.focus();
    });
});

const rememberEmail = document.getElementById("rememberEmail");
const loginEmail = document.getElementById("email");
if (rememberEmail && loginEmail) {
    loginEmail.value = localStorage.getItem("webclub_remembered_email") || "";
    rememberEmail.checked = Boolean(loginEmail.value);
    rememberEmail.addEventListener("change", () => {
        if (!rememberEmail.checked) {
            localStorage.removeItem("webclub_remembered_email");
        }
    });
}

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    const message = document.getElementById("registerMessage");
    const submitButton = registerForm.querySelector('[type="submit"]');

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showFormMessage(message, "Creating your account…", "");

        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        if (password !== confirmPassword) {
            showFormMessage(message, "Your passwords do not match.", "error");
            document.getElementById("confirmPassword").focus();
            return;
        }

        const payload = {
            name: document.getElementById("name").value.trim(),
            email: document.getElementById("email").value.trim(),
            password
        };

        submitButton.disabled = true;
        try {
            await submitAuthRequest("register", payload);
            showFormMessage(message, "Account created. Redirecting to login…", "success");
            registerForm.reset();
            window.setTimeout(() => {
                window.location.assign("login.html");
            }, 900);
        } catch (error) {
            console.error("Registration error:", error);
            showFormMessage(message, error.message, "error");
        } finally {
            submitButton.disabled = false;
        }
    });
}

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    const message = document.getElementById("loginMessage");
    const submitButton = loginForm.querySelector('[type="submit"]');

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showFormMessage(message, "Signing you in…", "");

        const payload = {
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
        };

        submitButton.disabled = true;
        try {
            const data = await submitAuthRequest("login", payload);

            localStorage.setItem("webclub_token", data.token);
            localStorage.setItem("webclub_user", JSON.stringify(data.user));
            if (rememberEmail && rememberEmail.checked) {
                localStorage.setItem("webclub_remembered_email", payload.email);
            } else {
                localStorage.removeItem("webclub_remembered_email");
            }

            showFormMessage(message, "Login successful. Redirecting…", "success");
            window.setTimeout(() => {
                const destination = data.user.role === "admin"
                    ? "../index.html"
                    : "../../frontend/index.html";

                window.location.assign(destination);
            }, 500);
        } catch (error) {
            console.error("Login error:", error);
            showFormMessage(message, error.message, "error");
        } finally {
            submitButton.disabled = false;
        }
    });
}
