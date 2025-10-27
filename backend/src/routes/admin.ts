import { Router } from 'express';
import { messageProcessor } from '../services/message-processor';
import { domainRulesService } from '../services/domain-rules';
import { getDatabase } from '../db';

const router = Router();

// Dashboard: Get recent decisions with filters
router.get('/admin/decisions', async (req, res) => {
  try {
    const { userId, search, decision, limit = 200, offset = 0 } = req.query;

    const db = getDatabase();
    let query = 'SELECT * FROM processing_decisions WHERE 1=1';
    const params: any[] = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (decision) {
      query += ' AND decision = ?';
      params.push(decision);
    }

    if (search) {
      query += ' AND (message_id LIKE ? OR internet_message_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY processed_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), parseInt(offset as string));

    const decisions = db.prepare(query).all(...params) as any[];

    const formattedDecisions = decisions.map((row) => ({
      messageId: row.message_id,
      internetMessageId: row.internet_message_id,
      userId: row.user_id,
      processedAt: row.processed_at,
      riskScore: row.risk_score,
      decision: row.decision,
      reasons: JSON.parse(row.reasons),
      mlUsed: row.ml_used === 1,
      actionTaken: row.action_taken,
      processingTimeMs: row.processing_time_ms,
    }));

    res.json(formattedDecisions);
  } catch (error) {
    console.error('Get decisions error:', error);
    res.status(500).json({ error: 'Failed to get decisions' });
  }
});

// Export decisions to CSV
router.get('/admin/decisions/export', async (req, res) => {
  try {
    const { userId } = req.query;

    const db = getDatabase();
    let query = 'SELECT * FROM processing_decisions';
    const params: any[] = [];

    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY processed_at DESC';

    const decisions = db.prepare(query).all(...params) as any[];

    // Build CSV
    const headers = [
      'Message ID',
      'Internet Message ID',
      'User ID',
      'Processed At',
      'Risk Score',
      'Decision',
      'Reasons',
      'ML Used',
      'Action Taken',
      'Processing Time (ms)',
    ];

    const rows = decisions.map((row) => [
      row.message_id,
      row.internet_message_id,
      row.user_id,
      row.processed_at,
      row.risk_score,
      row.decision,
      `"${row.reasons.replace(/"/g, '""')}"`,
      row.ml_used === 1 ? 'Yes' : 'No',
      row.action_taken,
      row.processing_time_ms,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.type('text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=invora-decisions.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export decisions' });
  }
});

// Get domain rules (allowlist/blocklist)
router.get('/admin/domain-rules', async (req, res) => {
  try {
    const rules = await domainRulesService.getAllRules();
    res.json(rules);
  } catch (error) {
    console.error('Get domain rules error:', error);
    res.status(500).json({ error: 'Failed to get domain rules' });
  }
});

// Add domain rule
router.post('/admin/domain-rules', async (req, res) => {
  try {
    const { domain, type, expiresAt } = req.body;

    if (!domain || !type) {
      return res.status(400).json({ error: 'domain and type are required' });
    }

    if (!['allow', 'block'].includes(type)) {
      return res.status(400).json({ error: 'type must be allow or block' });
    }

    await domainRulesService.addRule({
      domain,
      type,
      source: 'admin',
      addedAt: new Date().toISOString(),
      expiresAt: expiresAt || undefined,
    });

    res.json({ status: 'success', message: 'Domain rule added' });
  } catch (error) {
    console.error('Add domain rule error:', error);
    res.status(500).json({ error: 'Failed to add domain rule' });
  }
});

// Remove domain rule
router.delete('/admin/domain-rules/:domain/:type', async (req, res) => {
  try {
    const { domain, type } = req.params;

    if (!['allow', 'block'].includes(type)) {
      return res.status(400).json({ error: 'type must be allow or block' });
    }

    await domainRulesService.removeRule(domain, type as 'allow' | 'block');

    res.json({ status: 'success', message: 'Domain rule removed' });
  } catch (error) {
    console.error('Remove domain rule error:', error);
    res.status(500).json({ error: 'Failed to remove domain rule' });
  }
});

// Get overall stats
router.get('/admin/stats', async (req, res) => {
  try {
    const db = getDatabase();

    const stats = {
      decisions: db
        .prepare(
          `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN decision = 'junk' THEN 1 ELSE 0 END) as junk,
          SUM(CASE WHEN decision = 'warning' THEN 1 ELSE 0 END) as warning,
          SUM(CASE WHEN decision = 'safe' THEN 1 ELSE 0 END) as safe,
          AVG(risk_score) as avg_risk_score,
          AVG(processing_time_ms) as avg_processing_time
        FROM processing_decisions
      `
        )
        .get(),
      feedback: db
        .prepare(
          `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN feedback_type = 'mark_safe' THEN 1 ELSE 0 END) as mark_safe,
          SUM(CASE WHEN feedback_type = 'mark_junk' THEN 1 ELSE 0 END) as mark_junk,
          SUM(CASE WHEN feedback_type = 'report_phish' THEN 1 ELSE 0 END) as report_phish
        FROM user_feedback
      `
        )
        .get(),
      domainRules: db
        .prepare(
          `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN type = 'allow' THEN 1 ELSE 0 END) as allowlist,
          SUM(CASE WHEN type = 'block' THEN 1 ELSE 0 END) as blocklist
        FROM domain_rules
      `
        )
        .get(),
      subscriptions: db
        .prepare(
          `
        SELECT COUNT(*) as total
        FROM graph_subscriptions
      `
        )
        .get(),
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

