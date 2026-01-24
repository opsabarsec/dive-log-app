![Dive Log App Hero Image](./assets/hero-dive.jpg)

# Dive Log App

A full-stack dive log application built with Convex backend and modern web technologies for tracking and logging scuba diving sessions.

## Overview

Dive Log App is a real-time dive logging platform that allows divers to record their dive sessions, track buddies, monitor dive statistics, and maintain a comprehensive dive journal. You only need to register with your Google account and you are ready to go.

## Features

- **Interactive Location Picker**: Select dive locations using an interactive map with Leaflet + OpenStreetMap + Geoapify
  - Click-to-select locations on map
  - Search with autocomplete geocoding
  - Drag markers to fine-tune position
  - Automatic reverse geocoding for addresses
  - GPS coordinates stored with each dive
- **Dive Logging**: Record comprehensive dive details including depth, duration, temperature, visibility, and conditions
- **A photo and a webpage instead of a stamp**: To certify dives clubs normally have a stamp for paper logbooks. For each dive in this electronic form, you add the name of the club. A link to the club webpage can be entered manually but it is also suggested by the app through search API. To further verify it and to make great memories each dive is certified the verification photo is required. The photo is added to convex storage and the link to the photo is stored in the backend.
- **Safety checks**: On top of the above logging fields this app has a simple check for each logged dive: buddy check done and briefing done/received.
  with the explanation for both. This reminds the diver of the essential safety procedures at every log.
- **Statistics**: Monitor total dives, depths, and dive history
- **Cloud Backend**: Scalable Convex database with real-time updates
- **Responsive UI**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React / Next.js 14
- **Backend**: Convex
- **Database**: Convex Real-time Database
- **Authentication**: Convex Auth
- **Styling**: Tailwind CSS / shadcn/ui
- **UI Components**: PrimeReact
- **Maps**: Leaflet + react-leaflet
- **Map Data**: OpenStreetMap via Geoapify
- **Geocoding**: Geoapify API

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Convex account
- Geoapify API key (free tier: 3,000 requests/day)

### Installation

```bash
# Clone the repository
git clone https://github.com/opsabarsec/dive-log-app.git
cd dive-log-app

# Install dependencies
npm install

# Configure environment variables
# Copy .env.example to .env.local and add your API keys
cp .env.example .env.local
# Add your Geoapify API key to .env.local

# Setup Convex
npx convex dev

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Demo Pages

- **Map Demo**: `http://localhost:3000` - Interactive location picker demo
- **Dive Form**: `http://localhost:3000/demo-form` - Complete dive logging form with map integration

## Project Structure

```
dive-log-app/
├── app/                    # Next.js 14 app directory
│   ├── page.tsx           # Map demo page
│   └── demo-form/         # Dive form demo
├── components/
│   ├── map/               # Map components (LocationPicker, BaseMap)
│   └── forms/             # Form components (DiveForm)
├── lib/
│   ├── geocoding.ts       # Geoapify API utilities
│   └── types/             # TypeScript type definitions
├── convex/                # Convex backend
│   ├── schema.ts          # Database schema
│   └── dives.ts           # Dive mutations/queries
├── assets/                # Static assets
├── package.json
├── .env.local            # Environment variables (local)
├── tsconfig.json
└── next.config.js
```

## Development

### Running the Development Server

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## Deployment

The application can be deployed to Vercel or other hosting platforms:

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy

## Documentation

- **[MAP_IMPLEMENTATION.md](MAP_IMPLEMENTATION.md)** - Complete guide to map components and setup
- **[LOCATION_INTEGRATION.md](LOCATION_INTEGRATION.md)** - How to integrate location data with Convex
- **[PRIMEREACT_SETUP.md](PRIMEREACT_SETUP.md)** - PrimeReact component library setup and usage
- Convex API functions are documented in the `convex/` directory

## Contributing

Contributions are welcome! Please follow the standard GitHub flow:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open a GitHub issue or contact the maintainer.

## Author

Marco Berta - [GitHub](https://github.com/opsabarsec)

---

**Stay safe and happy diving!**
