from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_database
from app.core.config import settings
from app.core.security import get_current_user
import google.generativeai as genai
import json
from datetime import datetime

router = APIRouter()

class LegalStrategyRequest(BaseModel):
    scenario: str

class LegalStrategyResponse(BaseModel):
    ipc_sections: List[str]
    strategies: List[str]
    arguments: List[str]
    precedents: List[str]

from app.core.tokens import check_and_deduct_tokens

@router.post("/generate", response_model=LegalStrategyResponse)
async def generate_legal_strategy(request: LegalStrategyRequest, current_user: dict = Depends(get_current_user)):
    try:
        db = await get_database()
        
        # Check and deduct 1 token for this AI generation
        await check_and_deduct_tokens(current_user, db, required_tokens=1)
        
        # Check if AI features are globally enabled
        global_settings = await db["global_settings"].find_one({"_id": "global_config"})
        if global_settings and not global_settings.get("ai_features_enabled", True):
            raise HTTPException(status_code=400, detail="AI features are currently disabled")

        # Configure Gemini
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise HTTPException(status_code=500, detail="AI Service not configured")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-flash-latest')

        prompt = f"""
        You are an expert legal consultant specializing in Indian Law (IPC, CrPC, etc.).
        Analyze the following case scenario and provide a detailed legal strategy.
        
        Case Scenario:
        {request.scenario}
        
        Requirements:
        1. Identify the most relevant IPC sections or Legal Acts applicable to this scenario.
        2. Outline possible legal strategies for defense or prosecution (depending on the context).
        3. List key arguments that can be presented in court.
        4. Provide similar landmark or precedent cases if available.
        
        Format your response as a STRICT JSON object with these keys:
        - "ipc_sections": Array of strings (e.g., ["Section 302 IPC", "Section 34 IPC"])
        - "strategies": Array of strings (Clear, actionable legal strategies)
        - "arguments": Array of strings (Strong points for the case)
        - "precedents": Array of strings (Case names and brief relevance)
        
        Ensure the output is ONLY the JSON object.
        """

        response = await model.generate_content_async(prompt)
        response_text = response.text
        
        # Cleanup markdown if AI wraps it
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0]
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0]
            
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback for malformed JSON
            print(f"Failed to parse AI JSON: {response_text}")
            raise HTTPException(status_code=500, detail="AI provided an invalid response format")
            
        # Log the usage
        try:
            user_id = current_user.get("_id") or current_user.get("id")
            await db["ai_usage_logs"].insert_one({
                "timestamp": datetime.utcnow(),
                "user_id": user_id,
                "institution_id": current_user.get("institution_id"),
                "feature": "legal_strategy_generator",
                "model": "gemini-flash-latest",
                "scenario_length": len(request.scenario)
            })
        except Exception as log_error:
            print(f"Failed to log AI usage: {log_error}")
            
        return data

    except Exception as e:
        print(f"Legal Strategy Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate legal strategy: {str(e)}")
