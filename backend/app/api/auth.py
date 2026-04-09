import os
import json
import urllib.parse
import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

router = APIRouter(prefix="/auth", tags=["auth"])

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://tabi-ito.vercel.app")


@router.get("/github/callback")
async def github_callback(code: str):
    """Exchange GitHub OAuth code for user profile and redirect to frontend."""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")

    async with httpx.AsyncClient() as client:
        # 1. Exchange code for access token
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            error = token_data.get("error_description", "Failed to get access token")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/auth/github/callback?error={urllib.parse.quote(error)}"
            )

        # 2. Fetch GitHub user profile
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
            },
            timeout=15,
        )
        if user_res.status_code != 200:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/auth/github/callback?error=Failed+to+fetch+profile"
            )
        user = user_res.json()

        # 3. Fetch primary verified email if not public
        email = user.get("email")
        if not email:
            email_res = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/vnd.github+json",
                },
                timeout=15,
            )
            if email_res.status_code == 200:
                emails = email_res.json()
                primary = next(
                    (e["email"] for e in emails if e.get("primary") and e.get("verified")),
                    None,
                )
                email = primary or (emails[0]["email"] if emails else "")

    # 4. Build sanitised user payload and pass to frontend via query param
    user_payload = json.dumps({
        "id": str(user.get("id")),
        "sub": str(user.get("id")),
        "name": user.get("name") or user.get("login"),
        "login": user.get("login"),
        "email": email or "",
        "picture": user.get("avatar_url", ""),
        "provider": "github",
    })

    encoded = urllib.parse.quote(user_payload)
    return RedirectResponse(
        url=f"{FRONTEND_URL}/auth/github/callback?user={encoded}"
    )
