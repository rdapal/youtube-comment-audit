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

            // 2. Traversal: Go up exactly 4 levels based on debugging
      // Level 1: div -> Level 2: div -> Level 3: Header -> Level 4: Content Container
      const card = btn.parentElement?.parentElement?.parentElement?.parentElement;

      if (card) {
        // 3. Extract and Clean Text
        // We split by newlines (or implicit block breaks) to separate the metadata
        const rawLines = card.innerText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        
        // HEURISTIC: Find the user's content line
        const likelyComment = rawLines.find(line => {
          // --- IGNORE LIST ---
          if (line === "YouTube") return false;               // The Logo text
          if (line === "YouTube comment") return false;       // Old header style
          if (line.startsWith("Commented on")) return false;  // Context line
          if (line.startsWith("You commented on")) return false;
          if (line.includes("• Details")) return false;       // Timestamp footer
          if (line === "Delete") return false;                // Button text
          
          // If it's not any of those, it's the comment!
          return true;
        });

        if (likelyComment && likelyComment.length > 0) { 
           candidates.push({
            id: `comment_${index}_${Date.now()}`,
            text: likelyComment,
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
