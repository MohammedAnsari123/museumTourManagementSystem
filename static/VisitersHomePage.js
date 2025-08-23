// Theme toggle
document.getElementById('toggle-mode')?.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
});

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// Load "My Ratings" section
function loadMyRatings() {
  const list = document.getElementById('ratingsList');
  const empty = document.getElementById('noRatings');
  if (!list) return;

  fetch('/api/history')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data)) data = [];

      // If no bookings at all
      if (data.length === 0) {
        list.innerHTML = '';
        if (empty) empty.style.display = 'block';
        return;
      }

      if (empty) empty.style.display = 'none';

      // Sort newest first by Date
      data.sort((a, b) => new Date(b.Date) - new Date(a.Date));

      list.innerHTML = data.map(b => {
        const rating = parseInt(b.Rating) || 0;
        const hasRating = rating > 0;
        const stars = hasRating ? ('★'.repeat(rating) + '☆'.repeat(5 - rating)) : '☆☆☆☆☆';
        const reviewHtml = hasRating && b.Review ? `<p class="rating-review">${b.Review}</p>` : '';
        const actionHtml = hasRating ? '' : `<button class="review-btn" onclick="openReviewModal('${b.TicketID}', '${b.Museum}')">Rate now</button>`;
        return `
          <div class="booking-card rating-card">
            <div class="rating-header">
              <h4>${b.Museum}</h4>
              <span class="stars">${stars}</span>
            </div>
            <div class="rating-meta">
              <span><i class="fas fa-calendar"></i> ${b.Date || '-'}</span>
              <span><i class="fas fa-clock"></i> ${b.Time || '-'}</span>
            </div>
            ${reviewHtml}
            ${actionHtml}
          </div>`;
      }).join('');
    })
    .catch(err => {
      console.warn('Failed to load ratings:', err);
      if (list) list.innerHTML = '';
      if (empty) empty.style.display = 'block';
    });
}

// Load Exhibitions with Server-Side Pagination
const exhibitsState = { page: 1, per_page: 9, total_pages: 1, total: 0, items: [] };

