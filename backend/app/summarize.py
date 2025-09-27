import json
import pandas as pd
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
import re
from collections import Counter
from typing import List


try:
    from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM
    HF_AVAILABLE =True
except ImportError:
    HF_AVAILABLE =False
    print("Warning: Transformers not avaible, please install requirements.txt")

try:
    import openai
    OPEAI_AVAILABLE =True
except ImportError:
    OPEAI_AVAILABLE =False
    print("Warning: Transformers not avaible, please install requirements.txt")


class MeetingSummarizer:
    def __init__(self, model_type : str= "huggingface", model_name: str= None, open_ai_key: str=None):
        # initialisng the summerizer
        self.model_type = model_type
        self.model_name = model_name
        self.open_ai_key = open_ai_key

        if model_type == "huggingface":
            if not HF_AVAILABLE:
                raise ImportError("Transformers not avaiblable, install it using pip install transformers")
            
            self.model_name = model_name or "facebook/bart-large-cnn"
            self._init_huggingface_model()

        elif model_type =="openai":
            if not OPEAI_AVAILABLE:
                raise ImportError("OpenAI not available, install it using pip install openai")
            self.model_name= model_name or "gpt-3.5-turbo"
            if open_ai_key:
                openai.api_key = open_ai_key
        else:
            raise ValueError("model_type must be 'huggingface' or 'openai' ")
        
    

    def _init_huggingface_model(self):
        # initialising the tokeniser and hugging face model
        try:
            print(f"Loading Hugging Face model: {self.model_name}")
            # default ->bart, otherwise mentioned model used
            if "bart" in self.model_name.lower():
                self.generator = pipeline(
                    "summarization",
                    model=self.model_name,
                    max_length=800,  # Increased from 200 for larger summaries
                    min_length=100,  # Increased from 50 for more detailed content
                    do_sample=False
                )
                self.model_type_pipeline = "summarization"
            else:
                #other models
                self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
                self.model = AutoModelForCausalLM.from_pretrained(self.model_name)
                self.generator = pipeline(
                    "text-generation",
                    model=self.model,
                    tokenizer=self.tokenizer,
                    max_length=512,
                    do_sample=True,
                    temperature=0.7,
                    pad_token_id=self.tokenizer.eos_token_id
                )
                self.model_type_pipeline = "text-generation"
                
            print("HuggingFace model loaded successfully")
            
        except Exception as e:
            print(f"Error loading Hugging Face model: {e}")
            # Fallback to a simpler model
            print("Falling back to mock summarization...")
            self.generator = None
            self.model_type_pipeline = "mock"
    
    def _format_segments_for_prompt(self, segments_df: pd.DataFrame) -> str:

        # we give a DataFrame with columns ['start', 'end', 'speaker', 'text'] 
        # returns in a format, extracts the datetime, the speaker id and the text
        formatted_segments = []
        
        for _, row in segments_df.iterrows():
            timestamp = self._format_timestamp(row['start'])
            speaker = row['speaker']
            text = row['text'].strip()
            
            formatted_segments.append(f"[{timestamp}] {speaker}: {text}")
        
        return "\n".join(formatted_segments)
    
    def _format_timestamp(self, seconds: float) -> str:
        # returns the formated time stamp for the prev fucn
        """Convert seconds to MM:SS format."""
        minutes = int(seconds // 60)
        seconds = int(seconds % 60)
        return f"{minutes:02d}:{seconds:02d}"
    
    def _build_prompt(self, segments_text: str) -> str:

        # take the formated segments and return prompt string
        
        prompt = f"""Given the following time-ordered speaker segments: 

            {segments_text}

            Please analyze this meeting transcript and provide:

            1. MEETING SUMMARY: 3-5 concise bullet points covering the main topics discussed
            2. ACTION ITEMS: List any tasks, decisions, or follow-ups mentioned, including:
            - Timestamp when mentioned
            - Speaker who mentioned it
            - Brief description of the action
            - Assignee (if mentioned)
            - Priority level (if indicated)

            Use short, clear sentences. Format your response as JSON with this structure:
            {{
                "meeting_summary": [
                    "bullet point 1",
                    "bullet point 2", 
                    "bullet point 3"
                ],
                "action_items": [
                    {{
                        "timestamp": "MM:SS",
                        "speaker": "SPEAKER_ID",
                        "text": "description of action item",
                        "assignee": "person assigned (if mentioned)",
                        "priority": "high/medium/low (if indicated)"
                    }}
                ]
            }}

            Response:"""
                
        return prompt
    
    def _parse_llm_response(self, response_text: str) -> Dict[str, Any]:
        # convert the llm resposne in json format
        try:
            #find JSON in the response
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                return json.loads(json_str)
            else:
                # If no JSON found, create a fallback structure
                return self._create_fallback_summary(response_text)
                
        except json.JSONDecodeError:
            print("Warning: Could not parse LLM response as JSON, using fallback")
            return self._create_fallback_summary(response_text)
        
    