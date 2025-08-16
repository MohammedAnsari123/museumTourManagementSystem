// Main JavaScript for PixelPast Museum Management System

// Museum data for the interactive map
const museumData = {
  'national-museum-delhi': {
    name: 'National Museum, Delhi',
    type: 'history',
    location: 'Delhi',
    coordinates: { lat: 28.6139, lng: 77.2090 },
    description: 'India\'s largest museum with over 200,000 artifacts',
    established: '1949',
    highlights: 'Ancient sculptures, paintings, decorative arts',
    image: '/static/images/img1.jpg',
    interest: true
  },
  'ngma-delhi': {
    name: 'National Gallery of Modern Art',
    type: 'art',
    location: 'Delhi',
    coordinates: { lat: 28.6129, lng: 77.2295 },
    description: 'Premier art gallery showcasing modern Indian art',
    established: '1954',
    highlights: 'Contemporary paintings, sculptures, installations',
    image: '/static/images/img2.jpg',
    interest: true
  },
  'csmvs-mumbai': {
    name: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya',
    type: 'history',
    location: 'Mumbai',
    coordinates: { lat: 19.0760, lng: 72.8777 },
    description: 'Mumbai\'s premier museum with diverse collections',
    established: '1922',
    highlights: 'Natural history, archaeology, decorative arts',
    image: '/static/images/img3.jpg',
    interest: false
  },
  'indian-museum-kolkata': {
    name: 'Indian Museum, Kolkata',
    type: 'cultural',
    location: 'Kolkata',
    coordinates: { lat: 22.5726, lng: 88.3639 },
    description: 'Oldest museum in India with extensive collections',
    established: '1814',
    highlights: 'Archaeology, anthropology, art, coins',
    image: '/static/images/img1.jpg',
    interest: true
  },
  'government-museum-chennai': {
    name: 'Government Museum, Chennai',
    type: 'science',
    location: 'Chennai',
    coordinates: { lat: 13.0827, lng: 80.2707 },
    description: 'Science and technology museum with interactive exhibits',
    established: '1851',
    highlights: 'Science exhibits, technology demonstrations',
    image: '/static/images/img2.jpg',
    interest: false
  },
  'salar-jung-hyderabad': {
    name: 'Salar Jung Museum',
    type: 'art',
    location: 'Hyderabad',
    coordinates: { lat: 17.3850, lng: 78.4867 },
    description: 'One of India\'s largest museums with diverse collections',
    established: '1951',
    highlights: 'Art, artifacts, textiles, weapons',
    image: '/static/images/img3.jpg',
    interest: true
  },
  'visvesvaraya-bangalore': {
    name: 'Visvesvaraya Industrial & Technological Museum',
    type: 'science',
    location: 'Bangalore',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    description: 'Interactive science and technology museum',
    established: '1962',
    highlights: 'Interactive exhibits, science demonstrations',
    image: '/static/images/img1.jpg',
    interest: false
  },
  'albert-hall-jaipur': {
    name: 'Albert Hall Museum',
    type: 'cultural',
    location: 'Jaipur',
    coordinates: { lat: 26.9124, lng: 75.7873 },
    description: 'Rajasthan\'s oldest museum with rich collections',
    established: '1887',
    highlights: 'Rajasthani art, textiles, pottery',
    image: '/static/images/img2.jpg',
    interest: true
  },
  'bharat-kala-varanasi': {
    name: 'Bharat Kala Bhavan',
    type: 'cultural',
    location: 'Varanasi',
    coordinates: { lat: 25.3176, lng: 82.9739 },
    description: 'Banaras Hindu University museum with cultural artifacts',
    established: '1920',
    highlights: 'Sculptures, paintings, textiles',
    image: '/static/images/img3.jpg',
    interest: false
  },
  'calico-ahmedabad': {
    name: 'Calico Museum of Textiles',
    type: 'history',
    location: 'Ahmedabad',
    coordinates: { lat: 23.0225, lng: 72.5714 },
    description: 'World\'s finest textile collection',
    established: '1949',
    highlights: 'Textiles, costumes, tapestries',
    image: '/static/images/img1.jpg',
    interest: true
  },
  'raja-kelkar-pune': {
    name: 'Raja Dinkar Kelkar Museum',
    type: 'science',
    location: 'Pune',
    coordinates: { lat: 18.5204, lng: 73.8567 },
    description: 'Collection of Indian artifacts and cultural items',
    established: '1962',
    highlights: 'Artifacts, musical instruments, household items',
    image: '/static/images/img2.jpg',
    interest: false
  }
};

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for anchor links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Contact form handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');
            
            // Simple validation
            if (!name || !email || !subject || !message) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            // Submit to backend API
            showNotification('Sending message...', 'info');
            fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, subject, message })
            })
            .then(async (res) => {
                let data = {};
                try { data = await res.json(); } catch (_) {}
                if (!res.ok || data.success === false) {
                    const err = (data && (data.error || data.message)) || 'Failed to send message.';
                    throw new Error(err);
                }
                return data;
            })
            .then(() => {
                showNotification('Thank you! Your message has been sent successfully.', 'success');
                contactForm.reset();
            })
            .catch((error) => {
                showNotification(`Could not send message: ${error.message}`, 'error');
            });
        });
    }

    // Animate statistics on scroll
    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateStatistics();
                }
            });
        });
        observer.observe(statsSection);
    }

    // Add fade-in animation to sections
    const sections = document.querySelectorAll('section');
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    });

    sections.forEach(section => {
        sectionObserver.observe(section);
    });

    // Initialize museum map functionality
    initializeMuseumMap();
    
    // Initialize booking form functionality
    initializeBookingForm();
    
    // Load museum list
    loadMuseumList();
    
    // Load recent bookings
    loadRecentBookings();
    
    // Load AI recommendations
    loadAIRecommendations();
});

