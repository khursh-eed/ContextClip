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
        
    

    def _convert_bart_to_structured(self, bart_summary: str, original_prompt: str) -> str:
    
        def extract_assignees(text: str) -> List[str]:
            # Try to extract capitalized words or name patterns from action text as assignees
            # Ignore common filler words matched repeatedly, but keep proper nouns/names
            assignees = set()
            # Simple pattern to find capitalized words (names)
            candidates = re.findall(r'\b[A-Z][a-z]{1,}\b', text)
            # Filter some common non-assignee words
            ignore_list = {"Friday", "Monday", "Next", "Team", "Action", "Items"}
            for c in candidates:
                if c not in ignore_list:
                    assignees.add(c)
            return list(assignees)

        try:
            action_items = []
            segments_start = original_prompt.find('[00:')
            segments_end = original_prompt.find('\n\nPlease analyze')
            if segments_start != -1 and segments_end != -1:
                segments_text = original_prompt[segments_start:segments_end]
                lines = segments_text.split('\n')

                # Broader action keywords, add more verbs and modal verbs for generality
                action_keywords = [
                    'prepare', 'schedule', 'coordinate', 'by', 'next', 'demo', 'uat', 'update',
                    'notify', 'handle', 'can you', 'should we', 'action items are', 'prepares',
                    'coordinates', 'plan', 'assign', 'deliver', 'complete', 'review', 'follow up'
                ]

                for line in lines:
                    if ':' in line and any(keyword in line.lower() for keyword in action_keywords):
                        try:
                            timestamp = line.split(']')[0].replace('[', '') if '[' in line else "00:00"
                            parts = line.split(':')
                            if len(parts) >= 2:
                                speaker_part = parts[0]
                                if ']' in speaker_part:
                                    speaker = speaker_part.split(']')[1].strip()
                                else:
                                    speaker = "UNKNOWN"
                                content = ':'.join(parts[1:]).strip()
                                
                                # Extract assignees dynamically
                                assignees = extract_assignees(content)
                                assignee = assignees[0] if assignees else None

                                # Determine priority broadly
                                priority = "medium"
                                if re.search(r'\b(high priority|urgent|asap|immediately|by friday|deadline)\b', content.lower()):
                                    priority = "high"
                                elif re.search(r'\b(low|whenever|later|no rush)\b', content.lower()):
                                    priority = "low"

                                action_items.append({
                                    "timestamp": timestamp,
                                    "speaker": speaker,
                                    "text": content[:150] + "…" if len(content) > 150 else content,
                                    "assignee": assignee,
                                    "priority": priority
                                })
                        except Exception:
                            continue

            # Extract summary points by splitting on sentence boundaries
            summary_points = []
            if '. ' in bart_summary:
                sentences = bart_summary.split('. ')
                for sentence in sentences:
                    clean_sentence = sentence.strip().rstrip('.')
                    if clean_sentence and len(clean_sentence) > 10:
                        summary_points.append(clean_sentence)
            else:
                summary_points = [bart_summary.strip()]

            # If long single summary, break into logical parts by extracting keywords/topics
            if len(summary_points) == 1 and len(summary_points[0]) > 150:
                long_summary = summary_points[0]
                # Extract candidate keywords/topics by simple noun phrases or by most common meaningful words
                words = re.findall(r'\b\w+\b', long_summary.lower())
                stopwords = {'and', 'the', 'is', 'in', 'of', 'to', 'with', 'a', 'for', 'on', 'by', 'this', 'are', 'we'}
                filtered_words = [w for w in words if w not in stopwords and len(w) > 3]
                common_words = [word for word, count in Counter(filtered_words).most_common(8)]
                topics = [w.capitalize() for w in common_words]
                
                if topics:
                    summary_points = [f"Discussion covering: {topic}" for topic in topics]
                else:
                    # fallback split by common conjunctions
                    if ' and ' in long_summary:
                        parts = [part.strip() for part in long_summary.split(' and ')]
                        summary_points = [part for part in parts if len(part) > 20][:6]            

            # Limit number of summary points and action items
            summary_points = summary_points[:8]
            action_items = action_items[:5]

            structured_data = {
                "meeting_summary": summary_points,
                "action_items": action_items
            }

            return json.dumps(structured_data, indent=2)

        except Exception as e:
            print(f"Error converting BART output: {e}")
            return f'{{"meeting_summary": ["{bart_summary}"], "action_items": []}}'
    
    def _generate_with_huggingface(self, prompt: str) -> str:
        """Generate response using Hugging Face model."""


        # we already defined generator using the pipeline method, and now just using it if it exists
        if self.generator is None:
            return self._create_mock_summary_from_transcript(prompt)
        
        try:
            if getattr(self, 'model_type_pipeline', 'text-generation') == "summarization":
                # Use BART for summarization
                # Extract just the transcript content for BART
                segments_start = prompt.find('[00:')
                segments_end = prompt.find('\n\nPlease analyze')
                if segments_start != -1 and segments_end != -1:
                    transcript_text = prompt[segments_start:segments_end]
                    # Convert to plain text for BART
                    plain_text = transcript_text.replace('[', '').replace(']', '').replace('SPEAKER_00:', '').replace('SPEAKER_01:', '').replace('SPEAKER_02:', '')
                else:
                    plain_text = prompt[:500]  # Fallback
                
                # Calculate dynamic lengths for minimum 50% compression
                input_word_count = len(plain_text.split())
                min_summary_length = max(50, int(input_word_count * 0.5))  # Minimum 50% of original length
                max_summary_length = max(min_summary_length + 50, int(input_word_count * 0.8))  # Up to 80% for detailed summaries
                
                # Ensure we don't exceed model limits
                min_summary_length = min(min_summary_length, 400)
                max_summary_length = min(max_summary_length, 600)
                
                print(f"Input length: {input_word_count} words, Summary range: {min_summary_length}-{max_summary_length} words")
                
                # Generate summary with BART using dynamic lengths
                summary_result = self.generator(
                    plain_text, 
                    max_length=max_summary_length, 
                    min_length=min_summary_length, 
                    do_sample=False,
                    length_penalty=0.8,  # Encourage longer summaries
                    num_beams=4         # Better quality with beam search
                )
                bart_summary = summary_result[0]['summary_text']
                
                # Convert BART output to our JSON format
                return self._convert_bart_to_structured(bart_summary, prompt)
            
            else:
                # Use text generation
                outputs = self.generator(
                    prompt,
                    max_length=len(prompt) + 200,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True
                )
                
                # Extract generated text (remove the input prompt)
                generated_text = outputs[0]['generated_text']
                response = generated_text[len(prompt):].strip()
                
                return response
            
        except Exception as e:
            print(f"Error generating with Hugging Face model: {e}")
            return self._create_mock_summary_from_transcript(prompt)
    
    def _generate_with_openai(self, prompt: str) -> str:
        """Generate response using OpenAI API."""
        try:
            response = openai.ChatCompletion.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that analyzes meeting transcripts and provides concise summaries and action items."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating with OpenAI: {e}")
            return "Error: Could not generate summary with OpenAI API."
        
    def summarize_transcript(self, segments_df: pd.DataFrame) -> Dict[str, Any]:
        # generate summary
        print(f"Generating summary using {self.model_type} model...")
        
        # Format segments for prompt
        segments_text = self._format_segments_for_prompt(segments_df)
        
        # Build complete prompt
        prompt = self._build_prompt(segments_text)
        
        # Generate response based on model type
        if self.model_type == "huggingface":
            response = self._generate_with_huggingface(prompt)
        else:  # openai
            response = self._generate_with_openai(prompt)
        
        # Parse response
        summary_data = self._parse_llm_response(response)
        
        # Add metadata
        summary_data.update({
            "generated_at": datetime.utcnow().isoformat(),
            "model_type": self.model_type,
            "model_name": self.model_name,
            "total_segments": len(segments_df),
            "meeting_duration": f"{segments_df['end'].max():.1f} seconds"
        })
        
        return summary_data
    