async function loadExhibitions(page = 1) {
  const container = document.getElementById('exhibits-container');
  const nav = document.getElementById('exhibits-nav');
  try {
    const res = await fetch(`/api/exhibitions?page=${page}&per_page=${exhibitsState.per_page}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const payload = await res.json();

    if (Array.isArray(payload)) {
      // Backward-compat: server returned full array
      exhibitsState.items = payload;
      exhibitsState.page = 1;
      exhibitsState.total = payload.length;
      exhibitsState.total_pages = 1;
    } else {
      exhibitsState.items = payload.items || [];
      exhibitsState.page = payload.page || page;
      exhibitsState.per_page = payload.per_page || exhibitsState.per_page;
      exhibitsState.total = payload.total || exhibitsState.items.length;
      exhibitsState.total_pages = payload.total_pages || 1;
    }

    renderExhibits();
    renderExhibitsPagination();

    // Wire modal close
    document.getElementById('closeModal')?.addEventListener('click', () => {
      const modal = document.getElementById('exhibitModal');
      if (modal) modal.style.display = 'none';
    });
  } catch (error) {
    console.log('Error loading exhibitions:', error);
    if (container) {
      container.innerHTML = "<p>Error loading exhibitions. Please try again later.</p>";
    }
  }
}

function renderExhibits() {
  const container = document.getElementById('exhibits-container');
  if (!container) {
    console.warn('exhibits-container element not found in DOM');
    return;
  }
  container.innerHTML = '';
  exhibitsState.items.forEach((exhibit, index) => {
    const card = document.createElement('div');
    card.className = 'exhibit-card';
    card.innerHTML = `
      <h4>${exhibit.Name}</h4>
      <p><strong>City:</strong> ${exhibit.City}</p>
      <p><strong>State:</strong> ${exhibit.State}</p>
      <p><strong>Type:</strong> ${exhibit.Type}</p>
      <button class="details-btn" data-index="${index}">View Details</button>
    `;
    container.appendChild(card);
  });

  // Modal logic is handled by a single global delegated listener below
}

function renderExhibitsPagination() {
  const nav = document.getElementById('exhibits-nav');
  if (!nav) return;
  nav.innerHTML = '';

  const { page, total_pages } = exhibitsState;

  const createButton = (text, pageNum, disabled = false, active = false) => {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.disabled = disabled;
    btn.className = 'page-btn';
    if (active) btn.classList.add('active');
    btn.addEventListener('click', () => loadExhibitions(pageNum));
    return btn;
  };

  // Prev
  nav.appendChild(createButton('Prev', page - 1, page === 1));

  const maxVisible = 3;
  const pageList = [];

  if (total_pages <= 6) {
    for (let i = 1; i <= total_pages; i++) pageList.push(i);
  } else {
    pageList.push(1);
    if (page > maxVisible) pageList.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(total_pages - 1, page + 1);
    for (let i = start; i <= end; i++) pageList.push(i);
    if (page + 1 < total_pages - 1) pageList.push('...');
    pageList.push(total_pages);
  }

  pageList.forEach(p => {
    if (p === '...') {
      const span = document.createElement('span');
      span.textContent = '...';
      span.className = 'dots';
      nav.appendChild(span);
    } else {
      nav.appendChild(createButton(p, p, false, p === page));
    }
  });

  // Next
  nav.appendChild(createButton('Next', page + 1, page === total_pages));
}

// Initial load
loadExhibitions(1);

// Global delegated handler for exhibit details modal (supports repeated use and pagination)
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('details-btn')) {
    const idx = parseInt(e.target.dataset.index, 10);
    const exhibit = exhibitsState.items[idx];
    const modal = document.getElementById('exhibitModal');
    const content = document.getElementById('modalContent');
    if (!exhibit || !content) return;
    content.innerHTML = `
      <h2>${exhibit.Name}</h2>
      <p><strong>City:</strong> ${exhibit.City}</p>
      <p><strong>State:</strong> ${exhibit.State}</p>
      <p><strong>Type:</strong> ${exhibit.Type}</p>
      <p><strong>Established:</strong> ${exhibit.Established || ''}</p>
    `;
    if (modal) modal.style.display = 'block';
  }
});

// Confirm Booking
document.getElementById("confirm-booking")?.addEventListener("click", () => {
  const date = document.getElementById("booking-date").value;
  const time = document.getElementById("booking-time").value;
  const people = document.getElementById("booking-people").value;
  const type = document.getElementById("museum-type").value;
  const msg = document.getElementById("booking-msg");

  if (!date || !time || !people || !type) {
    msg.textContent = "Please fill in all fields";
    msg.style.color = "red";
    return;
  }

  fetch("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, time, people, type })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Booking failed');
      }
      return res.json();
    })
    .then(data => {
      msg.textContent = data.message;
      msg.style.color = "green";

      if (data.qr_url) {
        const qrDiv = document.getElementById("qr-ticket");
        const qrImg = document.getElementById("qr-img");
        const downloadLink = document.getElementById("download-link");

        qrImg.src = data.qr_url;
        downloadLink.href = data.qr_url;
        qrDiv.style.display = "block";
      }
    })
    .catch(error => {
      console.log('Error:', error);
      msg.textContent = "Booking failed. Please try again.";
      msg.style.color = "red";
    });
});

// Attend Tour
document.getElementById("attend-btn")?.addEventListener("click", () => {
  const date = document.getElementById("attend-date").value;
  const time = document.getElementById("attend-time").value;
  const msg = document.getElementById("attend-msg");

  if (!date || !time) {
    msg.textContent = "Please fill in date and time";
    msg.style.color = "red";
    return;
  }

  fetch("/api/attend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, time })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to mark attendance');
      }
      return res.json();
    })
    .then(data => {
      msg.textContent = data.message;
      msg.style.color = "green";
    })
    .catch(error => {
      console.log('Error:', error);
      msg.textContent = "Failed to mark attendance. Please try again.";
      msg.style.color = "red";
    });
});

// Submit Review
document.getElementById("submit-review")?.addEventListener("click", () => {
  const rating = document.getElementById("rating").value;
  const review = document.getElementById("review-text").value;

  if (!rating || !review) {
    alert("Please fill in both rating and review");
    return;
  }

  fetch("/api/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, review })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to submit review');
      }
      return res.json();
    })
    .then(() => alert("Thanks for your review!"))
    .catch(error => {
      console.log('Error:', error);
      alert("Failed to submit review. Please try again.");
    });
});

// View History
function loadHistory() {
  fetch("/api/history")
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to load history');
      }
      return res.json();
    })
    .then(data => {
      const container = document.getElementById("historyTableBody");
      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = "<tr><td colspan='6'>No bookings found.</td></tr>";
        console.log(container)
        return;
      }
      
      // Sort by date (newest first)
      data.sort((a, b) => new Date(b.Date) - new Date(a.Date));
      
      let html = "";
      data.forEach(booking => {
        // Determine status based on date and flags
        const today = new Date();
        const bookingDate = new Date(booking.Date);
        let status = "Upcoming";
        if (booking.Attended === "Cancelled") {
          status = "Cancelled";
        } else if (bookingDate < today) {
          status = booking.Attended === "Yes" ? "Completed" : "Missed";
        }
        
        // Format rating display
        let ratingDisplay = booking.Rating || "-";
        if (booking.Rating) {
          ratingDisplay = "★".repeat(booking.Rating) + "☆".repeat(5 - booking.Rating);
        }
        
        // Action buttons: allow review any time for unrated (except if cancelled); allow cancel for upcoming
        let actionParts = [];
        if (status === "Upcoming") {
          actionParts.push(`<button class="cancel-btn" data-ticket="${booking.TicketID}">Cancel</button>`);
        }
        if (!booking.Rating && status !== "Cancelled") {
          actionParts.push(`<button class="review-btn" onclick="openReviewModal('${booking.TicketID}', '${booking.Museum}')">Review</button>`);
        }
        let actions = actionParts.join(' ');
        if (booking.Rating) {
          actions = `<span class="reviewed">Reviewed</span>`;
        }
        
        html += `
          <tr data-status="${status.toLowerCase()}">
            <td>${booking.Museum}</td>
            <td>${booking.Date}</td>
            <td>${booking.Time}</td>
            <td><span class="status ${status.toLowerCase()}">${status}</span></td>
            <td>${ratingDisplay}</td>
            <td>${actions}</td>
          </tr>
        `;
      });
      container.innerHTML = html;
    })
    .catch(error => {
      console.log('Error:', error);
      const container = document.getElementById("historyTableBody");
      container.innerHTML = "<tr><td colspan='6'>Error loading history. Please try again later.</td></tr>";
    });

    console.log("History loaded successfully");
}

// Filter history
function filterHistory(filterType) {
  const rows = document.querySelectorAll("#historyTableBody tr");
  rows.forEach(row => {
    const status = row.getAttribute('data-status');
    if (filterType === "all" || status === filterType) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

// Add event listeners for filter buttons
document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');
      // Filter history
      const filterType = button.getAttribute('data-filter');
      filterHistory(filterType);
    });
  });
});

// Open review modal
function openReviewModal(ticketId, museumName) {
  // Create review modal if it doesn't exist
  let modal = document.getElementById('reviewModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reviewModal';
    modal.className = 'review-modal';
    modal.innerHTML = `
      <div class="review-modal-content">
        <span class="close-review">&times;</span>
        <h2>Review Your Visit to ${museumName}</h2>
        <form id="reviewForm">
          <input type="hidden" id="ticketId" value="${ticketId}">
          <div class="rating-input">
            <label>Rating:</label>
            <div class="stars">
              <span class="star" data-rating="1">★</span>
              <span class="star" data-rating="2">★</span>
              <span class="star" data-rating="3">★</span>
              <span class="star" data-rating="4">★</span>
              <span class="star" data-rating="5">★</span>
            </div>
            <input type="hidden" id="rating" name="rating" required>
          </div>
          <div class="review-input">
            <label for="reviewText">Your Review:</label>
            <textarea id="reviewText" name="review" rows="4" placeholder="Share your experience..."></textarea>
          </div>
          <button type="submit" class="submit-review-btn">Submit Review</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.close-review').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    // Star rating functionality
    const stars = modal.querySelectorAll('.star');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const rating = star.getAttribute('data-rating');
        document.getElementById('rating').value = rating;
        // Update star display
        stars.forEach((s, index) => {
          s.classList.toggle('selected', index < rating);
        });
      });
    });
    
    // Form submission
    modal.querySelector('#reviewForm').addEventListener('submit', submitReview);
  }
  
  // Reset form and show modal
  document.getElementById('reviewForm').reset();
  document.getElementById('rating').value = '';
  modal.querySelectorAll('.star').forEach(star => {
    star.classList.remove('selected');
  });
  modal.style.display = 'block';
}

