import React, { useState, useEffect } from 'react';
import { DOMScanner } from './Scraper';
import { Analyzer } from './Analyzer';
import { 
  Card, Button, Typography, List, IconButton, 
  ThemeProvider, createTheme, CssBaseline, Box, Chip, CircularProgress 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';

// Create a dark theme that matches YouTube
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ff0033', // YouTube Red
    },
    background: {
      paper: '#0f0f0f', // YouTube Dark Background
      default: '#0f0f0f',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
});

const Sidebar = () => {
  const [comments, setComments] = useState([]);
  const [apiKey, setApiKey] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');

  // Load API Key on mount
  useEffect(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['perspectiveApiKey'], (result) => {
        setApiKey(result.perspectiveApiKey);
      });
    }
  }, []);

  const handleScan = async () => {
    if (!apiKey) {
      alert("⚠️ API Key missing. Please open the extension icon and save your key.");
      return;
    }

    setIsScanning(true);
    setScanStatus('Scanning DOM...');
    
    // DEBUG LOG
    console.log("Audit: Starting scan...");

    // 1. Get DOM elements
    const candidates = DOMScanner.scanVisibleItems();
    console.log(`Audit: Found ${candidates.length} candidates`);
    
    if (candidates.length === 0) {
      setScanStatus('No visible comments found. Scroll down!');
      setIsScanning(false);
      return;
    }

    setScanStatus(`Analyzing ${candidates.length} items...`);
    
    const toxicCandidates = [];

    // 2. Check each one
    for (const item of candidates) {
      // Small artificial delay to prevent rate limiting
      await new Promise(r => setTimeout(r, 50)); 
      
      const score = await Analyzer.checkToxicity(item.text, apiKey);
      console.log(`Audit: "${item.text.substring(0, 20)}..." Score: ${score}`);

      // THRESHOLD: Show if > 60% toxic
      if (score > 0.6) {
        toxicCandidates.push({ ...item, score: score.toFixed(2) });
      }
    }

    setComments(prev => [...prev, ...toxicCandidates]);
    setScanStatus(toxicCandidates.length > 0 ? 'Scan complete.' : 'No toxic comments found in this batch.');
    setIsScanning(false);
  };

  const handleDelete = (id) => {
    const target = comments.find(c => c.id === id);
    if (target) {
      DOMScanner.deleteItem(target.deleteButtonRef);
      setComments(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{
        position: 'fixed', 
        right: 0, 
        top: 0, 
        width: '400px', 
        height: '100vh',
        backgroundColor: 'rgba(15, 15, 15, 0.95)', // Glass effect
        backdropFilter: 'blur(10px)',
        zIndex: 2147483647, // Max Z-Index to stay on top
        boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
        borderLeft: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        padding: 3
      }}>
        
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SecurityIcon color="primary" sx={{ fontSize: 30, mr: 1.5 }} />
          <Typography variant="h6" fontWeight="bold">
            YouTube Comment Audit
          </Typography>
        </Box>

        {/* Actions */}
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleScan} 
          disabled={isScanning}
          fullWidth
          startIcon={isScanning ? <CircularProgress size={20} color="inherit"/> : <CleaningServicesIcon />}
          sx={{ py: 1.5, mb: 2, fontWeight: 'bold' }}
        >
          {isScanning ? "Auditing..." : "Scan Visible Page"}
        </Button>
        
        {scanStatus && (
          <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block', textAlign: 'center' }}>
            {scanStatus}
          </Typography>
        )}

        {/* Results List */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
          <List>
            {comments.map((comment) => (
              <Card 
                key={comment.id} 
                variant="outlined" 
                sx={{ 
                  mb: 2, 
                  p: 2, 
                  borderColor: 'rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.02)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip 
                    label={`${(comment.score * 100).toFixed(0)}% TOXIC`} 
                    color="error" 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>
                
                <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0', fontStyle: 'italic' }}>
                  "{comment.text}"
                </Typography>
                
                <Button 
                  startIcon={<DeleteIcon />} 
                  color="error" 
                  size="small"
                  variant="text"
                  onClick={() => handleDelete(comment.id)}
                  fullWidth
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Delete permanently
                </Button>
              </Card>
            ))}
          </List>
          
          {comments.length === 0 && !isScanning && (
             <Typography variant="body2" color="textSecondary" textAlign="center" mt={4}>
               Scroll down on the page to load more comments, then click Scan.
             </Typography>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Sidebar;