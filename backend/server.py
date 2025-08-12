from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pymongo import MongoClient
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import os
import uuid
import qrcode
import io
import base64
from datetime import datetime, date
import pandas as pd
from pathlib import Path
import tempfile
import json

# Environment variables
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "attendance_system")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

app = FastAPI(title="Attendance System API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client[DB_NAME]
attendance_sessions = db.attendance_sessions
attendance_records = db.attendance_records

# Pydantic models
class AttendanceSession(BaseModel):
    time_slot: str
    lecture_or_lab: str
    subject: str
    faculty: str
    class_name: str
    semester: str
    date: str

class AttendanceRecord(BaseModel):
    session_id: str
    student_name: str
    enrollment_number: str
    email: EmailStr
    selfie_data: str  # base64 encoded image
    timestamp: datetime

class AttendanceQuery(BaseModel):
    class_name: str
    time_slot: str
    faculty: str
    subject: str
    semester: str
    date: str

class StudentAuth(BaseModel):
    session_id: str
    email: EmailStr
    name: str
    enrollment_number: str

# Utility functions
def generate_qr_code(data: str) -> str:
    """Generate QR code and return base64 encoded image"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    return f"data:image/png;base64,{img_base64}"

def validate_charusat_email(email: str) -> bool:
    """Validate if email belongs to charusat.edu.in domain"""
    return email.endswith("@charusat.edu.in")

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

@app.post("/api/teacher/create-session")
async def create_attendance_session(session: AttendanceSession):
    """Create new attendance session and generate QR code"""
    try:
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        
        # Create session document
        session_doc = {
            "session_id": session_id,
            "time_slot": session.time_slot,
            "lecture_or_lab": session.lecture_or_lab,
            "subject": session.subject,
            "faculty": session.faculty,
            "class_name": session.class_name,
            "semester": session.semester,
            "date": session.date,
            "created_at": datetime.now(),
            "is_active": True
        }
        
        # Insert into database
        attendance_sessions.insert_one(session_doc)
        
        # Generate QR code data (URL for student to scan)
        qr_data = f"session_id={session_id}"
        qr_code_image = generate_qr_code(qr_data)
        
        # Generate shareable link
        link = f"/student/attendance?session_id={session_id}"
        
        return {
            "success": True,
            "session_id": session_id,
            "qr_code": qr_code_image,
            "link": link,
            "message": "Attendance session created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")

@app.post("/api/student/authenticate")
async def authenticate_student(auth: StudentAuth):
    """Mock authentication for demo - validate email and session"""
    try:
        # Check if session exists and is active
        session = attendance_sessions.find_one({
            "session_id": auth.session_id,
            "is_active": True
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Invalid or expired session")
        
        # Validate email domain (mock authentication)
        if not validate_charusat_email(auth.email):
            raise HTTPException(status_code=403, detail="Only @charusat.edu.in emails are allowed")
        
        # Check if student already marked attendance
        existing_record = attendance_records.find_one({
            "session_id": auth.session_id,
            "email": auth.email
        })
        
        if existing_record:
            raise HTTPException(status_code=409, detail="Attendance already marked for this session")
        
        return {
            "success": True,
            "message": "Authentication successful",
            "session_info": {
                "subject": session["subject"],
                "faculty": session["faculty"],
                "class_name": session["class_name"],
                "time_slot": session["time_slot"],
                "date": session["date"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@app.post("/api/student/submit-attendance")
async def submit_attendance(
    session_id: str = Form(...),
    student_name: str = Form(...),
    enrollment_number: str = Form(...),
    email: str = Form(...),
    selfie: UploadFile = File(...)
):
    """Submit attendance with selfie"""
    try:
        # Validate session
        session = attendance_sessions.find_one({
            "session_id": session_id,
            "is_active": True
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Invalid or expired session")
        
        # Validate email
        if not validate_charusat_email(email):
            raise HTTPException(status_code=403, detail="Only @charusat.edu.in emails are allowed")
        
        # Check for duplicate attendance
        existing_record = attendance_records.find_one({
            "session_id": session_id,
            "email": email
        })
        
        if existing_record:
            raise HTTPException(status_code=409, detail="Attendance already marked")
        
        # Process selfie
        selfie_content = await selfie.read()
        selfie_base64 = base64.b64encode(selfie_content).decode()
        
        # Create attendance record
        attendance_record = {
            "record_id": str(uuid.uuid4()),
            "session_id": session_id,
            "student_name": student_name,
            "enrollment_number": enrollment_number,
            "email": email,
            "selfie_data": selfie_base64,
            "timestamp": datetime.now(),
            # Copy session details for easy querying
            "time_slot": session["time_slot"],
            "lecture_or_lab": session["lecture_or_lab"],
            "subject": session["subject"],
            "faculty": session["faculty"],
            "class_name": session["class_name"],
            "semester": session["semester"],
            "date": session["date"]
        }
        
        # Insert attendance record
        attendance_records.insert_one(attendance_record)
        
        return {
            "success": True,
            "message": "Attendance marked successfully",
            "timestamp": datetime.now()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit attendance: {str(e)}")

@app.post("/api/teacher/get-attendance")
async def get_attendance(query: AttendanceQuery):
    """Get attendance records based on query parameters"""
    try:
        # Build query filter
        filter_query = {
            "class_name": query.class_name,
            "time_slot": query.time_slot,
            "faculty": query.faculty,
            "subject": query.subject,
            "semester": query.semester,
            "date": query.date
        }
        
        # Get attendance records
        records = list(attendance_records.find(filter_query, {
            "selfie_data": 0  # Exclude selfie data from initial response
        }))
        
        # Convert ObjectId to string for JSON serialization
        for record in records:
            record["_id"] = str(record["_id"])
            if "timestamp" in record:
                record["timestamp"] = record["timestamp"].isoformat()
        
        return {
            "success": True,
            "total_attendance": len(records),
            "records": records,
            "query_info": filter_query
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch attendance: {str(e)}")

@app.post("/api/teacher/download-attendance")
async def download_attendance(query: AttendanceQuery):
    """Download attendance records as Excel file"""
    try:
        # Build query filter
        filter_query = {
            "class_name": query.class_name,
            "time_slot": query.time_slot,
            "faculty": query.faculty,
            "subject": query.subject,
            "semester": query.semester,
            "date": query.date
        }
        
        # Get attendance records
        records = list(attendance_records.find(filter_query, {
            "selfie_data": 0  # Exclude selfie data
        }))
        
        if not records:
            raise HTTPException(status_code=404, detail="No attendance records found")
        
        # Prepare data for Excel
        excel_data = []
        for record in records:
            excel_data.append({
                "Student Name": record.get("student_name", ""),
                "Enrollment Number": record.get("enrollment_number", ""),
                "Email": record.get("email", ""),
                "Time Slot": record.get("time_slot", ""),
                "Subject": record.get("subject", ""),
                "Faculty": record.get("faculty", ""),
                "Class": record.get("class_name", ""),
                "Semester": record.get("semester", ""),
                "Date": record.get("date", ""),
                "Attendance Time": record.get("timestamp").isoformat().replace("T", " ").split(".")[0] if record.get("timestamp") else ""
            })
        
        # Create DataFrame and Excel file
        df = pd.DataFrame(excel_data)
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
        df.to_excel(temp_file.name, index=False)
        temp_file.close()
        
        # Generate filename
        filename = f"attendance_{query.class_name}_{query.subject}_{query.date}.xlsx"
        
        return FileResponse(
            temp_file.name,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Excel file: {str(e)}")

@app.post("/api/teacher/reset-attendance")
async def reset_attendance(query: AttendanceQuery):
    """Reset/delete attendance records for given parameters"""
    try:
        # Build query filter
        filter_query = {
            "class_name": query.class_name,
            "time_slot": query.time_slot,
            "faculty": query.faculty,
            "subject": query.subject,
            "semester": query.semester,
            "date": query.date
        }
        
        # Count records to be deleted
        count = attendance_records.count_documents(filter_query)
        
        if count == 0:
            raise HTTPException(status_code=404, detail="No attendance records found to reset")
        
        # Delete attendance records
        result = attendance_records.delete_many(filter_query)
        
        # Also deactivate the session if exists
        attendance_sessions.update_many(
            filter_query,
            {"$set": {"is_active": False}}
        )
        
        return {
            "success": True,
            "message": f"Successfully reset {result.deleted_count} attendance records",
            "deleted_count": result.deleted_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset attendance: {str(e)}")

@app.get("/api/session/{session_id}")
async def get_session_info(session_id: str):
    """Get session information for student authentication"""
    try:
        session = attendance_sessions.find_one({
            "session_id": session_id,
            "is_active": True
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found or expired")
        
        return {
            "success": True,
            "session_info": {
                "session_id": session_id,
                "subject": session["subject"],
                "faculty": session["faculty"],
                "class_name": session["class_name"],
                "time_slot": session["time_slot"],
                "date": session["date"],
                "lecture_or_lab": session["lecture_or_lab"],
                "semester": session["semester"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session info: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)