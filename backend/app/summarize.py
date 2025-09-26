import json
import pandas as pd
import os
from typing import Dict, List, Any, Optional
from datetime import datetime


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
        
    

