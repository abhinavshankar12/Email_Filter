# Invora Email Filter

A production-grade Outlook integrated phishing and spam filter that detects and filters malicious emails with AI-powered classification, real-time risk scoring, and user feedback learning.

## Features

### Core Capabilities
- **Real-time Email Scanning**: Analyzes incoming emails within seconds
- **Multi-Factor Risk Scoring**: 29+ security checks including SPF, DKIM, DMARC, domain reputation, and content analysis
- **AI-Powered Classification**: Optional ML/LLM integration for enhanced detection
- **Automatic Junk Filtering**: Moves high-risk emails to Junk folder automatically
- **User Feedback Loop**: Learn from user corrections to improve accuracy
- **Audit Trail**: Complete decision logging for compliance
- **Privacy First**: Configurable privacy modes to protect sensitive data

### Outlook Integration
- **Task Pane Add-in**: Beautiful UI showing risk analysis in the reading pane
- **One-Click Actions**: Mark as Junk, Mark as Safe, Report Phishing
- **Risk Visualization**: Color-coded badges with detailed explanations
- **Settings Panel**: Configure ML, thresholds, and privacy settings
- **Export Logs**: Download decision history as CSV

## Architecture

```
┌─────────────────┐       ┌──────────────────┐
│  Outlook Client │◄─────►│  Outlook Add-in  │
│   (Desktop/Web) │       │   (React + JS)   │
└─────────────────┘       └──────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │  Backend API     │
                          │  (Node.js/TS)    │
                          └──────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────┐  ┌──────────────┐
            │ Microsoft    │ │ SQLite/  │  │ ML Classifier│
            │ Graph API    │ │ Postgres │  │ (Optional)   │
            └──────────────┘ └──────────┘  └──────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Microsoft 365 account with Outlook
- Azure AD app registration (for Graph API access)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/invora-email-filter.git
cd invora-email-filter

# Install dependencies
make install
# or
npm install
```

### 2. Microsoft Graph Setup

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Create a new registration:
   - Name: "Invora Email Filter"
   - Supported account types: Single tenant
   - Redirect URI: `http://localhost:3000/auth/callback`
3. Note the **Application (client) ID** and **Directory (tenant) ID**
4. Go to Certificates & secrets → New client secret → Copy the secret value
5. Go to API permissions → Add permission → Microsoft Graph:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `MailboxSettings.Read`
   - `offline_access`
6. Grant admin consent for your organization

### 3. Configuration

Create `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:

```env
# Microsoft Graph
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret

# Server
PORT=3000
WEBHOOK_BASE_URL=https://your-domain.ngrok.io

# Processing
RISK_THRESHOLD_JUNK=80
RISK_THRESHOLD_WARNING=50

# ML (Optional)
ML_ENABLED=true
ML_PROVIDER=mock
# For OpenAI:
# OPENAI_API_KEY=your-openai-key
```

### 4. Initialize Database

```bash
make seed
```

### 5. Start Development Servers

```bash
make dev
# Starts backend on http://localhost:3000 and add-in on https://localhost:3001
```

### 6. Sideload the Add-in

#### Outlook Desktop (Windows/Mac)
1. Open Outlook
2. Go to **Get Add-ins** or **Store**
3. Click **My add-ins** → **Add a custom add-in** → **Add from file**
4. Select `addin/dist/manifest.xml`
5. Click **Install**

#### Outlook on the Web
1. Go to https://outlook.office.com
2. Click Settings (gear icon) → **View all Outlook settings**
3. Go to **General** → **Manage add-ins**
4. Click **+ Add from file**
5. Upload `addin/dist/manifest.xml`

### 7. Test the Add-in

1. Open any email in Outlook
2. Click the **Invora** button in the ribbon
3. The task pane will show risk analysis
4. Test with synthetic emails: `make test-runner`

## Usage

### Reading an Email

1. Open an email in Outlook
2. Click the **Check Email** button to open the Invora task pane
3. View the **risk score** and **decision** (Safe/Warning/Junk)
4. Review **risk factors** detected
5. Take action:
   - **Mark as Junk**: Move to Junk and add sender to blocklist
   - **Mark as Safe**: Keep in Inbox and add sender to allowlist
   - **Report Phishing**: Report and move to Junk

### Configuring Settings

1. Click the **Settings** tab in the add-in
2. Configure:
   - **Backend API URL**: Default is `http://localhost:3000/api`
   - **Enable ML Classification**: Toggle AI-powered analysis
   - **Privacy Mode**: Prevent email bodies from being sent to external services
3. Click **Save Settings**

### Exporting Audit Logs

1. Go to Settings tab
2. Click **Export Decision Log**
3. CSV file downloads with all decisions

## Scoring System

Emails are scored 0-100 based on weighted rules:

### High-Risk Indicators (15-50 points each)
- SPF/DKIM/DMARC failures
- Sender on blocklist
- Display name spoofing
- Suspicious homoglyphs
- Dangerous attachments (.exe, .bat, etc.)
- Macro-enabled documents
- Password-protected archives

### Medium-Risk Indicators (8-15 points each)
- Reply-to address mismatch
- Newly seen domain
- URL shorteners
- Urgency language
- Payment requests
- Suspicious TLDs (.tk, .ml, .ga, .cf)