// Initialize museum map functionality
function initializeMuseumMap() {
    const mapFilters = document.querySelectorAll('.map-filter');
    const museumMarkers = document.querySelectorAll('.museum-marker');
    const detailsPanel = document.getElementById('museumDetailsPanel');
    const closePanel = document.getElementById('closePanel');
    const selectedMuseumName = document.getElementById('selectedMuseumName');
    const panelContent = document.getElementById('panelContent');

    // Map filter functionality
    mapFilters.forEach(filter => {
        filter.addEventListener('click', function() {
            // Remove active class from all filters
            mapFilters.forEach(f => f.classList.remove('active'));
            // Add active class to clicked filter
            this.classList.add('active');
            
            const filterType = this.getAttribute('data-type');
            filterMuseums(filterType);
        });
    });

    // Museum marker click functionality
    museumMarkers.forEach(marker => {
        marker.addEventListener('click', function() {
            const lat = this.getAttribute('data-lat');
            const lng = this.getAttribute('data-lng');
            const type = this.getAttribute('data-type');
            const interest = this.getAttribute('data-interest') === 'true';
            
            // Find museum data
            const museum = findMuseumByCoordinates(lat, lng);
            if (museum) {
                showMuseumDetails(museum);
            }
        });
    });

    // Close panel functionality
    if (closePanel) {
        closePanel.addEventListener('click', function() {
            detailsPanel.classList.remove('active');
        });
    }
}

// Filter museums based on type
function filterMuseums(filterType) {
    const museumMarkers = document.querySelectorAll('.museum-marker');
    
    museumMarkers.forEach(marker => {
        const markerType = marker.getAttribute('data-type');
        const interest = marker.getAttribute('data-interest') === 'true';
        
        if (filterType === 'all' || 
            (filterType === 'interest' && interest) || 
            markerType === filterType) {
            marker.style.display = 'block';
            marker.style.opacity = '1';
        } else {
            marker.style.opacity = '0.3';
        }
    });
}

// Find museum by coordinates
function findMuseumByCoordinates(lat, lng) {
    for (const [key, museum] of Object.entries(museumData)) {
        if (museum.coordinates.lat.toString() === lat && 
            museum.coordinates.lng.toString() === lng) {
            return { key, ...museum };
        }
    }
    return null;
}

// Show museum details in panel
function showMuseumDetails(museum) {
    const detailsPanel = document.getElementById('museumDetailsPanel');
    const selectedMuseumName = document.getElementById('selectedMuseumName');
    const panelContent = document.getElementById('panelContent');

    selectedMuseumName.textContent = museum.name;
    
    panelContent.innerHTML = `
        <div class="museum-detail-content active">
            <img src="${museum.image}" alt="${museum.name}">
            <h4>${museum.name}</h4>
            
            <div class="detail-item">
                <strong>Type:</strong>
                <span>${museum.type.charAt(0).toUpperCase() + museum.type.slice(1)} Museum</span>
            </div>
            
            <div class="detail-item">
                <strong>Location:</strong>
                <span>${museum.location}</span>
            </div>
            
            <div class="detail-item">
                <strong>Established:</strong>
                <span>${museum.established}</span>
            </div>
            
            <div class="detail-item">
                <strong>Description:</strong>
                <span>${museum.description}</span>
            </div>
            
            <div class="detail-item">
                <strong>Highlights:</strong>
                <span>${museum.highlights}</span>
            </div>
            
            <div class="museum-actions">
                <button class="book-museum-btn" onclick="bookMuseum('${museum.key}')">
                    <i class="fas fa-calendar-plus"></i> Book Visit
                </button>
                <button class="view-details-btn" onclick="viewMuseumDetails('${museum.key}')">
                    <i class="fas fa-info-circle"></i> More Info
                </button>
            </div>
        </div>
    `;
    
    detailsPanel.classList.add('active');
}

