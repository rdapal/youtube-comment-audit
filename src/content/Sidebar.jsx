import React, { useState, useEffect, useRef } from 'react';
import { DOMScanner } from './Scraper';
import { Analyzer } from './Analyzer';
import { 
  Card, Button, Typography, List, FormControlLabel, Switch, 
  ThemeProvider, createTheme, CssBaseline, Box, Chip, LinearProgress, IconButton 
} from '@mui/material';
// Icons
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import StopCircleIcon from '@mui/icons-material/StopCircle';

const BATCH_SIZE = 50; 
const RATE_LIMIT_DELAY = 1200; // Our API limiter - up this if you want more power 
// this is made for free use of API ~ 1.2 seconds (Safe for 60 QPS limit of API)
const SCROLL_DELAY = 3000; // 3 second wait after scrolling to load more comments

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#ff0033' },
    background: { paper: '#0f0f0f', default: '#0f0f0f' },
  },
  typography: { fontFamily: 'Roboto, Arial, sans-serif' },
});

const Sidebar = () => {
  const [comments, setComments] = useState([]); // ONLY toxic ones
  const [apiKey, setApiKey] = useState(null);
  
  // State for Infinite Loop
  const [isScanning, setIsScanning] = useState(false);
  const [isInfiniteMode, setIsInfiniteMode] = useState(false);
  const [stopSignal, setStopSignal] = useState(false); // Kill switch

  // Stats
  const [scanStatus, setScanStatus] = useState('');
  const [stats, setStats] = useState({ scanned: 0, toxicFound: 0 });

  // Cache to prevent duplicate API calls (String Set)
  const scannedTextCache = useRef(new Set());
  // Ref to access current state inside async loops
  const isInfiniteRef = useRef(isInfiniteMode);

  useEffect(() => {
    isInfiniteRef.current = isInfiniteMode;
  }, [isInfiniteMode]);

  useEffect(() => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['perspectiveApiKey'], (result) => {
        setApiKey(result.perspectiveApiKey);
      });
    }
  }, []);

  // --- THE SCROLL HELPER ---
  const attemptScrollDown = async () => {
    setScanStatus('Scrolling to load more...');
    const previousHeight = document.body.scrollHeight;
    
    window.scrollTo(0, document.body.scrollHeight);
    
    // Wait for network to load comments
    await new Promise(r => setTimeout(r, SCROLL_DELAY));
    
    const newHeight = document.body.scrollHeight;
    // Return true if we actually loaded new stuff
    return newHeight > previousHeight;
  };

  // Main AUDIT logic
  const startAudit = async () => {
    if (!apiKey) return alert("⚠️ API Key missing.");
    
    setIsScanning(true);
    setStopSignal(false);
    
    // THE MAIN LOOP
    while (true) {
      if (stopSignal) break; // User clicked Stop

      setScanStatus('Scanning DOM...');
      
      // 1. Scan DOM
      const allCandidates = DOMScanner.scanVisibleItems();
      
      // 2. Filter out texts we have ALREADY checked in previous batches
      const freshCandidates = allCandidates.filter(c => !scannedTextCache.current.has(c.text));
      
      console.log(`Audit: Found ${allCandidates.length} total, ${freshCandidates.length} new.`);

      // 3. If we have fresh items, process them
      if (freshCandidates.length > 0) {
        // Take a batch
        const batch = freshCandidates.slice(0, BATCH_SIZE);
        await processBatch(batch);
        
        // If user wanted to stop during the batch
        if (stopSignal) break; 
      } 
      
      // 4. Decision Time: Done or Scroll?
      if (freshCandidates.length < BATCH_SIZE) {
        if (isInfiniteRef.current) {
          const success = await attemptScrollDown();
          if (!success) {
            setScanStatus('End of history reached.');
            break; 
          }
        } else {
          setScanStatus('Batch done. Scroll for more.');
          break; 
        }
      }
    }

    setIsScanning(false);
    setStopSignal(false);
  };

  const processBatch = async (batch) => {
    const toxicBatch = [];

    for (let i = 0; i < batch.length; i++) {
      if (stopSignal) return;

      const item = batch[i];
      setScanStatus(`Analyzing (${i+1}/${batch.length}) in batch...`);
      
      try {
        await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
        const scores = await Analyzer.checkToxicity(item.text, apiKey);
        
        // Mark as processed so we never check this text again
        scannedTextCache.current.add(item.text);

        // --- AUDIT HEURISTIC ---
        // 1. SEVERE_TOXICITY (Hate speech, threats) -> Always flag if > 0.4
        // 2. INSULT (Personal attacks) -> Flag if > 0.6
        // 3. TOXICITY (General) -> Only flag if VERY high (> 0.8) to avoid false positives Ex : "you're killing it" = +- 70%.
        
        const isToxic = 
          scores.severeToxicity > 0.4 || 
          scores.insult > 0.6 || 
          scores.toxicity > 0.85;

        console.log(`[${i+1}] "${item.text.substring(0, 15)}..." | Tox:${scores.toxicity.toFixed(2)} Ins:${scores.insult.toFixed(2)} Sev:${scores.severeToxicity.toFixed(2)} | Flagged: ${isToxic}`);
        
        
        // Update Scan Count Stats
        setStats(prev => ({ ...prev, scanned: prev.scanned + 1 }));

        if (isToxic) {
          // Push to local batch array
          toxicBatch.push({ ...item, scores });
          
          // Update Toxic Count Stats
          setStats(prev => ({ ...prev, toxicFound: prev.toxicFound + 1 }));
          
          // Debug Log
          console.log(`[FLAGGED] "${item.text.substring(0,20)}..." | Tox:${scores.toxicity}`);
        }

      } catch (err) {
        if (err.message === "RATE_LIMIT") {
           console.warn("Rate Limit hit. Pausing 5s...");
           await new Promise(r => setTimeout(r, 5000));
           i--; // Retry this item
        } else {
           console.error("API Error", err);
        }
      }
    }

    // Add found toxic items to the main UI list
    setComments(prev => [...prev, ...toxicBatch]);
  };

  const handleStop = () => {
    setStopSignal(true);
    setScanStatus('Stopping...');
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
        {/* HEADER */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SecurityIcon color="primary" sx={{ fontSize: 30, mr: 1.5 }} />
          <Typography variant="h6" fontWeight="bold">Comment Audit</Typography>
        </Box>

        {/* STATS */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, bgcolor: '#222', p: 1, borderRadius: 1 }}>
            <Box>
                <Typography variant="caption" color="gray">SCANNED</Typography>
                <Typography variant="h6">{stats.scanned}</Typography>
            </Box>
            <Box>
                <Typography variant="caption" color="gray">TOXIC</Typography>
                <Typography variant="h6" color="error">{stats.toxicFound}</Typography>
            </Box>
        </Box>

        {/* CONTROLS */}
        <Box sx={{ mb: 2 }}>
            <FormControlLabel
                control={
                    <Switch 
                        checked={isInfiniteMode} 
                        onChange={(e) => setIsInfiniteMode(e.target.checked)} 
                        disabled={isScanning}
                        color="primary"
                    />
                }
                label={<Typography variant="body2">Infinite Auto-Scroll Mode</Typography>}
            />
            
            {!isScanning ? (
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={startAudit} 
                    fullWidth
                    startIcon={<CleaningServicesIcon />}
                    sx={{ py: 1.5, fontWeight: 'bold' }}
                >
                    {isInfiniteMode ? "Start Infinite Audit" : "Scan Visible Page"}
                </Button>
            ) : (
                <Button 
                    variant="contained" 
                    color="error" 
                    onClick={handleStop} 
                    fullWidth
                    startIcon={<StopCircleIcon />}
                    sx={{ py: 1.5, fontWeight: 'bold' }}
                >
                    STOP AUDIT
                </Button>
            )}
        </Box>
        
        {isScanning && <LinearProgress sx={{ mb: 1 }} />}
        
        <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block', textAlign: 'center' }}>
          {scanStatus}
        </Typography>

        {/* LIST */}
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