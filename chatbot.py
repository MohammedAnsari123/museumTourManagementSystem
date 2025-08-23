import google.generativeai as genai
import pandas as pd
import os
from typing import Dict, List, Optional, Any, Union
import re
import json
from datetime import datetime, timedelta
import requests
from urllib.parse import quote

class MuseumExpertChatbot:
    def __init__(self, api_key: str, museum_data_file: str = "final_museums.csv"):
        """
        Initialize the Comprehensive Museum Expert Chatbot
        
        Args:
            api_key (str): Gemini API key
            museum_data_file (str): Path to the museum data CSV file
        """
        if not api_key or not api_key.startswith('AIza'):
            raise ValueError("Invalid Gemini API key provided. Please check your API key.")

        self.api_key = api_key

        try:
            genai.configure(api_key=api_key)

            self.model = genai.GenerativeModel('gemini-1.5-pro')

            try:
                self.vision_model = genai.GenerativeModel('gemini-1.5-pro-vision-latest')
            except:
                self.vision_model = None

            test_response = self.model.generate_content("Hello! I'm ready to help with museum questions.")
            print("✅ Museum Expert Chatbot initialized successfully!")
            print(f"🤖 Ready to answer any museum-related question!")
            
        except Exception as e:
            print(f"❌ Failed to initialize Gemini Pro: {e}")
            try:
                self.model = genai.GenerativeModel('gemini-1.5-flash')
                self.vision_model = None
                print("✅ Fallback to Gemini Flash successful!")
            except Exception as e2:
                raise Exception(f"Failed to initialize any Gemini model: {e2}")

        self.chat_session = None
        self._initialize_expert_chat_session()

        self.museum_data_file = museum_data_file
        self.museums_df = self._load_museum_data()

        self.conversation_context = {
            "user_profile": {
                "interests": [],
                "expertise_level": "general",
                "preferred_topics": [],
                "location": None,
                "age_group": None
            },
            "session_data": {
                "start_time": datetime.now().isoformat(),
                "query_count": 0,
                "topics_covered": [],
                "last_museum_discussed": None,
                "conversation_flow": []
            },
            "preferences": {
                "response_style": "brief",
                "include_examples": True,
                "include_sources": False,
                "language": "en"
            }
        }

        self.museum_knowledge = {
            "types": {
                "art": ["painting", "sculpture", "contemporary art", "classical art", "modern art", "galleries"],
                "history": ["archaeology", "cultural heritage", "historical artifacts", "ancient civilizations"],
                "science": ["natural history", "technology", "space", "physics", "biology", "chemistry"],
                "specialized": ["maritime", "military", "aviation", "automotive", "music", "sports"],
                "cultural": ["ethnography", "anthropology", "folk culture", "religious art", "textiles"]
            },
            "periods": {
                "ancient": ["prehistoric", "egyptian", "greek", "roman", "mesopotamian"],
                "medieval": ["byzantine", "islamic", "gothic", "renaissance"],
                "modern": ["baroque", "neoclassical", "romantic", "impressionist"],
                "contemporary": ["modern art", "pop art", "abstract", "digital art"]
            },
            "functions": {
                "preservation": "conserving cultural heritage and artifacts",
                "education": "teaching and learning about history, art, and culture",
                "research": "scholarly study and documentation",
                "exhibition": "displaying collections for public viewing",
                "community": "serving as cultural centers for communities"
            }
        }

        self.expert_system_prompt = """
        You are MuseumGPT, the world's most knowledgeable Museum Expert AI Assistant. You have comprehensive expertise in:

        🏛️ MUSEUM DOMAINS:
        • Art Museums: Paintings, sculptures, installations, galleries, artists, art movements, techniques
        • History Museums: Archaeological artifacts, historical periods, civilizations, cultural heritage
        • Science Museums: Natural history, technology, space, interactive exhibits, scientific discoveries
        • Specialized Museums: Maritime, military, aviation, music, sports, automotive, and niche collections
        • Cultural Museums: Ethnography, anthropology, folk traditions, religious artifacts

        🎓 EXPERTISE AREAS:
        • Museum Operations: Curation, conservation, exhibition design, visitor experience
        • Art History: All periods from ancient to contemporary, major movements and artists
        • Historical Knowledge: World history, archaeology, cultural developments
        • Scientific Knowledge: Natural sciences, technology evolution, scientific methodology
        • Museum Education: Learning theories, educational programs, accessibility
        • Conservation: Preservation techniques, restoration, climate control, handling

        🎯 CAPABILITIES:
        • Answer ANY museum-related question with expert-level detail
        • Provide historical context and cultural significance
        • Explain artistic techniques, styles, and movements
        • Discuss museum best practices and operations
        • Offer educational insights and learning opportunities
        • Compare museums, exhibitions, and collections worldwide
        • Suggest related topics and deeper exploration paths

        📋 RESPONSE GUIDELINES:
        • Default to concise, readable answers
        • Format as 3–6 short bullet points
        • Keep total under ~90 words unless asked for detail
        • Bold museum names, avoid emojis, use simple language
        • Include relevant examples, dates, and specific details
        • Explain complex concepts in accessible language, briefly
        • Offer multiple perspectives when appropriate
        • Only add extras if the user asks; otherwise keep it brief
        • Maintain enthusiasm for museum culture and learning
        • No emojis by default

        🔍 KNOWLEDGE SOURCES:
        • Global museum collections and exhibitions
        • Art history and cultural studies
        • Archaeological and historical research
        • Scientific discoveries and natural history
        • Museum studies and best practices
        • Educational theory and visitor experience research

        Always strive to be the most helpful, knowledgeable, and engaging museum expert possible!
        """

    def _initialize_expert_chat_session(self):
        """Initialize expert chat session with comprehensive museum knowledge"""
        try:
            self.chat_session = self.model.start_chat(
                history=[
                    {
                        "role": "user",
                        "parts": ["Initialize as museum expert"]
                    },
                    {
                        "role": "model", 
                        "parts": [self.expert_system_prompt]
                    }
                ]
            )
            print("🎓 Expert museum knowledge base activated!")
        except Exception as e:
            print(f"Warning: Could not initialize expert chat session: {e}")
            self.chat_session = None

    def _load_museum_data(self) -> pd.DataFrame:
        """Load and enhance museum database"""
        try:
            df = pd.read_csv(self.museum_data_file, on_bad_lines='skip')
            df.columns = df.columns.str.strip()

            essential_columns = ['Name', 'City', 'State', 'Type']
            df = df.dropna(subset=essential_columns)

            df['SearchIndex'] = (
                df['Name'].fillna('') + ' ' +
                df['City'].fillna('') + ' ' +
                df['State'].fillna('') + ' ' +
                df['Type'].fillna('') + ' ' +
                df.get('Category', pd.Series([''] * len(df))).fillna('') + ' ' +
                df.get('Description', pd.Series([''] * len(df))).fillna('')
            ).str.lower()
            
            print(f"📊 Loaded {len(df)} museums into knowledge base")
            return df
            
        except Exception as e:
            print(f"Warning: Could not load museum data: {e}")
            return pd.DataFrame()

    def answer_museum_question(self, question: str, context: Dict = None) -> str:
        """
        Answer any museum-related question with expert knowledge
        
        Args:
            question (str): User's museum question
            context (Dict): Additional context for the question
            
        Returns:
            str: Comprehensive expert answer
        """
        self.conversation_context["session_data"]["query_count"] += 1
        self.conversation_context["session_data"]["conversation_flow"].append({
            "timestamp": datetime.now().isoformat(),
            "question": question[:200],
            "type": self._classify_question_type(question)
        })
        
        try:
            question_analysis = self._analyze_question(question)

            relevant_museums = self._find_relevant_museums(question)

            enhanced_context = self._build_enhanced_context(question, question_analysis, relevant_museums, context)

            concise_rules = (
                "Format as 3-6 short bullet points, <=90 words total. "
                "Bold museum names. No emojis. Keep to museum context in India if applicable."
            )
            if self.chat_session:
                full_prompt = f"""
                QUESTION: {question}
                
                CONTEXT: {enhanced_context}
                
                USER PROFILE: {json.dumps(self.conversation_context['user_profile'], indent=2)}
                
                CONVERSATION HISTORY: {self._get_recent_conversation_summary()}
                
                Please provide a concise answer. {concise_rules}
                """
                
                response = self.chat_session.send_message(full_prompt)
                answer = response.text
            else:
                full_prompt = f"""
                {self.expert_system_prompt}
                
                QUESTION: {question}
                CONTEXT: {enhanced_context}
                
                Provide a concise answer. {concise_rules}
                """
                
                response = self.model.generate_content(full_prompt)
                answer = response.text

            formatted = self._enforce_concise_format(answer)

            self._update_user_profile(question, question_analysis)
            
            return formatted
            
        except Exception as e:
            return self._get_expert_fallback_response(question, str(e))

    def _classify_question_type(self, question: str) -> str:
        """Classify the type of museum question"""
        question_lower = question.lower()

        patterns = {
            "museum_search": ["find", "search", "museums in", "museums near", "list museums"],
            "artwork_info": ["painting", "sculpture", "artist", "artwork", "piece", "work by"],
            "historical_info": ["history", "historical", "ancient", "civilization", "period", "era"],
            "exhibition_info": ["exhibition", "exhibit", "display", "show", "collection"],
            "museum_operations": ["how do museums", "museum work", "curator", "conservation", "preservation"],
            "educational": ["learn", "teach", "education", "school", "children", "students"],
            "visiting_info": ["visit", "hours", "tickets", "admission", "tour", "guide"],
            "comparison": ["compare", "difference", "better", "best", "versus", "vs"],
            "recommendation": ["recommend", "suggest", "should visit", "worth seeing"],
            "technical": ["technique", "method", "process", "material", "medium"],
            "cultural": ["culture", "tradition", "significance", "meaning", "symbol"],
            "scientific": ["science", "natural", "discovery", "research", "specimen"]
        }
        
        for question_type, keywords in patterns.items():
            if any(keyword in question_lower for keyword in keywords):
                return question_type
        
        return "general"

    def _analyze_question(self, question: str) -> Dict:
        """Analyze question for complexity and requirements"""
        analysis = {
            "type": self._classify_question_type(question),
            "complexity": "basic",
            "requires_examples": False,
            "requires_comparison": False,
            "requires_historical_context": False,
            "requires_technical_details": False,
            "geographic_scope": None,
            "time_period": None,
            "subject_area": []
        }
        
        question_lower = question.lower()

        complex_indicators = ["why", "how", "explain", "analyze", "compare", "evaluate", "significance"]
        if any(indicator in question_lower for indicator in complex_indicators):
            analysis["complexity"] = "advanced"
        elif any(word in question_lower for word in ["what", "when", "where", "who"]):
            analysis["complexity"] = "intermediate"

        if any(word in question_lower for word in ["example", "instance", "such as"]):
            analysis["requires_examples"] = True
        
        if any(word in question_lower for word in ["compare", "difference", "versus", "better"]):
            analysis["requires_comparison"] = True
        
        if any(word in question_lower for word in ["history", "historical", "origin", "development"]):
            analysis["requires_historical_context"] = True
        
        if any(word in question_lower for word in ["technique", "process", "method", "how"]):
            analysis["requires_technical_details"] = True

        for subject, keywords in self.museum_knowledge["types"].items():
            if any(keyword in question_lower for keyword in keywords):
                analysis["subject_area"].append(subject)
        
        return analysis

    def _find_relevant_museums(self, question: str, limit: int = 5) -> List[Dict]:
        """Find museums relevant to the question"""
        if self.museums_df.empty:
            return []
        
        question_lower = question.lower()
        relevant_museums = []

        for _, museum in self.museums_df.iterrows():
            relevance_score = 0
            search_text = museum.get('SearchIndex', '').lower()

            question_words = re.findall(r'\b\w+\b', question_lower)
            for word in question_words:
                if len(word) > 3 and word in search_text:
                    relevance_score += 1

            if any(word in search_text for word in question_words if len(word) > 5):
                relevance_score += 3
            
            if relevance_score > 0:
                museum_info = {
                    'Name': museum.get('Name', ''),
                    'City': museum.get('City', ''),
                    'State': museum.get('State', ''),
                    'Type': museum.get('Type', ''),
                    'Category': museum.get('Category', ''),
                    'relevance_score': relevance_score
                }
                relevant_museums.append(museum_info)

        relevant_museums.sort(key=lambda x: x['relevance_score'], reverse=True)
        return relevant_museums[:limit]

    def _build_enhanced_context(self, question: str, analysis: Dict, relevant_museums: List[Dict], additional_context: Dict = None) -> str:
        """Build comprehensive context for the question"""
        context_parts = []

        if relevant_museums:
            context_parts.append("RELEVANT MUSEUMS:")
            for museum in relevant_museums[:3]:
                context_parts.append(f"- {museum['Name']} ({museum['Type']}) in {museum['City']}, {museum['State']}")

        if analysis["subject_area"]:
            context_parts.append("\nRELEVANT SUBJECT AREAS:")
            for subject in analysis["subject_area"]:
                if subject in self.museum_knowledge["types"]:
                    keywords = ", ".join(self.museum_knowledge["types"][subject][:5])
                    context_parts.append(f"- {subject.title()}: {keywords}")

        if self.conversation_context["session_data"]["topics_covered"]:
            context_parts.append(f"\nPREVIOUS TOPICS: {', '.join(self.conversation_context['session_data']['topics_covered'][-3:])}")

        user_interests = self.conversation_context["user_profile"]["interests"]
        if user_interests:
            context_parts.append(f"\nUSER INTERESTS: {', '.join(user_interests)}")

        if additional_context:
            context_parts.append(f"\nADDITIONAL CONTEXT: {json.dumps(additional_context, indent=2)}")
        
        return "\n".join(context_parts)

    def _enhance_answer_with_resources(self, answer: str, analysis: Dict) -> str:
        """Enhance answer with additional resources and suggestions"""
        if self.conversation_context["preferences"].get("response_style") == "brief":
            return self._enforce_concise_format(answer)
        enhanced_answer = answer

        if analysis["subject_area"]:
            enhanced_answer += "\n\n🔗 **Related Topics You Might Find Interesting:**\n"
            for subject in analysis["subject_area"][:2]:
                if subject in self.museum_knowledge["types"]:
                    related_keywords = self.museum_knowledge["types"][subject][:3]
                    enhanced_answer += f"• {subject.title()}: {', '.join(related_keywords)}\n"

        if analysis["type"] in ["museum_search", "recommendation", "visiting_info"]:
            enhanced_answer += "\n\n🎫 **Planning Your Visit:**\n"
            enhanced_answer += "• Check museum websites for current exhibitions and hours\n"
            enhanced_answer += "• Consider guided tours for deeper insights\n"
            enhanced_answer += "• Look for special events and educational programs\n"

        if analysis["complexity"] == "advanced":
            enhanced_answer += "\n\n📚 **For Further Learning:**\n"
            enhanced_answer += "• Explore museum online collections and virtual tours\n"
            enhanced_answer += "• Read scholarly articles and museum publications\n"
            enhanced_answer += "• Attend lectures and workshops at local museums\n"
        
        return enhanced_answer

    def _update_user_profile(self, question: str, analysis: Dict):
        """Update user profile based on question patterns"""
        for subject in analysis["subject_area"]:
            if subject not in self.conversation_context["user_profile"]["interests"]:
                self.conversation_context["user_profile"]["interests"].append(subject)

        if analysis["type"] not in self.conversation_context["session_data"]["topics_covered"]:
            self.conversation_context["session_data"]["topics_covered"].append(analysis["type"])

        if analysis["complexity"] == "advanced":
            if self.conversation_context["user_profile"]["expertise_level"] == "general":
                self.conversation_context["user_profile"]["expertise_level"] = "intermediate"

        if len(self.conversation_context["session_data"]["topics_covered"]) > 10:
            self.conversation_context["session_data"]["topics_covered"] = \
                self.conversation_context["session_data"]["topics_covered"][-10:]

    def _get_recent_conversation_summary(self) -> str:
        """Get summary of recent conversation"""
        recent_queries = self.conversation_context["session_data"]["conversation_flow"][-3:]
        if not recent_queries:
            return "No previous conversation."
        
        summary = "Recent questions:\n"
        for query in recent_queries:
            summary += f"- {query['type']}: {query['question'][:100]}...\n"
        
        return summary

    def _get_expert_fallback_response(self, question: str, error: str = "") -> str:
        """Provide expert fallback response"""
        return f"""🏛️ **Museum Expert Assistant**

I'm here to answer any museum-related question! I have comprehensive knowledge about:

🎨 **Art & Culture:**
• Paintings, sculptures, and artistic movements
• Famous artists and their techniques
• Art history from ancient to contemporary

🏺 **History & Archaeology:**
• Historical artifacts and civilizations
• Archaeological discoveries and methods
• Cultural heritage and preservation

🔬 **Science & Natural History:**
• Natural specimens and scientific collections
• Technology and innovation exhibits
• Interactive science demonstrations

🏛️ **Museum Operations:**
• Curation and exhibition design
• Conservation and preservation techniques
• Educational programs and visitor experience

**Your question:** "{question[:100]}..."

Please feel free to ask about any aspect of museums, art, history, science, or cultural heritage. I'm equipped to provide detailed, expert-level answers with examples and context!

💡 **Try asking:**
• "Explain the significance of the Mona Lisa"
• "How do museums preserve ancient artifacts?"
• "What makes the Louvre special?"
• "Tell me about dinosaur fossils in museums"
"""

    def get_conversation_analytics(self) -> Dict:
        """Get detailed conversation analytics"""
        return {
            "session_info": {
                "duration_minutes": (datetime.now() - datetime.fromisoformat(
                    self.conversation_context["session_data"]["start_time"]
                )).seconds // 60,
                "total_queries": self.conversation_context["session_data"]["query_count"],
                "topics_explored": len(self.conversation_context["session_data"]["topics_covered"])
            },
            "user_profile": self.conversation_context["user_profile"],
            "engagement_metrics": {
                "question_types": [q["type"] for q in self.conversation_context["session_data"]["conversation_flow"]],
                "complexity_trend": "increasing" if self.conversation_context["user_profile"]["expertise_level"] != "general" else "stable"
            }
        }

    def reset_conversation(self):
        """Reset conversation while maintaining user preferences"""
        interests = self.conversation_context["user_profile"]["interests"].copy()
        expertise = self.conversation_context["user_profile"]["expertise_level"]
        
        self.conversation_context = {
            "user_profile": {
                "interests": interests,
                "expertise_level": expertise,
                "preferred_topics": [],
                "location": None,
                "age_group": None
            },
            "session_data": {
                "start_time": datetime.now().isoformat(),
                "query_count": 0,
                "topics_covered": [],
                "last_museum_discussed": None,
                "conversation_flow": []
            },
            "preferences": {
                "response_style": "brief",
                "include_examples": True,
                "include_sources": False,
                "language": "en"
            }
        }
        
        self._initialize_expert_chat_session()

    def _enforce_concise_format(self, text: str, max_words: int = 90, max_bullets: int = 6) -> str:
        """Convert text to short, readable bullet points with word cap."""
        clean = re.sub(r"\s+", " ", (text or "").strip())
        sentences = re.split(r"(?<=[.!?])\s+", clean)
        bullets: List[str] = []
        for s in sentences:
            if not s:
                continue
            words = s.split()
            if len(words) > 25:
                s = " ".join(words[:25]) + "…"
            bullets.append(f"- {s}")
            if len(bullets) >= max_bullets:
                break
        if not bullets:
            bullets = [f"- {clean}"]
        out_words = []
        out_lines = []
        for b in bullets:
            w = b.split()
            if len(out_words) + len(w) > max_words:
                break
            out_words += w
            out_lines.append(b)
        return "\n".join(out_lines) if out_lines else bullets[0]

if __name__ == "__main__":
    API_KEY = os.environ.get('GEMINI_API_KEY')
    if not API_KEY:
        print("Error: GEMINI_API_KEY environment variable not set")
        exit(1)
    
    chatbot = MuseumExpertChatbot(API_KEY)
    
    print("🏛️ Museum Expert Chatbot Ready!")
    print("Ask me anything about museums, art, history, science, or culture!")
    print("Type 'quit' to exit, 'analytics' for session info\n")
    
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'quit':
            break
        elif user_input.lower() == 'analytics':
            analytics = chatbot.get_conversation_analytics()
            print(f"Analytics: {json.dumps(analytics, indent=2)}\n")
            continue
            
        response = chatbot.answer_museum_question(user_input)
        print(f"Museum Expert: {response}\n")