def summarize_meeting(job_id: str, model_type: str = "huggingface", openai_api_key: str = None) -> Dict[str, Any]:
        
        # Main function to generate meeting summary for a job.
        
        # Path to segments file
        segments_path = f"storage/{job_id}/segments.csv"
        summary_path = f"storage/{job_id}/summary.json"
        
        if not os.path.exists(segments_path):
            raise FileNotFoundError(f"Segments file not found: {segments_path}")
        
        # Load transcript segments
        print(f"Loading transcript segments from: {segments_path}")
        segments_df = pd.read_csv(segments_path)
        
        # Initialize summarizer
        summarizer = MeetingSummarizer(
            model_type=model_type,
            openai_api_key=openai_api_key
        )
        
        # Generate summary
        summary_data = summarizer.summarize_transcript(segments_df)
        
        # Save summary to file
        print(f"Saving summary to: {summary_path}")
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary_data, f, indent=2, ensure_ascii=False)
        
        print(f"✓ Meeting summary generated successfully!")
        
        return summary_data

def create_example_prompt_with_sample_segments():
    """
    Create an example of the prompt with sample segments for demonstration.
    
    Returns:
        Dictionary with sample data and formatted prompt
    """
    # Sample segments data
    sample_segments = [
        {
            "start": 15.0,
            "end": 22.0, 
            "speaker": "SPEAKER_00",
            "text": "Good morning everyone, let's start our project review meeting."
        },
        {
            "start": 23.5,
            "end": 35.2,
            "speaker": "SPEAKER_01", 
            "text": "Thanks John. I've completed the API integration and we're ready for testing phase."
        },
        {
            "start": 36.0,
            "end": 45.8,
            "speaker": "SPEAKER_00",
            "text": "Great work Sarah. Can you prepare a demo for the client by Friday? This is high priority."
        }
    ]
    
    # Create DataFrame
    segments_df = pd.DataFrame(sample_segments)
    
    # Initialize summarizer
    summarizer = MeetingSummarizer(model_type="huggingface")
    
    # Format segments and build prompt
    segments_text = summarizer._format_segments_for_prompt(segments_df)
    prompt = summarizer._build_prompt(segments_text)
    
    return {
        "sample_segments": sample_segments,
        "formatted_segments": segments_text,
        "complete_prompt": prompt,
        "expected_output_format": {
            "meeting_summary": [
                "Project review meeting initiated with team status updates",
                "API integration completed and ready for testing phase", 
                "Client demo scheduled for Friday with high priority"
            ],
            "action_items": [
                {
                    "timestamp": "00:36",
                    "speaker": "SPEAKER_00",
                    "text": "Prepare demo for client by Friday",
                    "assignee": "Sarah",
                    "priority": "high"
                }
            ]
        }
    }


if __name__ == "__main__":
    # Example usage and testing
    print("=== ContextClip Meeting Summarizer ===")
    
    # Create example prompt
    example = create_example_prompt_with_sample_segments()
    
    print("\nSample Segments:")
    for segment in example["sample_segments"]:
        print(f"[{segment['start']:.1f}s] {segment['speaker']}: {segment['text']}")
    
    print(f"\nFormatted for Prompt:")
    print(example["formatted_segments"])
    
    print(f"\nComplete Prompt:")
    print("=" * 50)
    print(example["complete_prompt"])
    print("=" * 50)
    
    print(f"\nExpected Output Format:")
    print(json.dumps(example["expected_output_format"], indent=2))

    
