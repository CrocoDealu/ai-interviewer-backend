# Python Analysis Server

This Python server provides AI-powered analysis services for the InterviewAI application, including sentiment analysis, voice analysis, and facial expression recognition.

## Features

- **Sentiment Analysis**: Advanced text sentiment analysis with confidence scoring
- **Voice Analysis**: Speaking pace, filler words detection, confidence analysis
- **Facial Expression Recognition**: Mockup facial expression analysis (ready for real implementation)
- **Comprehensive Analysis**: Combined analysis of all three modalities

## Setup

### 1. Install Python Dependencies

```bash
cd python_analysis_server
pip install -r requirements.txt
```

### 2. Download NLTK Data

The server will automatically download required NLTK data on first run, but you can pre-download:

```python
import nltk
nltk.download('punkt')
nltk.download('stopwords')
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### 4. Run the Server

```bash
# Development
python app.py

# Or with Flask CLI
export FLASK_APP=app.py
export FLASK_ENV=development
flask run --host=0.0.0.0 --port=5000
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Analysis Endpoints
- `POST /analyze/sentiment` - Sentiment analysis
- `POST /analyze/voice` - Voice pattern analysis  
- `POST /analyze/facial` - Facial expression analysis (mockup)
- `POST /analyze/comprehensive` - All analyses combined

## Request Format

### Sentiment Analysis
```json
{
  "text": "I am very confident about this opportunity",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Voice Analysis
```json
{
  "text": "Um, I think I can handle this project well",
  "timestamp": "2024-01-15T10:30:00Z",
  "duration": 3.5
}
```

### Facial Analysis
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "image_data": "base64_encoded_image_or_url"
}
```

## Response Format

All endpoints return JSON responses with analysis results and timestamps.

## Integration with Node.js Backend

The Node.js backend communicates with this Python server through HTTP requests. The `pythonAnalysisService.js` handles the integration and provides fallback responses if the Python server is unavailable.

## Production Considerations

1. **Real Facial Recognition**: Replace mockup with actual OpenCV/face recognition
2. **Performance**: Add caching and optimize for concurrent requests
3. **Security**: Add authentication between servers
4. **Scaling**: Use WSGI server (Gunicorn) for production
5. **Monitoring**: Add logging and health monitoring
6. **Error Handling**: Improve error responses and recovery

## Dependencies

- **Flask**: Web framework
- **NLTK**: Natural language processing
- **TextBlob**: Sentiment analysis
- **OpenCV**: Computer vision (for future facial recognition)
- **NumPy**: Numerical computing
- **Pillow**: Image processing