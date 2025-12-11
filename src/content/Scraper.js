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
      // Avoid re-scanning items we already processed (add a data-attribute to mark them)
      if (btn.dataset.detoxScanned) return;

      // 2. Traverse up to the container (The comment "card")
      // The hierarchy usually changes, so we use closest() or parentElement safety checks
      const card = btn.closest('[role="article"]') || btn.parentElement?.parentElement?.parentElement;

      if (card) {
        // 3. Extract Text
        // We clean newlines to make sending to API cheaper/cleaner
        const rawText = card.innerText || "";
        const cleanText = rawText
          .replace(/Delete activity item/gi, "")
          .replace(/YouTube comment/gi, "")
          .replace(/\n/g, " ")
          .trim();

        if (cleanText.length > 2) { // Ignore empty or tiny artifacts
           candidates.push({
            id: `comment_${index}_${Date.now()}`,
            text: cleanText,
            deleteButtonRef: btn // Store the reference to the DOM element
          });
        }
        
        // Mark as scanned in DOM so we don't duplicate on next scroll
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
      console.log("Attempting deletion...");
    }
  }
};
