import logging
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.auth.dependencies import get_current_user
from app.core.database import get_db
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/room-image")
async def upload_room_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.name not in ("Resort Owner", "Manager"):
        raise HTTPException(status_code=403, detail="Not authorized")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    if (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            result = cloudinary.uploader.upload(
                contents,
                folder=f"stayease/rooms",
                resource_type="image",
            )
            return {
                "url": result["secure_url"],
                "public_id": result["public_id"],
                "width": result.get("width"),
                "height": result.get("height"),
            }
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    else:
        import hashlib
        import os

        upload_dir = os.path.join("uploads", "rooms")
        os.makedirs(upload_dir, exist_ok=True)
        file_hash = hashlib.md5(contents).hexdigest()[:12]
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{file_hash}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(contents)
        return {
            "url": f"/static/uploads/rooms/{filename}",
            "public_id": filename,
            "width": None,
            "height": None,
        }


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, detail="Only JPEG, PNG, WebP, and GIF images are allowed"
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    if (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            result = cloudinary.uploader.upload(
                contents,
                folder=f"stayease/avatars/{current_user.id}",
                resource_type="image",
            )
            return {"url": result["secure_url"], "public_id": result["public_id"]}
        except Exception as e:
            logger.error(f"Cloudinary avatar upload failed: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    else:
        import hashlib
        import os

        upload_dir = os.path.join("uploads", "avatars", str(current_user.id))
        os.makedirs(upload_dir, exist_ok=True)
        file_hash = hashlib.md5(contents).hexdigest()[:12]
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{file_hash}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(contents)
        return {
            "url": f"/static/uploads/avatars/{current_user.id}/{filename}",
            "public_id": filename,
        }
