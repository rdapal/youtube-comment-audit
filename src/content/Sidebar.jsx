import React, { useState, useEffect } from 'react';
import { DOMScanner } from './Scraper';
import { Analyzer } from './Analyzer';
import { 
  Card, Button, Typography, List, 
  ThemeProvider, createTheme, CssBaseline, Box, Chip, LinearProgress 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';

// --- CONFIGURATION ---
const BATCH_SIZE = 50; // Safety limit to prevent API bans, basically google limits us to I think 60 a minute, so we have to batch our API calls.
const TOXICITY_THRESHOLD = 0.50; // Our threshold of what is considered toxic FEAUTRE POTENTIAL : add slider to modify

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ff0033' },
    background: { paper: '#0f0f0f', default: '#0f0f0f' },
  },
  typography: { fontFamily: 'Roboto, Arial, sans-serif' },
});

const Sidebar = () => {
  const [comments, setComments] = useState([]);
  const [apiKey, setApiKey] = useState(null);
  
  // State for UI Feedback
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
    setScanStatus('Identifying comments in DOM...');
    
    // 1. Get ALL DOM elements
    const allCandidates = DOMScanner.scanVisibleItems();
    
    // 2. Apply Batch Limit
    const batch = allCandidates.slice(0, BATCH_SIZE);
    
    console.log(`Audit: DOM contains ${allCandidates.length} items. Processing batch of ${batch.length}.`);

    if (batch.length === 0) {
      setScanStatus('No un-scanned comments visible. Scroll down!');
      setIsScanning(false);
      return;
    }

    // Init Progress
    setProgress({ current: 0, total: batch.length });
    
    const toxicCandidates = [];

    // 3. Process Batch
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      
      // Update UI Progress
      setProgress({ current: i + 1, total: batch.length });
      setScanStatus(`Analyzing...`);

      try {
        // Rate Limit Protection: 1 request every 100ms (approx 10/sec) lower than google limit
        // If you get lots of errors in console, increase this number. Could be us timing out.
        await new Promise(r => setTimeout(r, 100)); 

        const score = await Analyzer.checkToxicity(item.text, apiKey);

        // --- DEBUG LOGGING ---
        // Look at your Chrome Developer Console to see these!
        console.log(`[${i+1}/${batch.length}] Score: ${score.toFixed(2)} | Text: "${item.text.substring(0, 30)}..."`);
        
        if (score > TOXICITY_THRESHOLD) {
          toxicCandidates.push({ ...item, score: score.toFixed(2) });
        }
      } catch (err) {
        console.error("API Error for item:", item, err);
      }
    }

    setComments(prev => [...prev, ...toxicCandidates]);
    setScanStatus(toxicCandidates.length > 0 ? `Found ${toxicCandidates.length} potential issues.` : 'Batch clean. Scroll down & scan again.');
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
        position: 'fixed', right: 0, top: 0, width: '400px', height: '100vh',
        backgroundColor: 'rgba(15, 15, 15, 0.98)',
        zIndex: 2147483647,
        boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
        borderLeft: '1px solid #333',
        display: 'flex', flexDirection: 'column', padding: 3
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
          startIcon={isScanning ? null : <CleaningServicesIcon />}
          sx={{ py: 1.5, mb: 1, fontWeight: 'bold' }}
        >
          {isScanning ? `Analyzing ${progress.current}/${progress.total}` : "Scan Next 50 Items"}
        </Button>
        
        {isScanning && (
          <LinearProgress 
            variant="determinate" 
            value={(progress.current / progress.total) * 100} 
            sx={{ mb: 2, borderRadius: 1 }}
          />
        )}
        
        <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block', textAlign: 'center' }}>
          {scanStatus || "Scroll down to load comments, then Scan."}
        </Typography>

        {/* Results List */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
          <List>
            {comments.map((comment) => (
              <Card 
                key={comment.id} 
                variant="outlined" 
                sx={{ 
                  mb: 2, p: 2, 
                  borderColor: comment.score > 0.8 ? '#ff4444' : 'rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.02)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip 
                    label={`${(comment.score * 100).toFixed(0)}% TOXIC`} 
                    color={comment.score > 0.8 ? "error" : "warning"} 
                    size="small" 
                  />
                </Box>
                
                <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>
                  "{comment.text}"
                </Typography>
                
                <Button 
                  startIcon={<DeleteIcon />} 
                  color="error" 
                  size="small"
                  variant="outlined"
                  onClick={() => handleDelete(comment.id)}
                  fullWidth
                >
                  Delete permanently
                </Button>
              </Card>
            ))}
          </List>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Sidebar;