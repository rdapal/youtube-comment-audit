/**
 * Service to interact with Perspective API.
 * Our main workhorse of determining toxicity of past comments to flag while scraping.
 */
const API_ENDPOINT = "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";

export const Analyzer = {
  /**
   * Analyzes a text string for toxicity using Google's Perspective API.
   * @param {string} text - The comment body.
   * @param {string} apiKey - User's personal API key fully local chrome storage.
   * - Returns our "how bad is it" comment rating object {toxicity, severeToxicity, insult}
   * @returns {Promise<Object>} 
   * Many different factors could be considered from the powerful Perspective API,
   * however as of this version we take only basic identifiers 
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
          // REQUEST MORE NUANCE
          requestedAttributes: { 
            TOXICITY: {}, 
            SEVERE_TOXICITY: {},
            INSULT: {}
          }
        })
      });

      // Handle Rate Limiting gracefully
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }

      const data = await response.json();
      
      if (data.attributeScores) {
        return {
          toxicity: data.attributeScores.TOXICITY.summaryScore.value,
          severeToxicity: data.attributeScores.SEVERE_TOXICITY.summaryScore.value,
          insult: data.attributeScores.INSULT.summaryScore.value
        };
      }
      return { toxicity: 0, severeToxicity: 0, insult: 0 };
    } catch (error) {
      if (error.message === "RATE_LIMIT") throw error;
      console.error("Analysis failed", error);
      return { toxicity: 0, severeToxicity: 0, insult: 0 };
    }
  }
}; 