// Submit review
function submitReview(e) {
  e.preventDefault();
  
  const ticketId = document.getElementById('ticketId').value;
  const rating = document.getElementById('rating').value;
  const review = document.getElementById('reviewText').value;
  
  if (!rating) {
    alert('Please select a rating');
    return;
  }
  
  fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_id: ticketId, rating: parseInt(rating), review: review })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error('Failed to submit review');
    }
    return res.json();
  })
  .then(data => {
    alert('Review submitted successfully!');
    document.getElementById('reviewModal').style.display = 'none';
    // Reload history to show updated review
    loadHistory();
    // Reload ratings section
    loadMyRatings();
  })
  .catch(error => {
    console.log('Error:', error);
    alert('Failed to submit review. Please try again.');
  });
}

// Cancel booking
function cancelBooking(ticketId) {
  if (!ticketId) return;
  if (!confirm('Are you sure you want to cancel this booking?')) return;
  fetch('/api/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket_id: ticketId })
  })
  .then(res => {
    if (!res.ok) throw new Error('Failed to cancel');
    return res.json();
  })
  .then(() => {
    alert('Booking cancelled');
    loadHistory();
  })
  .catch(err => {
    console.log(err);
    alert('Failed to cancel booking. Please try again.');
  });
}

// Load dashboard stats
function loadDashboardStats() {
  fetch('/api/history')
    .then(res => res.json())
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        return;
      }
      
      // Calculate stats
      const totalBookings = data.length;
      const visitedMuseums = new Set(data.map(b => b.Museum)).size;
      const ratings = data.filter(b => b.Rating).map(b => parseInt(b.Rating));
      const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0.0';
      const today = new Date();
      const upcomingTours = data.filter(b => {
        const bookingDate = new Date(b.Date);
        return bookingDate >= today && b.Attended !== 'Yes';
      }).length;
      
      // Update dashboard elements
      document.getElementById('totalBookings').textContent = totalBookings;
      document.getElementById('visitedMuseums').textContent = visitedMuseums;
      document.getElementById('avgRating').textContent = avgRating;
      document.getElementById('upcomingTours').textContent = upcomingTours;
    })
    .catch(error => console.log('Error loading dashboard stats:', error));
}

// Load Popular Exhibits
function loadPopular() {
  fetch("/api/popular")
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to load popular data');
      }
      return res.json();
    })
    .then(data => {
      const container = document.getElementById("popular-container");
      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = "<p>No popular data available.</p>";
        return;
      }
      let html = "<table><tr><th>Rating</th><th>Count</th></tr>";
      data.forEach(row => {
        html += `<tr><td>${row.Rating}</td><td>${row.Count}</td></tr>`;
      });
      html += "</table>";
      container.innerHTML = html;
    })
    .catch(error => {
      console.log('Error:', error);
      const container = document.getElementById("popular-container");
      container.innerHTML = "<p>Error loading popular data. Please try again later.</p>";
    });
}

