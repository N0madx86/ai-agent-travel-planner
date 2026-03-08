# AI Travel Planner - Frontend

Beautiful, modern React + Vite frontend for the AI Travel Planner application.

## 🎨 Features

- ✨ **Modern UI** - Clean, professional design with Tailwind CSS
- 🚀 **Lightning Fast** - Built with Vite for instant dev server and HMR
- 📱 **Fully Responsive** - Works perfectly on mobile, tablet, and desktop
- 🎭 **Beautiful Animations** - Smooth transitions and micro-interactions
- 🏨 **Hotel Search** - Real-time hotel search with beautiful cards
- 🤖 **AI Integration** - Ready for AI itinerary generation
- 🎯 **Type-Safe** - Clean component architecture

## 📦 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Next generation frontend tooling
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Lucide React** - Beautiful icons
- **date-fns** - Date manipulation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Backend API running on `http://localhost:8000`

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Start development server
npm run dev
```

The app will open at **http://localhost:3000**

## 📁 Project Structure

```
travel-planner-ui/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   └── Navbar.jsx
│   ├── pages/          # Page components
│   │   ├── HomePage.jsx
│   │   ├── PlanTripPage.jsx
│   │   ├── MyTripsPage.jsx
│   │   └── TripDetailPage.jsx
│   ├── services/       # API services
│   │   └── api.js
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎯 Pages

### Home Page (`/`)
- Hero section with CTA
- Features showcase
- Stats section
- Beautiful gradients and animations

### Plan Trip (`/plan`)
- Multi-step trip planning form
- Date picker
- Budget selection
- Interest tags
- Traveler count

### My Trips (`/trips`)
- Grid of all user trips
- Trip cards with key info
- Click to view details

### Trip Detail (`/trips/:id`)
- Full trip information
- Hotel search and display
- AI itinerary generation
- Beautiful hotel cards with images

## 🎨 Design System

### Colors
- **Primary**: Blue gradient (sky-500 to sky-700)
- **Accent**: Purple/Pink accents
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: Bold, large sizes
- **Body**: Regular weight, comfortable reading size

### Components
- **Buttons**: `.btn-primary`, `.btn-secondary`
- **Cards**: `.card`, `.card-hover`
- **Inputs**: `.input-field`
- **Badges**: `.badge`, `.badge-primary`

## 🔌 API Integration

The app connects to your FastAPI backend through:

```javascript
// src/services/api.js
const API_BASE_URL = 'http://localhost:8000';

// Trips
tripsAPI.create(data)
tripsAPI.getAll()
tripsAPI.getOne(id)

// Hotels
hotelsAPI.search(params)
hotelsAPI.getAll()

// Itineraries
itinerariesAPI.generate(tripId)
itinerariesAPI.get(tripId)
```

## 🚀 Build for Production

```bash
npm run build
```

Builds the app for production to `dist/` folder.

## 📝 Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

For production, update to your deployed backend URL.

## 🎨 Customization

### Change Colors

Edit `tailwind.config.js`:

```javascript
colors: {
  primary: {
    // Your color palette
  }
}
```

### Add New Pages

1. Create file in `src/pages/YourPage.jsx`
2. Add route in `src/App.jsx`
3. Add nav link in `src/components/Navbar.jsx`

## 🐛 Troubleshooting

### API Connection Issues
- Verify backend is running on port 8000
- Check CORS settings in backend
- Verify `.env` file has correct API URL

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📱 Responsive Design

- **Mobile**: Stacked layout, touch-friendly
- **Tablet**: 2-column grids
- **Desktop**: Full 3-4 column layouts

## ✨ Features to Hand Off

For your developer (Antigravity) to implement:

1. **Authentication** - Add user login/signup
2. **State Management** - Consider React Context or Zustand
3. **Error Boundaries** - Add error handling components
4. **Loading States** - More skeleton loaders
5. **Offline Support** - Add service worker
6. **Analytics** - Add tracking events
7. **Testing** - Add unit and integration tests

## 🎯 What's Included

✅ Complete UI for all core features
✅ Trip planning flow
✅ Hotel search with beautiful cards
✅ AI itinerary display
✅ Responsive design
✅ Modern animations
✅ API integration ready
✅ Production-ready build

## 📚 Resources

- [React Docs](https://react.dev)
- [Vite Docs](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

---

**Built with ❤️ for AI Travel Planner**
