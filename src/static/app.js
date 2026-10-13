document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error(`Could not refresh activities (HTTP ${response.status}).`);
      }

      const activities = await response.json();
      const activityEntries =
        activities && typeof activities === "object" && !Array.isArray(activities)
          ? Object.entries(activities)
          : null;
      if (
        !activityEntries ||
        !activityEntries.every(
          ([, details]) =>
            details &&
            typeof details.description === "string" &&
            typeof details.schedule === "string" &&
            Number.isFinite(details.max_participants) &&
            Array.isArray(details.participants) &&
            details.participants.every((email) => typeof email === "string")
        )
      ) {
        throw new Error("Could not refresh activities because the server returned invalid data.");
      }

      const selectedActivity = activitySelect.value;
      const activityCards = document.createDocumentFragment();
      const activityOptions = document.createDocumentFragment();
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = "-- Select an activity --";
      activityOptions.appendChild(placeholderOption);

      // Populate activities list
      activityEntries.forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants">
            <strong>Participants (${details.participants.length}):</strong>
            <ul class="participant-list"></ul>
          </div>
        `;

        const participantList = activityCard.querySelector(".participant-list");
        if (details.participants.length === 0) {
          const emptyMessage = document.createElement("li");
          emptyMessage.textContent = "No participants yet.";
          emptyMessage.className = "participant-empty";
          participantList.appendChild(emptyMessage);
        } else {
          details.participants.forEach((email) => {
            const participant = document.createElement("li");
            participant.className = "participant-row";

            const participantEmail = document.createElement("span");
            participantEmail.textContent = email;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "participant-remove";
            removeButton.textContent = "×";
            removeButton.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            removeButton.title = `Unregister ${email}`;
            removeButton.addEventListener("click", async () => {
              try {
                const response = await fetch(
                  `/activities/${encodeURIComponent(name)}/signup?email=${encodeURIComponent(email)}`,
                  { method: "DELETE" }
                );
                const result = await response.json();
                if (!response.ok) {
                  throw new Error(result.detail || "Could not unregister participant");
                }
                messageDiv.textContent = "";
                messageDiv.className = "hidden";
                await fetchActivities();
              } catch (error) {
                messageDiv.textContent = error.message || "Could not unregister participant";
                messageDiv.className = "error";
                messageDiv.classList.remove("hidden");
              }
            });

            participant.append(participantEmail, removeButton);
            participantList.appendChild(participant);
          });
        }

        activityCards.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activityOptions.appendChild(option);
      });

      activitiesList.replaceChildren(activityCards);
      activitySelect.replaceChildren(activityOptions);
      if (Object.prototype.hasOwnProperty.call(activities, selectedActivity)) {
        activitySelect.value = selectedActivity;
      }
    } catch (error) {
      messageDiv.textContent =
        error.message || "Could not refresh activities. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
