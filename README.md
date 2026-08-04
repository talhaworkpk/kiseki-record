# Kiseki Record Website

Official website for Kiseki Record - Your Personal AI Life Operating System.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Lucide React** - Icons

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Navigate to the website directory:
```bash
cd website
```

2. Install dependencies:
```bash
npm install
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the website.

### Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
website/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable components
│   │   ├── Navigation.tsx
│   │   └── Footer.tsx
│   ├── sections/        # Page sections
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Screenshots.tsx
│   │   ├── Download.tsx
│   │   ├── Changelog.tsx
│   │   ├── FAQ.tsx
│   │   ├── Privacy.tsx
│   │   └── Contact.tsx
│   ├── config/          # Configuration files
│   │   └── appConfig.ts # App-wide configuration
│   ├── data/            # Static data
│   │   ├── features.ts
│   │   └── faq.ts
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── tailwind.config.js   # Tailwind configuration
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

## Configuration

### Updating Download Information

To update the latest version information, edit `src/config/appConfig.ts`:

```typescript
latestRelease: {
  version: '1.0.0',
  downloadUrl: 'https://...',
  fileSize: '85 MB',
  releaseDate: '2024-08-04',
  sha256: '...',
  portableUrl: 'https://...',
  portableFileSize: '82 MB',
}
```

### Updating Changelog

Add new entries to the `changelog` array in `src/config/appConfig.ts`.

### Updating Features

Edit `src/data/features.ts` to add or modify feature cards.

### Updating FAQ

Edit `src/data/faq.ts` to add or modify FAQ items.

## Customization

### Colors

The website uses CSS custom properties for theming. Modify the color values in `src/index.css` under the `:root` and `.dark` selectors.

### Styling

The website uses Tailwind CSS with custom utilities for glassmorphism effects. These are defined in `src/index.css` under the `@layer utilities` section.

## Deployment

The website can be deployed to any static hosting service:

- **Netlify**: Connect your GitHub repository and enable automatic builds
- **Vercel**: Import your repository and deploy
- **GitHub Pages**: Use the `dist` folder as the publishing source

## Future Enhancements

The website is structured to easily add:

- Blog section
- Documentation pages
- Update checker API
- Download statistics
- News/announcements
- Community showcase
- Theme customization
- Plugin marketplace
- Roadmap page
- Support/ticket system

## License

This website is part of the Kiseki Record project and follows the same license.
