const sign_in_btn = document.querySelector("#sign-in-btn");
const sign_up_btn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");

sign_up_btn.addEventListener("click", () => {
  container.classList.add("sign-up-mode");
});

sign_in_btn.addEventListener("click", () => {
  container.classList.remove("sign-up-mode");
});
document.getElementById('sign-in-form').addEventListener('submit', function(event) {
  var telephoneInput = document.querySelector('.sign-in-form input[type="tel"]');
  if (telephoneInput.value.length !== 10 || isNaN(telephoneInput.value)) {
    alert('Telephone number must be exactly 10 digits.');
    event.preventDefault();
  }
});

document.getElementById('sign-up-form').addEventListener('submit', function(event) {
  var telephoneInput = document.querySelector('.sign-up-form input[type="tel"]');
  if (telephoneInput && (telephoneInput.value.length !== 10 || isNaN(telephoneInput.value))) {
    alert('Telephone number must be exactly 10 digits.');
    event.preventDefault();
  }
});