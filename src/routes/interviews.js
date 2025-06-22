import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { validateInterviewSetup, validateMessage } from '../middleware/validation.js';
// import { deepSeekService } from '../services/deepseekService.js';
import { deepSeekService } from '../services/ollamaService.js';
import { pythonAnalysisService } from '../services/pythonAnalysisService.js';
const router = express.Router();

const interviews = new Map();
const userInterviews = new Map(); // userId -> [interviewIds]

router.post('/start', optionalAuth, validateInterviewSetup, async (req, res) => {
  try {
    const { industry, difficulty, personality, role, company } = req.body;
    const userId = req.user?.id;

    const interview = {
      id: uuidv4(),
      userId,
      setup: {
        industry,
        difficulty,
        personality,
        role,
        company
      },
      messages: [],
      startTime: new Date().toISOString(),
      endTime: null,
      feedback: null,
      status: 'active'
    };

    interviews.set(interview.id, interview);

    if (userId) {
      if (!userInterviews.has(userId)) {
        userInterviews.set(userId, []);
      }
      userInterviews.get(userId).push(interview.id);
    }

    try {
      const initialPrompt = "Please introduce yourself and start the interview.";
      const aiResponse = await deepSeekService.sendMessage(
        [{ role: 'user', content: initialPrompt }],
        interview.setup
      );
      
      const aiMessage = {
        id: uuidv4(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };

      interview.messages.push(aiMessage);
    } catch (error) {
      console.error('Error generating initial AI message:', error);
    }

    res.status(201).json({
      message: 'Interview started successfully',
      interview: {
        id: interview.id,
        setup: interview.setup,
        messages: interview.messages,
        startTime: interview.startTime,
        status: interview.status
      }
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to start interview'
    });
  }
});

router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const interview = interviews.get(id);

    if (!interview) {
      return res.status(404).json({
        error: 'Interview not found',
        message: 'The requested interview session does not exist'
      });
    }

    if (interview.userId && (!req.user || req.user.id !== interview.userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this interview'
      });
    }

    res.json({
      interview: {
        id: interview.id,
        setup: interview.setup,
        messages: interview.messages,
        startTime: interview.startTime,
        endTime: interview.endTime,
        feedback: interview.feedback,
        status: interview.status
      }
    });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get interview'
    });
  }
});

// POST /api/interviews/:id/messages
router.post('/:id/messages', optionalAuth, validateMessage, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, sender } = req.body;
    
    const interview = interviews.get(id);
    if (!interview) {
      return res.status(404).json({
        error: 'Interview not found',
        message: 'The requested interview session does not exist'
      });
    }

    // Check if user has access to this interview
    if (interview.userId && (!req.user || req.user.id !== interview.userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this interview'
      });
    }

    // Check if interview is still active
    if (interview.status !== 'active') {
      return res.status(400).json({
        error: 'Interview not active',
        message: 'Cannot add messages to an inactive interview'
      });
    }

    // Create user message
    const userMessage = {
      id: uuidv4(),
      content: content.trim(),
      sender,
      timestamp: new Date().toISOString()
    };

    interview.messages.push(userMessage);

    let aiMessage = null;
    let analysisResults = null;

    // Generate AI response for user messages
    if (sender === 'user') {
      // Perform comprehensive analysis on user message
      try {
        analysisResults = await pythonAnalysisService.comprehensiveAnalysis(
          content,
          userMessage.timestamp,
          req.body.duration, // Optional: speech duration
          req.body.imageData // Optional: facial image data
        );
        
        // Store analysis results with the message
        userMessage.analysis = analysisResults;
      } catch (error) {
        console.error('Analysis failed:', error);
        userMessage.analysis = { error: 'Analysis unavailable' };
      }

      try {
        // Convert messages to DeepSeek format
        const conversationHistory = interview.messages.map(msg => ({
          role: msg.sender === 'ai' ? 'assistant' : 'user',
          content: msg.content
        }));

        const aiResponse = await deepSeekService.sendMessage(
          conversationHistory,
          interview.setup
        );
        
        aiMessage = {
          id: uuidv4(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date().toISOString()
        };

        interview.messages.push(aiMessage);
      } catch (error) {
        console.error('Error generating AI response:', error);
        
        // Add fallback message
        aiMessage = {
          id: uuidv4(),
          content: "I apologize, but I'm having trouble responding right now. Could you please repeat your last point?",
          sender: 'ai',
          timestamp: new Date().toISOString()
        };

        interview.messages.push(aiMessage);
      }
    }

    res.status(201).json({
      message: 'Message added successfully',
      userMessage,
      aiMessage,
      analysis: analysisResults
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add message'
    });
  }
});

