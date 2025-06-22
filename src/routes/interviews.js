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

    // Generate AI response for user messages
    if (sender === 'user') {
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
      aiMessage
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

    // Perform comprehensive analysis on all user messages
    performInterviewAnalysis(interview);
    
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

// Function to perform comprehensive analysis on interview completion
async function performInterviewAnalysis(interview) {
  console.log('\n' + '='.repeat(80));
  console.log(`🎯 INTERVIEW ANALYSIS REPORT - Interview ID: ${interview.id}`);
  console.log('='.repeat(80));
  
  console.log(`📋 Interview Setup:`);
  console.log(`   Role: ${interview.setup.role || 'Not specified'}`);
  console.log(`   Company: ${interview.setup.company || 'Not specified'}`);
  console.log(`   Industry: ${interview.setup.industry}`);
  console.log(`   Difficulty: ${interview.setup.difficulty}`);
  console.log(`   Personality: ${interview.setup.personality}`);
  console.log(`   Duration: ${calculateInterviewDuration(interview.startTime, interview.endTime)}`);
  
  // Get all user messages for analysis
  const userMessages = interview.messages.filter(msg => msg.sender === 'user');
  
  if (userMessages.length === 0) {
    console.log('\n❌ No user messages found for analysis');
    console.log('='.repeat(80) + '\n');
    return;
  }
  
  console.log(`\n📊 Analyzing ${userMessages.length} user messages...`);
  
  const analysisResults = [];
  
  // Perform analysis on each user message
  for (let i = 0; i < userMessages.length; i++) {
    const message = userMessages[i];
    console.log(`\n🔍 Analyzing message ${i + 1}/${userMessages.length}...`);
    
    try {
      const analysis = await pythonAnalysisService.comprehensiveAnalysis(
        message.content,
        message.timestamp,
        null, // duration - not available from text
        null  // imageData - not available
      );
      
      analysisResults.push({
        messageIndex: i + 1,
        content: message.content,
        timestamp: message.timestamp,
        analysis: analysis
      });
      
      console.log(`   ✅ Message ${i + 1} analyzed successfully`);
    } catch (error) {
      console.log(`   ❌ Message ${i + 1} analysis failed: ${error.message}`);
      analysisResults.push({
        messageIndex: i + 1,
        content: message.content,
        timestamp: message.timestamp,
        analysis: { error: error.message }
      });
    }
  }
  
  // Print detailed analysis results
  console.log('\n' + '='.repeat(80));
  console.log('📈 DETAILED ANALYSIS RESULTS');
  console.log('='.repeat(80));
  
  analysisResults.forEach((result, index) => {
    console.log(`\n📝 MESSAGE ${result.messageIndex}:`);
    console.log(`   Content: "${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}"`);
    console.log(`   Timestamp: ${result.timestamp}`);
    
    if (result.analysis.error) {
      console.log(`   ❌ Analysis Error: ${result.analysis.error}`);
      return;
    }
    
    // Sentiment Analysis
    if (result.analysis.sentiment) {
      const sentiment = result.analysis.sentiment;
      console.log(`   😊 Sentiment:`);
      console.log(`      Category: ${sentiment.sentiment?.category || 'N/A'}`);
      console.log(`      Polarity: ${sentiment.sentiment?.polarity || 'N/A'} (-1 to 1)`);
      console.log(`      Subjectivity: ${sentiment.sentiment?.subjectivity || 'N/A'} (0 to 1)`);
      console.log(`      Confidence Level: ${sentiment.confidence?.level || 'N/A'}`);
      console.log(`      Professionalism: ${sentiment.professionalism?.level || 'N/A'}`);
    }
    
    // Voice Analysis
    if (result.analysis.voice) {
      const voice = result.analysis.voice;
      console.log(`   🎤 Voice Analysis:`);
      console.log(`      Speaking Pace: ${voice.speaking_pace?.words_per_minute || 'N/A'} WPM (${voice.speaking_pace?.pace_category || 'N/A'})`);
      console.log(`      Filler Words: ${voice.filler_words?.total || 0} total`);
      console.log(`      Confidence Level: ${voice.confidence_clarity?.confidence?.level || 'N/A'}`);
      console.log(`      Clarity Level: ${voice.confidence_clarity?.clarity?.level || 'N/A'}`);
      console.log(`      Overall Voice Quality: ${voice.overall_voice_quality?.rating || 'N/A'} (${voice.overall_voice_quality?.score || 'N/A'})`);
    }
    
    // Facial Analysis (Mockup)
    if (result.analysis.facial) {
      const facial = result.analysis.facial;
      console.log(`   😐 Facial Expression (Mockup):`);
      console.log(`      Primary Expression: ${facial.facial_expression?.primary?.expression || 'N/A'} (${facial.facial_expression?.primary?.confidence || 'N/A'})`);
      console.log(`      Engagement Level: ${facial.engagement?.level || 'N/A'} (${facial.engagement?.score || 'N/A'})`);
      console.log(`      Eye Contact: ${facial.eye_contact?.pattern || 'N/A'} (${facial.eye_contact?.score || 'N/A'})`);
      console.log(`      Professionalism: ${facial.professionalism?.rating || 'N/A'} (${facial.professionalism?.score || 'N/A'})`);
    }
  });
  
  // Generate summary statistics
  const validAnalyses = analysisResults.filter(r => !r.analysis.error);
  
  if (validAnalyses.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(80));
    
    // Sentiment Summary
    const sentimentData = validAnalyses
      .map(r => r.analysis.sentiment)
      .filter(s => s && s.sentiment);
    
    if (sentimentData.length > 0) {
      const avgPolarity = sentimentData.reduce((sum, s) => sum + (s.sentiment.polarity || 0), 0) / sentimentData.length;
      const avgSubjectivity = sentimentData.reduce((sum, s) => sum + (s.sentiment.subjectivity || 0), 0) / sentimentData.length;
      const positiveCount = sentimentData.filter(s => s.sentiment.category === 'positive').length;
      const neutralCount = sentimentData.filter(s => s.sentiment.category === 'neutral').length;
      const negativeCount = sentimentData.filter(s => s.sentiment.category === 'negative').length;
      
      console.log(`\n😊 Sentiment Summary:`);
      console.log(`   Average Polarity: ${avgPolarity.toFixed(3)} (-1 to 1)`);
      console.log(`   Average Subjectivity: ${avgSubjectivity.toFixed(3)} (0 to 1)`);
      console.log(`   Sentiment Distribution: ${positiveCount} positive, ${neutralCount} neutral, ${negativeCount} negative`);
    }
    
    // Voice Summary
    const voiceData = validAnalyses
      .map(r => r.analysis.voice)
      .filter(v => v && v.speaking_pace);
    
    if (voiceData.length > 0) {
      const avgWPM = voiceData.reduce((sum, v) => sum + (v.speaking_pace.words_per_minute || 0), 0) / voiceData.length;
      const totalFillers = voiceData.reduce((sum, v) => sum + (v.filler_words?.total || 0), 0);
      const avgVoiceQuality = voiceData.reduce((sum, v) => sum + (v.overall_voice_quality?.score || 0), 0) / voiceData.length;
      
      console.log(`\n🎤 Voice Summary:`);
      console.log(`   Average Speaking Pace: ${avgWPM.toFixed(1)} WPM`);
      console.log(`   Total Filler Words: ${totalFillers}`);
      console.log(`   Average Voice Quality Score: ${avgVoiceQuality.toFixed(3)}`);
    }
    
    // Facial Summary (Mockup)
    const facialData = validAnalyses
      .map(r => r.analysis.facial)
      .filter(f => f && f.engagement);
    
    if (facialData.length > 0) {
      const avgEngagement = facialData.reduce((sum, f) => sum + (f.engagement?.score || 0), 0) / facialData.length;
      const avgProfessionalism = facialData.reduce((sum, f) => sum + (f.professionalism?.score || 0), 0) / facialData.length;
      const expressions = facialData.map(f => f.facial_expression?.primary?.expression).filter(e => e);
      const mostCommonExpression = expressions.length > 0 ? 
        expressions.reduce((a, b, i, arr) => 
          arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
        ) : 'N/A';
      
      console.log(`\n😐 Facial Summary (Mockup):`);
      console.log(`   Average Engagement Score: ${avgEngagement.toFixed(3)}`);
      console.log(`   Average Professionalism Score: ${avgProfessionalism.toFixed(3)}`);
      console.log(`   Most Common Expression: ${mostCommonExpression}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ ANALYSIS COMPLETE');
  console.log('='.repeat(80) + '\n');
}

// Helper function to calculate interview duration
function calculateInterviewDuration(startTime, endTime) {
  if (!startTime || !endTime) return 'Unknown';
  
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end - start;
  const durationMinutes = Math.floor(durationMs / (1000 * 60));
  const durationSeconds = Math.floor((durationMs % (1000 * 60)) / 1000);
  
  return `${durationMinutes}m ${durationSeconds}s`;
}

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

    res.json({
      message: 'Analysis is performed when interview ends. Check server console for detailed results.',
      note: 'Analysis data is now generated and logged to console when interview is completed.'
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