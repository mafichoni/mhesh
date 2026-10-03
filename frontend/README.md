# Mhesh Frontend

Next.js 14 (App Router) web application for Mhesh (`mhesh.co.ke`). Built with TypeScript, Tailwind CSS, Lucide icons, and Axios.

---

## Features

- **Candidate Command Center (`/mhesh/dashboard`)**:
  - Seamless first-time onboarding wizard (`POST /api/mhesh/aspirants/me`).
  - Real-time campaign stats (followers, shares, public reach, task completions).
  - Profile editor with manifesto builder, achievements timeline, and photo upload.
  - AI Campaign Studio for generating face-preserving posters and billboards.
  - Grassroots task creator with M-Pesa STK escrow funding.
  - Print merchandise orders tracking.
- **Supporter Portal (`/mhesh/work`)**:
  - Discover paid campaign tasks by county and category.
  - Geotagged evidence uploader with preview and field notes.
  - Earnings ledger with direct M-Pesa payout status.
- **Print Partner Marketplace (`/mhesh/partners`)**:
  - Directory of verified Kenyan print shops.
  - Partner application form and shop operational dashboard.
- **Public Candidate Pages (`/mhesh/p/[slug]`)**:
  - Mobile-first, responsive profile layout with JSON-LD schema metadata.
  - Follower subscriptions, share shortlink tracker, and report abuse modal.

---

## Directory Structure

```
frontend/
├── app/
│   ├── login/                     # Root login alias
│   ├── register/                  # Root register alias
│   └── mhesh/
│       ├── county/[county]/       # Aspirant directory by county
│       ├── dashboard/             # Candidate Command Center & Onboarding
│       │   ├── followers/         # Follower management
│       │   ├── orders/            # Print orders
│       │   ├── profile/           # Profile editor & manifesto
│       │   ├── studio/            # AI Studio campaign poster generator
│       │   │   └── train/         # LoRA photo upload & training
│       │   └── tasks/             # Task delegator & evidence review
│       ├── login/                 # Dedicated login with Suspense boundary
│       ├── office/[office]/       # Aspirants filtered by office
│       ├── p/[slug]/              # Public profile page
│       ├── partner/               # Print partner operations
│       ├── partners/              # Print shop directory & applications
│       ├── register/              # Account registration with role selection
│       ├── s/[code]/              # Shortlink redirect tracking
│       └── work/                  # Supporter task marketplace & earnings
├── components/mhesh/              # Reusable, typed UI components
│   ├── AiGeneratedTag.tsx         # Visible AI provenance badge
│   ├── AspirantHero.tsx           # Candidate public profile banner
│   ├── ComplianceBanner.tsx       # Mandatory IEBC/ODPC disclaimer
│   ├── EvidenceUploader.tsx       # Field work evidence photo submission
│   ├── FollowButton.tsx           # Voter follower signup modal
│   ├── ReportButton.tsx           # Content reporting modal
│   └── ...
└── lib/
    └── api.ts                     # Axios client with JWT bearer interceptors
```

---

## Quick Start

### 1. Environment Variables

Create `.env.local` if custom backend URL is needed:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
*(Defaults to `http://localhost:8000` if omitted).*

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/mhesh` in your browser.

---

## Building for Production

Compile and verify static generation across all 23 routes:
```bash
npm run build
```

Start the production server:
```bash
npm start
```
