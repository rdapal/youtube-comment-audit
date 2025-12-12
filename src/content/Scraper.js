/**
 * DOM Utility service to handle Google's obfuscated class names.
 * Our scraping strategy: Anchor to the 'Delete' button and traverse up to find comment content
 */

export const DOMScanner = {
  /**
   * Scans the currently visible viewport for comment cards.
   * @returns {Array} Array of candidate objects { id, text, domNode }
   */
  scanVisibleItems: () => {
    // 1. Find all "X" buttons. 
    // Note: In a real app, we'd handle multi-language support for aria-labels. For this version we hard code english aria.
    const deleteButtons = document.querySelectorAll('[aria-label*="Delete"]');
    
    const candidates = [];

    deleteButtons.forEach((btn, index) => {
      // Avoid re-scanning items
      if (btn.dataset.detoxScanned) return;

      // 2. Traverse up to the container (The "Card")
      // We look for a container that has role="article" OR is a few levels up
      const card = btn.closest('[role="article"]') || btn.parentElement?.parentElement?.parentElement;

      if (card) {
        // 3. Smart Text Extraction
        // We split by newlines to separate headers from content
        const rawLines = card.innerText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        
        // HEURISTIC: The comment is usually the longest line that isn't a known header
        const likelyComment = rawLines.find(line => {
          // Filter out known Google headers
          if (line.includes("YouTube comment")) return false;
          if (line.includes("You commented on")) return false;
          if (line.includes("• Details")) return false;
          if (line.match(/^[A-Z][a-z]{2}\s\d{1,2},\s\d{4}/)) return false; // Date regex (e.g. Dec 12, 2025)
          if (line === "Delete") return false;
          return true;
        });

        // Fallback: If heuristic fails, just take the raw text but clean it
        const finalDelayText = likelyComment || rawLines.join(" ");

        if (finalDelayText && finalDelayText.length > 1) { 
           candidates.push({
            id: `comment_${index}_${Date.now()}`,
            text: finalDelayText, // Send this cleaner text to API
            deleteButtonRef: btn 
          });
        }
        
        // Mark as scanned
        btn.dataset.detoxScanned = "true";
      }
    });

    return candidates;
  },

  /**
   * Function responsbile for deleting comments
   * Clicks the specific button associated with a comment.
   * @param {HTMLElement} buttonElement 
   */
  deleteItem: (buttonElement) => {
    if (buttonElement && buttonElement.click) {
      buttonElement.click();
      // We just click the delete x which as of 12/11/2025 is the way to delete from the history page
      console.log("Audit: Deleted item.");
    }
  }
};
