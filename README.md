![Dive Log App Hero Image](./assets/hero-dive.jpg)

# Dive Log App

A full-stack dive log application built with Convex backend and modern web technologies for tracking and logging scuba diving sessions.

## Overview

Dive Log App is a real-time dive logging platform that allows divers to record their dive sessions, track buddies, monitor dive statistics, and maintain a comprehensive dive journal.

## Features

- **Real-time Sync**: Powered by Convex for seamless data synchronization
- **Dive Logging**: Record dive details including location, depth, duration, and conditions
- **Buddy Management**: Track dive buddies and create dive groups
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
