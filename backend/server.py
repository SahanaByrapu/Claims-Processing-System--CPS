from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import StreamingResponse
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import boto3
from botocore.exceptions import ClientError
from io import BytesIO
import mimetypes
import asyncio

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'default-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# AWS S3 Configuration
s3_client = boto3.client(
    's3',
    region_name=os.environ.get('AWS_REGION', 'us-east-1'),
    aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
)
S3_BUCKET = os.environ.get('S3_BUCKET_NAME', 'amzn-s3-claims')
S3_FOLDER = os.environ.get('S3_UPLOAD_FOLDER', 'claim-documents')

# Create the main app
app = FastAPI(title="TrustClaim Enterprise API")

"""origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000"
).split(",") """

origins = [
    "http://localhost:3000",   # React dev server
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "claimant"  # claimant, adjuster, admin

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str
    is_active: bool = True

class ClaimCreate(BaseModel):
    claim_type: str  # auto, health, property, life
    description: str
    incident_date: str
    amount: float
    policy_number: str

class ClaimUpdate(BaseModel):
    status: Optional[str] = None
    adjuster_notes: Optional[str] = None
    risk_score: Optional[float] = None
    fraud_analysis: Optional[str] = None

class ClaimResponse(BaseModel):
    id: str
    claim_number: str
    claimant_id: str
    claimant_name: str
    claimant_email: str
    claim_type: str
    description: str
    incident_date: str
    amount: float
    policy_number: str
    status: str
    documents: List[dict]
    adjuster_notes: str
    risk_score: Optional[float]
    fraud_analysis: Optional[str]
    assigned_adjuster_id: Optional[str]
    assigned_adjuster_name: Optional[str]
    created_at: str
    updated_at: str

class NoteCreate(BaseModel):
    content: str

class AuditLogResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    action: str
    resource_type: str
    resource_id: str
    details: str
    timestamp: str
    ip_address: Optional[str]

class AlertResponse(BaseModel):
    id: str
    claim_id: str
    claim_number: str
    alert_type: str
    severity: str
    message: str
    is_resolved: bool
    created_at: str

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_role(roles: List[str]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

async def log_audit(user_id: str, user_email: str, action: str, resource_type: str, resource_id: str, details: str, ip_address: str = None):
    audit_log = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user_email,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip_address": ip_address
    }
    await db.audit_logs.insert_one(audit_log)

def generate_claim_number() -> str:
    return f"CLM-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if user.role not in ["claimant", "adjuster", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    await log_audit(user_doc["id"], user.email, "USER_REGISTERED", "user", user_doc["id"], f"New {user.role} registered")
    
    token = create_token(user_doc["id"], user.email, user.role)
    return {
        "token": token,
        "user": {
            "id": user_doc["id"],
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    await log_audit(user["id"], user["email"], "USER_LOGIN", "user", user["id"], "User logged in")
    
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user["created_at"],
        is_active=user.get("is_active", True)
    )

# ==================== CLAIMS ROUTES ====================

@api_router.post("/claims", response_model=ClaimResponse)
async def create_claim(claim: ClaimCreate, user: dict = Depends(get_current_user)):
    claim_doc = {
        "id": str(uuid.uuid4()),
        "claim_number": generate_claim_number(),
        "claimant_id": user["id"],
        "claimant_name": user["name"],
        "claimant_email": user["email"],
        "claim_type": claim.claim_type,
        "description": claim.description,
        "incident_date": claim.incident_date,
        "amount": claim.amount,
        "policy_number": claim.policy_number,
        "status": "submitted",
        "documents": [],
        "adjuster_notes": "",
        "risk_score": None,
        "fraud_analysis": None,
        "assigned_adjuster_id": None,
        "assigned_adjuster_name": None,
        "notes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.claims.insert_one(claim_doc)
    
    await log_audit(user["id"], user["email"], "CLAIM_CREATED", "claim", claim_doc["id"], f"Claim {claim_doc['claim_number']} created")
    
    # Trigger fraud analysis asynchronously
    asyncio.create_task(analyze_fraud(claim_doc["id"]))
    
    return ClaimResponse(**{k: v for k, v in claim_doc.items() if k != "notes"})

@api_router.get("/claims", response_model=List[ClaimResponse])
async def get_claims(
    status: Optional[str] = None,
    claim_type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    
    # Filter based on role
    if user["role"] == "claimant":
        query["claimant_id"] = user["id"]
    elif user["role"] == "adjuster":
        query["$or"] = [
            {"assigned_adjuster_id": user["id"]},
            {"assigned_adjuster_id": None}
        ]
    # Admin sees all
    
    if status:
        query["status"] = status
    if claim_type:
        query["claim_type"] = claim_type
    
    claims = await db.claims.find(query, {"_id": 0, "notes": 0}).sort("created_at", -1).to_list(1000)
    return [ClaimResponse(**c) for c in claims]

@api_router.get("/claims/{claim_id}", response_model=ClaimResponse)
async def get_claim(claim_id: str, user: dict = Depends(get_current_user)):
    claim = await db.claims.find_one({"id": claim_id}, {"_id": 0, "notes": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Check access
    if user["role"] == "claimant" and claim["claimant_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return ClaimResponse(**claim)

@api_router.put("/claims/{claim_id}", response_model=ClaimResponse)
async def update_claim(claim_id: str, update: ClaimUpdate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Only adjusters and admins can update claims")
    
    claim = await db.claims.find_one({"id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.claims.update_one({"id": claim_id}, {"$set": update_data})
    
    await log_audit(user["id"], user["email"], "CLAIM_UPDATED", "claim", claim_id, f"Claim updated: {list(update_data.keys())}")
    
    updated = await db.claims.find_one({"id": claim_id}, {"_id": 0, "notes": 0})
    return ClaimResponse(**updated)

@api_router.post("/claims/{claim_id}/assign")
async def assign_claim(claim_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Only adjusters can assign claims")
    
    claim = await db.claims.find_one({"id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    await db.claims.update_one(
        {"id": claim_id},
        {"$set": {
            "assigned_adjuster_id": user["id"],
            "assigned_adjuster_name": user["name"],
            "status": "under_review",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await log_audit(user["id"], user["email"], "CLAIM_ASSIGNED", "claim", claim_id, f"Claim assigned to {user['name']}")
    
    return {"message": "Claim assigned successfully"}

@api_router.post("/claims/{claim_id}/approve")
async def approve_claim(claim_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Only adjusters can approve claims")
    
    await db.claims.update_one(
        {"id": claim_id},
        {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(user["id"], user["email"], "CLAIM_APPROVED", "claim", claim_id, "Claim approved")
    
    return {"message": "Claim approved"}

@api_router.post("/claims/{claim_id}/reject")
async def reject_claim(claim_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Only adjusters can reject claims")
    
    await db.claims.update_one(
        {"id": claim_id},
        {"$set": {"status": "rejected", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_audit(user["id"], user["email"], "CLAIM_REJECTED", "claim", claim_id, "Claim rejected")
    
    return {"message": "Claim rejected"}

# ==================== NOTES ROUTES ====================

@api_router.post("/claims/{claim_id}/notes")
async def add_note(claim_id: str, note: NoteCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Only adjusters can add notes")
    
    note_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "content": note.content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.claims.update_one(
        {"id": claim_id},
        {"$push": {"notes": note_doc}}
    )
    
    await log_audit(user["id"], user["email"], "NOTE_ADDED", "claim", claim_id, "Note added to claim")
    
    return note_doc

@api_router.get("/claims/{claim_id}/notes")
async def get_notes(claim_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Only adjusters can view notes")
    
    claim = await db.claims.find_one({"id": claim_id}, {"_id": 0, "notes": 1})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    return claim.get("notes", [])

# ==================== DOCUMENT ROUTES ====================

@api_router.post("/claims/{claim_id}/documents")
async def upload_document(
    claim_id: str,
    file: UploadFile = File(...),
    document_type: str = Query(...),
    user: dict = Depends(get_current_user)
):
    claim = await db.claims.find_one({"id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Only claimant who owns the claim or adjusters/admins can upload
    if user["role"] == "claimant" and claim["claimant_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Validate file type
    allowed_extensions = ["pdf", "jpg", "jpeg", "png", "tiff"]
    file_ext = file.filename.split('.')[-1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
    
    # Read file content
    file_content = await file.read()
    
    # Upload to S3
    s3_key = f"{S3_FOLDER}/{claim_id}/{str(uuid.uuid4())}_{file.filename}"
    content_type, _ = mimetypes.guess_type(file.filename)
    
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type or "application/octet-stream",
            Metadata={"claim_id": claim_id, "document_type": document_type}
        )
        print("s3_client");
    except ClientError as e:
        logger.error(f"S3 upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")
    
    # Save document reference
    doc_ref = {
        "id": str(uuid.uuid4()),
        "filename": file.filename,
        "s3_key": s3_key,
        "document_type": document_type,
        "size": len(file_content),
        "content_type": content_type,
        "uploaded_by": user["id"],
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.claims.update_one(
        {"id": claim_id},
        {"$push": {"documents": doc_ref}}
    )
    
    await log_audit(user["id"], user["email"], "DOCUMENT_UPLOADED", "claim", claim_id, f"Document {file.filename} uploaded")
    
    return {"message": "Document uploaded successfully", "document": doc_ref}

@api_router.get("/claims/{claim_id}/documents/{doc_id}/download")
async def download_document(claim_id: str, doc_id: str, user: dict = Depends(get_current_user)):
    claim = await db.claims.find_one({"id": claim_id}, {"_id": 0})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Check access
    if user["role"] == "claimant" and claim["claimant_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Find document
    doc = next((d for d in claim.get("documents", []) if d["id"] == doc_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=doc["s3_key"])
        file_content = response['Body'].read()
        
        return StreamingResponse(
            BytesIO(file_content),
            media_type=doc.get("content_type", "application/octet-stream"),
            headers={"Content-Disposition": f"attachment; filename={doc['filename']}"}
        )
    except ClientError as e:
        logger.error(f"S3 download error: {e}")
        raise HTTPException(status_code=500, detail="Failed to download document")

# ==================== FRAUD ANALYSIS ====================
""" You are an insurance fraud detection expert. Analyze the claim details and provide:
1. A risk score from 0-100 (0=no risk, 100=high risk)
2. Key risk indicators found
3. Recommendation (approve/review/reject)

Respond in JSON format:
{
    "risk_score": <number>,
    "risk_indicators": ["indicator1", "indicator2"],
    "recommendation": "approve|review|reject",
    "analysis_summary": "brief explanation"
}"""
async def analyze_fraud(claim_id: str):
    """Analyze claim for potential fraud using OpenAI GPT-5.2"""
    try:
        claim = await db.claims.find_one({"id": claim_id}, {"_id": 0})
        if not claim:
            return
        
        chat_instance = ChatOpenAI(
        model="gpt-4o",   # or gpt-4.1
        api_key=OPENAI_API_KEY,
        temperature=0.7
         )

        messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
         ]

        
    except Exception as e:
        logging.error(f"Error calling LLM: {e}")
        response_text = (
        "I apologize, but I encountered an error processing your request. "
        f"Please try again. Error: {str(e)}"
        )
        
        prompt = f"""You are an insurance fraud detection expert. Analyze the claim details and provide:
                    1. A risk score from 0-100 (0=no risk, 100=high risk)
                    2. Key risk indicators found
                    3. Recommendation (approve/review/reject)

                    Respond in JSON format:
                   {
                    "risk_score": <number>,
                    "risk_indicators": ["indicator1", "indicator2"],
                     "recommendation": "approve|review|reject",
                        "analysis_summary": "brief explanation"
                    }
        
                Analyze this insurance claim for potential fraud:
                - Claim Type: {claim['claim_type']}
                - Amount: ${claim['amount']}
                - Incident Date: {claim['incident_date']}
                - Description: {claim['description']}
                - Policy Number: {claim['policy_number']}
                """
        
        response = await chat_instance.ainvoke(messages)
        response_text = response.content

        # Parse response
        import json
        try:
            # Extract JSON from response
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            
            analysis = json.loads(json_str.strip())
            risk_score = analysis.get("risk_score", 50)
            fraud_analysis = analysis.get("analysis_summary", response_text)
        except:
            risk_score = 50
            fraud_analysis = response_text
        
        # Update claim with fraud analysis
        await db.claims.update_one(
            {"id": claim_id},
            {"$set": {
                "risk_score": risk_score,
                "fraud_analysis": fraud_analysis,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Create alert if high risk
        if risk_score > 70:
            alert = {
                "id": str(uuid.uuid4()),
                "claim_id": claim_id,
                "claim_number": claim["claim_number"],
                "alert_type": "high_risk_fraud",
                "severity": "high" if risk_score > 85 else "medium",
                "message": f"High fraud risk detected (score: {risk_score}). {fraud_analysis[:200]}",
                "is_resolved": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.alerts.insert_one(alert)
        
        logger.info(f"Fraud analysis completed for claim {claim_id}: score={risk_score}")
        
    except Exception as e:
        logger.error(f"Fraud analysis error for claim {claim_id}: {e}") 

@api_router.post("/claims/{claim_id}/analyze-fraud")
async def trigger_fraud_analysis(claim_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Only adjusters can trigger fraud analysis")
    
    asyncio.create_task(analyze_fraud(claim_id))
    
    await log_audit(user["id"], user["email"], "FRAUD_ANALYSIS_TRIGGERED", "claim", claim_id, "Manual fraud analysis triggered")
    
    return {"message": "Fraud analysis triggered"} 

# ==================== ALERTS ROUTES ====================

@api_router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    resolved: Optional[bool] = None,
    user: dict = Depends(get_current_user)
):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if resolved is not None:
        query["is_resolved"] = resolved
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [AlertResponse(**a) for a in alerts]

@api_router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"is_resolved": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    await log_audit(user["id"], user["email"], "ALERT_RESOLVED", "alert", alert_id, "Alert resolved")
    
    return {"message": "Alert resolved"}

# ==================== ANALYTICS ROUTES ====================

@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(user: dict = Depends(get_current_user)):
    if user["role"] not in ["adjuster", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get claim counts by status
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.claims.aggregate(pipeline).to_list(100)
    
    # Get claim counts by type
    type_pipeline = [
        {"$group": {"_id": "$claim_type", "count": {"$sum": 1}, "total_amount": {"$sum": "$amount"}}}
    ]
    type_counts = await db.claims.aggregate(type_pipeline).to_list(100)
    
    # Get risk distribution
    risk_pipeline = [
        {"$match": {"risk_score": {"$ne": None}}},
        {"$bucket": {
            "groupBy": "$risk_score",
            "boundaries": [0, 40, 70, 100],
            "default": "Other",
            "output": {"count": {"$sum": 1}}
        }}
    ]
    risk_dist = await db.claims.aggregate(risk_pipeline).to_list(100)
    
    # Get recent claims trend (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    trend_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "count": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }},
        {"$sort": {"_id": 1}}
    ]
    trend_data = await db.claims.aggregate(trend_pipeline).to_list(100)
    
    # Get unresolved alerts count
    alerts_count = await db.alerts.count_documents({"is_resolved": False})
    
    # Total claims and amount
    total_claims = await db.claims.count_documents({})
    total_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    total_amount_result = await db.claims.aggregate(total_pipeline).to_list(1)
    total_amount = total_amount_result[0]["total"] if total_amount_result else 0
    
    return {
        "total_claims": total_claims,
        "total_amount": total_amount,
        "status_distribution": {item["_id"]: item["count"] for item in status_counts},
        "type_distribution": [{"type": item["_id"], "count": item["count"], "amount": item["total_amount"]} for item in type_counts],
        "risk_distribution": risk_dist,
        "trend_data": [{"date": item["_id"], "count": item["count"], "amount": item["total_amount"]} for item in trend_data],
        "unresolved_alerts": alerts_count
    }

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users", response_model=List[UserResponse])
async def get_all_users(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, role: str = Query(...), user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if role not in ["claimant", "adjuster", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"role": role, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_audit(user["id"], user["email"], "USER_ROLE_UPDATED", "user", user_id, f"Role changed to {role}")
    
    return {"message": "User role updated"}

@api_router.put("/admin/users/{user_id}/status")
async def update_user_status(user_id: str, is_active: bool = Query(...), user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_audit(user["id"], user["email"], "USER_STATUS_UPDATED", "user", user_id, f"Status changed to {'active' if is_active else 'inactive'}")
    
    return {"message": "User status updated"}

@api_router.get("/admin/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = Query(100, le=500),
    user: dict = Depends(get_current_user)
):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if action:
        query["action"] = action
    if resource_type:
        query["resource_type"] = resource_type
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return [AuditLogResponse(**log) for log in logs]

@api_router.get("/admin/compliance-report")
async def get_compliance_report(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get various compliance metrics
    total_users = await db.users.count_documents({})
    active_users = await db.users.count_documents({"is_active": True})
    
    # Claims processing metrics
    total_claims = await db.claims.count_documents({})
    processed_claims = await db.claims.count_documents({"status": {"$in": ["approved", "rejected"]}})
    pending_claims = await db.claims.count_documents({"status": {"$in": ["submitted", "under_review"]}})
    
    # Average processing time (mock calculation)
    # In real scenario, calculate from created_at to status change timestamp
    
    # Audit log counts
    audit_count = await db.audit_logs.count_documents({})
    
    # High risk claims
    high_risk_claims = await db.claims.count_documents({"risk_score": {"$gt": 70}})
    
    return {
        "report_date": datetime.now(timezone.utc).isoformat(),
        "user_metrics": {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users
        },
        "claims_metrics": {
            "total_claims": total_claims,
            "processed_claims": processed_claims,
            "pending_claims": pending_claims,
            "processing_rate": round((processed_claims / total_claims * 100), 2) if total_claims > 0 else 0
        },
        "risk_metrics": {
            "high_risk_claims": high_risk_claims,
            "high_risk_percentage": round((high_risk_claims / total_claims * 100), 2) if total_claims > 0 else 0
        },
        "audit_metrics": {
            "total_audit_entries": audit_count
        }
    }

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "TrustClaim Enterprise API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router and middleware
app.include_router(api_router)



@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
