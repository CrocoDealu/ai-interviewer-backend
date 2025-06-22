import re
from collections import Counter
import logging

logger = logging.getLogger(__name__)

class VoiceAnalysisService:
    def __init__(self):
        # Filler words to detect
        self.filler_words = {
            'um', 'uh', 'er', 'ah', 'like', 'you know', 'so', 'well',
            'actually', 'basically', 'literally', 'obviously', 'right',
            'okay', 'alright', 'i mean', 'sort of', 'kind of', 'you see',
            'let me think', 'how do i put this', 'what i mean is'
        }
        
        # Confidence indicators in speech
        self.confidence_indicators = {
            'strong': {
                'definitely', 'absolutely', 'certainly', 'clearly', 'exactly',
                'precisely', 'specifically', 'without doubt', 'for sure',
                'undoubtedly', 'obviously', 'of course'
            },
            'weak': {
                'maybe', 'perhaps', 'i think', 'i guess', 'probably',
                'sort of', 'kind of', 'i suppose', 'i believe',
                'it seems', 'i feel like', 'possibly'
            }
        }
        
        # Clarity indicators
        self.clarity_indicators = {
            'clear': {
                'first', 'second', 'third', 'next', 'then', 'finally',
                'in conclusion', 'to summarize', 'specifically',
                'for example', 'such as', 'in other words'
            },
            'unclear': {
                'stuff', 'things', 'whatever', 'something', 'somehow',
                'somewhere', 'whatnot', 'and so on', 'etcetera'
            }
        }

    def detect_filler_words(self, text):
        """Detect and count filler words"""
        text_lower = text.lower()
        filler_count = {}
        total_fillers = 0
        
        for filler in self.filler_words:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(filler) + r'\b'
            matches = len(re.findall(pattern, text_lower))
            if matches > 0:
                filler_count[filler] = matches
                total_fillers += matches
        
        return {
            'total': total_fillers,
            'breakdown': filler_count,
            'unique_fillers': len(filler_count)
        }

    def analyze_pauses(self, text):
        """Analyze pause patterns from punctuation and sentence structure"""
        # Count different types of pauses
        commas = text.count(',')
        periods = text.count('.')
        semicolons = text.count(';')
        dashes = text.count('--') + text.count('—')
        ellipses = text.count('...')
        
        # Estimate pause frequency
        sentences = len(re.split(r'[.!?]+', text))
        words = len(text.split())
        
        # Calculate pause metrics
        total_pauses = commas + periods + semicolons + dashes + ellipses
        pause_frequency = total_pauses / max(words, 1) * 100  # Pauses per 100 words
        
        # Estimate average sentence length (indicator of pause patterns)
        avg_sentence_length = words / max(sentences, 1)
        
        return {
            'total_pauses': total_pauses,
            'pause_frequency_per_100_words': round(pause_frequency, 2),
            'pause_breakdown': {
                'commas': commas,
                'periods': periods,
                'semicolons': semicolons,
                'dashes': dashes,
                'ellipses': ellipses
            },
            'average_sentence_length': round(avg_sentence_length, 2),
            'sentences_count': sentences
        }

    def analyze_confidence_clarity(self, text):
        """Analyze voice confidence and clarity from text"""
        words = text.lower().split()
        
        # Count confidence indicators
        strong_confidence = sum(1 for word in words if word in self.confidence_indicators['strong'])
        weak_confidence = sum(1 for word in words if word in self.confidence_indicators['weak'])
        
        # Count clarity indicators
        clear_indicators = sum(1 for word in words if word in self.clarity_indicators['clear'])
        unclear_indicators = sum(1 for word in words if word in self.clarity_indicators['unclear'])
        
        # Calculate scores
        confidence_score = (strong_confidence - weak_confidence) / max(len(words), 1)
        clarity_score = (clear_indicators - unclear_indicators) / max(len(words), 1)
        
        # Determine levels
        confidence_level = 'high' if confidence_score > 0.02 else 'low' if confidence_score < -0.02 else 'medium'
        clarity_level = 'high' if clarity_score > 0.01 else 'low' if clarity_score < -0.01 else 'medium'
        
        return {
            'confidence': {
                'score': round(confidence_score, 4),
                'level': confidence_level,
                'strong_indicators': strong_confidence,
                'weak_indicators': weak_confidence
            },
            'clarity': {
                'score': round(clarity_score, 4),
                'level': clarity_level,
                'clear_indicators': clear_indicators,
                'unclear_indicators': unclear_indicators
            }
        }

    def calculate_speaking_pace(self, text, duration=None):
        """Calculate speaking pace (words per minute)"""
        words = text.split()
        word_count = len(words)
        
        if duration:
            # Use actual duration if provided
            wpm = (word_count / duration) * 60
        else:
            # Estimate based on average speaking speed
            # Average reading speed: 200-250 WPM, speaking: 150-200 WPM
            estimated_duration_minutes = word_count / 180  # Assume 180 WPM average
            wpm = word_count / estimated_duration_minutes if estimated_duration_minutes > 0 else 0
        
        # Categorize pace
        if wpm < 120:
            pace_category = 'slow'
        elif wpm > 200:
            pace_category = 'fast'
        else:
            pace_category = 'normal'
        
        return {
            'words_per_minute': round(wpm, 1),
            'word_count': word_count,
            'duration_seconds': duration,
            'estimated_duration': not bool(duration),
            'pace_category': pace_category
        }

    def analyze_voice(self, text, timestamp, duration=None):
        """Perform comprehensive voice analysis"""
        try:
            if not text.strip():
                return {
                    'timestamp': timestamp,
                    'error': 'No text provided for voice analysis'
                }
            
            # Analyze different aspects
            speaking_pace = self.calculate_speaking_pace(text, duration)
            filler_analysis = self.detect_filler_words(text)
            pause_analysis = self.analyze_pauses(text)
            confidence_clarity = self.analyze_confidence_clarity(text)
            
            # Calculate overall voice quality score
            pace_score = 1.0 if speaking_pace['pace_category'] == 'normal' else 0.7
            filler_score = max(0, 1.0 - (filler_analysis['total'] / max(speaking_pace['word_count'], 1)) * 5)
            confidence_score = (confidence_clarity['confidence']['score'] + 1) / 2  # Normalize to 0-1
            clarity_score = (confidence_clarity['clarity']['score'] + 1) / 2  # Normalize to 0-1
            
            overall_score = (pace_score + filler_score + confidence_score + clarity_score) / 4
            
            return {
                'timestamp': timestamp,
                'speaking_pace': speaking_pace,
                'filler_words': filler_analysis,
                'pause_analysis': pause_analysis,
                'confidence_clarity': confidence_clarity,
                'overall_voice_quality': {
                    'score': round(overall_score, 3),
                    'rating': 'excellent' if overall_score > 0.8 else 'good' if overall_score > 0.6 else 'needs_improvement'
                }
            }
            
        except Exception as e:
            logger.error(f"Voice analysis error: {str(e)}")
            return {
                'timestamp': timestamp,
                'error': f'Voice analysis failed: {str(e)}'
            }

    def get_voice_summary(self, analyses):
        """Generate summary from multiple voice analyses"""
        if not analyses:
            return None
            
        valid_analyses = [a for a in analyses if 'error' not in a]
        if not valid_analyses:
            return {'error': 'No valid voice analyses to summarize'}
        
        # Calculate averages
        avg_wpm = sum(a['speaking_pace']['words_per_minute'] for a in valid_analyses) / len(valid_analyses)
        avg_filler_rate = sum(a['filler_words']['total'] / max(a['speaking_pace']['word_count'], 1) for a in valid_analyses) / len(valid_analyses)
        avg_confidence = sum(a['confidence_clarity']['confidence']['score'] for a in valid_analyses) / len(valid_analyses)
        avg_clarity = sum(a['confidence_clarity']['clarity']['score'] for a in valid_analyses) / len(valid_analyses)
        avg_overall_score = sum(a['overall_voice_quality']['score'] for a in valid_analyses) / len(valid_analyses)
        
        return {
            'summary': {
                'average_wpm': round(avg_wpm, 1),
                'average_filler_rate': round(avg_filler_rate * 100, 2),  # As percentage
                'average_confidence_score': round(avg_confidence, 3),
                'average_clarity_score': round(avg_clarity, 3),
                'overall_voice_quality': round(avg_overall_score, 3),
                'total_analyses': len(valid_analyses)
            }
        }