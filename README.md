![Dive Log App Hero Image](./assets/hero-dive.jpg)

# Dive Log App

A full-stack dive log application built with Convex backend and modern web technologies for tracking and logging scuba diving sessions.

## Overview

Dive Log App is a real-time dive logging platform that allows divers to record their dive sessions, track buddies, monitor dive statistics, and maintain a comprehensive dive journal. You only need to register with your Google account and you are ready to go.

## Features

- **Dive Logging**: Record dive details including location (connected to Google maps API), depth, duration, and conditions
- **A photo and a webpage instead of a stamp**: To certify dives clubs normally have a stamp for paper logbooks. For each dive in this electronic form, you add the name of the club. A link to the club webpage can be entered manually but it is also suggested by the app through google search API. To further verify it and to make great memories each dive is certified the verification photo is required. The photo is added to a specific folder in google drive and the link to the photo is stored in the backend. 
- **Safety checks**: On top of the above logging fields this app has a simple check for each logged dive: buddy check done and briefing done/received.
  with the explanation for both. This reminds the diver of the essential safety procedures at every log. 
- **Statistics**: Monitor total dives, depths, and dive history
- **Cloud Backend**: Scalable Convex database with real-time updates
- **Responsive UI**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React / Next.js
- **Backend**: Convex
- **Database**: Convex Real-time Database
- **Authentication**: Convex Auth
- **Styling**: Tailwind CSS / shadcn/ui

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn
- Convex account

### Installation

```bash
# Clone the repository
git clone https://github.com/opsabarsec/dive-log-app.git
cd dive-log-app

# Install dependencies
npm install

# Setup Convex
npx convex dev

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Structure

```
dive-log-app/
├── convex/           # Convex backend (functions, schema)
├── src/             # React/Next.js frontend
├── public/          # Static assets
├── package.json
├── .env.local       # Environment variables (local)
├── tsconfig.json
├── next.config.js
├─┠ .gitignore
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

## API Documentation

API endpoints and Convex functions are documented in the `convex/` directory.

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
