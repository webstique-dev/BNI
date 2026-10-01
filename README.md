# 🔴 BNI Jubilant – Chennai CBD A | QR Attendance System

A full-stack, mobile-first QR attendance web application built for the **BNI Jubilant – Chennai CBD A** chapter (~50 members, weekly meetings at 8:00 AM IST).

Designed with BNI Chapter branding (#CF2030 BNI Red, #C9A24B Warm Gold, #FBF8F3 Cream background, Playfair Display & Inter typography).

---

## 🌟 Key Features

### 1. Frictionless Member Check-In
- **Zero-Friction One-Scan Check-In**: On QR scan, device token cookie is verified; the member is recognized and marked present in under a second with an animated checkmark and celebratory confetti.
- **Phone Number Fallback**: If scanning on a new phone or browser, enter a 10-digit mobile number once. The app matches the record, marks attendance, links the device, and sets a 1-year secure cookie for future one-scan check-ins.
- **Instant Guest / New Member Registration**: Unrecognized phone numbers seamlessly open an inline registration form to capture name, company, and classification.
- **Search & Pick-Your-Name (`/find`)**: Live debounced search by name (phone numbers are strictly protected and never exposed). Includes optional last-4-digit phone verification and a "Remember this device" toggle.
- **Strict Idempotency**: Unique compound index on `(memberId, meetingDate)` ensures multiple scans on the same morning never create duplicate attendance records.

### 2. Time & Punctuality Engine (Asia/Kolkata)
- All date/time calculations strictly use the `Asia/Kolkata` timezone via Dayjs.
- **Punctuality Status**:
  - **Present**: Checked in before `startTime + graceMinutes` (Default: 8:00 AM IST).
  - **Late**: Checked in after `startTime + graceMinutes` (Badged with an amber indicator).
  - **Absent**: Active chapter members with no check-in record for that meeting date (computed dynamically).

### 3. Chapter Admin Portal (`/admin`)
- **Real-Time Live Dashboard**: Auto-refreshes every 15 seconds. Visual stat cards for Present, Late, Absent, and Total Chapter Turnout %.
- **Manual Attendance Overrides**: Admin can manually mark absent members present/late or delete attendance records.
- **Members Directory**: Add, edit, activate/deactivate members, reset linked devices, or bulk import via CSV (`name, phone, company, category`).
- **Reports & Analytics**: Date-range filtering, per-member attendance %, punctuality breakdown, and one-click CSV export.
- **Chapter Settings**: Configure meeting start time, grace periods, and toggle phone last-4 verification on search.

---

## 📂 Project Structure

```
BNI_Attendence/
├── server/                      # Express API backend
│   ├── src/
│   │   ├── config/              # MongoDB connection & config
│   │   ├── controllers/         # Check-in, Admin, Members, Reports controllers
│   │   ├── middleware/          # JWT auth, Rate limiters, Zod validation, Error handlers
│   │   ├── models/              # Mongoose schemas (Member, Device, Attendance, Admin, Settings)
│   │   ├── routes/              # Express API route declarations
│   │   ├── utils/               # Phone normalization, Asia/Kolkata Dayjs helpers, Token crypto
│   │   ├── app.js               # Express application configuration
│   │   ├── seed.js              # Admin & sample chapter members seed script
│   │   └── server.js            # Server entrypoint
│   ├── tests/                   # Jest & Supertest unit/integration test suite
│   ├── .env.example
│   └── package.json
│
├── client/                      # Vite + React frontend
│   ├── public/                  # BNI logo and favicon assets
│   ├── src/
│   │   ├── components/          # Header, StatusBadge, SuccessCheckmark, Modal, LoadingSpinner
│   │   ├── context/             # AuthContext (JWT cookie authentication)
│   │   ├── pages/               # Home (QR Landing), FindName, AdminLogin, Dashboard, Members, Reports, Settings
│   │   ├── services/            # API client (Fetch with credentials)
│   │   ├── App.jsx              # React Router setup
│   │   ├── index.css            # Tailwind CSS & custom animations
│   │   └── main.jsx
│   ├── tailwind.config.js       # BNI color tokens & fonts
│   ├── vite.config.js           # Vite config with API proxy
│   ├── .env.example
│   └── package.json
│
├── package.json                 # Root script runner
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)

### 1. Install Dependencies
```bash
# In the project root
npm run install:all

# Or separately:
cd server && npm install
cd ../client && npm install
```

### 2. Configure Environment Variables
Create `.env` in the `server/` directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/bni_attendance
JWT_SECRET=super_secret_bni_jwt_key_jubilant_chennai_2026
ADMIN_USERNAME=admin
ADMIN_PASSWORD=adminPassword123!
CLIENT_URL=http://localhost:5173
TIMEZONE=Asia/Kolkata
```

### 3. Seed the Database
Run the seed script to create the chapter Admin user, default settings, today's meeting, and ~12 sample BNI Jubilant members:
```bash
cd server
npm run seed
```

**Default Admin Credentials:**
- **Username**: `admin`
- **Password**: `adminPassword123!`

### 4. Start the Application
Open two terminal tabs:

**Terminal 1 (Backend API):**
```bash
cd server
npm run dev
# Server running at http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd client
npm run dev
# Client running at http://localhost:5173
```

---

## 🧪 Running Automated Tests

A comprehensive test suite covers:
- Late calculation logic based on 8:00 AM IST and grace periods.
- Phone check-in & new member self-registration with device cookie setting.
- Duplicate scan idempotency (unique compound index prevents duplicate DB records).
- Privacy in public search (phone numbers never leaked) and last-4 digit validation.

```bash
cd server
npm test
```

---

## 📱 Generating the Chapter QR Code

You can use any QR code generator (e.g. [QR Code Monkey](https://www.qrcode-monkey.com/) or [Canva]):
1. Set the QR code destination URL to your deployed root URL (e.g. `https://attend.bni-jubilant.com/`).
2. Add the BNI Logo in the center of the QR code.
3. Print and display the QR code at the registration desk / entrance of your chapter meeting hall.

---

## 🌐 Deployment Guide

### Option 1: Render / Railway (Backend API + Database)
1. Provision a free MongoDB database on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Web Service on [Render](https://render.com) or [Railway](https://railway.app) connected to the `/server` directory.
3. Set the Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or leave default for Render)
   - `MONGODB_URI`: `<Your MongoDB Atlas connection string>`
   - `JWT_SECRET`: `<A strong random secret>`
   - `CLIENT_URL`: `https://your-frontend-domain.vercel.app`
   - `TIMEZONE`: `Asia/Kolkata`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Run the seed script once via Render shell or locally pointing `MONGODB_URI` to Atlas: `npm run seed`.

### Option 2: Vercel / Netlify (Frontend)
1. Import your repository into [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
2. Set Root Directory to `client`.
3. Set Build Command: `npm run build`.
4. Set Output Directory: `dist`.
5. Set Environment Variable:
   - `VITE_API_URL`: `https://your-backend-service.onrender.com/api`

### Option 3: Monolithic Deployment (Serve Frontend directly from Express)
1. Build the frontend: `cd client && npm run build`.
2. The Express server (`server/src/app.js`) automatically serves static files from `client/dist` in production.
3. Deploy just the `/server` directory to Render/Railway/Fly.io.
