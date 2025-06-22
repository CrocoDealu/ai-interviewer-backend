import nltk
from textblob import TextBlob
import re
from collections import Counter
import logging

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

logger = logging.getLogger(__name__)

class SentimentAnalysisService:
    def __init__(self):
        # Load stop words
        self.stop_words = set(stopwords.words('english'))
        
        # Extended stop words for interview context
        self.interview_stop_words = {
            'um', 'uh', 'er', 'ah', 'like', 'you', 'know', 'so', 'well',
            'actually', 'basically', 'literally', 'obviously', 'right',
            'okay', 'alright', 'mean', 'sort', 'kind', 'think', 'guess'
        }
        
        self.stop_words.update(self.interview_stop_words)
        
        # Confidence indicators
        self.confidence_indicators = {
            'high': {
                'definitely', 'absolutely', 'certainly', 'clearly', 'exactly',
                'precisely', 'specifically', 'confident', 'sure', 'positive',
                'convinced', 'determined', 'decisive', 'assertive'
            },
            'low': {
                'maybe', 'perhaps', 'possibly', 'might', 'could', 'probably',
                'unsure', 'uncertain', 'confused', 'doubt', 'hesitant',
                'tentative', 'vague', 'unclear'
            }
        }
        
        # Professional vocabulary indicators
        self.professional_words = {
            'experience', 'skills', 'expertise', 'knowledge', 'proficient',
            'accomplished', 'achieved', 'successful', 'leadership', 'management',
            'innovative', 'creative', 'analytical', 'strategic', 'efficient',
            'collaborative', 'communication', 'problem-solving', 'results',
            'improvement', 'optimization', 'development', 'implementation'
        }

    def filter_text(self, text):
        """Filter unnecessary words and clean text for analysis"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove punctuation and special characters
        text = re.sub(r'[^\w\s]', ' ', text)
        
        # Tokenize
        tokens = word_tokenize(text)
        
        # Remove stop words and short words
        filtered_tokens = [
            word for word in tokens 
            if word not in self.stop_words and len(word) > 2
        ]
        
        return filtered_tokens, ' '.join(filtered_tokens)

    def analyze_confidence(self, tokens):
        """Analyze confidence level based on word choice"""
        high_confidence_count = sum(1 for token in tokens if token in self.confidence_indicators['high'])
        low_confidence_count = sum(1 for token in tokens if token in self.confidence_indicators['low'])
        
        confidence_score = (high_confidence_count - low_confidence_count) / max(len(tokens), 1)
        
        if confidence_score > 0.1:
            level = 'high'
        elif confidence_score < -0.1:
            level = 'low'
        else:
            level = 'medium'
            
        return {
            'score': round(confidence_score, 3),
            'level': level,
            'high_confidence_words': high_confidence_count,
            'low_confidence_words': low_confidence_count
        }

    def analyze_professionalism(self, tokens):
        """Analyze professionalism based on vocabulary"""
        professional_count = sum(1 for token in tokens if token in self.professional_words)
        professionalism_score = professional_count / max(len(tokens), 1)
        
        if professionalism_score > 0.15:
            level = 'high'
        elif professionalism_score > 0.05:
            level = 'medium'
        else:
            level = 'low'
            
        return {
            'score': round(professionalism_score, 3),
            'level': level,
            'professional_words_count': professional_count
        }

    def analyze_sentiment(self, text, timestamp):
        """Perform comprehensive sentiment analysis"""
        try:
            # Filter text
            filtered_tokens, filtered_text = self.filter_text(text)
            
            if not filtered_text.strip():
                return {
                    'timestamp': timestamp,
                    'error': 'No meaningful content to analyze after filtering'
                }
            
            # TextBlob sentiment analysis
            blob = TextBlob(filtered_text)
            polarity = blob.sentiment.polarity  # -1 to 1
            subjectivity = blob.sentiment.subjectivity  # 0 to 1
            
            # Determine sentiment category
            if polarity > 0.1:
                sentiment_category = 'positive'
            elif polarity < -0.1:
                sentiment_category = 'negative'
            else:
                sentiment_category = 'neutral'
            
            # Analyze confidence
            confidence_analysis = self.analyze_confidence(filtered_tokens)
            
            # Analyze professionalism
            professionalism_analysis = self.analyze_professionalism(filtered_tokens)
            
            # Word frequency analysis
            word_freq = Counter(filtered_tokens)
            most_common_words = word_freq.most_common(5)
            
            return {
                'timestamp': timestamp,
                'original_text': text,
                'filtered_text': filtered_text,
                'sentiment': {
                    'polarity': round(polarity, 3),
                    'subjectivity': round(subjectivity, 3),
                    'category': sentiment_category,
                    'intensity': abs(polarity)
                },
                'confidence': confidence_analysis,
                'professionalism': professionalism_analysis,
                'word_analysis': {
                    'total_words': len(text.split()),
                    'filtered_words': len(filtered_tokens),
                    'most_common': most_common_words
                }
            }
            
        except Exception as e:
            logger.error(f"Sentiment analysis error: {str(e)}")
            return {
                'timestamp': timestamp,
                'error': f'Analysis failed: {str(e)}'
            }

    def get_overall_sentiment_summary(self, analyses):
        """Generate overall sentiment summary from multiple analyses"""
        if not analyses:
            return None
            
        valid_analyses = [a for a in analyses if 'error' not in a]
        if not valid_analyses:
            return {'error': 'No valid analyses to summarize'}
        
        # Calculate averages
        avg_polarity = sum(a['sentiment']['polarity'] for a in valid_analyses) / len(valid_analyses)
        avg_subjectivity = sum(a['sentiment']['subjectivity'] for a in valid_analyses) / len(valid_analyses)
        avg_confidence = sum(a['confidence']['score'] for a in valid_analyses) / len(valid_analyses)
        avg_professionalism = sum(a['professionalism']['score'] for a in valid_analyses) / len(valid_analyses)
        
        # Sentiment trend analysis
        polarities = [a['sentiment']['polarity'] for a in valid_analyses]
        trend = 'stable'
        if len(polarities) > 1:
            first_half_avg = sum(polarities[:len(polarities)//2]) / (len(polarities)//2)
            second_half_avg = sum(polarities[len(polarities)//2:]) / (len(polarities) - len(polarities)//2)
            
            if second_half_avg - first_half_avg > 0.2:
                trend = 'improving'
            elif first_half_avg - second_half_avg > 0.2:
                trend = 'declining'
        
        return {
            'summary': {
                'average_polarity': round(avg_polarity, 3),
                'average_subjectivity': round(avg_subjectivity, 3),
                'average_confidence': round(avg_confidence, 3),
                'average_professionalism': round(avg_professionalism, 3),
                'sentiment_trend': trend,
                'total_analyses': len(valid_analyses)
            }
        }