// Load museum list
function loadMuseumList() {
    const museumList = document.getElementById('museumList');
    if (!museumList) return;

    // Fetch personalized recommendations
    fetch('/api/personalized-recommendations')
        .then(response => response.json())
        .then(data => {
            let html = '';
            
            if (data.length === 0) {
                html = '<p>No personalized recommendations available. Book some museums to get recommendations!</p>';
            } else {
                data.forEach(museum => {
                    html += `
                        <div class="museum-list-item">
                            <h4>
                                ${getMuseumIcon(museum.Type)}
                                ${museum.Name}
                            </h4>
                            <span class="museum-type">${museum.Type.charAt(0).toUpperCase() + museum.Type.slice(1)}</span>
                            <p>${museum.City}, ${museum.State}</p>
                            <div class="museum-location">
                                <i class="fas fa-map-marker-alt"></i>
                                Based on your booking history
                            </div>
                        </div>
                    `;
                });
            }
            
            museumList.innerHTML = html;
        })
        .catch(error => {
            console.error('Error loading personalized recommendations:', error);
            if (museumList) {
                museumList.innerHTML = '<p>Error loading recommendations. Please try again later.</p>';
            }
        });
}

// Get museum icon based on type
function getMuseumIcon(type) {
    const icons = {
        'art': '🎨',
        'history': '🏛️',
        'science': '🔬',
        'cultural': '🏺'
    };
    return icons[type] || '🏛️';
}

// Book museum function
function bookMuseum(museumKey) {
    const museum = museumData[museumKey];
    if (museum) {
        // Scroll to booking section and pre-fill museum
        scrollToSection('booking');
        setTimeout(() => {
            const museumSelect = document.getElementById('museumSelect');
            if (museumSelect) {
                // Add museum to select if not exists
                const option = document.createElement('option');
                option.value = museumKey;
                option.textContent = museum.name;
                museumSelect.appendChild(option);
                museumSelect.value = museumKey;
            }
        }, 500);
    }
}

// View museum details function
function viewMuseumDetails(museumKey) {
    const museum = museumData[museumKey];
    if (museum) {
        // Could open a modal or navigate to detailed page
        showNotification(`Opening detailed view for ${museum.name}`, 'info');
    }
}

// Initialize booking form functionality
function initializeBookingForm() {
    const bookingForm = document.getElementById('bookingForm');
    if (!bookingForm) return;

    // Update booking summary in real-time
    const formInputs = bookingForm.querySelectorAll('input, select');
    formInputs.forEach(input => {
        input.addEventListener('change', updateBookingSummary);
        input.addEventListener('input', updateBookingSummary);
    });

    // Form submission
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const museum = formData.get('museumSelect');
        const date = formData.get('visitDate');
        const time = formData.get('visitTime');
        const people = formData.get('numPeople');
        const tourType = formData.get('tourType');
        
        if (!museum || !date || !time || !people || !tourType) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Simulate booking
        showNotification('Processing your booking...', 'info');
        
        setTimeout(() => {
            showNotification('Booking confirmed! Check your email for details.', 'success');
            bookingForm.reset();
            updateBookingSummary();
        }, 2000);
    });
}

// Update booking summary
function updateBookingSummary() {
    const museumSelect = document.getElementById('museumSelect');
    const visitDate = document.getElementById('visitDate');
    const visitTime = document.getElementById('visitTime');
    const numPeople = document.getElementById('numPeople');
    const tourType = document.getElementById('tourType');
    
    const summaryMuseum = document.getElementById('summaryMuseum');
    const summaryDate = document.getElementById('summaryDate');
    const summaryTime = document.getElementById('summaryTime');
    const summaryPeople = document.getElementById('summaryPeople');
    const summaryTourType = document.getElementById('summaryTourType');
    const summaryTotal = document.getElementById('summaryTotal');
    
    if (summaryMuseum) summaryMuseum.textContent = museumSelect.value || '-';
    if (summaryDate) summaryDate.textContent = visitDate.value || '-';
    if (summaryTime) summaryTime.textContent = visitTime.value || '-';
    if (summaryPeople) summaryPeople.textContent = numPeople.value || '-';
    if (summaryTourType) summaryTourType.textContent = tourType.value || '-';
    
    // Calculate total
    const people = parseInt(numPeople.value) || 0;
    const basePrice = 500; // Base price per person
    const total = people * basePrice;
    if (summaryTotal) summaryTotal.textContent = `₹${total}`;
}

