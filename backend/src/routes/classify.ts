import { Router } from 'express';
import { messageProcessor } from '../services/message-processor';

const router = Router();

// Classify a message on-demand
router.post('/classify', async (req, res) => {
  try {
    const { userId, messageId } = req.body;

    if (!userId || !messageId) {
      return res.status(400).json({ error: 'userId and messageId are required' });
    }

    const decision = await messageProcessor.processMessage(userId, messageId);

    res.json(decision);
  } catch (error) {
    console.error('Classification error:', error);
    res.status(500).json({ error: 'Failed to classify message' });
  }
});

// Get classification result for a message
router.get('/classify/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const decision = await messageProcessor.getDecision(messageId);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json(decision);
  } catch (error) {
    console.error('Get decision error:', error);
    res.status(500).json({ error: 'Failed to get decision' });
  }
});

// Get recent decisions for a user
router.get('/classify/user/:userId/recent', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 200;

    const decisions = await messageProcessor.getRecentDecisions(userId, limit);

    res.json(decisions);
  } catch (error) {
    console.error('Get recent decisions error:', error);
    res.status(500).json({ error: 'Failed to get recent decisions' });
  }
});

// Get decision stats for a user
router.get('/classify/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await messageProcessor.getDecisionStats(userId);

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Batch classify messages
router.post('/classify/batch', async (req, res) => {
  try {
    const { userId, messageIds } = req.body;

    if (!userId || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'userId and messageIds array are required' });
    }

    const results = await Promise.allSettled(
      messageIds.map((messageId) => messageProcessor.processMessage(userId, messageId))
    );

    const decisions = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          messageId: messageIds[index],
          error: result.reason.message,
        };
      }
    });

    res.json(decisions);
  } catch (error) {
    console.error('Batch classification error:', error);
    res.status(500).json({ error: 'Failed to classify messages' });
  }
});

export default router;

