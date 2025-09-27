from sqlalchemy import Column, Integer, String, DateTime, create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import uuid
DATABASE_URL = "sqlite:///./contextclip.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# engine connects file to db on sqlite, the sessionlocla generates a new session object whn called and base is for identification of special class

def generate_job_id():
    return str(uuid.uuid4())

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(String, primary_key=True, index=True, default=generate_job_id)
    status = Column(String, default="pending")  # pending, processing, done, error
    created_at = Column(DateTime, default=datetime.utcnow)
    media_path = Column(String, nullable=True)
    transcript_path = Column(String, nullable=True)
    slides_count = Column(Integer, default=0)
    slides_path= Column(String, nullable=True)

def create_tables():
    # creating tables and migrating database(adding missing columns) if required 
    migrate_database()
    Base.metadata.create_all(bind=engine)

def migrate_database():
    # checks for exisiting table and adds wtv is missing, if table isnt there it'll be created using create tables
    # its a custom migration, for bigger ones use Alembic
    try:
        with engine.connect() as conn:
            result = conn.execute(text("PRAGMA table_info(jobs)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'transcript_path' not in columns:
                print("Adding transcript_path column to jobs table...")
                conn.execute(text("ALTER TABLE jobs ADD COLUMN transcript_path VARCHAR"))
                conn.commit()
                print("Migration completed successfully!")
                
    except Exception as e:
        if "no such table: jobs" not in str(e).lower():
            print(f"Migration warning: {e}")

def reset_database():
    # for dev
    if os.path.exists("contextclip.db"):
        os.remove("contextclip.db")
        print("Database reset - will be recreated on next startup")

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
    