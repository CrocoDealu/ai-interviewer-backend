from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging

# Import analysis services
from services.sentiment_service import SentimentAnalysisService
from services.voice_service import VoiceAnalysisService
from services.facial_service import FacialExpressionService

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize services
sentiment_service = SentimentAnalysisService()
voice_service = VoiceAnalysisService()
facial_service = FacialExpressionService()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'message': 'Python Analysis Server is running',
        'services': {
            'sentiment': True,
            'voice': True,
            'facial': True
        }
    })

@app.route('/analyze/sentiment', methods=['POST'])
def analyze_sentiment():
    try:
        data = request.get_json()
        text = data.get('text', '')
        timestamp = data.get('timestamp')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        result = sentiment_service.analyze_sentiment(text, timestamp)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        return jsonify({'error': 'Sentiment analysis failed'}), 500

@app.route('/analyze/voice', methods=['POST'])
def analyze_voice():
    try:
        data = request.get_json()
        text = data.get('text', '')
        timestamp = data.get('timestamp')
        duration = data.get('duration')  # Optional: actual speech duration in seconds
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        result = voice_service.analyze_voice(text, timestamp, duration)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Voice analysis error: {str(e)}")
        return jsonify({'error': 'Voice analysis failed'}), 500

@app.route('/analyze/facial', methods=['POST'])
def analyze_facial():
    try:
        data = request.get_json()
        timestamp = data.get('timestamp')
        image_data = data.get('image_data')  # Base64 encoded image or image URL
        
        if not timestamp:
            return jsonify({'error': 'Timestamp is required'}), 400
        
        # For now, return mockup data as requested
        result = facial_service.analyze_facial_expression(timestamp, image_data)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Facial analysis error: {str(e)}")
        return jsonify({'error': 'Facial analysis failed'}), 500

@app.route('/analyze/comprehensive', methods=['POST'])
def comprehensive_analysis():
    try:
        data = request.get_json()
        text = data.get('text', '')
        timestamp = data.get('timestamp')
        duration = data.get('duration')
        image_data = data.get('image_data')
        
        if not text or not timestamp:
            return jsonify({'error': 'Text and timestamp are required'}), 400
        
        # Perform all analyses
        sentiment_result = sentiment_service.analyze_sentiment(text, timestamp)
        voice_result = voice_service.analyze_voice(text, timestamp, duration)
        facial_result = facial_service.analyze_facial_expression(timestamp, image_data)
        
        return jsonify({
            'timestamp': timestamp,
            'sentiment': sentiment_result,
            'voice': voice_result,
            'facial': facial_result
        })
    
    except Exception as e:
        logger.error(f"Comprehensive analysis error: {str(e)}")
        return jsonify({'error': 'Comprehensive analysis failed'}), 500

if __name__ == '__main__':
    port = int(os.getenv('PYTHON_SERVER_PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)