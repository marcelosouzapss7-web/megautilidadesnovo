#!/usr/bin/env python3
"""Move Base64 product images to the public Supabase `products` bucket.

Requires Pillow (`python -m pip install Pillow`) and these environment variables:
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Keep the key in the environment only.
Run after applying the product image migration: `python scripts/migrate-product-images.py`.
The script is resumable: it skips URLs, and only updates a row after every image
for that row has uploaded successfully.
"""

import base64
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid

from PIL import Image, ImageOps

BUCKET = "products"
PAGE_SIZE = 100
MAX_SOURCE_BYTES = 20 * 1024 * 1024
MAX_DIMENSION = 1600


def request(url, key, method="GET", payload=None, content_type="application/json", extra_headers=None):
    body = payload if isinstance(payload, bytes) else (json.dumps(payload).encode() if payload is not None else None)
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": content_type}
    headers.update(extra_headers or {})
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"Supabase respondeu HTTP {error.code}: {detail}") from error


def decode_data_url(value):
    match = re.fullmatch(r"data:image/(?:png|jpeg|jpg|webp);base64,(.+)", value, re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError("URI Base64 não corresponde a uma imagem aceita")
    raw = base64.b64decode(match.group(1), validate=True)
    if len(raw) > MAX_SOURCE_BYTES:
        raise ValueError("Imagem Base64 excede 20 MB")
    return raw


def compress_image(data):
    with Image.open(io.BytesIO(data)) as source:
        source = ImageOps.exif_transpose(source).convert("RGB")
        source.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
        output = io.BytesIO()
        source.save(output, format="WEBP", quality=82, method=5)
        return output.getvalue()


def upload_image(base_url, key, product_id, value):
    data = compress_image(decode_data_url(value))
    path = f"{product_id}/{uuid.uuid4()}.webp"
    encoded_path = urllib.parse.quote(path, safe="/")
    request(
        f"{base_url}/storage/v1/object/{BUCKET}/{encoded_path}",
        key,
        method="POST",
        payload=data,
        content_type="image/webp",
        extra_headers={"x-upsert": "false", "cache-control": "31536000"},
    )
    return f"{base_url}/storage/v1/object/public/{BUCKET}/{encoded_path}"


def main():
    base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base_url or not key:
        raise SystemExit("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente antes de executar.")

    migrated = 0
    offset = 0
    while True:
        rows = json.loads(request(
            f"{base_url}/rest/v1/products?select=id,image_url,images&order=id&limit={PAGE_SIZE}&offset={offset}", key
        ))
        if not rows:
            break
        for row in rows:
            original = [row.get("image_url"), *(row.get("images") or [])]
            image_urls = []
            uploaded_paths = []
            try:
                for value in original:
                    if not value:
                        continue
                    if value.startswith("data:"):
                        url = upload_image(base_url, key, row["id"], value)
                        uploaded_paths.append(url)
                    else:
                        url = value
                    if url not in image_urls:
                        image_urls.append(url)

                if not uploaded_paths:
                    continue
                patch = {"image_url": image_urls[0] if image_urls else "", "images": image_urls}
                request(
                    f"{base_url}/rest/v1/products?id=eq.{urllib.parse.quote(row['id'])}",
                    key,
                    method="PATCH",
                    payload=patch,
                    extra_headers={"Prefer": "return=minimal"},
                )
                migrated += 1
            except Exception as error:
                print(f"Falha no produto {row['id']}: {error}", file=sys.stderr)
                raise
        offset += len(rows)
    print(f"Migração concluída: {migrated} produto(s) atualizado(s).")


if __name__ == "__main__":
    main()
