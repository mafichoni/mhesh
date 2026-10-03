# Mhesh API Reference

Base URL: `http://localhost:8000` (Production: `https://api.mafichoni.co.ke` or `https://mhesh.app/api`)

All protected endpoints require the HTTP header:
`Authorization: Bearer <access_token>`

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Register a new user account.
- **Request Body**:
  ```json
  {
    "email": "candidate@example.com",
    "phone": "0712345678",
    "password": "strongPassword123",
    "full_name": "Hon. Sarah Mwangi"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer"
  }
  ```

### `POST /api/auth/login`
Authenticate with email or phone.
- **Request Body**:
  ```json
  {
    "identifier": "candidate@example.com",
    "password": "strongPassword123"
  }
  ```
- **Response** `200 OK`:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer"
  }
  ```

### `GET /api/auth/me`
Retrieve currently authenticated user profile and admin status.
- **Response** `200 OK`:
  ```json
  {
    "id": "a97c3a76-3d84-486a-8b26-b53325841732",
    "email": "candidate@example.com",
    "phone": "0712345678",
    "full_name": "Hon. Sarah Mwangi",
    "is_admin": false
  }
  ```

---

## 2. Candidate Profiles (`/api/mhesh/aspirants`)

### `POST /api/mhesh/aspirants/me`
Create aspirant campaign profile for the authenticated user.
- **Request Body**:
  ```json
  {
    "display_name": "Hon. Sarah Mwangi",
    "official_name": "Sarah Wanjiku Mwangi",
    "title_prefix": "Hon.",
    "party": "Independent",
    "office": "mp",
    "county": "Nairobi",
    "constituency": "Westlands",
    "ward": "Parklands",
    "whatsapp_public": "0712345678"
  }
  ```
- **Response** `200 OK`: Full aspirant object.

### `GET /api/mhesh/aspirants/me`
Get the authenticated candidate's profile.
- **Response** `200 OK`: Aspirant profile object. Returns `404` if not yet configured.

### `PATCH /api/mhesh/aspirants/me`
Update candidate details, manifesto, or achievements.
- **Request Body**:
  ```json
  {
    "manifesto": [
      {
        "title": "Youth Tech Hubs",
        "description": "Establish solar-powered community innovation centers in every ward."
      }
    ],
    "achievements": [
      {
        "title": "Clean Water Initiative",
        "description": "Drilled 4 solar boreholes in Westlands.",
        "year": 2024
      }
    ]
  }
  ```

### `POST /api/mhesh/aspirants/me/photo-upload-url`
Generate a presigned Cloudflare R2 upload URL for the candidate's portrait photo.
- **Response** `200 OK`:
  ```json
  {
    "upload_url": "https://r2.cloudflarestorage.com/...",
    "key": "mhesh/{aspirant_id}/photo/{uuid}.jpg"
  }
  ```

### `POST /api/mhesh/aspirants/me/verify-mpesa`
Initiate an M-Pesa STK push for KSh 1 to verify candidate identity and phone ownership.
- **Request Body**:
  ```json
  { "phone": "0712345678" }
  ```

---

## 3. AI Campaign Studio (`/api/mhesh/studio`)

### `GET /api/mhesh/studio/usage`
Check remaining generations today (quota: 20/day).
- **Response** `200 OK`:
  ```json
  {
    "used_today": 3,
    "daily_limit": 20
  }
  ```

### `POST /api/mhesh/studio/train-lora`
Submit uploaded reference portrait photos to train a candidate-specific face LoRA.
- **Request Body**:
  ```json
  {
    "photo_keys": [
      "mhesh/{aspirant_id}/lora/img1.jpg",
      "mhesh/{aspirant_id}/lora/img2.jpg"
    ]
  }
  ```

### `POST /api/mhesh/studio/generate`
Generate face-preserving campaign visuals.
- **Request Body**:
  ```json
  {
    "style": "rally_podium",
    "prompt": "Delivering an address to a passionate Nairobi crowd at a stadium podium",
    "formats": ["post", "billboard"]
  }
  ```
- **Response** `200 OK`: Array of generated image objects with signed URLs and audit records.

---

## 4. Grassroots Tasks (`/api/mhesh/tasks`)

### `GET /api/mhesh/tasks`
List campaign tasks. Filterable by `county`, `category`, and `status`.

### `POST /api/mhesh/tasks`
Create a new grassroots campaign task.
- **Request Body**:
  ```json
  {
    "title": "Distribute 1000 Manifesto Flyers",
    "description": "Hand out official campaign brochures at Westlands roundabout.",
    "category": "distribute_posters",
    "county": "Nairobi",
    "ward": "Parklands",
    "reward_kes": 2500,
    "deadline": "2027-04-15T18:00:00+03:00"
  }
  ```

### `POST /api/mhesh/tasks/{id}/fund`
Initiate STK push to deposit task reward into escrow.

### `POST /api/mhesh/tasks/{id}/apply`
Supporter applies to execute an available task.

### `POST /api/mhesh/tasks/{id}/submit-evidence`
Supporter uploads geotagged photo evidence and field notes.

### `POST /api/mhesh/tasks/{id}/approve`
Candidate approves verified evidence &rarr; triggers M-Pesa B2C payout to supporter.

---

## 5. Print Partners (`/api/mhesh/partners`)

### `GET /api/mhesh/partners`
Browse verified Kenyan print shops by county and capability (`tshirt`, `banner`, `posters`, `caps`, `billboards`).

### `POST /api/mhesh/partners/apply`
Print shop business onboarding application.

### `POST /api/mhesh/orders`
Place a bulk print merchandise order with escrow protection.

---

## 6. Public Endpoints & Operations

### `GET /api/mhesh/stats`
Platform metrics: total registered aspirants, verified print partners, and completed grassroots tasks.

### `GET /api/mhesh/aspirants/{slug}`
Public profile payload for candidate web page with JSON-LD schema metadata.

### `POST /api/mhesh/aspirants/{slug}/follow`
Voter follows candidate via email or SMS.

### `POST /api/mhesh/aspirants/{slug}/share`
Generate and track candidate shortlink clicks.

### `POST /api/mhesh/reports`
File a content report for immediate ops moderation review.
