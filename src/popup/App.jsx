import React, { useState, useEffect } from 'react';
import './App.css'; 

function App() {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
	  // Your API key is stored locally in chrome storage and no-where else!
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['perspectiveApiKey'], (result) => {
        if (result.perspectiveApiKey) {
          setApiKey(result.perspectiveApiKey);
        }
      });
    }
  }, []);

  const handleSave = () => {
    if (!apiKey) {
      setStatus('Please enter a key.');
      return;
    }
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ perspectiveApiKey: apiKey }, () => {
        setStatus('Saved!');
        setTimeout(() => setStatus(''), 2000);
      });
    }
  };

  const openActivityPage = () => {
    // Check if we can use the Tabs API
    if (chrome.tabs) {
      // As of 12/11/2025 this is the correct link
      const targetUrl = "https://myactivity.google.com/page?page=youtube_comments";
      
      // Optional: Check if tab is already open to avoid duplicates
      chrome.tabs.query({}, (tabs) => {
        const existingTab = tabs.find(t => t.url && t.url.includes("page=youtube_comments"));
        if (existingTab) {
          chrome.tabs.update(existingTab.id, { active: true });
        } else {
          chrome.tabs.create({ url: targetUrl });
        }
      });
    } else {
      // Fallback for local testing outside extension
      window.open("https://myactivity.google.com/page?page=youtube_comments", "_blank");
    }
  };

  return (
    <div style={{ width: '320px', padding: '15px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, flexGrow: 1, fontSize: '1.2rem' }}>YouTube Comment Audit</h2>
        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
          Perspective API Key
        </label>
        <input 
          type="password" 
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste AIzaSy... key here"
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
        />
        <button 
          onClick={handleSave} 
          style={{ 
            marginTop: '8px', 
            width: '100%', 
            padding: '8px', 
            backgroundColor: '#1976d2', 
            color: 'white', 
            border: 'none', 
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Save Key
        </button>
        {status && <p style={{ color: 'green', fontSize: '0.8rem', marginTop: '5px' }}>{status}</p>}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '15px 0' }} />

      <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
        Actions
      </label>
      <button 
        onClick={openActivityPage}
        style={{ 
          width: '100%', 
          padding: '10px', 
          backgroundColor: '#d32f2f', 
          color: 'white', 
          border: 'none', 
          cursor: 'pointer',
          borderRadius: '4px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>🚀</span> Launch Comment Audit on YouTube
      </button>
      <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px' }}>
        Clicking this will open your Google Activity page where the Comment Audit Sidebar will automatically load.
      </p>
    </div>
  );
}

export default App;
