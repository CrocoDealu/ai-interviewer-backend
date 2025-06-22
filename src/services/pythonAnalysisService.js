import dotenv from 'dotenv';

dotenv.config();

class PythonAnalysisService {
  constructor() {
    this.pythonServerUrl = process.env.PYTHON_SERVER_URL || 'http://localhost:5000';
    this.timeout = 30000; // 30 seconds timeout
  }

  async makeRequest(endpoint, data) {
    try {
      const response = await fetch(`${this.pythonServerUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Python server error: ${response.status} - ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Python analysis service error (${endpoint}):`, error);
      throw error;
    }
  }

  async analyzeSentiment(text, timestamp) {
    try {
      return await this.makeRequest('/analyze/sentiment', {
        text,
        timestamp
      });
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      // Return fallback response
      return {
        timestamp,
        error: 'Sentiment analysis service unavailable',
        fallback: true,
        sentiment: {
          polarity: 0,
          subjectivity: 0.5,
          category: 'neutral',
          intensity: 0
        }
      };
    }
  }

  async analyzeVoice(text, timestamp, duration = null) {
    try {
      return await this.makeRequest('/analyze/voice', {
        text,
        timestamp,
        duration
      });
    } catch (error) {
      console.error('Voice analysis failed:', error);
      // Return fallback response
      const wordCount = text.split(' ').length;
      const estimatedWPM = duration ? Math.round((wordCount / duration) * 60) : 150;
      
      return {
        timestamp,
        error: 'Voice analysis service unavailable',
        fallback: true,
        speaking_pace: {
          words_per_minute: estimatedWPM,
          word_count: wordCount,
          pace_category: 'normal'
        },
        filler_words: {
          total: 0,
          breakdown: {},
          unique_fillers: 0
        }
      };
    }
  }

  async analyzeFacialExpression(timestamp, imageData = null) {
    try {
      return await this.makeRequest('/analyze/facial', {
        timestamp,
        image_data: imageData
      });
    } catch (error) {
      console.error('Facial analysis failed:', error);
      // Return fallback response
      return {
        timestamp,
        error: 'Facial analysis service unavailable',
        fallback: true,
        facial_expression: {
          primary: {
            expression: 'neutral',
            confidence: 0.8
          }
        },
        engagement: {
          level: 'medium',
          score: 0.6
        }
      };
    }
  }

  async comprehensiveAnalysis(text, timestamp, duration = null, imageData = null) {
    try {
      return await this.makeRequest('/analyze/comprehensive', {
        text,
        timestamp,
        duration,
        image_data: imageData
      });
    } catch (error) {
      console.error('Comprehensive analysis failed:', error);
      
      // Perform individual analyses as fallback
      const [sentiment, voice, facial] = await Promise.allSettled([
        this.analyzeSentiment(text, timestamp),
        this.analyzeVoice(text, timestamp, duration),
        this.analyzeFacialExpression(timestamp, imageData)
      ]);

      return {
        timestamp,
        sentiment: sentiment.status === 'fulfilled' ? sentiment.value : { error: 'Failed' },
        voice: voice.status === 'fulfilled' ? voice.value : { error: 'Failed' },
        facial: facial.status === 'fulfilled' ? facial.value : { error: 'Failed' },
        fallback: true
      };
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.pythonServerUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout for health check
      });
      
      if (response.ok) {
        return await response.json();
      }
      return { status: 'ERROR', message: 'Python server not responding' };
    } catch (error) {
      return { status: 'ERROR', message: error.message };
    }
  }

  isConfigured() {
    return !!this.pythonServerUrl;
  }
}

export const pythonAnalysisService = new PythonAnalysisService();