// Load recent bookings
function loadRecentBookings() {
    const recentBookings = document.getElementById('recentBookings');
    const noBookings = document.getElementById('noBookings');
    
    if (!recentBookings) return;
    
    // Simulate recent bookings data
    const bookings = [
        {
            museum: 'National Museum, Delhi',
            date: '2025-01-15',
            time: '10:00',
            status: 'upcoming',
            type: 'history'
        },
        {
            museum: 'Salar Jung Museum',
            date: '2024-12-20',
            time: '14:00',
            status: 'completed',
            type: 'art'
        }
    ];
    
    if (bookings.length === 0) {
        if (noBookings) noBookings.style.display = 'block';
        if (recentBookings) recentBookings.style.display = 'none';
    } else {
        if (noBookings) noBookings.style.display = 'none';
        if (recentBookings) recentBookings.style.display = 'grid';
        
        let html = '';
        bookings.forEach(booking => {
            html += `
                <div class="booking-card">
                    <h4>${booking.museum}</h4>
                    <div class="booking-info">
                        <span><i class="fas fa-calendar"></i> ${booking.date}</span>
                        <span><i class="fas fa-clock"></i> ${booking.time}</span>
                        <span><i class="fas fa-tag"></i> ${booking.type}</span>
                    </div>
                    <div class="booking-status status-${booking.status}">
                        ${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </div>
                </div>
            `;
        });
        
        recentBookings.innerHTML = html;
    }
}

// Load AI recommendations
function loadAIRecommendations() {
    const aiRecommendations = document.getElementById('aiRecommendations');
    if (!aiRecommendations) return;
    
    // Simulate AI recommendations based on user interests
    const recommendations = [
        {
            museum: 'National Gallery of Modern Art',
            reason: 'Based on your interest in contemporary art',
            type: 'art',
            rating: 4.8
        },
        {
            museum: 'Calico Museum of Textiles',
            reason: 'Matches your history and cultural interests',
            type: 'history',
            rating: 4.6
        },
        {
            museum: 'Albert Hall Museum',
            reason: 'Recommended for cultural exploration',
            type: 'cultural',
            rating: 4.5
        }
    ];
    
    let html = '';
    recommendations.forEach(rec => {
        html += `
            <div class="recommendation-item">
                <h4>${getMuseumIcon(rec.type)} ${rec.museum}</h4>
                <p>${rec.reason}</p>
                <div class="recommendation-stats">
                    <span><i class="fas fa-star"></i> ${rec.rating}</span>
                    <span><i class="fas fa-tag"></i> ${rec.type}</span>
                </div>
            </div>
        `;
    });
    
    aiRecommendations.innerHTML = html;
}

// Scroll to section function
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Animate statistics numbers
function animateStatistics() {
    const statNumbers = document.querySelectorAll('.stat-card h3');
    
    statNumbers.forEach(stat => {
        const finalValue = stat.textContent;
        const isNumber = /^\d+/.test(finalValue);
        
        if (isNumber) {
            const targetNumber = parseInt(finalValue.replace(/\D/g, ''));
            const suffix = finalValue.replace(/\d/g, '');
            let currentNumber = 0;
            const increment = targetNumber / 50;
            
            const timer = setInterval(() => {
                currentNumber += increment;
                if (currentNumber >= targetNumber) {
                    currentNumber = targetNumber;
                    clearInterval(timer);
                }
                stat.textContent = Math.floor(currentNumber) + suffix;
            }, 50);
        }
    });
}

// Navigation functions
function navigateVisiter(path) {
    window.location.href = "/visitor_pages/index";
}

function navigateAdmin(path) {
    window.location.href = "/admin";
}

// Add CSS for notifications
const notificationStyles = `
    .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }
    
    .notification-close:hover {
        opacity: 0.8;
    }
    
    .notification-message {
        flex: 1;
    }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Add scroll-to-top functionality
function addScrollToTop() {
    const scrollButton = document.createElement('button');
    scrollButton.innerHTML = '<i class="fas fa-arrow-up"></i>';
    scrollButton.className = 'scroll-to-top';
    scrollButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--btn-bg);
        color: white;
        border: none;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.2rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        opacity: 0;
        visibility: hidden;
        z-index: 1000;
    `;
    
    document.body.appendChild(scrollButton);
    
    // Show/hide scroll button
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
            scrollButton.style.opacity = '1';
            scrollButton.style.visibility = 'visible';
        } else {
            scrollButton.style.opacity = '0';
            scrollButton.style.visibility = 'hidden';
        }
    });
    
    // Scroll to top functionality
    scrollButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Hover effects
    scrollButton.addEventListener('mouseenter', () => {
        scrollButton.style.background = 'var(--btn-hover)';
        scrollButton.style.transform = 'translateY(-2px)';
    });
    
    scrollButton.addEventListener('mouseleave', () => {
        scrollButton.style.background = 'var(--btn-bg)';
        scrollButton.style.transform = 'translateY(0)';
    });
}

// Initialize scroll-to-top button
document.addEventListener('DOMContentLoaded', addScrollToTop);