### Low-Risk Indicators (5-10 points each)
- First-time sender
- Unusual send time
- HTML-only messages
- High hidden text ratio

### Negative Score (Reduces Risk)
- Sender on allowlist (-40 points)
- Strong relationship score

### Decision Thresholds
- **0-49**: Safe
- **50-79**: Warning (flagged but not moved)
- **80-100**: Junk (automatically moved)

## API Endpoints

### Classification
- `POST /api/classify` - Classify a message
- `GET /api/classify/:messageId` - Get decision
- `GET /api/classify/user/:userId/recent` - Recent decisions
- `GET /api/classify/user/:userId/stats` - Statistics

### Feedback
- `POST /api/feedback` - Submit user feedback
- `GET /api/feedback/user/:userId` - Feedback history
- `GET /api/feedback/user/:userId/stats` - Feedback stats

### Webhooks
- `POST /api/webhook` - Graph notification endpoint
- `POST /api/webhook/subscribe` - Create subscription
- `POST /api/webhook/renew/:id` - Renew subscription

### Admin
- `GET /api/admin/decisions` - List all decisions
- `GET /api/admin/decisions/export` - Export CSV
- `GET /api/admin/domain-rules` - Get rules
- `POST /api/admin/domain-rules` - Add rule
- `DELETE /api/admin/domain-rules/:domain/:type` - Remove rule
- `GET /api/admin/stats` - Overall statistics

### Health
- `GET /api/health` - Health check
- `GET /api/ready` - Readiness check

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests with Synthetic Emails

```bash
make test-runner
```

This runs 10 synthetic test emails through the classifier and validates:
- Display name spoofing
- Urgent payment requests
- Dangerous attachments
- Crypto scams
- HR benefits phishing
- URL shorteners
- And more...

## Deployment

### Docker Compose

```bash
docker-compose up -d
```

### Azure Functions

```bash
cd deploy/azure
az group create --name invora-rg --location eastus
az deployment group create \
  --resource-group invora-rg \
  --template-file arm-template.json \
  --parameters graphTenantId=<your-tenant-id> \
               graphClientId=<your-client-id> \
               graphClientSecret=<your-secret>
```

### AWS Lambda

```bash
cd deploy/aws
aws cloudformation create-stack \
  --stack-name invora-stack \
  --template-body file://cloudformation-template.yaml \
  --parameters ParameterKey=GraphTenantId,ParameterValue=<your-tenant-id> \
               ParameterKey=GraphClientId,ParameterValue=<your-client-id> \
               ParameterKey=GraphClientSecret,ParameterValue=<your-secret> \
  --capabilities CAPABILITY_IAM
```

## Multi-User Rollout

To extend from single mailbox to multiple users:

1. **Update Graph Permissions**: Add `Mail.Read.Shared` and `Mail.ReadWrite.Shared`
2. **Implement Per-User Settings**: Store thresholds and rules per user
3. **Tenant-Wide Policies**: Add admin controls for organization-wide allowlist/blocklist
4. **Central Management**: Build admin dashboard for monitoring all users
5. **Database Migration**: Switch from SQLite to PostgreSQL or DynamoDB
6. **Queue Processing**: Use Azure Service Bus or AWS SQS for scalability

## Privacy and Security

### Data Handling
- Email addresses are redacted in logs by default
- Email bodies are NOT sent to ML services unless explicitly enabled
- All data stays within your infrastructure
- No telemetry or external tracking

### Configurable Privacy Levels
1. **High Privacy**: Rules-only scoring, no ML, full redaction
2. **Balanced**: ML on metadata only, partial redaction
3. **Full Features**: ML with body analysis, minimal redaction

### Security Best Practices
- OAuth 2.0 for Graph API authentication
- Webhook signature validation
- Rate limiting on API endpoints
- SQL injection protection with parameterized queries
- XSS protection in add-in UI

## Troubleshooting

### Add-in Not Loading
1. Verify manifest.xml URLs match your dev server
2. Check browser console for HTTPS certificate warnings
3. Enable Office add-in debugging: `Office.context.mailbox.diagnostics.hostName`

### Messages Not Being Classified
1. Check Graph API permissions are granted
2. Verify subscription is active: `GET /api/webhook/subscriptions`
3. Check backend logs for errors
4. Test manually: `POST /api/classify` with userId and messageId

### High False Positive Rate
1. Review scoring thresholds in `.env`
2. Add trusted domains to allowlist
3. Check ML provider configuration
4. Review feedback history for patterns

## Performance

- **Classification Time**: < 2 seconds (rules only), < 6 seconds (with ML)
- **Throughput**: 100+ emails/minute per instance
- **Memory**: ~200MB per backend instance
- **Database**: < 100KB per 1000 decisions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

- GitHub Issues: https://github.com/yourusername/invora-email-filter/issues
- Documentation: See `/docs` folder
- Email: support@invora.example.com

## Roadmap

- [ ] QR code detection in attachments
- [ ] Advanced NLP for context analysis
- [ ] Browser extension for standalone use
- [ ] Mobile app integration
- [ ] Advanced reporting dashboard
- [ ] Multi-language support
- [ ] Integration with SIEM systems
- [ ] Custom rule builder UI

---

**Built with ❤️ for email security**