// POST /api/interviews/:id/analyze
router.post('/:id/analyze', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, timestamp, duration, imageData, analysisType } = req.body;
    
    const interview = interviews.get(id);
    if (!interview) {
      return res.status(404).json({
        error: 'Interview not found',
        message: 'The requested interview session does not exist'
      });
    }

    // Check if user has access to this interview
    if (interview.userId && (!req.user || req.user.id !== interview.userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this interview'
      });
    }

    let result;
    
    switch (analysisType) {
      case 'sentiment':
        result = await pythonAnalysisService.analyzeSentiment(text, timestamp);
        break;
      case 'voice':
        result = await pythonAnalysisService.analyzeVoice(text, timestamp, duration);
        break;
      case 'facial':
        result = await pythonAnalysisService.analyzeFacialExpression(timestamp, imageData);
        break;
      case 'comprehensive':
      default:
        result = await pythonAnalysisService.comprehensiveAnalysis(text, timestamp, duration, imageData);
        break;
    }

    res.json({
      message: 'Analysis completed successfully',
      analysis: result
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to perform analysis'
    });
  }
});

// POST /api/interviews/:id/end
router.post('/:id/end', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const interview = interviews.get(id);

    if (!interview) {
      return res.status(404).json({
        error: 'Interview not found',
        message: 'The requested interview session does not exist'
      });
    }

    // Check if user has access to this interview
    if (interview.userId && (!req.user || req.user.id !== interview.userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this interview'
      });
    }

    // End the interview
    interview.endTime = new Date().toISOString();
    interview.status = 'completed';

    // Generate comprehensive feedback including analysis data
    const messagesWithAnalysis = interview.messages.filter(msg => msg.analysis && !msg.analysis.error);
    
    // Generate feedback
    const feedback = {
      confidenceScore: Math.floor(Math.random() * 30) + 70, // 70-100
      strengths: [
        'Clear communication skills',
        'Good problem-solving approach',
        'Relevant experience mentioned',
      ],
      improvements: [
        'Provide more specific examples',
        'Show more enthusiasm',
        'Ask thoughtful questions',
      ],
      overallRating: Math.floor(Math.random() * 2) + 4, // 4-5
      detailedFeedback: {
        communication: Math.floor(Math.random() * 30) + 70,
        technicalKnowledge: Math.floor(Math.random() * 30) + 70,
        problemSolving: Math.floor(Math.random() * 30) + 70,
        culturalFit: Math.floor(Math.random() * 30) + 70,
      },
      analysisData: {
        totalAnalyzedMessages: messagesWithAnalysis.length,
        sentimentTrend: messagesWithAnalysis.length > 0 ? 'improving' : 'no_data',
        averageConfidence: messagesWithAnalysis.length > 0 ? 
          Math.round(messagesWithAnalysis.reduce((sum, msg) => 
            sum + (msg.analysis?.sentiment?.confidence?.score || 0), 0) / messagesWithAnalysis.length * 100) / 100 : 0,
        voiceQuality: messagesWithAnalysis.length > 0 ? 
          Math.round(messagesWithAnalysis.reduce((sum, msg) => 
            sum + (msg.analysis?.voice?.overall_voice_quality?.score || 0.7), 0) / messagesWithAnalysis.length * 100) / 100 : 0.7
      }
    };

    interview.feedback = feedback;

    res.json({
      message: 'Interview ended successfully',
      interview: {
        id: interview.id,
        setup: interview.setup,
        messages: interview.messages,
        startTime: interview.startTime,
        endTime: interview.endTime,
        feedback: interview.feedback,
        status: interview.status
      }
    });
  } catch (error) {
    console.error('End interview error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to end interview'
    });
  }
});

