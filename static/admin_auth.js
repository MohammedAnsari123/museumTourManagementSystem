// Tab switching
function switchTab(tabId) {
  document.querySelectorAll(".form").forEach(f => f.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");

  if (tabId === "login") {
    document.querySelectorAll(".tab")[0].classList.add("active");
  } else {
    document.querySelectorAll(".tab")[1].classList.add("active");
  }
}

// Validate pass key
function validatePassKey() {
  const passKey = document.getElementById("passKey").value;
  const msgElement = document.getElementById("passKeyMsg");
  
  if (!passKey) {
    msgElement.textContent = "Please enter the pass key.";
    return;
  }
  
  // Send request to backend to validate pass key
  fetch('/admin/validate_passkey', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ passkey: passKey }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      msgElement.textContent = data.message;
      msgElement.style.color = "green";
      
      // Hide pass key section and show registration form
      document.getElementById("passKeySection").style.display = "none";
      document.getElementById("registrationForm").style.display = "flex";
    } else {
      msgElement.textContent = data.message;
      msgElement.style.color = "red";
    }
  })
  .catch(error => {
    msgElement.textContent = "An error occurred. Please try again.";
    msgElement.style.color = "red";
  });
}

// Create pass key
function createPassKey() {
  const newPassKey = document.getElementById("newPassKey").value;
  const confirmPassKey = document.getElementById("confirmPassKey").value;
  const msgElement = document.getElementById("createPassKeyMsg");
  
  if (!newPassKey || !confirmPassKey) {
    msgElement.textContent = "Please fill all fields.";
    return;
  }
  
  if (newPassKey !== confirmPassKey) {
    msgElement.textContent = "Pass keys do not match.";
    return;
  }
  
  // Send request to backend to create pass key
  fetch('/api/admin/passkeys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ passkey: newPassKey }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      msgElement.textContent = data.message;
      msgElement.style.color = "green";
      
      // Clear the input fields
      document.getElementById("newPassKey").value = "";
      document.getElementById("confirmPassKey").value = "";
      
      // Set the new pass key in the validation field
      document.getElementById("passKey").value = newPassKey;
    } else {
      msgElement.textContent = data.error || "Failed to create pass key";
      msgElement.style.color = "red";
    }
  })
  .catch(error => {
    msgElement.textContent = "An error occurred. Please try again.";
    msgElement.style.color = "red";
  });
}

// Go back to pass key step
function backToPassKey() {
  // Hide registration form and show pass key section
  document.getElementById("registrationForm").style.display = "none";
  document.getElementById("passKeySection").style.display = "block";
  
  // Clear messages
  document.getElementById("passKeyMsg").textContent = "";
  document.getElementById("createPassKeyMsg").textContent = "";
  document.getElementById("registerMsg").textContent = "";
  
  // Clear inputs
  document.getElementById("passKey").value = "";
  document.getElementById("newPassKey").value = "";
  document.getElementById("confirmPassKey").value = "";
  document.getElementById("regUser").value = "";
  document.getElementById("regPass").value = "";
}

// Register new admin
function registerAdmin() {
  const username = document.getElementById("regUser").value;
  const password = document.getElementById("regPass").value;
  const passKey = document.getElementById("passKey").value;
  const msgElement = document.getElementById("registerMsg");

  if (!username || !password || !passKey) {
    msgElement.textContent = "Please fill all fields.";
    return;
  }
  
  // Send request to backend to register admin
  fetch('/admin/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username: username, password: password, passkey: passKey }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      msgElement.textContent = data.message;
      msgElement.style.color = "green";
      // Clear inputs
      document.getElementById("regUser").value = '';
      document.getElementById("regPass").value = '';
    } else {
      msgElement.textContent = data.message;
      msgElement.style.color = "red";
    }
  })
  .catch(error => {
    msgElement.textContent = "An error occurred. Please try again.";
    msgElement.style.color = "red";
  });
}

// Login admin
function loginAdmin() {
  const username = document.getElementById("loginUser").value;
  const password = document.getElementById("loginPass").value;
  const msgElement = document.getElementById("loginMsg");

  if (!username || !password) {
    msgElement.textContent = "Please fill all fields.";
    return;
  }
  
  // Send request to backend to login admin
  fetch('/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username: username, password: password }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      msgElement.textContent = data.message + " Redirecting...";
      msgElement.style.color = "green";
      setTimeout(() => {
        window.location.href = "/admin/dashboard"; // Redirect to admin dashboard
      }, 1000);
    } else {
      msgElement.textContent = data.message;
      msgElement.style.color = "red";
    }
  })
  .catch(error => {
    msgElement.textContent = "An error occurred. Please try again.";
    msgElement.style.color = "red";
  });
}
