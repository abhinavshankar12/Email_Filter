import { Router } from 'express';
import { feedbackService } from '../services/feedback-service';

const router = Router();

// Submit feedback
router.post('/feedback', async (req, res) => {
  try {
    const { userId, messageId, feedbackType } = req.body;

    if (!userId || !messageId || !feedbackType) {
      return res.status(400).json({ error: 'userId, messageId, and feedbackType are required' });
    }

    if (!['mark_safe', 'mark_junk', 'report_phish'].includes(feedbackType)) {
      return res.status(400).json({
        error: 'feedbackType must be mark_safe, mark_junk, or report_phish',
      });
    }

    await feedbackService.handleFeedback(userId, messageId, feedbackType);

    res.json({ status: 'success', message: 'Feedback recorded' });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

// Get feedback history
router.get('/feedback/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const history = await feedbackService.getFeedbackHistory(userId, limit);

    res.json(history);
  } catch (error) {
    console.error('Get feedback history error:', error);
    res.status(500).json({ error: 'Failed to get feedback history' });
  }
});

// Get feedback stats
router.get('/feedback/user/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await feedbackService.getFeedbackStats(userId);

    res.json(stats);
  } catch (error) {
    console.error('Get feedback stats error:', error);
    res.status(500).json({ error: 'Failed to get feedback stats' });
  }
});

export default router;

