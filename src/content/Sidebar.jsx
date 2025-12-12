import React, { useState, useEffect, useRef } from 'react';
import { DOMScanner } from './Scraper';
import { Analyzer } from './Analyzer';
import { 
  Card, Button, Typography, List, 
  ThemeProvider, createTheme, CssBaseline, Box, Chip, LinearProgress, IconButton 
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';

const BATCH_SIZE = 50; 
const RATE_LIMIT_DELAY = 1200; // Our API limiter - up this if you want more power 
// this is made for free use of API ~ 1.2 seconds (Safe for 60 QPS limit of API)

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
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Keep track of scanned texts to prevent duplicates in the UI
  const scannedTextCache = useRef(new Set());

  useEffect(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['perspectiveApiKey'], (result) => {
        setApiKey(result.perspectiveApiKey);
      });
    }
  }, []);

  const handleScan = async () => {
    if (!apiKey) {
      alert("⚠️ API Key missing.");
      return;
    }

    setIsScanning(true);
    setScanStatus('Reading DOM...');
    
    // 1. Get Candidates
    const allCandidates = DOMScanner.scanVisibleItems();
    
    // 2. Filter Duplicates (Don't re-scan things we already have in the list)
    const newCandidates = allCandidates.filter(c => !scannedTextCache.current.has(c.text));
    
    const batch = newCandidates.slice(0, BATCH_SIZE);

    if (batch.length === 0) {
      setScanStatus('No new comments visible. Scroll down!');
      setIsScanning(false);
      return;
    }

    setProgress({ current: 0, total: batch.length });
    const toxicCandidates = [];

    // 3. Process Batch
    for (let i = 0; i < batch.length; i++) {
      const item = batch[i];
      setProgress({ current: i + 1, total: batch.length });
      setScanStatus(`Analyzing (${i+1}/${batch.length})...`);

      try {
        // RATE LIMITER
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY)); 

        const scores = await Analyzer.checkToxicity(item.text, apiKey);

        // --- AUDIT HEURISTIC ---
        // 1. SEVERE_TOXICITY (Hate speech, threats) -> Always flag if > 0.4
        // 2. INSULT (Personal attacks) -> Flag if > 0.6
        // 3. TOXICITY (General) -> Only flag if VERY high (> 0.8) to avoid false positives Ex : "you're killing it" = +- 70%.
        
        const isToxic = 
          scores.severeToxicity > 0.4 || 
          scores.insult > 0.6 || 
          scores.toxicity > 0.85;

        console.log(`[${i+1}] "${item.text.substring(0, 15)}..." | Tox:${scores.toxicity.toFixed(2)} Ins:${scores.insult.toFixed(2)} Sev:${scores.severeToxicity.toFixed(2)} | Flagged: ${isToxic}`);
        
        // Add to cache so we don't scan again
        scannedTextCache.current.add(item.text);

        if (isToxic) {
          toxicCandidates.push({ 
            ...item, 
            scores: scores 
          });
        }
      } catch (err) {
        if (err.message === "RATE_LIMIT") {
          console.warn("Hit Rate Limit. Pausing for 5 seconds...");
          await new Promise(r => setTimeout(r, 5000));
          i--; // Retry this item
        } else {
          console.error(err);
        }
      }
    }

    setComments(prev => [...prev, ...toxicCandidates]);
    setScanStatus(toxicCandidates.length > 0 ? `Found ${toxicCandidates.length} issues.` : 'Batch clean.');
    setIsScanning(false);
  };

  const handleDelete = (id) => {
    const target = comments.find(c => c.id === id);
    if (target) {
      DOMScanner.deleteItem(target.deleteButtonRef);
      setComments(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleIgnore = (id) => {
    setComments(prev => prev.filter(c => c.id !== id));
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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <SecurityIcon color="primary" sx={{ fontSize: 30, mr: 1.5 }} />
          <Typography variant="h6" fontWeight="bold">Comment Audit</Typography>
        </Box>

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
        
        {isScanning && <LinearProgress variant="determinate" value={(progress.current / progress.total) * 100} sx={{ mb: 2 }} />}
        
        <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block', textAlign: 'center' }}>
          {scanStatus}
        </Typography>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
          <List>
            {comments.map((comment) => (
              <Card 
                key={comment.id} 
                variant="outlined" 
                sx={{ mb: 2, p: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  {comment.scores.severeToxicity > 0.4 && <Chip label="HATE" color="error" size="small" />}
                  {comment.scores.insult > 0.6 && <Chip label="INSULT" color="warning" size="small" />}
                  {comment.scores.toxicity > 0.8 && <Chip label="TOXIC" color="default" size="small" />}
                </Box>
                
                <Typography variant="body2" sx={{ mb: 2, color: '#e0e0e0' }}>"{comment.text}"</Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    startIcon={<DeleteIcon />} color="error" variant="outlined" 
                    onClick={() => handleDelete(comment.id)} fullWidth
                  >
                    Delete
                  </Button>
                  <IconButton onClick={() => handleIgnore(comment.id)} size="small">
                    <VisibilityOffIcon />
                  </IconButton>
                </Box>
              </Card>
            ))}
          </List>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Sidebar;