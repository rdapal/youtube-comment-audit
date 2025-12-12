/**
 * Service to interact with Perspective API.
 * Our main workhorse of determining toxicity of past comments to flag while scraping.
 */
const API_ENDPOINT = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";

export const Analyzer = {
  /**
   * Analyzes a text string for toxicity using Google's Perspective API.
   * @param {string} text - The comment body.
   * @param {string} apiKey - User's personal API key.
   * @returns {Promise<number>} - Toxicity score (0.0 to 1.0)
   */
  checkToxicity: async (text, apiKey) => {
    if (!apiKey) throw new Error("API Key missing");

    try {
      const response = await fetch(`${API_ENDPOINT}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: { text: text },
          languages: ["en"],
          requestedAttributes: { TOXICITY: {} }
        })
      });

      const data = await response.json();
      
      if (data.attributeScores) {
        return data.attributeScores.TOXICITY.summaryScore.value;
      }
      return 0;
    } catch (error) {
      console.error("Analysis failed", error);
      return 0; // Fail safe
    }
  }
};
