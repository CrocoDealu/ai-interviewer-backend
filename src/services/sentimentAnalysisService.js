class SentimentAnalysisService {
  constructor() {
    // Common stop words to filter out
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'i', 'me', 'my', 'we', 'our', 'you',
      'your', 'they', 'them', 'their', 'this', 'these', 'those', 'have',
      'had', 'do', 'does', 'did', 'can', 'could', 'should', 'would'
    ]);

    // Positive sentiment words with weights
    this.positiveWords = {
      'excellent': 3, 'amazing': 3, 'outstanding': 3, 'fantastic': 3,
      'great': 2, 'good': 2, 'wonderful': 2, 'awesome': 2, 'love': 2,
      'excited': 2, 'passionate': 2, 'confident': 2, 'successful': 2,
      'accomplished': 2, 'proud': 2, 'happy': 2, 'pleased': 2,
      'nice': 1, 'fine': 1, 'okay': 1, 'positive': 1, 'yes': 1,
      'sure': 1, 'definitely': 1, 'absolutely': 1, 'certainly': 1,
      'enjoy': 1, 'like': 1, 'appreciate': 1, 'thank': 1, 'thanks': 1
    };

    // Negative sentiment words with weights
    this.negativeWords = {
      'terrible': -3, 'awful': -3, 'horrible': -3, 'hate': -3,
      'bad': -2, 'poor': -2, 'difficult': -2, 'hard': -2, 'problem': -2,
      'issue': -2, 'struggle': -2, 'failed': -2, 'failure': -2,
      'worried': -2, 'concerned': -2, 'frustrated': -2, 'disappointed': -2,
      'no': -1, 'not': -1, 'never': -1, 'nothing': -1, 'nobody': -1,
      'unfortunately': -1, 'sorry': -1, 'apologize': -1, 'mistake': -1,
      'wrong': -1, 'challenging': -1, 'tough': -1
    };

    // Confidence indicators
    this.confidenceWords = {
      'confident': 2, 'sure': 2, 'certain': 2, 'definitely': 2,
      'absolutely': 2, 'clearly': 1, 'obviously': 1, 'exactly': 1,
      'precisely': 1, 'specifically': 1, 'believe': 1, 'think': 0,
      'maybe': -1, 'perhaps': -1, 'possibly': -1, 'might': -1,
      'unsure': -2, 'uncertain': -2, 'confused': -2, 'doubt': -2
    };
  }

  filterText(text) {
    // Convert to lowercase and remove punctuation
    const cleaned = text.toLowerCase().replace(/[^\w\s]/g, ' ');
    
    // Split into words and filter out stop words
    const words = cleaned.split(/\s+/).filter(word => 
      word.length > 2 && !this.stopWords.has(word)
    );
    
    return words;
  }

  analyzeSentiment(text, timestamp) {
    const words = this.filterText(text);
    let sentimentScore = 0;
    let confidenceScore = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let totalWords = words.length;

    // Analyze each word
    words.forEach(word => {
      if (this.positiveWords[word]) {
        sentimentScore += this.positiveWords[word];
        positiveCount++;
      }
      if (this.negativeWords[word]) {
        sentimentScore += this.negativeWords[word];
        negativeCount++;
      }
      if (this.confidenceWords[word] !== undefined) {
        confidenceScore += this.confidenceWords[word];
      }
    });

    // Normalize scores
    const normalizedSentiment = totalWords > 0 ? sentimentScore / totalWords : 0;
    const normalizedConfidence = totalWords > 0 ? confidenceScore / totalWords : 0;

    // Determine sentiment category
    let sentimentCategory;
    if (normalizedSentiment > 0.3) sentimentCategory = 'positive';
    else if (normalizedSentiment < -0.3) sentimentCategory = 'negative';
    else sentimentCategory = 'neutral';

    // Determine confidence level
    let confidenceLevel;
    if (normalizedConfidence > 0.3) confidenceLevel = 'high';
    else if (normalizedConfidence < -0.3) confidenceLevel = 'low';
    else confidenceLevel = 'medium';

    return {
      timestamp,
      sentiment: {
        score: Math.round(normalizedSentiment * 100) / 100,
        category: sentimentCategory,
        positiveWords: positiveCount,
        negativeWords: negativeCount
      },
      confidence: {
        score: Math.round(normalizedConfidence * 100) / 100,
        level: confidenceLevel
      },
      wordCount: totalWords,
      filteredWords: words
    };
  }

  getOverallSentiment(analyses) {
    if (!analyses || analyses.length === 0) return null;

    const avgSentiment = analyses.reduce((sum, analysis) => 
      sum + analysis.sentiment.score, 0) / analyses.length;
    
    const avgConfidence = analyses.reduce((sum, analysis) => 
      sum + analysis.confidence.score, 0) / analyses.length;

    const totalPositive = analyses.reduce((sum, analysis) => 
      sum + analysis.sentiment.positiveWords, 0);
    
    const totalNegative = analyses.reduce((sum, analysis) => 
      sum + analysis.sentiment.negativeWords, 0);

    return {
      averageSentiment: Math.round(avgSentiment * 100) / 100,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      totalPositiveWords: totalPositive,
      totalNegativeWords: totalNegative,
      sentimentTrend: this.calculateTrend(analyses.map(a => a.sentiment.score)),
      confidenceTrend: this.calculateTrend(analyses.map(a => a.confidence.score))
    };
  }

  calculateTrend(scores) {
    if (scores.length < 2) return 'stable';
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const difference = secondAvg - firstAvg;
    
    if (difference > 0.2) return 'improving';
    if (difference < -0.2) return 'declining';
    return 'stable';
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService();