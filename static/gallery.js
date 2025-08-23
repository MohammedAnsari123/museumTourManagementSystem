// Gallery JavaScript - Enhanced Museum Gallery
class MuseumGallery {
  constructor() {
    this.museums = [];
    this.filteredMuseums = [];
    this.currentView = 'grid';
    this.init();
  }

  async init() {
    await this.loadMuseums();
    this.setupEventListeners();
    this.renderMuseums();
  }

  async loadMuseums() {
    try {
      const response = await fetch('/api/exhibitions');
      if (!response.ok) throw new Error('Failed to load museums');

      this.museums = await response.json();
      this.filteredMuseums = [...this.museums];

      // Hide loading spinner
      document.getElementById('loadingSpinner').style.display = 'none';
    } catch (error) {
      console.log('Error loading museums:', error);
      this.showError('Failed to load museums. Please try again later.');
    }
  }

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Filter functionality
    const typeFilter = document.getElementById('typeFilter');
    const locationFilter = document.getElementById('locationFilter');
    typeFilter.addEventListener('change', () => this.applyFilters());
    locationFilter.addEventListener('change', () => this.applyFilters());

    // Reset filters
    const resetBtn = document.getElementById('resetFilters');
    resetBtn.addEventListener('click', () => this.resetFilters());

    // View toggle
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.toggleView(e.target.dataset.view));
    });

    // Modal close
    const closeModal = document.getElementById('closeModal');
    const modal = document.getElementById('museumModal');
    closeModal.addEventListener('click', () => this.closeModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });
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

    this.renderMuseums();
  }

  applyFilters() {
    const typeFilter = document.getElementById('typeFilter').value;
    const locationFilter = document.getElementById('locationFilter').value;

    this.filteredMuseums = this.museums.filter(museum => {
      const typeMatch = !typeFilter || museum.Type === typeFilter;
      const locationMatch = !locationFilter ||
        museum.City === locationFilter ||
        museum.State === locationFilter;

      return typeMatch && locationMatch;
    });

    this.renderMuseums();
  }

  resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('locationFilter').value = '';
    this.filteredMuseums = [...this.museums];
    this.renderMuseums();
  }

  toggleView(view) {
    this.currentView = view;

    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`).classList.add('active');

    // Update container class
    const container = document.getElementById('museumsContainer');
    container.className = `museums-container ${view}-view`;

    this.renderMuseums();
  }

  renderMuseums() {
    const container = document.getElementById('museumsContainer');

    if (this.filteredMuseums.length === 0) {
      this.showNoResults();
      return;
    }

    container.innerHTML = this.filteredMuseums.map((museum, index) =>
      this.createMuseumCard(museum, index)
    ).join('');

    // Add click listeners to cards
    container.querySelectorAll('.museum-card').forEach((card, index) => {
      card.addEventListener('click', () => this.openModal(this.filteredMuseums[index]));
    });
  }

  createMuseumCard(museum, index) {
    const imageUrl = this.getMuseumImage(museum);

    return `
      <div class="museum-card fade-in" data-index="${index}">
        <div class="museum-image">
          <img src="${imageUrl}" alt="${museum.Name}" loading="lazy">
        </div>
        <div class="museum-content">
          <h3 class="museum-title">${museum.Name}</h3>
          <div class="museum-info">
            <div class="info-item">
              <i class="fas fa-map-marker-alt"></i>
              <span>${museum.City}, ${museum.State}</span>
            </div>
            <div class="info-item">
              <i class="fas fa-tag"></i>
              <span>${museum.Type}</span>
            </div>
            <div class="info-item">
              <i class="fas fa-calendar"></i>
              <span>Est. ${museum.Established || 'N/A'}</span>
            </div>
          </div>
          <div class="museum-actions">
            <button class="action-btn view-details-btn" onclick="event.stopPropagation(); gallery.openModal(${JSON.stringify(museum).replace(/"/g, '&quot;')})">
              <i class="fas fa-eye"></i> View Details
            </button>
            <button class="action-btn book-btn" onclick="event.stopPropagation(); gallery.bookVisit('${museum.Name}')">
              <i class="fas fa-ticket-alt"></i> Book Visit
            </button>
          </div>
        </div>
      </div>
    `;
  }

  getMuseumImage(museum) {
    // Use a placeholder image or generate based on museum type
    const typeImages = {
      'Art': '/static/images/img1.jpg',
      'History': '/static/images/img2.jpg',
      'Science': '/static/images/img3.jpg',
      'Natural': '/static/images/img1.jpg',
      'Cultural': '/static/images/img2.jpg'
    };

    return typeImages[museum.Type] || '/static/images/img1.jpg';
  }

  openModal(museum) {
    const modal = document.getElementById('museumModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalImage = document.getElementById('modalImage');
    const modalLocation = document.getElementById('modalLocation');
    const modalType = document.getElementById('modalType');
    const modalEstablished = document.getElementById('modalEstablished');
    const modalDescription = document.getElementById('modalDescription');

    modalTitle.textContent = museum.Name;
    modalImage.src = this.getMuseumImage(museum);
    modalLocation.textContent = `${museum.City}, ${museum.State}`;
    modalType.textContent = museum.Type;
    modalEstablished.textContent = museum.Established || 'Information not available';
    modalDescription.textContent = this.getMuseumDescription(museum);

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Add animation
    modal.classList.add('slide-in');
  }

  closeModal() {
    const modal = document.getElementById('museumModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    modal.classList.remove('slide-in');
  }

  getMuseumDescription(museum) {
    const descriptions = {
      'Art': 'A prestigious art museum showcasing masterpieces from various periods and cultures.',
      'History': 'A historical museum preserving and presenting artifacts from significant historical periods.',
      'Science': 'An interactive science museum featuring exhibits on technology, nature, and innovation.',
      'Natural': 'A natural history museum displaying specimens from the natural world.',
      'Cultural': 'A cultural museum celebrating diverse traditions and heritage.'
    };

    return descriptions[museum.Type] || 'A fascinating museum offering unique insights and experiences.';
  }

  bookVisit(museumName) {
    // Redirect to visitor home page with booking intent
    window.location.href = `/visitor/home?book=${encodeURIComponent(museumName)}`;
  }

  showError(message) {
    const container = document.getElementById('museumsContainer');
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error</h3>
        <p>${message}</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    `;
  }

  showNoResults() {
    const container = document.getElementById('museumsContainer');
    container.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No museums found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    `;
  }
}

// Share functionality
function shareMuseum() {
  const modalTitle = document.getElementById('modalTitle').textContent;
  const modalLocation = document.getElementById('modalLocation').textContent;

  const shareText = `Check out ${modalTitle} in ${modalLocation}! Visit our museum gallery for more amazing places.`;

  if (navigator.share) {
    navigator.share({
      title: 'Museum Discovery',
      text: shareText,
      url: window.location.href
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Museum information copied to clipboard!');
    });
  }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.gallery = new MuseumGallery();
});



const slider = document.querySelector(".imageSlider");
const slides = document.querySelectorAll(".slide");
const slidesPerView = 3;
let currentIndex = 0;

function slideLeft() {
  if (currentIndex > 0) {
    currentIndex--;
    updateSlider();
  }
}

function slideRight() {
  const maxIndex = Math.ceil(slides.length / slidesPerView) - 1;
  if (currentIndex < maxIndex) {
    currentIndex++;
    updateSlider();
  }
}

function updateSlider() {
  const slideWidth = slides[0].offsetWidth;
  const offset = currentIndex * slideWidth;
  slider.style.transform = `translateX(-${offset}px)`;
}

// Optional: responsive fix if image width changes
window.addEventListener("resize", updateSlider);
