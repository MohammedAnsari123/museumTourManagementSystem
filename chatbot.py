# chatbot.py
# Museum Management System Chatbot using Gemini API

import google.generativeai as genai
import pandas as pd
import os
from typing import Dict, List, Optional
import re

class MuseumChatbot:
    def __init__(self, api_key: str, museum_data_file: str = "final_museums.csv"):
        """
        Initialize the Museum Chatbot with Gemini API
        
        Args:
            api_key (str): Gemini API key
            museum_data_file (str): Path to the museum data CSV file
        """
        # Configure Gemini API
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Load museum data
        self.museum_data_file = museum_data_file
        self.museums_df = self._load_museum_data()
        
        # Chat history
        self.chat_history = []
        
        # System prompt for domain-specific responses
        self.system_prompt = """
        You are a Museum Information Assistant specialized in providing information about museums in India.
        Your knowledge is limited to the museum data provided to you.
        When users ask questions about museums, provide accurate information based on the museum database.
        If a user asks about something outside of museum information, politely redirect them to museum-related queries.
        Always be helpful, informative, and concise in your responses.
        """

    def _load_museum_data(self) -> pd.DataFrame:
        """Load museum data from CSV file"""
        try:
            df = pd.read_csv(self.museum_data_file, on_bad_lines='skip')
            # Clean column names
            df.columns = df.columns.str.strip()
            # Remove rows with missing essential data
            essential_columns = ['Name', 'City', 'State', 'Type']
            df = df.dropna(subset=essential_columns)
            return df
        except Exception as e:
            print(f"Error loading museum data: {e}")
            return pd.DataFrame()

    def search_museums(self, query: str) -> List[Dict]:
        """
        Search for museums based on query terms
        
        Args:
            query (str): Search query
            
        Returns:
            List[Dict]: List of matching museums
        """
        if self.museums_df.empty:
            return []
            
        query = query.lower().strip()
        matches = []
        
        # Search in museum name, city, state, and type
        for _, museum in self.museums_df.iterrows():
            museum_info = {
                'Name': museum.get('Name', ''),
                'City': museum.get('City', ''),
                'State': museum.get('State', ''),
                'Type': museum.get('Type', ''),
                'Established': museum.get('Established', ''),
                'Latitude': museum.get('Latitude', ''),
                'Longitude': museum.get('Longitude', '')
            }
            
            # Check if query matches any of the museum fields
            museum_text = f"{museum_info['Name']} {museum_info['City']} {museum_info['State']} {museum_info['Type']}".lower()
            if query in museum_text or any(word in museum_text for word in query.split()):
                matches.append(museum_info)
                
        return matches[:10]  # Return top 10 matches

    def get_museum_details(self, museum_name: str) -> Optional[Dict]:
        """
        Get detailed information about a specific museum
        
        Args:
            museum_name (str): Name of the museum
            
        Returns:
            Dict: Museum details or None if not found
        """
        if self.museums_df.empty:
            return None
            
        # Find exact match or partial match
        museum_row = self.museums_df[
            self.museums_df['Name'].str.lower() == museum_name.lower()
        ]
        
        if museum_row.empty:
            # Try partial match
            museum_row = self.museums_df[
                self.museums_df['Name'].str.contains(museum_name, case=False, na=False)
            ]
            
        if not museum_row.empty:
            museum = museum_row.iloc[0]
            return {
                'Name': museum.get('Name', ''),
                'City': museum.get('City', ''),
                'State': museum.get('State', ''),
                'Type': museum.get('Type', ''),
                'Established': museum.get('Established', ''),
                'Latitude': museum.get('Latitude', ''),
                'Longitude': museum.get('Longitude', '')
            }
        
        return None

    def get_museums_by_location(self, city: str = None, state: str = None) -> List[Dict]:
        """
        Get museums by location (city or state)
        
        Args:
            city (str): City name
            state (str): State name
            
        Returns:
            List[Dict]: List of museums in the location
        """
        if self.museums_df.empty:
            return []
            
        filtered_df = self.museums_df.copy()
        
        if city:
            filtered_df = filtered_df[
                filtered_df['City'].str.lower().str.contains(city.lower(), na=False)
            ]
            
        if state:
            filtered_df = filtered_df[
                filtered_df['State'].str.lower().str.contains(state.lower(), na=False)
            ]
            
        museums = []
        for _, museum in filtered_df.iterrows():
            museums.append({
                'Name': museum.get('Name', ''),
                'City': museum.get('City', ''),
                'State': museum.get('State', ''),
                'Type': museum.get('Type', ''),
                'Established': museum.get('Established', ''),
                'Latitude': museum.get('Latitude', ''),
                'Longitude': museum.get('Longitude', '')
            })
            
        return museums[:10]  # Return top 10 matches

    def get_museum_types(self) -> List[str]:
        """Get all museum types in the database"""
        if self.museums_df.empty:
            return []
            
        return self.museums_df['Type'].dropna().unique().tolist()

    def format_museum_info(self, museum: Dict) -> str:
        """Format museum information for display"""
        info = f"Museum: {museum['Name']}\n"
        info += f"Location: {museum['City']}, {museum['State']}\n"
        info += f"Type: {museum['Type']}\n"
        
        if museum['Established'] and str(museum['Established']).lower() != 'nan':
            info += f"Established: {museum['Established']}\n"
            
        return info

    def get_chat_response(self, user_message: str) -> str:
        """
        Get chatbot response for user message
        
        Args:
            user_message (str): User's message
            
        Returns:
            str: Chatbot response
        """
        # Add user message to history
        self.chat_history.append({"role": "user", "parts": [user_message]})
        
        # Check for specific museum queries
        museum_query = self._extract_museum_query(user_message)
        
        if museum_query:
            # Handle museum-specific queries
            response_text = self._handle_museum_query(museum_query, user_message)
        else:
            # Use Gemini for general responses
            try:
                # Prepare context with museum data summary
                context = self._get_context_summary()
                full_prompt = f"{self.system_prompt}\n\nContext: {context}\n\nUser: {user_message}"
                
                response = self.model.generate_content(full_prompt)
                response_text = response.text
                # Handle encoding issues
                response_text = response_text.encode('utf-8', errors='ignore').decode('utf-8')
            except Exception as e:
                response_text = f"I'm sorry, I'm having trouble connecting to my knowledge base right now. However, I can tell you that I have information about {len(self.museums_df)} museums in my database. You can ask me about specific museums, search for museums by location, or ask about museum types."
        
        # Add response to history
        self.chat_history.append({"role": "model", "parts": [response_text]})
        
        return response_text

    def _extract_museum_query(self, message: str) -> Optional[Dict]:
        """Extract museum query parameters from user message"""
        message = message.lower()
        
        query = {}
        
        # Check for museum name mentions
        museum_names = self.museums_df['Name'].dropna().tolist() if not self.museums_df.empty else []
        for name in museum_names:
            if name.lower() in message:
                query['museum_name'] = name
                return query
                
        # Check for location queries
        if 'in' in message:
            parts = message.split('in')
            if len(parts) > 1:
                location = parts[1].strip()
                # Check if it's a city or state
                cities = self.museums_df['City'].dropna().unique().tolist() if not self.museums_df.empty else []
                states = self.museums_df['State'].dropna().unique().tolist() if not self.museums_df.empty else []
                
                for city in cities:
                    if city.lower() in location:
                        query['city'] = city
                        return query
                        
                for state in states:
                    if state.lower() in location:
                        query['state'] = state
                        return query
        
        # Check for search terms
        search_keywords = ['museum', 'museums', 'find', 'search', 'looking for', 'show me']
        if any(keyword in message for keyword in search_keywords):
            # Extract search terms
            words = message.split()
            for i, word in enumerate(words):
                if word in search_keywords and i < len(words) - 1:
                    query['search_term'] = words[i + 1]
                    return query
                    
        return None

    def _handle_museum_query(self, query: Dict, original_message: str) -> str:
        """Handle specific museum queries"""
        try:
            if 'museum_name' in query:
                museum_details = self.get_museum_details(query['museum_name'])
                if museum_details:
                    return f"Here's information about that museum:\n\n{self.format_museum_info(museum_details)}"
                else:
                    return f"I couldn't find specific information about '{query['museum_name']}'. However, you can ask me about other museums or search for museums in specific locations."
                    
            elif 'city' in query or 'state' in query:
                museums = self.get_museums_by_location(
                    city=query.get('city'), 
                    state=query.get('state')
                )
                if museums:
                    response = f"I found the following museums"
                    if 'city' in query:
                        response += f" in {query['city']}"
                    if 'state' in query:
                        response += f" in {query['state']}"
                    response += ":\n\n"
                    
                    for museum in museums:
                        response += f"{self.format_museum_info(museum)}\n"
                    return response
                else:
                    return "I couldn't find any museums matching your criteria. Please try a different location."
                    
            elif 'search_term' in query:
                museums = self.search_museums(query['search_term'])
                if museums:
                    response = f"I found the following museums related to '{query['search_term']}':\n\n"
                    for museum in museums[:5]:  # Limit to 5 results
                        response += f"{self.format_museum_info(museum)}\n"
                    return response
                else:
                    return f"I couldn't find any museums related to '{query['search_term']}'. Please try a different search term."
                    
        except Exception as e:
            pass
            
        # Fallback to general response
        return self._get_general_response(original_message)

    def _get_context_summary(self) -> str:
        """Get a summary of the museum database for context"""
        if self.museums_df.empty:
            return "No museum data available."
            
        total_museums = len(self.museums_df)
        states = self.museums_df['State'].dropna().nunique()
        types = self.museums_df['Type'].dropna().nunique()
        
        return f"I have information about {total_museums} museums across {states} states and {types} different types of museums."

    def _get_general_response(self, message: str) -> str:
        """Get a general response using Gemini"""
        try:
            context = self._get_context_summary()
            full_prompt = f"{self.system_prompt}\n\nContext: {context}\n\nUser: {message}"
            response = self.model.generate_content(full_prompt)
            response_text = response.text
            # Handle encoding issues
            response_text = response_text.encode('utf-8', errors='ignore').decode('utf-8')
            return response_text
        except:
            return "I can help you find information about museums. You can ask me about specific museums, search for museums in specific locations, or ask about different types of museums."

    def reset_conversation(self):
        """Reset the chat history"""
        self.chat_history = []

# Example usage
if __name__ == "__main__":
    # Initialize chatbot with your Gemini API key
    API_KEY = "AIzaSyDRATpNvG_tJgmInd6Iyn8xAtz1i06uQk0"  # Replace with your actual API key
    chatbot = MuseumChatbot(API_KEY)
    
    print("🏛️ Museum Information Chatbot")
    print("Ask me about museums, their locations, types, or specific information!")
    print("Type 'quit' to exit\n")
    
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'quit':
            break
            
        response = chatbot.get_chat_response(user_input)
        print(f"Bot: {response}\n")