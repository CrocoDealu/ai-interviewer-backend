import dotenv from 'dotenv';

dotenv.config();

class DeepSeekService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.apiUrl = process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
    
    if (!this.apiKey) {
      console.warn('OpenRouter API key not found. Please set OPENROUTER_API_KEY in your environment variables.');
    }
  }

  generateSystemPrompt(setup) {
    const personalityPrompts = {
      intimidator: `INTIMIDATOR: Challenge the user's answers. Be cold, skeptical, and direct. Show no empathy. Interrupt if answers are too long.`,
      friendly: `FRIENDLY MENTOR: Be warm, supportive, and encouraging. Help the user feel comfortable. Give soft feedback when needed.`,
      robotic: `ROBOTIC EVALUATOR: Act like an automated recruiter. Neutral tone. Ask standardized technical questions. Give minimal feedback.`,
      curveball: `CURVEBALLER: Be creative and unpredictable. Occasionally throw in quirky or unusual questions to test adaptability.`
    };

    const difficultyLevels = {
      easy: "ENTRY-LEVEL: Basic, straightforward questions that focus on general experience, motivation, and foundational skills.",
      medium: "MID-LEVEL: Questions of moderate complexity that include problem-solving, role-specific knowledge, and behavioral scenarios.",
      hard: "ADVANCED: Challenging questions requiring deep technical knowledge, strategic thinking, and leadership skills."
    };

    const industryContext = {
      tech: "technology and software development",
      healthcare: "healthcare and medical services",
      finance: "finance and banking",
      marketing: "marketing and digital advertising",
      education: "education and academic institutions",
      design: "design and creative services",
    };

    return `
    You are an expert interviewer for a ${setup.role || 'professional'} role at ${setup.company || 'a leading company'}. Today you will assume the personality of ${personalityPrompts[setup.personality]} Conduct a realistic job interview simulation to help the candidate practice and improve their interview skills.
    
    Follow this interview structure:
    1. Begin with a professional introduction of yourself and briefly describe ${setup.company}.
    2. Conduct the interview with:
       - 3-5 technical questions appropriate for a ${difficultyLevels[setup.difficulty]} ${setup.role}.
       - Include industry-specific questions relevant to ${setup.industry}.
       - 2-3 behavioral/non-technical questions relevant to the role.
       - At least one scenario-based question (e.g., "How would you handle X situation?").
    3. Interview process:
       - Ask one question at a time and wait for a response.
       - If a candidate gives an incorrect or inappropriate answer, respond according to your personality:
         * INTIMIDATOR: Point out specific flaws in their reasoning bluntly and skeptically.
         * FRIENDLY MENTOR: Gently guide them toward the right direction.
         * ROBOTIC EVALUATOR: Simply acknowledge with minimal feedback ("Noted").
         * CURVEBALLER: Challenge their thinking or approach with creative follow-ups.
       - Ask follow-up questions appropriate to your personality type.
    4. If you don't understand an answer, ask the candidate to clarify.
    5. After all questions have been asked, conclude the interview and provide:
       - Overall assessment of technical skills.
       - Overall assessment of communication/soft skills.
       - 2-3 specific recommendations for improvement.
       - Highlight 1-2 particularly strong answers (if any).
    
    Keep responses concise but complete. Use clear, direct language and avoid complex terminology. Aim for a Flesch reading score of 80 or higher. Use the active voice. Avoid adverbs. Avoid buzzwords and instead use plain English. Use jargon where relevant. Avoid being salesy or overly enthusiastic and instead express calm confidence.
  `;
  }

  async sendMessage(messages, setup) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is not configured');
    }

    try {
      const systemPrompt = this.generateSystemPrompt(setup);
      const messagesWithSystem = messages[0]?.role === 'system' 
        ? messages 
        : [{ role: 'system', content: systemPrompt }, ...messages];

      console.log('Sending request to OpenRouter API...');
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
          'X-Title': 'InterviewAI Mock Interview App',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-r1-0528:free',
          messages: messagesWithSystem,
          max_tokens: 800,
          temperature: 0.7,
          stream: false,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenRouter API error response:', errorData);
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('OpenRouter API response received');
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      const choice = data.choices[0];
      const content = choice.message.content.trim();
      
      if (choice.finish_reason === 'length') {
        console.warn('Response was truncated due to max_tokens limit');
      }

      console.log('AI Response generated successfully');
      
      return content;
    } catch (error) {
      console.error('OpenRouter API Error:', error);
      
      const fallbackResponses = {
        intimidator: [
          "That's not convincing. Give me something better.",
          "I don't buy that. Prove it to me.",
          "Weak answer. What else do you have?",
          "That's exactly what everyone says. Be original.",
          "Not impressed. Try again."
        ],
        friendly: [
          "That's interesting! Can you tell me more about that experience?",
          "I love hearing about that! How did that make you feel?",
          "That sounds like a great learning opportunity. What did you take away from it?",
          "You seem passionate about this. What drives that passion?",
          "That's wonderful! How do you think that experience prepared you for this role?"
        ],
        robotic: [
          "Noted. Please provide additional details.",
          "Understood. Specify your methodology.",
          "Data recorded. Quantify your results.",
          "Information processed. Elaborate on metrics.",
          "Input received. Define success parameters."
        ],
        curveball: [
          "Here's a curveball: If you were a kitchen appliance, which one would you be and why?",
          "Let's try something different - how would you explain our company to a 5-year-old?",
          "Interesting! Now, if you had to choose a theme song for your work style, what would it be?",
          "Plot twist: You're stranded on a desert island with only office supplies. How do you survive?",
          "Curveball time: What's the most unusual way you've solved a problem?"
        ]
      };
      
      const responses = fallbackResponses[setup.personality];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  isConfigured() {
    return !!this.apiKey;
  }
}

export const deepSeekService = new DeepSeekService();