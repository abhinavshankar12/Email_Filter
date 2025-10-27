import { Router } from 'express';
import { messageProcessor } from '../services/message-processor';
import { getDatabase } from '../db';

const router = Router();

// Handle Graph webhook validation
router.post('/webhook', async (req, res) => {
  // Validation token check for subscription setup
  if (req.query.validationToken) {
    return res.type('text/plain').send(req.query.validationToken);
  }

  try {
    const notifications = req.body.value;

    if (!Array.isArray(notifications)) {
      return res.status(400).json({ error: 'Invalid notification format' });
    }

    // Process notifications asynchronously
    for (const notification of notifications) {
      // Extract user ID and message ID from resource
      const resource = notification.resource;
      const match = resource.match(/users\/([^/]+)\/messages\/([^/]+)/);

      if (match) {
        const [, userId, messageId] = match;

        // Process in background
        messageProcessor.processMessage(userId, messageId).catch((error) => {
          console.error('Failed to process message:', error);
        });
      }
    }

    // Respond immediately
    res.status(202).json({ status: 'accepted' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Subscribe a user to notifications
router.post('/webhook/subscribe', async (req, res) => {
  try {
    const { userId, notificationUrl, clientState } = req.body;

    if (!userId || !notificationUrl || !clientState) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { graphClient } = await import('../services/graph-client');
    const subscription = await graphClient.createSubscription(
      userId,
      notificationUrl,
      clientState
    );

    // Save subscription to database
    const db = getDatabase();
    db.prepare(
      `
      INSERT INTO graph_subscriptions (subscription_id, user_id, resource, change_type, expiration_date_time, client_state)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(
      subscription.id,
      userId,
      subscription.resource,
      subscription.changeType,
      subscription.expirationDateTime,
      clientState
    );

    res.json(subscription);
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Renew a subscription
router.post('/webhook/renew/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;

    const { graphClient } = await import('../services/graph-client');
    const subscription = await graphClient.renewSubscription(subscriptionId);

    // Update database
    const db = getDatabase();
    db.prepare(
      `
      UPDATE graph_subscriptions 
      SET expiration_date_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE subscription_id = ?
    `
    ).run(subscription.expirationDateTime, subscriptionId);

    res.json(subscription);
  } catch (error) {
    console.error('Renewal error:', error);
    res.status(500).json({ error: 'Failed to renew subscription' });
  }
});

// Get all subscriptions
router.get('/webhook/subscriptions', async (req, res) => {
  try {
    const db = getDatabase();
    const subscriptions = db
      .prepare(
        `
      SELECT * FROM graph_subscriptions 
      ORDER BY created_at DESC
    `
      )
      .all();

    res.json(subscriptions);
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ error: 'Failed to get subscriptions' });
  }
});

export default router;

