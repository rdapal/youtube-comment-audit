# Youtube Comment Audit: AI-Powered YouTube History Cleaner

A Privacy Control tool that utilizes Semantic Analysis (Google Perspective API) to identify and delete offensive comments from your YouTube history without wiping your entire digital footprint.

## Features
- **Semantic Heuristics:** Uses Perspective API's Transformer-based models to detect toxicity, not just keyword matching.
- **Comment FLagging:** Users review flagged comments before deletion and can confirm for individual comments.
- **React Overlay:** Creates a usable dashboard into `myactivity.google.com`.
- **Privacy:** Your data is analyzed using your own API key; no data is saved anywhere besides by Google which already has your comment history.

## Tech Stack
- **Core:** React 18, Vite, Manifest V3
- **Analysis:** Google Perspective API (TensorFlow models)
- **DOM:** Custom scraping heuristics to handle obfuscated React class names.

## Installation Guide
1. Clone the repo.
2. Run `npm install` and `npm run build`.
3. Open Chrome -> Extensions -> Load Unpacked -> Select `dist` folder.
4. Get a free API Key from [Google Cloud Console](https://console.cloud.google.com/).
