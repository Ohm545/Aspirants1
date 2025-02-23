const cardContainer = document.getElementById("card-container");

// Fetch Data from Backend API
async function fetchData() {
  try {
    const response = await fetch("http://localhost:5000/api/livequeue");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch data");
    }

    console.log("Fetched Tokens:", result.data);
    renderCards(result.data);
  } catch (error) {
    console.error("Error fetching data:", error);
    alert("Failed to fetch data. Please try again.");
  }
}

// Function to Create a Card
function createCard(content) {
  const card = document.createElement("div");
  card.className = "col-md-4 mb-4";

  const cardBody = document.createElement("div");
  cardBody.className = "card cardCustom";

  const cardContent = document.createElement("div");
  cardContent.className = "card-body d-flex justify-content-between align-items-center";
  cardContent.innerHTML = `<div>${content}</div>`;

  const swapButton = document.createElement("button");
  swapButton.className = "btn btn-primary";
  swapButton.textContent = "Swap";

  swapButton.addEventListener("click", () => showSwapModal(content));

  cardContent.appendChild(swapButton);
  cardBody.appendChild(cardContent);
  card.appendChild(cardBody);

  return card;
}

// Function to Render Cards
function renderCards(tokens) {
  cardContainer.innerHTML = ""; // Clear previous cards
  tokens.forEach((token) => {
    const card = createCard(token);
    cardContainer.appendChild(card);
  });
}

// Function to Show the Swap Modal
function showSwapModal(token) {
  const modal = document.createElement("div");
  modal.className = "modal fade";
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Reason for Swap</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <label for="reason-textarea">Enter Your Reason:</label>
          <textarea id="reason-textarea" class="form-control" placeholder="Enter your reason"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
          <button type="button" class="btn btn-primary" id="submit-reason">Submit</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  $(modal).modal("show");

  const submitButton = modal.querySelector("#submit-reason");
  submitButton.addEventListener("click", () => {
    const reason = modal.querySelector("#reason-textarea").value;
    if (!reason) {
      alert("Please enter a reason.");
      return;
    }

    console.log(`Swap request from user ${token}:`, reason);
    $(modal).modal("hide");

    // Clean up modal after hiding
    modal.addEventListener("hidden.bs.modal", () => {
      modal.remove();
    });
  });

  // Clean up modal if closed without submitting
  modal.addEventListener("hidden.bs.modal", () => {
    modal.remove();
  });
}

// Fetch Data When the Page Loads
document.addEventListener("DOMContentLoaded", fetchData);