# Multi-User Rollout Guide

This guide explains how to extend the Invora Email Filter from a single mailbox to support multiple users across your organization.

## Current Architecture (Single User)

The current implementation is designed for **one mailbox** with:
- Single Graph API subscription
- User-specific database tables
- Isolated allowlist/blocklist per user
- Direct message processing

## Multi-User Architecture

```
┌──────────────────────────────────────────────────┐
│              Tenant Admin Console                 │
│  - User Management                                │
│  - Organization-wide Policies                     │
│  - Centralized Allowlist/Blocklist                │
│  - Analytics Dashboard                            │
└──────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌────────┐      ┌────────┐      ┌────────┐
   │ User 1 │      │ User 2 │      │ User N │
   └────────┘      └────────┘      └────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
              ┌──────────────────┐
              │ Queue (SQS/ASB)  │
              └──────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   ┌─────────┐     ┌─────────┐     ┌─────────┐
   │Worker 1 │     │Worker 2 │     │Worker N │
   └─────────┘     └─────────┘     └─────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ Shared Database  │
              │ (PostgreSQL/     │
              │  DynamoDB)       │
              └──────────────────┘
```

## Migration Steps

### 1. Update Graph API Permissions

Add shared mailbox permissions to your Azure AD app:

```
Mail.Read.Shared
Mail.ReadWrite.Shared
MailboxSettings.ReadWrite
User.Read.All (for user enumeration)
```

### 2. Implement User Management

Create a users table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  tenant_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_status ON users(status);
```

### 3. Add Subscription Management

Update Graph subscription handling:

```typescript
// backend/src/services/subscription-manager.ts
export class SubscriptionManager {
  async subscribeUser(userId: string): Promise<Subscription> {
    // Create subscription for user
    const subscription = await graphClient.createSubscription(
      userId,
      `${config.webhookBaseUrl}/api/webhook`,
      this.generateClientState(userId)
    );
    
    // Store in database
    await this.saveSubscription(userId, subscription);
    
    return subscription;
  }
  
  async renewAllSubscriptions(): Promise<void> {
    const expiring = await this.getExpiringSoonSubscriptions();
    
    for (const sub of expiring) {
      try {
        await graphClient.renewSubscription(sub.subscriptionId);
      } catch (error) {
        console.error(`Failed to renew ${sub.subscriptionId}:`, error);
        // Re-create subscription
        await this.subscribeUser(sub.userId);
      }
    }
  }
}
```

### 4. Implement Queue-Based Processing

#### AWS SQS Example

```typescript
// backend/src/services/queue-service.ts
import AWS from 'aws-sdk';

const sqs = new AWS.SQS({ region: 'us-east-1' });
const QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;

export async function enqueueMessage(userId: string, messageId: string) {
  await sqs.sendMessage({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify({ userId, messageId }),
    MessageAttributes: {
      userId: { DataType: 'String', StringValue: userId },
      priority: { DataType: 'Number', StringValue: '1' }
    }
  }).promise();
}

export async function processQueue() {
  while (true) {
    const messages = await sqs.receiveMessage({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20
    }).promise();
    
    if (!messages.Messages) continue;
    
    await Promise.all(messages.Messages.map(async (msg) => {
      const { userId, messageId } = JSON.parse(msg.Body);
      
      try {
        await messageProcessor.processMessage(userId, messageId);
        
        // Delete from queue
        await sqs.deleteMessage({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle
        }).promise();
      } catch (error) {
        console.error('Processing failed:', error);
        // Message will be retried after visibility timeout
      }
    }));
  }
}
```

#### Azure Service Bus Example

```typescript
// backend/src/services/queue-service.ts
import { ServiceBusClient } from '@azure/service-bus';

const sbClient = new ServiceBusClient(process.env.AZURE_SERVICEBUS_CONNECTION_STRING);
const sender = sbClient.createSender('email-processing');
const receiver = sbClient.createReceiver('email-processing');

