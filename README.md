# Youtube Comment Audit: AI-Powered YouTube Comment Moderation & Cleanup Tool

YouTube Comment Audit is a client-side Chrome extension that helps users review and clean up potentially offensive or regretabble YouTube comments from their Google activity history using semantic analysis powered by Google's Perspective API.
Unlike the history bulk deletion tool offered by YouTube, this extension emphasizes user control, it flags comments to be reivewed by users for deletion before any action is taken.

## Why?
Many users want to:
- Review old comments they no longer stand behind.
- Improve their online footprint without deleting all of it or embarking in time-expensive manually reviewing.
- Understand how modern AI models interpret their language and toxicity.
- Reflect on the way they portray themselves online and give them a "call-to-action" in modifying their behaviors.

Google provides powerful moderation models, but no end-user tooling as of 12/13/2025 integrates them into personal activity review. This project bridges that gap responsbily.

## Key Features

- Semantic Comment Analysis:
|-> Uses Google Perspective API (Transformer-based NLP models)
|-> Detects toxicity, insults, threats and abusive language using a customized heuristic.
|-> Goes beyond simple keyword matching with AI

- User Review
|-> Comments are flagged and NOT auto-deleted
|-> Users confirm deletions individually
|-> Clear visibility into WHY a comment was flagged by Perspective API

- UI Overlay
|-> React-based dashboard injected into myactivity.google.com
|-> Designed to survive obfuscated class names and UI changes using a customized web scraper
|-> Uses native browser themes for enhanced accesibility and customization

- Privacy
|-> Users supply their own API key
|-> API key is stored locally in the browser
|-> No analytics, tracking or third-part servers
|-> No data is persisted outside of Google's API processing 


## Ethics & Responsible Use
- Only analyzes publicaly visible comments.
- No background automiation or slient actions
- No scraping beyond the active page
- No credential interception
- Designed for research, moderation awarness and UX design.

## Tech Stack
- **Core:** React 18, Vite, Manifest V3
- **Analysis:** Google Perspective API (TensorFlow models)
- **DOM:** Custom scraping heuristics to handle obfuscated React class names.

## Screenshots

## Installation & Usage
0. Get a free Perspective API Key from [Google Cloud Console](https://console.cloud.google.com/).
As of 12/13/2025 to get a key you must apply for a developer one! Apply at Perspective API (https://support.perspectiveapi.com/s/request-api-access?language=en_US)

1. Clone the repo.
git clone https://github.com/your-username/youtube-comment-audit
cd youtube-comment-audit

2. Install Dependencies & Build
npm install
npm run build

3. Load the Extension
Open Chrome -> Extensions -> Load Unpacked -> Select `dist` folder.

4. Open the Extension, paste your Perspective API key (ensure billing is enabled on Google Cloud Console) and start your audit!