// Load Personalized Recommendations
function loadPersonalized() {
  fetch("/api/personalized")
    .then(res => {
      if (!res.ok) {
        throw new Error('Failed to load recommendations');
      }
      return res.json();
    })
    .then(data => {
      const container = document.getElementById("personalized-container");
      if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = "<p>No recommendations found.</p>";
        return;
      }
      let html = "<ul class='recommendation-list'>";
      data.forEach(m => {
        html += `<li><strong>${m.Name}</strong> - ${m.City} (${m.Type})</li>`;
      });
      html += "</ul>";
      container.innerHTML = html;
    })
    .catch(error => {
      console.log('Error:', error);
      const container = document.getElementById("personalized-container");
      container.innerHTML = "<p>Error loading recommendations. Please try again later.</p>";
    });
}

// Chart initialization is handled in the HTML file
// No duplicate chart code needed here

// Enhanced Museum Booking System
class MuseumBookingSystem {
  constructor() {
    this.museums = [];
    this.filteredMuseums = [];
    this.selectedMuseum = null;
    this.init();
  }

  async init() {
    await this.loadMuseums();
    await this.loadFilters();
    this.setupEventListeners();
    this.setMinDate();
  }

  async loadMuseums() {
    try {
      const response = await fetch('/api/exhibitions');
      if (!response.ok) throw new Error('Failed to load museums');
      
      this.museums = await response.json();
      this.filteredMuseums = [...this.museums];
      console.log(`Loaded ${this.museums.length} museums`);
    } catch (error) {
      console.log('Error loading museums:', error);
      this.showError('Failed to load museums. Please try again later.');
    }
  }

  async loadFilters() {
    try {
      const response = await fetch('/api/museum-filters');
      if (!response.ok) throw new Error('Failed to load filters');
      
      const filters = await response.json();
      this.populateFilterDropdowns(filters);
    } catch (error) {
      console.log('Error loading filters:', error);
      // Fallback to static filters if API fails
    }
  }