export async function enqueueMessage(userId: string, messageId: string) {
  await sender.sendMessages({
    body: { userId, messageId },
    contentType: 'application/json'
  });
}

export async function processQueue() {
  const messageHandler = async (message) => {
    const { userId, messageId } = message.body;
    
    try {
      await messageProcessor.processMessage(userId, messageId);
      await receiver.completeMessage(message);
    } catch (error) {
      console.error('Processing failed:', error);
      await receiver.abandonMessage(message);
    }
  };
  
  receiver.subscribe({
    processMessage: messageHandler,
    processError: async (error) => console.error(error)
  });
}
```

### 5. Update Webhook Handler

```typescript
// backend/src/routes/webhook.ts
router.post('/webhook', async (req, res) => {
  // Validate webhook
  if (req.query.validationToken) {
    return res.type('text/plain').send(req.query.validationToken);
  }
  
  const notifications = req.body.value;
  
  // Enqueue all notifications
  for (const notification of notifications) {
    const { userId, messageId } = extractFromNotification(notification);
    await enqueueMessage(userId, messageId);
  }
  
  // Respond immediately
  res.status(202).json({ status: 'accepted' });
});
```

### 6. Implement Tenant-Wide Policies

```typescript
// backend/src/services/policy-service.ts
export class PolicyService {
  async getTenantPolicy(tenantId: string): Promise<Policy> {
    // Get organization-wide settings
    return db.prepare(`
      SELECT * FROM tenant_policies WHERE tenant_id = ?
    `).get(tenantId);
  }
  
  async mergeUserAndTenantRules(userId: string): Promise<DomainRule[]> {
    const user = await this.getUser(userId);
    const tenantRules = await this.getTenantDomainRules(user.tenantId);
    const userRules = await domainRulesService.getUserRules(userId);
    
    // Tenant rules take precedence
    return [...tenantRules, ...userRules];
  }
  
  async applyTenantThresholds(userId: string, baseScore: number): number {
    const policy = await this.getTenantPolicy(userId);
    
    if (policy.enforceMinimumThreshold) {
      return Math.max(baseScore, policy.minimumRiskScore);
    }
    
    return baseScore;
  }
}
```

### 7. Database Migration

#### From SQLite to PostgreSQL

```sql
-- Create tenant table
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update existing tables
ALTER TABLE processing_decisions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE user_feedback ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE domain_rules ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- Create indexes
CREATE INDEX idx_decisions_tenant ON processing_decisions(tenant_id);
CREATE INDEX idx_feedback_tenant ON user_feedback(tenant_id);
CREATE INDEX idx_rules_tenant ON domain_rules(tenant_id);

-- Add partitioning for scale
CREATE TABLE processing_decisions_2025_01 PARTITION OF processing_decisions
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 8. Add Admin Dashboard

```typescript
// backend/src/routes/admin.ts
router.get('/admin/tenants/:tenantId/stats', async (req, res) => {
  const { tenantId } = req.params;
  
  const stats = {
    users: await getUserCount(tenantId),
    decisions: await getDecisionStats(tenantId),
    topBlockedDomains: await getTopBlockedDomains(tenantId),
    userActivity: await getUserActivity(tenantId)
  };
  
  res.json(stats);
});

router.put('/admin/tenants/:tenantId/policy', async (req, res) => {
  const { tenantId } = req.params;
  const policy = req.body;
  
  await updateTenantPolicy(tenantId, policy);
  res.json({ status: 'updated' });
});
```

### 9. Implement User Onboarding

```typescript
// backend/src/services/onboarding-service.ts
export class OnboardingService {
  async onboardUser(email: string): Promise<void> {
    // 1. Create user record
    const user = await this.createUser(email);
    
    // 2. Subscribe to Graph notifications
    await subscriptionManager.subscribeUser(user.id);
    
    // 3. Initialize user settings with tenant defaults
    const tenantDefaults = await policyService.getTenantPolicy(user.tenantId);
    await this.initializeUserSettings(user.id, tenantDefaults);
    
    // 4. Send welcome email with add-in installation instructions
    await this.sendWelcomeEmail(user.email);
  }
  
  async offboardUser(userId: string): Promise<void> {
    // 1. Delete subscription
    await subscriptionManager.unsubscribeUser(userId);
    
    // 2. Archive user data
    await this.archiveUserData(userId);
    
    // 3. Mark user as inactive
    await this.deactivateUser(userId);
  }
}
```

