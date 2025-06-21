import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { validateInterviewSetup, validateMessage } from '../middleware/validation.js';
// import { deepSeekService } from '../services/deepseekService.js';
import { deepSeekService } from '../services/ollamaService.js';
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