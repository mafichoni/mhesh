"""Cloudflare R2 (S3-compatible) storage helpers."""
from functools import lru_cache
from typing import Any

import boto3

from app.config import get_settings


@lru_cache
def _client() -> Any:
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=f"https://{s.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=s.R2_ACCESS_KEY_ID,
        aws_secret_access_key=s.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


def presigned_upload(key: str, content_type: str, expires: int = 900) -> str:
    return _client().generate_presigned_url(
        "put_object",
        Params={"Bucket": get_settings().R2_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )


def presigned_get(key: str, expires: int = 3600) -> str:
    return _client().generate_presigned_url(
        "get_object", Params={"Bucket": get_settings().R2_BUCKET, "Key": key}, ExpiresIn=expires,
    )


def upload_file(path: str, key: str, content_type: str) -> str:
    _client().upload_file(path, get_settings().R2_BUCKET, key, ExtraArgs={"ContentType": content_type})
    return public_url(key)


def public_url(key: str) -> str:
    return f"{get_settings().R2_PUBLIC_BASE_URL.rstrip('/')}/{key}"
