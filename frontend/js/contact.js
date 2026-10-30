const API_URL = "http://localhost:5000/api";

const contactForm =
    document.getElementById("contactForm");

const contactMessage =
    document.getElementById("contactMessage");

const submitButton = contactForm.querySelector('button[type="submit"]');

contactForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        const name =
            document.getElementById("name")
                .value.trim();

        const email =
            document.getElementById("email")
                .value.trim();

        const subject =
            document.getElementById("subject")
                .value.trim();

        const message =
            document.getElementById("message")
                .value.trim();


        contactMessage.className =
            "form-message";

        contactMessage.textContent =
            "Sending message...";
        submitButton.disabled = true;

        try {

            const response = await fetch(
                `${API_URL}/messages`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        email,
                        subject,
                        message
                    })
                }
            );


            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error(`The server returned an invalid response (${response.status}).`);
            }


            if (!response.ok) {

                contactMessage.className =
                    "form-message error";

                contactMessage.textContent =
                    data.message ||
                    "Failed to send message.";

                return;
            }


            contactMessage.className =
                "form-message success";

            contactMessage.textContent = data.message || "Message sent successfully!";


            contactForm.reset();


        } catch (error) {

            console.error(
                "Contact form error:",
                error
            );

            contactMessage.className =
                "form-message error";

            contactMessage.textContent =
                error.message || "Cannot connect to the server.";
        } finally {
            submitButton.disabled = false;
        }
    }
);