### 10. Update Add-in for Multi-User

```typescript
// addin/src/taskpane/services/api.ts
export class ApiService {
  async getOrganizationSettings(): Promise<OrgSettings> {
    const userId = Office.context.mailbox.userProfile.emailAddress;
    const response = await this.client.get(`/settings/org/${userId}`);
    return response.data;
  }
  
  async getUserAllowlist(userId: string): Promise<DomainRule[]> {
    const response = await this.client.get(`/domain-rules/user/${userId}`);
    return response.data;
  }
}
```

## Scaling Considerations

### Performance Targets (Multi-User)
- **Users**: 1,000+ concurrent users
- **Throughput**: 10,000+ emails/minute
- **Latency**: < 5 seconds per email
- **Availability**: 99.9% uptime

### Optimization Strategies

1. **Horizontal Scaling**
   - Run multiple worker instances
   - Load balance with nginx or cloud load balancer
   - Use container orchestration (Kubernetes, ECS)

2. **Caching**
   - Cache domain rules in Redis
   - Cache user settings
   - Cache Graph API tokens

3. **Database Optimization**
   - Use connection pooling
   - Implement read replicas
   - Partition large tables by tenant or date

4. **Rate Limiting**
   - Implement per-user rate limits
   - Throttle Graph API calls
   - Queue overflow protection

## Cost Estimates (Azure)

For 1,000 users processing 50 emails/day:

| Service | Monthly Cost |
|---------|-------------|
| Azure Functions (Consumption) | $50 |
| Azure SQL Database (Basic) | $5 |
| Azure Service Bus | $10 |
| Azure Storage | $5 |
| **Total** | **~$70/month** |

## Rollout Plan

### Phase 1: Pilot (Week 1-2)
- Deploy to 10 power users
- Monitor for issues
- Gather feedback

### Phase 2: Department (Week 3-4)
- Expand to 50-100 users
- Test at scale
- Optimize performance

### Phase 3: Organization (Week 5-8)
- Roll out to all users
- Enable webhook subscriptions
- Monitor system health

### Phase 4: Optimization (Week 9+)
- Fine-tune thresholds
- Add custom rules
- Implement advanced features

## Monitoring and Alerts

```yaml
# monitoring/alerts.yaml
alerts:
  - name: High Error Rate
    condition: error_rate > 5%
    action: page_oncall
    
  - name: Queue Backlog
    condition: queue_depth > 1000
    action: auto_scale_workers
    
  - name: Processing Delay
    condition: avg_processing_time > 10s
    action: investigate
    
  - name: Subscription Expiring
    condition: expiration < 24h
    action: auto_renew
```

## Security Considerations

1. **Tenant Isolation**: Ensure users can only access their own data
2. **Admin Permissions**: Restrict tenant-wide settings to admins
3. **Audit Logging**: Log all admin actions
4. **Data Encryption**: Encrypt sensitive data at rest and in transit
5. **Compliance**: Meet GDPR, CCPA, and SOC2 requirements

## Support and Training

1. **User Training**
   - Create video tutorials
   - Provide quick start guide
   - Offer live training sessions

2. **Admin Training**
   - Dashboard walkthrough
   - Policy configuration guide
   - Troubleshooting procedures

3. **Documentation**
   - API reference
   - Integration guides
   - FAQs

## Next Steps

1. Choose cloud provider (Azure, AWS, or hybrid)
2. Set up development environment with 5-10 test users
3. Implement queue-based architecture
4. Migrate database to production-grade solution
5. Build admin dashboard
6. Test at scale with pilot group
7. Roll out incrementally

---

**Questions?** Open an issue or contact support@invora.example.com