  populateFilterDropdowns(filters) {
    const typeFilter = document.getElementById('typeFilter');
    const cityFilter = document.getElementById('cityFilter');
    
    if (typeFilter && filters.types) {
      // Clear existing options except the first one
      typeFilter.innerHTML = '<option value="">All Types</option>';
      
      // Add dynamic types
      filters.types.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
      });
    }
    
    if (cityFilter && filters.cities) {
      // Clear existing options except the first one
      cityFilter.innerHTML = '<option value="">All Cities</option>';
      
      // Add dynamic cities
      filters.cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
      });
    }
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('museumSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    // Filter functionality
    const typeFilter = document.getElementById('typeFilter');
    const cityFilter = document.getElementById('cityFilter');
    
    if (typeFilter) {
      typeFilter.addEventListener('change', () => this.applyFilters());
    }
    if (cityFilter) {
      cityFilter.addEventListener('change', () => this.applyFilters());
    }

    // Reset search
    const resetBtn = document.getElementById('resetSearch');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetSearch());
    }

    // Form submission
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
      bookingForm.addEventListener('submit', (e) => this.handleBookingSubmit(e));
    }

    // Form field changes for summary updates
    this.setupFormListeners();
  }

  setupFormListeners() {
    const formFields = [
      'visitDate', 'visitTime', 'numPeople', 'tourType', 
      'visitorName', 'visitorEmail', 'visitorPhone', 'visitorAge'
    ];

    formFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('change', () => this.updateSummary());
        field.addEventListener('input', () => this.updateSummary());
      }
    });

    // Special handling for date changes
    const visitDate = document.getElementById('visitDate');
    if (visitDate) {
      visitDate.addEventListener('change', () => this.updateAvailableTimes());
    }

    // Special handling for tour type changes
    const tourType = document.getElementById('tourType');
    if (tourType) {
      tourType.addEventListener('change', () => this.updatePricingInfo());
    }
  }

  handleSearch(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (searchTerm === '') {
      this.filteredMuseums = [...this.museums];
    } else {
      this.filteredMuseums = this.museums.filter(museum =>
        museum.Name.toLowerCase().includes(searchTerm) ||
        museum.City.toLowerCase().includes(searchTerm) ||
        museum.State.toLowerCase().includes(searchTerm) ||
        museum.Type.toLowerCase().includes(searchTerm)
      );
    }

    this.applyFilters();
    this.displaySearchResults();
  }

  applyFilters() {
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const cityFilter = document.getElementById('cityFilter')?.value || '';
    const searchTerm = document.getElementById('museumSearchInput')?.value.toLowerCase().trim() || '';

    let filtered = this.museums;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(museum =>
        museum.Name.toLowerCase().includes(searchTerm) ||
        museum.City.toLowerCase().includes(searchTerm) ||
        museum.State.toLowerCase().includes(searchTerm) ||
        museum.Type.toLowerCase().includes(searchTerm)
      );
    }

    // Apply type filter
    if (typeFilter) {
      filtered = filtered.filter(museum => museum.Type === typeFilter);
    }

    // Apply city filter
    if (cityFilter) {
      filtered = filtered.filter(museum => museum.City === cityFilter);
    }

    this.filteredMuseums = filtered;
    this.displaySearchResults();
  }

  displaySearchResults() {
    const resultsContainer = document.getElementById('searchResults');
    const resultsList = document.getElementById('resultsList');
    const resultsCount = document.getElementById('resultsCount');

    if (!resultsContainer || !resultsList || !resultsCount) return;

    if (this.filteredMuseums.length === 0) {
      resultsContainer.style.display = 'none';
      return;
    }

    resultsCount.textContent = `${this.filteredMuseums.length} result${this.filteredMuseums.length !== 1 ? 's' : ''}`;
    
    resultsList.innerHTML = this.filteredMuseums.map(museum => `
      <div class="museum-result-item" data-museum-id="${museum.Name}" 
           onmouseenter="bookingSystem.showMuseumTooltip(event, ${JSON.stringify(museum).replace(/"/g, '&quot;')})"
           onmouseleave="bookingSystem.hideMuseumTooltip()">
        <div class="museum-info">
          <div class="museum-name">${museum.Name}</div>
          <div class="museum-details">
            <span><i class="fas fa-map-marker-alt"></i> ${museum.City}, ${museum.State}</span>
            <span><i class="fas fa-tag"></i> ${museum.Type}</span>
            ${museum.Established ? `<span><i class="fas fa-calendar"></i> Est. ${museum.Established}</span>` : ''}
          </div>
        </div>
        <button class="select-btn" onclick="bookingSystem.selectMuseum('${museum.Name}')">
          <i class="fas fa-check"></i> Select
        </button>
      </div>
    `).join('');

    resultsContainer.style.display = 'block';
  }

  selectMuseum(museumName) {
    this.selectedMuseum = this.museums.find(m => m.Name === museumName);
    
    if (this.selectedMuseum) {
      // Update museum select dropdown
      const museumSelect = document.getElementById('museumSelect');
      if (museumSelect) {
        // Clear existing options
        museumSelect.innerHTML = '<option value="">Choose a museum from search results...</option>';
        
        // Add selected museum
        const option = document.createElement('option');
        option.value = this.selectedMuseum.Name;
        option.textContent = `${this.selectedMuseum.Name} - ${this.selectedMuseum.City}`;
        option.selected = true;
        museumSelect.appendChild(option);
      }

      // Update summary
      this.updateSummary();
      
      // Hide search results
      const searchResults = document.getElementById('searchResults');
      if (searchResults) {
        searchResults.style.display = 'none';
      }

      // Show success message
      this.showMessage(`Selected: ${this.selectedMuseum.Name}`, 'success');
    }
  }

  resetSearch() {
    document.getElementById('museumSearchInput').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('cityFilter').value = '';
    
    this.filteredMuseums = [...this.museums];
    this.displaySearchResults();
    
    // Clear selected museum
    this.selectedMuseum = null;
    const museumSelect = document.getElementById('museumSelect');
    if (museumSelect) {
      museumSelect.innerHTML = '<option value="">Choose a museum from search results...</option>';
    }
    
    this.updateSummary();
  }

  setMinDate() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dateInput = document.getElementById('visitDate');
    if (dateInput) {
      dateInput.min = tomorrow.toISOString().split('T')[0];
    }
  }

  updateSummary() {
    if (!this.selectedMuseum) {
      this.clearSummary();
      return;
    }

    const summaryMuseum = document.getElementById('summaryMuseum');
    const summaryLocation = document.getElementById('summaryLocation');
    const summaryDate = document.getElementById('summaryDate');
    const summaryTime = document.getElementById('summaryTime');
    const summaryPeople = document.getElementById('summaryPeople');
    const summaryTourType = document.getElementById('summaryTourType');
    const summaryVisitor = document.getElementById('summaryVisitor');
    const summaryContact = document.getElementById('summaryContact');
    const summaryTotal = document.getElementById('summaryTotal');

    if (summaryMuseum) summaryMuseum.textContent = this.selectedMuseum.Name;
    if (summaryLocation) summaryLocation.textContent = `${this.selectedMuseum.City}, ${this.selectedMuseum.State}`;
    
    // Update other fields based on form values
    const visitDate = document.getElementById('visitDate')?.value;
    const visitTime = document.getElementById('visitTime')?.value;
    const numPeople = document.getElementById('numPeople')?.value;
    const tourType = document.getElementById('tourType')?.value;
    const visitorName = document.getElementById('visitorName')?.value;
    const visitorEmail = document.getElementById('visitorEmail')?.value;
    const visitorPhone = document.getElementById('visitorPhone')?.value;

    if (summaryDate) summaryDate.textContent = visitDate || '-';
    if (summaryTime) summaryTime.textContent = visitTime || '-';
    if (summaryPeople) summaryPeople.textContent = numPeople || '-';
    if (summaryTourType) summaryTourType.textContent = tourType || '-';
    if (summaryVisitor) summaryVisitor.textContent = visitorName || '-';
    if (summaryContact) summaryContact.textContent = visitorEmail || visitorPhone || '-';

    // Calculate total
    if (summaryTotal && numPeople && tourType) {
      const total = this.calculateTotal(numPeople, tourType);
      summaryTotal.textContent = `₹${total.toLocaleString()}`;
    }
  }

  calculateTotal(people, tourType) {
    const prices = {
      'guided': 500,
      'self-guided': 200,
      'virtual': 100,
      'group': 300,
      'educational': 400
    };

    const basePrice = prices[tourType] || 200;
    let total = basePrice * parseInt(people);

    // Apply group discount
    if (tourType === 'group' && people >= 5) {
      total = total * 0.9; // 10% discount
    }

    return total;
  }

  clearSummary() {
    const summaryFields = [
      'summaryMuseum', 'summaryLocation', 'summaryDate', 'summaryTime',
      'summaryPeople', 'summaryTourType', 'summaryVisitor', 'summaryContact', 'summaryTotal'
    ];

    summaryFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) field.textContent = '-';
    });
  }

  async handleBookingSubmit(e) {
    e.preventDefault();

    if (!this.selectedMuseum) {
      this.showMessage('Please select a museum first', 'error');
      return;
    }

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Prepare booking data
    const bookingData = this.prepareBookingData();

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        throw new Error('Booking failed');
      }

      const result = await response.json();
      this.showMessage(result.message, 'success');
      
      // Show QR code if available
      if (result.qr_url) {
        this.showQRCode(result.qr_url, result.ticket_id);
      }

      // Reset form
      this.resetForm();
      
      // Refresh booking history so the new booking shows up immediately
      if (typeof loadHistory === 'function') {
        try {
          loadHistory();
        } catch (e) {
          console.warn('Failed to refresh history:', e);
        }
      }
      // Also refresh ratings so it appears in My Ratings immediately
      if (typeof loadMyRatings === 'function') {
        try {
          loadMyRatings();
        } catch (e) {
          console.warn('Failed to refresh ratings:', e);
        }
      }
      
    } catch (error) {
      console.log('Booking error:', error);
      this.showMessage('Booking failed. Please try again.', 'error');
    }
  }

  validateForm() {
    const requiredFields = [
      'visitDate', 'visitTime', 'numPeople', 'tourType',
      'visitorName', 'visitorEmail', 'visitorPhone', 'visitorAge'
    ];

    for (const fieldId of requiredFields) {
      const field = document.getElementById(fieldId);
      if (!field || !field.value.trim()) {
        this.showMessage(`Please fill in ${fieldId.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
        field?.focus();
        return false;
      }
    }

    // Validate terms acceptance
    const termsAccepted = document.getElementById('termsAccepted');
    if (!termsAccepted || !termsAccepted.checked) {
      this.showMessage('Please accept the terms and conditions', 'error');
      return false;
    }

    return true;
  }

  prepareBookingData() {
    return {
      museum: this.selectedMuseum.Name,
      date: document.getElementById('visitDate').value,
      time: document.getElementById('visitTime').value,
      people: document.getElementById('numPeople').value,
      tourType: document.getElementById('tourType').value,
      visitorName: document.getElementById('visitorName').value,
      visitorEmail: document.getElementById('visitorEmail').value,
      visitorPhone: document.getElementById('visitorPhone').value,
      visitorAge: document.getElementById('visitorAge').value,
      specialRequests: document.getElementById('specialRequests').value,
      emergencyContact: document.getElementById('emergencyContact').value,
      type: this.selectedMuseum.Type
    };
  }

  showQRCode(qrUrl, ticketId) {
    // Create and show QR code modal
    const modal = document.createElement('div');
    modal.className = 'qr-modal';
    modal.innerHTML = `
      <div class="qr-modal-content">
        <div class="qr-header">
          <h3>Booking Confirmed!</h3>
          <span class="close-qr">&times;</span>
        </div>
        <div class="qr-body">
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <img src="${qrUrl}" alt="QR Code" class="qr-image">
          <p>Scan this QR code at the museum entrance</p>
          <a href="${qrUrl}" download="ticket-${ticketId}.png" class="download-qr">
            <i class="fas fa-download"></i> Download QR Code
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal functionality
    const closeBtn = modal.querySelector('.close-qr');
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }

  resetForm() {
    document.getElementById('bookingForm').reset();
    this.selectedMuseum = null;
    this.clearSummary();
    this.resetSearch();
  }

  showMessage(message, type = 'info') {
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.innerHTML = `
      <span>${message}</span>
      <button class="close-message">&times;</button>
    `;

    // Add styles
    messageEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 15px;
      max-width: 400px;
      animation: slideIn 0.3s ease;
    `;

    // Set background color based on type
    const colors = {
      success: '#4caf50',
      error: '#f44336',
      info: '#2196f3',
      warning: '#ff9800'
    };
    messageEl.style.backgroundColor = colors[type] || colors.info;

    // Add close button styles
    const closeBtn = messageEl.querySelector('.close-message');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      margin: 0;
    `;

    // Add to page
    document.body.appendChild(messageEl);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 5000);

    // Close button functionality
    closeBtn.onclick = () => messageEl.remove();
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showMuseumTooltip(event, museum) {
    // Remove existing tooltip
    this.hideMuseumTooltip();
    
    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'museum-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <h4>${museum.Name}</h4>
        <span class="tooltip-type">${museum.Type}</span>
      </div>
      <div class="tooltip-content">
        <p><i class="fas fa-map-marker-alt"></i> <strong>Location:</strong> ${museum.City}, ${museum.State}</p>
        ${museum.Established ? `<p><i class="fas fa-calendar"></i> <strong>Established:</strong> ${museum.Established}</p>` : ''}
        ${museum.Latitude && museum.Longitude ? `<p><i class="fas fa-globe"></i> <strong>Coordinates:</strong> ${museum.Latitude}, ${museum.Longitude}</p>` : ''}
        <p><i class="fas fa-info-circle"></i> <strong>Description:</strong> ${this.getMuseumDescription(museum.Type)}</p>
      </div>
    `;
    
    // Position tooltip
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = rect.right + 10 + 'px';
    tooltip.style.top = rect.top + 'px';
    
    document.body.appendChild(tooltip);
  }

  hideMuseumTooltip() {
    const existingTooltip = document.querySelector('.museum-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }
  }

  getMuseumDescription(type) {
    const descriptions = {
      'Art': 'A prestigious art museum showcasing masterpieces from various periods and cultures.',
      'History': 'A historical museum preserving and presenting artifacts from significant historical periods.',
      'Science': 'An interactive science museum featuring exhibits on technology, nature, and innovation.',
      'Natural': 'A natural history museum displaying specimens from the natural world.',
      'Cultural': 'A cultural museum celebrating diverse traditions and heritage.',
      'General': 'A comprehensive museum offering diverse exhibits and collections.',
      'Archaeology': 'A museum dedicated to archaeological discoveries and ancient civilizations.',
      'Anthropology': 'A museum exploring human cultures and societies throughout history.',
      'Military': 'A museum preserving military history and artifacts.',
      'Maritime': 'A museum showcasing maritime history and naval heritage.'
    };
    
    return descriptions[type] || 'A fascinating museum offering unique insights and experiences.';
  }

  updateAvailableTimes() {
    const visitDate = document.getElementById('visitDate');
    const visitTime = document.getElementById('visitTime');
    
    if (!visitDate || !visitTime) return;
    
    const selectedDate = new Date(visitDate.value);
    const dayOfWeek = selectedDate.getDay();
    
    // Different time slots for weekdays vs weekends
    const timeSlots = this.getTimeSlotsForDay(dayOfWeek);
    
    // Update time dropdown
    visitTime.innerHTML = '<option value="">Select time...</option>';
    timeSlots.forEach(time => {
      const option = document.createElement('option');
      option.value = time.value;
      option.textContent = time.label;
      option.disabled = time.disabled;
      visitTime.appendChild(option);
    });
  }

  getTimeSlotsForDay(dayOfWeek) {
    // Weekend (Saturday = 6, Sunday = 0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return [
        { value: '09:00', label: '9:00 AM', disabled: false },
        { value: '10:00', label: '10:00 AM', disabled: false },
        { value: '11:00', label: '11:00 AM', disabled: false },
        { value: '12:00', label: '12:00 PM', disabled: false },
        { value: '14:00', label: '2:00 PM', disabled: false },
        { value: '15:00', label: '3:00 PM', disabled: false },
        { value: '16:00', label: '4:00 PM', disabled: false },
        { value: '17:00', label: '5:00 PM', disabled: false }
      ];
    } else {
      // Weekday - more limited hours
      return [
        { value: '10:00', label: '10:00 AM', disabled: false },
        { value: '11:00', label: '11:00 AM', disabled: false },
        { value: '12:00', label: '12:00 PM', disabled: false },
        { value: '14:00', label: '2:00 PM', disabled: false },
        { value: '15:00', label: '3:00 PM', disabled: false },
        { value: '16:00', label: '4:00 PM', disabled: false }
      ];
    }
  }

  updatePricingInfo() {
    const tourType = document.getElementById('tourType');
    const numPeople = document.getElementById('numPeople');
    const pricingInfo = document.getElementById('pricingInfo');
    
    if (!tourType || !numPeople) return;
    
    if (pricingInfo) {
      pricingInfo.remove();
    }
    
    const tourTypeValue = tourType.value;
    if (!tourTypeValue) return;
    
    const prices = {
      'guided': { base: 500, description: 'Professional guide included' },
      'self-guided': { base: 200, description: 'Audio guide available' },
      'virtual': { base: 100, description: 'Online experience' },
      'group': { base: 300, description: '10% discount for 5+ people' },
      'educational': { base: 400, description: 'Educational materials included' }
    };
    
    const price = prices[tourTypeValue];
    if (price) {
      const infoDiv = document.createElement('div');
      infoDiv.id = 'pricingInfo';
      infoDiv.className = 'pricing-info';
      infoDiv.innerHTML = `
        <div class="price-details">
          <span class="price-amount">₹${price.base}</span>
          <span class="price-per">per person</span>
          <span class="price-description">${price.description}</span>
        </div>
      `;
      
      tourType.parentNode.appendChild(infoDiv);
    }
  }
}

// Initialize booking system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.bookingSystem = new MuseumBookingSystem();
  
  // Load booking history
  loadHistory();
  
  // Load dashboard stats
  loadDashboardStats();
});

// Add CSS for QR modal and messages
const style = document.createElement('style');
style.textContent = `
  .qr-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .qr-modal-content {
    background: white;
    border-radius: 15px;
    padding: 2rem;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .qr-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid #9BD3C4;
    padding-bottom: 1rem;
  }

  .qr-header h3 {
    margin: 0;
    color: #333;
  }

  .close-qr {
    font-size: 24px;
    cursor: pointer;
    color: #666;
    background: none;
    border: none;
  }

  .qr-body p {
    margin: 1rem 0;
    color: #333;
  }

  .qr-image {
    max-width: 200px;
    margin: 1rem 0;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
  }

  .download-qr {
    display: inline-block;
    background: #4caf50;
    color: white;
    padding: 10px 20px;
    text-decoration: none;
    border-radius: 6px;
    margin-top: 1rem;
    transition: background 0.3s ease;
  }

  .download-qr:hover {
    background: #45a049;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* Review Modal Styles */
  .review-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .review-modal-content {
    background: white;
    border-radius: 15px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .close-review {
    font-size: 24px;
    cursor: pointer;
    color: #666;
    background: none;
    border: none;
    float: right;
    margin-top: -10px;
  }

  .rating-input {
    margin: 1.5rem 0;
  }

  .rating-input label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .stars {
    display: flex;
    gap: 5px;
  }

  .star {
    font-size: 2rem;
    color: #ddd;
    cursor: pointer;
    transition: color 0.2s;
  }

  .star:hover,
  .star.selected {
    color: #ffc107;
  }

  .review-input {
    margin: 1.5rem 0;
  }

  .review-input label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .review-input textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 5px;
    resize: vertical;
  }

  .submit-review-btn {
    background: #4caf50;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1rem;
    width: 100%;
    transition: background 0.3s;
  }

  .submit-review-btn:hover {
    background: #45a049;
  }

  /* History Table Styles */
  .status {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: bold;
  }

  .status.upcoming {
    background: #e3f2fd;
    color: #1976d2;
  }

  .status.completed {
    background: #e8f5e9;
    color: #388e3c;
  }

  .status.missed {
    background: #ffebee;
    color: #d32f2f;
  }

  .review-btn {
    background: #ff9800;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .review-btn:hover {
    background: #f57c00;
  }

  .reviewed {
    color: #4caf50;
    font-weight: bold;
  }

  .cancel-btn {
    background: #f44336;
    color: white;
    border: none;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .cancel-btn:hover {
    background: #d32f2f;
  }

  .no-action {
    color: #999;
  }

  /* Pagination Styles */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap;
  }

  .page-btn {
    padding: 8px 12px;
    background: #9BD3C4;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.3s;
  }

  .page-btn:hover:not(:disabled) {
    background: #8ac2b3;
  }

  .page-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .page-btn.active {
    background: #4CAF50;
    color: white;
  }

  .dots {
    padding: 8px 12px;
  }

  /* Exhibit Card Styles */
  .exhibit-card {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin: 15px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.2s;
  }

  .exhibit-card:hover {
    transform: translateY(-5px);
  }

  .exhibit-card h4 {
    margin-top: 0;
    color: #333;
  }

  .exhibit-card p {
    margin: 5px 0;
    color: #666;
  }

  .details-btn {
    background: #9BD3C4;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
  }

  .details-btn:hover {
    background: #8ac2b3;
  }

  /* Modal Styles */
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.4);
  }

  .modal-content {
    background-color: #fefefe;
    margin: 15% auto;
    padding: 20px;
    border: 1px solid #888;
    width: 80%;
    max-width: 500px;
    border-radius: 8px;
  }

  .close {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
  }

  .close:hover,
  .close:focus {
    color: black;
    text-decoration: none;
  }
`;
document.head.appendChild(style);

// demo/static/VisitersHomePage.js

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function card(m) {
  const name = m.Name || m.name || "Museum";
  const city = m.City || m.city || "";
  const state = m.State || m.state || "";
  const cat = m.Category || m.Type || m.category || m.type || "";
  const dist = m.distance_km ? `<div class="muted">${m.distance_km} km away</div>` : "";
  return `
    <div class="tile">
      <div class="title">${name}</div>
      <div class="muted">${cat}</div>
      <div class="muted">${city}${city && state ? ", " : ""}${state}</div>
      ${dist}
    </div>
  `;
}

function render(id, items) {
  document.getElementById(id).innerHTML = (items || []).map(card).join("");
}

async function loadPopular() {
  const data = await postJSON("/recommendations", { interests: [], lat: null, lon: null });
  render("popularResults", data.popular);
}

async function loadPersonalized() {
  const raw = document.getElementById("interests").value;
  const interests = raw.split(",").map(s => s.trim()).filter(Boolean);
  const data = await postJSON("/recommendations", { interests, lat: null, lon: null });
  render("personalizedResults", data.personalized);
}

function loadNearby() {
  const radius_km = Number(document.getElementById("radius").value || 25);
  if (!navigator.geolocation) {
    alert("Geolocation not supported by your browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const data = await postJSON("/recommendations", { interests: [], lat, lon, radius_km });
    render("nearbyResults", data.nearby);
  }, err => {
    alert("Unable to get location: " + err.message);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  try { loadHistory(); } catch (e) { console.warn('init loadHistory failed', e); }
  try { loadDashboardStats(); } catch (e) { console.warn('init dashboard failed', e); }
  try { loadPopular(); } catch (e) { console.warn('init popular failed', e); }
  try { loadMyRatings(); } catch (e) { console.warn('init loadMyRatings failed', e); }
  // Delegate cancel button clicks
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.cancel-btn');
    if (btn && btn.getAttribute('data-ticket')) {
      cancelBooking(btn.getAttribute('data-ticket'));
    }
  });
  document.getElementById("btnPersonalized").addEventListener("click", loadPersonalized);
  document.getElementById("btnNearby").addEventListener("click", loadNearby);
});
