# Kiseki Record

Your Personal AI Life Operating System. A private, local-first personal life-record desktop application that helps you track every aspect of your life with AI assistance.

## Repository Structure

This repository contains two main projects:
- `/app` - The Electron desktop application.
- `/website` - The landing page and documentation website.

## Getting Started

If you have just downloaded or cloned this repository from GitHub, you need to install the dependencies before running the application or website.

### Running the Desktop App

1. Open your terminal and navigate to the `app` folder:
   ```bash
   cd app
   ```
2. Install the necessary dependencies (this is required before running the app!):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Running the Website

1. Open your terminal and navigate to the `website` folder:
   ```bash
   cd website
   ```
2. Install the necessary dependencies:
   ```bash
   npm install
   ```
3. Start the website development server:
   ```bash
   npm run dev
   ```

## Building for Production

To build the executable `.exe` file for Windows:
```bash
cd app
npm run build
```