// GET /api/interviews/:id/analysis-summary
router.get('/:id/analysis-summary', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const interview = interviews.get(id);

    if (!interview) {
      return res.status(404).json({
        error: 'Interview not found',
        message: 'The requested interview session does not exist'
      });
    }

    // Check if user has access to this interview
    if (interview.userId && (!req.user || req.user.id !== interview.userId)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this interview'
      });
    }

    // Extract analysis data from messages
    const analysisData = interview.messages
      .filter(msg => msg.sender === 'user' && msg.analysis && !msg.analysis.error)
      .map(msg => msg.analysis);

    if (analysisData.length === 0) {
      return res.json({
        message: 'No analysis data available',
        summary: null
      });
    }

    // Generate summary statistics
    const summary = {
      totalAnalyzedMessages: analysisData.length,
      sentiment: {
        averagePolarity: analysisData.reduce((sum, data) => 
          sum + (data.sentiment?.sentiment?.polarity || 0), 0) / analysisData.length,
        mostCommonCategory: 'neutral', // Could be calculated from actual data
        trend: 'stable'
      },
      voice: {
        averageWPM: analysisData.reduce((sum, data) => 
          sum + (data.voice?.speaking_pace?.words_per_minute || 150), 0) / analysisData.length,
        totalFillerWords: analysisData.reduce((sum, data) => 
          sum + (data.voice?.filler_words?.total || 0), 0),
        averageConfidence: analysisData.reduce((sum, data) => 
          sum + (data.voice?.confidence_clarity?.confidence?.score || 0), 0) / analysisData.length
      },
      facial: {
        mostCommonExpression: 'neutral', // Could be calculated from actual data
        averageEngagement: analysisData.reduce((sum, data) => 
          sum + (data.facial?.engagement?.score || 0.6), 0) / analysisData.length,
        averageProfessionalism: analysisData.reduce((sum, data) => 
          sum + (data.facial?.professionalism?.score || 0.7), 0) / analysisData.length
      }
    };

    res.json({
      message: 'Analysis summary generated successfully',
      summary: {
        ...summary,
        // Round all numeric values
        sentiment: {
          ...summary.sentiment,
          averagePolarity: Math.round(summary.sentiment.averagePolarity * 1000) / 1000
        },
        voice: {
          ...summary.voice,
          averageWPM: Math.round(summary.voice.averageWPM * 10) / 10,
          averageConfidence: Math.round(summary.voice.averageConfidence * 1000) / 1000
        },
        facial: {
          ...summary.facial,
          averageEngagement: Math.round(summary.facial.averageEngagement * 1000) / 1000,
          averageProfessionalism: Math.round(summary.facial.averageProfessionalism * 1000) / 1000
        }
      }
    });
  } catch (error) {
    console.error('Analysis summary error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate analysis summary'
    });
  }
});

// GET /api/interviews (get user's interviews)
router.get('/', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userInterviewIds = userInterviews.get(userId) || [];
    
    const userInterviewList = userInterviewIds
      .map(id => interviews.get(id))
      .filter(interview => interview) // Remove any null/undefined
      .map(interview => ({
        id: interview.id,
        setup: interview.setup,
        startTime: interview.startTime,
        endTime: interview.endTime,
        status: interview.status,
        messageCount: interview.messages.length,
        feedback: interview.feedback ? {
          confidenceScore: interview.feedback.confidenceScore,
          overallRating: interview.feedback.overallRating
        } : null
      }))
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)); // Sort by newest first

    res.json({
      interviews: userInterviewList,
      total: userInterviewList.length
    });
  } catch (error) {
    console.error('Get user interviews error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get interviews'
    });
  }
});

export default router;