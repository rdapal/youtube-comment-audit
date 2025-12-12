import React from 'react';
import { createRoot } from 'react-dom/client';
import Sidebar from './Sidebar';

// Create a container div for our app
const appContainer = document.createElement('div');
appContainer.id = 'comment-detox-root';
document.body.appendChild(appContainer);

// Mount React
const root = createRoot(appContainer);
root.render(<Sidebar />);
