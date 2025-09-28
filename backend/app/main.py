from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import os
import shutil
from datetime import datetime

from .database import get_db, create_tables, Job
from .workers import process_job
from .summarize import summarize_meeting


# make the app
app = FastAPI(
    title="ContextClip API",
    description="Audio processing, diarization, and semantic search API",
    version="1.0.0"
)

# configuring cors

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # React dev server (default)
        "http://localhost:5173",    # Vite dev server
        "http://localhost:8080",    # Vue dev server
        "http://127.0.0.1:3000",    # Alternative localhost
        "http://127.0.0.1:5173",    # Alternative localhost
        "*"                         # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# creating tables whn we start
# this req- makes the fun run even before req are received
@app.on_event("startup")
async def startup_event():
    create_tables()
    # Ensure storage directory exists
    os.makedirs("storage", exist_ok=True)

@app.get("/")
async def root():
    return {"message": "ContextClip API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "contextclip-api"}

# the upload request
@app.post("/upload")
async def upload_files(
    media: UploadFile = File(...),
    slides: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    
#creating the job in db
    job = Job(
        status="pending",
        created_at=datetime.utcnow(),
        slides_count=0 
        # the slides numebr weill be updated later on
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    #auto-generated job ID
    job_id = job.id
    
    #create storage dir for this job
    job_storage_path = f"storage/{job_id}"
    media_dir = f"{job_storage_path}/media"
    slides_original_dir = f"{job_storage_path}/slides/original"
    slides_images_dir = f"{job_storage_path}/slides/images"
    os.makedirs(media_dir, exist_ok=True)
    os.makedirs(slides_original_dir, exist_ok=True)
    os.makedirs(slides_images_dir, exist_ok=True)
    
    
    try:
        # Save media file
        media_filename = media.filename or f"media_{job_id}"
        media_path = f"{media_dir}/{media_filename}"
        with open(media_path, "wb") as buffer:
            shutil.copyfileobj(media.file, buffer)

        # Save slides
        slides_pdf_path = None
        slides_ppt_path = None
        image_count = 0
        for slide in slides:
            ext = os.path.splitext(slide.filename)[1].lower()
            save_path = f"{slides_original_dir}/{slide.filename}"
            with open(save_path, "wb") as buffer:
                shutil.copyfileobj(slide.file, buffer)
            if ext == ".pdf":
                slides_pdf_path = save_path
            elif ext in [".ppt", ".pptx"]:
                slides_ppt_path = save_path
            elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff"]:
                # Copy image to images dir as well
                shutil.copy(save_path, f"{slides_images_dir}/{slide.filename}")
                image_count += 1

        # Update job record
        job.media_path = media_path
        job.slides_pdf_path = slides_pdf_path
        job.slides_ppt_path = slides_ppt_path
        job.slides_image_dir = slides_images_dir
        job.slides_count = image_count
        db.commit()

        return JSONResponse(
            status_code=200,
            content={
                "job_id": job_id,
                "status": job.status,
                "media_filename": media.filename,
                "slides_count": image_count,
                "created_at": job.created_at.isoformat()
            }
        )
    except Exception as e:
        if os.path.exists(job_storage_path):
            shutil.rmtree(job_storage_path)
        try:
            db.delete(job)
            db.commit()
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
@app.get("/job/{job_id}")
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    # this is to get details about the job:
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # basic info
    job_data = {
        "job_id": job.id,
        "status": job.status,
        "created_at": job.created_at.isoformat(),
        "media_path": job.media_path,
        "slides_count": job.slides_count,
        "urls": {
            "transcript": None,
            "summary": None,
            "segments": None,
            "slide_texts": None,
            "linked_segments": None
        },
        "action_items": [],
        "slide_links": [],
        "summary": None,
        "meeting_duration": None,
        "speakers": []
    }
    
    # other urls
    
    job_storage_path = f"storage/{job_id}"

    transcript_file = f"{job_storage_path}/transcript.json"
    if os.path.exists(transcript_file):
        job_data["urls"]["transcript"] = f"/files/{job_id}/transcript.json"
    
    summary_file = f"{job_storage_path}/summary.json"
    if os.path.exists(summary_file):
        job_data["urls"]["summary"] = f"/files/{job_id}/summary.json"
        try:
            import json
            with open(summary_file, 'r', encoding='utf-8') as f:
                summary_data = json.load(f)
            
            job_data["summary"] = summary_data.get("meeting_summary", [])
            job_data["action_items"] = summary_data.get("action_items", [])
            job_data["meeting_duration"] = summary_data.get("meeting_duration", None)
        except Exception as e:
            print(f"Error loading summary: {e}")
    
    segments_file = f"{job_storage_path}/segments.csv"
    if os.path.exists(segments_file):
        job_data["urls"]["segments"] = f"/files/{job_id}/segments.csv"
        try:
            import pandas as pd
            segments_df = pd.read_csv(segments_file)
            job_data["speakers"] = list(segments_df['speaker'].unique())
            if not job_data["meeting_duration"]:
                job_data["meeting_duration"] = f"{segments_df['end'].max():.1f} seconds"
        except Exception as e:
            print(f"Error loading segments: {e}")

    slide_texts_file = f"{job_storage_path}/slide_texts.json"
    if os.path.exists(slide_texts_file):
        job_data["urls"]["slide_texts"] = f"/files/{job_id}/slide_texts.json"
    
    linked_segments_file = f"{job_storage_path}/linked_segments.csv"
    if os.path.exists(linked_segments_file):
        job_data["urls"]["linked_segments"] = f"/files/{job_id}/linked_segments.csv"
        try:
            import pandas as pd
            linked_df = pd.read_csv(linked_segments_file)
            
            # Extract slide links (segments that are linked to slides)
            slide_links = []
            for _, row in linked_df.iterrows():
                if pd.notna(row.get('linked_slide')):
                    slide_links.append({
                        "slide": row['linked_slide'],
                        "timestamp": f"{int(row['start']//60):02d}:{int(row['start']%60):02d}",
                        "speaker": row['speaker'],
                        "text": row['text'][:100] + "..." if len(row['text']) > 100 else row['text'],
                        "confidence": row.get('confidence', 0)
                    })
            
            job_data["slide_links"] = slide_links
        except Exception as e:
            print(f"Error loading linked segments: {e}")
    
    return JSONResponse(
        status_code=200,
        content=job_data
    )

@app.post("/job/{job_id}/process")
async def start_job_processing(job_id: str, db: Session = Depends(get_db)):
    # to start the job processing
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "pending":
        raise HTTPException(status_code=400, detail=f"Job is already {job.status}")
    
    # Start processing from the wokers
    await process_job(job_id)
    
    return {"message": f"Started processing job {job_id}"}

@app.post("/job/{job_id}/summarize")
async def generate_summary(
    job_id: str, 
    model_type: str = "huggingface",
    openai_api_key: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # processed job earlier, now get the summary for the job
    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # we need to process first, and get the segements file, then this
    segments_path = f"storage/{job_id}/segments.csv"
    if not os.path.exists(segments_path):
        raise HTTPException(
            status_code=400, 
            detail="Transcript segments not found. Process the job first."
        )
    
    try:
        # calling the summaeize fun
        summary_data = summarize_meeting(
            job_id=job_id,
            model_type=model_type,
            openai_api_key=openai_api_key
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "job_id": job_id,
                "summary_generated": True,
                "summary_path": f"storage/{job_id}/summary.json",
                "summary_data": summary_data
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

@app.get("/job/{job_id}/summary")
async def get_summary(job_id: str, db: Session = Depends(get_db)):
    # after the processing and summary is generated, we can get the summary using this

    job = db.query(Job).filter(Job.id == job_id).first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    summary_path = f"storage/{job_id}/summary.json"
    if not os.path.exists(summary_path):
        raise HTTPException(status_code=404, detail="Summary not found. Generate it first.")
    
    try:
        import json
        with open(summary_path, 'r', encoding='utf-8') as f:
            summary_data = json.load(f)
        
        return JSONResponse(
            status_code=200,
            content={
                "job_id": job_id,
                "summary_data": summary_data
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load summary: {str(e)}")

@app.get("/search")
async def search_transcripts(q: str, db: Session = Depends(get_db)):
    # search for the transcripts of all jobs tht hv been completed
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters long")
    
    query = q.strip().lower()
    results = []
    
    try:
        #get all completed ones
        jobs = db.query(Job).filter(Job.status == "completed").all()
        
        for job in jobs:
            job_storage_path = f"storage/{job.id}"
            
            # n check for segements file
            segments_file = f"{job_storage_path}/segments.csv"
            if os.path.exists(segments_file):
                try:
                    import pandas as pd
                    segments_df = pd.read_csv(segments_file)
                    
                    # Search in transcript text
                    matching_segments = []
                    for _, segment in segments_df.iterrows():
                        text = segment['text'].lower()
                        if query in text:
                            # Calculate simple relevance score based on query position and frequency
                            score = text.count(query)
                            if text.startswith(query):
                                score += 5  # Boost for beginning matches
                            if query in text.split()[:3]:  # First few words
                                score += 3
                            
                            matching_segments.append({
                                "timestamp": f"{int(segment['start']//60):02d}:{int(segment['start']%60):02d}",
                                "speaker": segment['speaker'],
                                "text": segment['text'],
                                "score": score,
                                "start_time": segment['start']
                            })
                    
                    if matching_segments:
                        # Sort by relevance score
                        matching_segments.sort(key=lambda x: x['score'], reverse=True)
                        
                        # Calculate overall job relevance
                        total_score = sum(seg['score'] for seg in matching_segments)
                        
                        results.append({
                            "job_id": job.id,
                            "created_at": job.created_at.isoformat(),
                            "score": total_score,
                            "matching_segments": matching_segments[:5],  # Top 5 matches per job
                            "total_matches": len(matching_segments),
                            "meeting_duration": f"{segments_df['end'].max():.1f} seconds" if len(segments_df) > 0 else None
                        })
                        
                except Exception as e:
                    print(f"Error searching job {job.id}: {e}")
                    continue
            
            # Search in slide texts
            slide_texts_file = f"{job_storage_path}/slide_texts.json"
            if os.path.exists(slide_texts_file):
                try:
                    import json
                    with open(slide_texts_file, 'r', encoding='utf-8') as f:
                        slide_data = json.load(f)
                    
                    matching_slides = []
                    for slide in slide_data:
                        text = slide['text'].lower()
                        if query in text:
                            score = text.count(query) * 2  # Boost slide matches
                            matching_slides.append({
                                "filename": slide['filename'],
                                "text": slide['text'],
                                "score": score
                            })
                    
                    if matching_slides:
                        # Add slide matches to existing job result or create new one
                        existing_result = next((r for r in results if r['job_id'] == job.id), None)
                        if existing_result:
                            existing_result['matching_slides'] = matching_slides
                            existing_result['score'] += sum(s['score'] for s in matching_slides)
                        else:
                            results.append({
                                "job_id": job.id,
                                "created_at": job.created_at.isoformat(),
                                "score": sum(s['score'] for s in matching_slides),
                                "matching_slides": matching_slides,
                                "matching_segments": [],
                                "total_matches": 0
                            })
                            
                except Exception as e:
                    print(f"Error searching slides for job {job.id}: {e}")
                    continue
        
        # Sort results by overall score
        results.sort(key=lambda x: x['score'], reverse=True)
        
        return JSONResponse(
            status_code=200,
            content={
                "query": q,
                "total_results": len(results),
                "results": results[:20]  # Return top 20 results
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/files/{job_id}/{filename}")
async def serve_job_file(job_id: str, filename: str, db: Session = Depends(get_db)):
    # serves files form the dir
    # verify if job exists
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # construct its file path
    file_path = f"storage/{job_id}/{filename}"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # content type 
    if filename.endswith('.json'):
        media_type = "application/json"
    elif filename.endswith('.csv'):
        media_type = "text/csv"
    elif filename.endswith('.txt'):
        media_type = "text/plain"
    else:
        media_type = "application/octet-stream"
    
    # return
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return JSONResponse(
            status_code=200,
            content=content if filename.endswith('.json') else {"content": content},
            media_type=media_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

@app.get("/jobs")
async def list_jobs(status: Optional[str] = None, db: Session = Depends(get_db)):
    # returning all jobs + there is status filter optional
    query = db.query(Job)
    
    if status:
        query = query.filter(Job.status == status)
    
    jobs = query.order_by(Job.created_at.desc()).all()
    
    job_list = []
    for job in jobs:
        job_data = {
            "job_id": job.id,
            "status": job.status,
            "created_at": job.created_at.isoformat(),
            "slides_count": job.slides_count,
            "has_transcript": os.path.exists(f"storage/{job.id}/segments.csv"),
            "has_summary": os.path.exists(f"storage/{job.id}/summary.json"),
            "has_slides": os.path.exists(f"storage/{job.id}/slide_texts.json")
        }
        job_list.append(job_data)
    
    return JSONResponse(
        status_code=200,
        content={
            "total_jobs": len(job_list),
            "jobs": job_list
        }
    )

# calling the main app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
