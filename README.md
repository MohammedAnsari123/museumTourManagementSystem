# PixelPast Museum - Enhanced Booking System

## Overview
PixelPast Museum is a comprehensive museum management and booking platform that allows visitors to search, explore, and book tours at various museums across India.

## New Features - Enhanced Museum Booking Section

### 🎯 Museum Search & Discovery
- **Real-time Search**: Search museums by name, city, state, or type
- **Dynamic Filtering**: Filter by museum type and city with data loaded from CSV
- **Interactive Results**: Hover over search results to see detailed museum information
- **Smart Suggestions**: Get relevant museum recommendations based on your search

### 📅 Comprehensive Booking System
- **Detailed Visitor Information**: 
  - Primary visitor name, email, phone
  - Age group selection
  - Number of people (1-20)
  - Special requests and accessibility needs
  - Emergency contact information

- **Tour Options**:
  - Guided Tour (₹500/person)
  - Self-Guided Tour (₹200/person)
  - Virtual Tour (₹100/person)
  - Group Tour (₹300/person, 10% discount for 5+ people)
  - Educational Tour (₹400/person)

- **Smart Scheduling**:
  - Different time slots for weekdays vs weekends
  - Minimum booking date (next day)
  - Real-time availability updates

### 💰 Dynamic Pricing & Summary
- **Live Price Calculation**: Real-time total calculation based on tour type and number of people
- **Group Discounts**: Automatic 10% discount for group bookings
- **Detailed Summary**: Complete booking summary with all details
- **Pricing Information**: Clear pricing details for each tour type

### 🔍 CSV Integration
- **Museum Database**: Integrated with `final_museums.csv` containing 1700+ museums
- **Dynamic Filters**: Filter options automatically populated from CSV data
- **Real-time Search**: Search through all museum data instantly
- **Location Data**: Access to museum coordinates, establishment dates, and types

### 📱 User Experience Features
- **Responsive Design**: Works seamlessly on all devices
- **Interactive Elements**: Hover effects, tooltips, and smooth animations
- **Form Validation**: Comprehensive validation with helpful error messages
- **QR Code Generation**: Automatic QR code generation for tickets
- **Success Notifications**: Clear feedback for all user actions

## Technical Implementation

### Backend (Flask)
- **Enhanced API Endpoints**: 
  - `/api/book` - Comprehensive booking with visitor details
  - `/api/museum-filters` - Dynamic filter options from CSV
  - `/api/exhibitions` - Museum data for search and display
  - `/api/museum-locations` - Geo points from `final_museums.csv`
  - `/api/contact` - Sends email via Gmail SMTP (env vars required)
  - `/api/foreign-visitors`, `/api/foreign-visitors-by-district` - Admin analytics (requires login)
  - `/api/admin/*` - Admin endpoints: passkeys, bookings, analytics (requires login)

- **Data Management**: 
  - Enhanced CSV structure for detailed bookings
  - QR code generation for tickets
  - Comprehensive error handling

### Frontend (JavaScript)
- **MuseumBookingSystem Class**: Main booking system controller
- **Real-time Search**: Instant search with debouncing
- **Dynamic Filtering**: Multi-criteria museum filtering
- **Form Management**: Comprehensive form handling and validation
- **Interactive UI**: Tooltips, pricing info, and dynamic updates

### CSS Styling
- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Mobile-first responsive design
- **Interactive Elements**: Hover effects, animations, and transitions
- **Accessibility**: High contrast and readable typography

## Documentation
- See `LIBRARIES.md` for a detailed description of all imported libraries used in this project.

