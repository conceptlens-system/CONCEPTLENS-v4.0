from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.database import get_database
from bson import ObjectId

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

PWD_CONTEXT = CryptContext(schemes=["pbkdf2_sha256", "bcrypt", "sha256_crypt", "md5_crypt"], deprecated="auto")
SECRET_KEY = "CHANGE_THIS_IN_PRODUCTION_SECRET_KEY" # TODO: Move to env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    
    hashed_password = hashed_password.strip()
    
    # Workaround for passlib/bcrypt version incompatibility in Python 3.13+
    if hashed_password.startswith("$2"):
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            print(f"Manual bcrypt verification failed: {e}")
            return False

    try:
        return PWD_CONTEXT.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"ERROR: Password verification failed: {e}")
        return False

def get_password_hash(password: str) -> str:
    return PWD_CONTEXT.hash(password)

def create_access_token(subject: Union[str, Any], role: str, name: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"sub": str(subject), "role": role, "name": name, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_database)):
    print(f"DEBUG: Received token: {token}")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception: # JWTError
        raise credentials_exception
        
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise credentials_exception
        
    if user.get("role") != "admin":
        # Check global maintenance but don't crash if it doesn't exist
        security_config = await db["system_settings"].find_one({"_id": "security"})
        if security_config and security_config.get("maintenance_mode", False) is True:
            maintenance_type = security_config.get("maintenance_type", "instant")
            if maintenance_type == "instant":
                raise credentials_exception
            elif maintenance_type == "scheduled":
                start_str = security_config.get("maintenance_start")
                end_str = security_config.get("maintenance_end")
                if start_str and end_str:
                    try:
                        from datetime import timezone
                        start_time = datetime.fromisoformat(start_str.replace('Z', '+00:00'))
                        end_time = datetime.fromisoformat(end_str.replace('Z', '+00:00'))
                        now = datetime.utcnow()
                        if start_time.tzinfo:
                            now = now.replace(tzinfo=timezone.utc)
                        if start_time <= now <= end_time:
                            raise credentials_exception
                    except Exception as e:
                        print(f"Error parsing maintenance schedule: {e}")
                        # Fallback block if schedule is malformed just in case
                        pass
            
    return user
