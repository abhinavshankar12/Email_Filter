# Detailed Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Azure AD App Registration](#azure-ad-app-registration)
3. [Backend Setup](#backend-setup)
4. [Add-in Setup](#add-in-setup)
5. [Webhook Configuration](#webhook-configuration)
6. [ML Integration](#ml-integration)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)

## Prerequisites

### Required Software
- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** 9.x or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Outlook** Desktop or Web access

### Required Accounts
- **Microsoft 365** account with admin access
- **Azure** subscription (free tier works)
- **ngrok** account (for webhook testing) - [Sign up](https://ngrok.com/)

### Optional for ML
- **OpenAI** API key ([Get one](https://platform.openai.com/))
- **Azure OpenAI** deployment

## Azure AD App Registration

### Step 1: Create App Registration

1. Navigate to [Azure Portal](https://portal.azure.com)
2. Go to **Azure Active Directory**
3. Click **App registrations** → **New registration**
4. Fill in the details:
   - **Name**: `Invora Email Filter`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: 
     - Platform: `Web`
     - URI: `http://localhost:3000/auth/callback`
5. Click **Register**

### Step 2: Note Important IDs

After registration, copy these values:
- **Application (client) ID**: Found on the Overview page
- **Directory (tenant) ID**: Found on the Overview page

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description: `Invora Backend Secret`
4. Choose expiration: `24 months` (recommended)
5. Click **Add**
6. **IMPORTANT**: Copy the secret **value** immediately (you won't see it again)

### Step 4: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add these permissions:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `MailboxSettings.Read`
   - `offline_access`
6. Click **Add permissions**
7. Click **Grant admin consent for [Your Organization]**
8. Confirm by clicking **Yes**

### Step 5: Configure Authentication

1. Go to **Authentication**
2. Under **Implicit grant and hybrid flows**:
   - ✅ Check **Access tokens**
   - ✅ Check **ID tokens**
3. Click **Save**

## Backend Setup

### Step 1: Clone and Install

```bash
git clone https://github.com/yourusername/invora-email-filter.git
cd Email_Filter_App
npm install
```

### Step 2: Create Environment File

```bash
cd backend
cp .env.example .env
```

### Step 3: Configure Environment Variables

Edit `backend/.env`:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
WEBHOOK_BASE_URL=https://your-ngrok-subdomain.ngrok.io

# Microsoft Graph Configuration
GRAPH_TENANT_ID=<your-tenant-id-from-step-2>
GRAPH_CLIENT_ID=<your-client-id-from-step-2>
GRAPH_CLIENT_SECRET=<your-secret-from-step-3>
GRAPH_REDIRECT_URI=http://localhost:3000/auth/callback

# Database
DATABASE_PATH=./data/invora.db

# Processing Configuration
RISK_THRESHOLD_JUNK=80
RISK_THRESHOLD_WARNING=50
PROCESSING_TIMEOUT_MS=6000
FALLBACK_POLLING_INTERVAL_MS=300000

# ML Configuration
ML_ENABLED=true
ML_PROVIDER=mock
ML_TIMEOUT_MS=3000

# Privacy Settings
LOG_FULL_EMAIL_ADDRESSES=false
SEND_BODY_TO_ML=false

# Feature Flags
ENABLE_COMPOSE_WARNING=true
ENABLE_AUTO_MOVE=true
ENABLE_FEEDBACK_LEARNING=true
```

### Step 4: Initialize Database

```bash
npm run seed
```

This will:
- Create SQLite database
- Initialize schema
- Load allowlist/blocklist seed data

### Step 5: Start Backend

```bash
npm run dev
```

Backend should now be running on `http://localhost:3000`

## Add-in Setup

### Step 1: Navigate to Add-in Directory

```bash
cd ../addin
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Update Manifest

Edit `manifest.xml` and replace all instances of `localhost:3001` with your domain if deploying to production.

For development, the defaults are fine.

### Step 4: Start Add-in Dev Server

```bash
npm run dev
```

Add-in should now be running on `https://localhost:3001`

**Note**: You may see a certificate warning. This is expected for local development.

### Step 5: Trust Self-Signed Certificate

#### Windows
```powershell
# In PowerShell as Administrator
cd addin
npm install -g office-addin-dev-certs
office-addin-dev-certs install
```

#### macOS
```bash
cd addin
npm install -g office-addin-dev-certs
office-addin-dev-certs install
```

## Webhook Configuration

For real-time email processing, set up webhooks:

### Step 1: Install ngrok

```bash
npm install -g ngrok
```

Or download from [ngrok.com](https://ngrok.com/download)

### Step 2: Start ngrok Tunnel

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 3: Update Backend .env

```env
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

Restart backend server.

### Step 4: Create Subscription

```bash
curl -X POST http://localhost:3000/api/webhook/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "your-email@company.com",
    "notificationUrl": "https://abc123.ngrok.io/api/webhook",
    "clientState": "your-random-secret-string"
  }'
```

## ML Integration

### Option 1: Mock Classifier (Default)

No setup needed. Already configured.

### Option 2: OpenAI

1. Get API key from [OpenAI](https://platform.openai.com/api-keys)
2. Update `backend/.env`:

```env
ML_PROVIDER=openai
OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-4
```

### Option 3: Azure OpenAI

1. Create Azure OpenAI resource
2. Deploy a model (e.g., gpt-4)
3. Update `backend/.env`:

```env
ML_PROVIDER=azure_openai
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_DEPLOYMENT=your-deployment-name
```

## Testing

### Unit Tests

```bash
cd backend
npm test
```

### Synthetic Email Tests

```bash
cd backend
npm run build
node dist/scripts/test-runner.js
```

### Manual API Test

```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user@company.com",
    "messageId": "AAMkADExNzk..."
  }'
```

## Production Deployment

See detailed deployment guides:
- [Docker Deployment](./DOCKER.md)
- [Azure Deployment](./AZURE.md)
- [AWS Deployment](./AWS.md)

## Next Steps

1. [Sideload the Add-in](./SIDELOAD.md)
2. [Configure Scoring Rules](./RULES.md)
3. [Monitor Performance](./MONITORING.md)
4. [Extend to Multiple Users](./MULTI_USER.md)

## Troubleshooting

### Backend won't start
- Check Node.js version: `node --version` (should be 18+)
- Check for port conflicts: `lsof -i :3000`
- Verify .env file exists and has correct values

### Database errors
- Delete database and reseed: `npm run reset && npm run seed`
- Check file permissions on `backend/data/` directory

### Graph API errors
- Verify App Registration permissions are granted
- Check tenant/client ID values in .env
- Test Graph access: `GET /api/health`

### Add-in not loading
- Clear Office cache
- Verify manifest.xml URLs are correct
- Check browser console for errors
- Try sideloading again

## Support

For issues:
1. Check [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Search [GitHub Issues](https://github.com/yourusername/invora-email-filter/issues)
3. Create a new issue with logs and configuration (redact secrets!)