## File Structure
```
├── app.py                          # Flask backend (routes/APIs)
├── final_museums.csv               # Museum database (1700+ entries)
├── foreign.csv                     # Foreign visitors dataset (admin analytics)
├── bookingDB                       # CSV data store for bookings (single file)
├── templates/                      # HTML templates (visitor/admin/chatbot)
├── static/                         # CSS/JS/images
│   └── qrcodes/                    # Generated QR PNGs for tickets
├── ml_recommendations.py           # ML utilities (TF‑IDF, similarity, nearby)
├── chatbot.py                      # Gemini-powered chatbot
├── db_utils.py                     # MongoDB helpers and auth utilities
├── requirements.txt                # Python dependencies
└── LIBRARIES.md                    # Library documentation
```

## Usage Instructions

### 1. Search for Museums
- Use the search bar to find museums by name, city, or type
- Apply filters to narrow down results
- Hover over results to see detailed information

### 2. Select Museum
- Click "Select" on your preferred museum
- Museum will be automatically added to the booking form

### 3. Fill Booking Details
- Choose visit date and time
- Select number of people and tour type
- Fill in visitor information
- Add special requests if needed

### 4. Review and Confirm
- Check the booking summary
- Verify all details
- Accept terms and conditions
- Submit booking

### 5. Receive Confirmation
- Get instant confirmation
- Download QR code ticket
- Save ticket ID for reference

## Features in Detail

### Museum Search
- **Real-time Search**: Type to search with instant results
- **Multi-criteria**: Search by name, city, state, or type
- **Smart Filtering**: Combine search with type and city filters
- **Results Display**: Clean, organized search results with museum details

### Booking Form
- **Visitor Information**: Complete visitor details collection
- **Tour Selection**: Multiple tour types with clear pricing
- **Date & Time**: Smart scheduling with availability considerations
- **Special Requests**: Accommodation for accessibility and special needs

### Booking Summary
- **Live Updates**: Real-time summary as you fill the form
- **Price Calculation**: Automatic total calculation
- **Complete Details**: All booking information in one place
- **Professional Layout**: Clean, organized summary display

### QR Code System
- **Automatic Generation**: QR codes generated for each booking
- **Downloadable**: Save QR codes for offline use
- **Comprehensive Data**: QR codes contain all essential booking information
- **Professional Format**: Clean, scannable QR code design

## Technical Features

### Performance
- **Efficient Search**: Optimized search algorithms
- **Lazy Loading**: Load data as needed
- **Responsive UI**: Smooth interactions and animations

### Security
- **Input Validation**: Comprehensive form validation
- **Data Sanitization**: Safe data handling
- **Error Handling**: Graceful error management

### Accessibility
- **Screen Reader Support**: Proper ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **High Contrast**: Readable color schemes
- **Responsive Design**: Works on all device sizes

## Future Enhancements

### Planned Features
- **Payment Integration**: Online payment processing
- **Email Confirmations**: Automated email notifications
- **Booking Management**: User dashboard for managing bookings
- **Review System**: Post-visit feedback and ratings
- **Social Sharing**: Share museum experiences on social media

### Technical Improvements
- **Caching**: Implement Redis caching for better performance
- **API Rate Limiting**: Protect against abuse
- **Database Optimization**: Improve query performance
- **Mobile App**: Native mobile application

## Installation & Setup

### Prerequisites
- Python 3.10+
- MongoDB running locally (or a connection string)
- Python packages (installed via `requirements.txt`): Flask, pandas, numpy, scikit-learn, qrcode, Pillow, pymongo, google-generativeai

### Setup
1. Clone the repository
2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```
3. Configure environment variables
   - Gmail SMTP for contact form:
     - `GMAIL_USER` = your Gmail address
     - `GMAIL_APP_PASSWORD` = Gmail App Password (not your normal password)
   - Gemini API (chatbot):
     - `GENAI_API_KEY` = your Gemini API key
   - MongoDB (optional override):
     - `MONGO_URI` = e.g., `mongodb://localhost:27017`
4. Ensure MongoDB is running and accessible
5. Run the application
   ```bash
   python app.py
   ```
6. Open: `http://localhost:5000`

## Contributing
Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

---

**PixelPast Museum** - Bringing the past to life through technology and innovation. 