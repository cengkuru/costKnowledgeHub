/**
 * Insights Routes
 * Endpoints for weekly usage insights and scheduler triggers
 */

import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { insightsService } from '../services/insightsService';
import { emailService } from '../services/emailService';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Middleware to authenticate scheduler requests
 * Uses a shared secret in the Authorization header
 */
function schedulerAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!config.schedulerSecret) {
    console.error('SCHEDULER_SECRET not configured');
    res.status(500).json({ error: 'Scheduler not configured' });
    return;
  }

  if (!authHeader || authHeader !== `Bearer ${config.schedulerSecret}`) {
    console.warn('Unauthorized scheduler request attempt');
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
}

/**
 * POST /api/internal/insights/send-weekly
 * Triggered by Cloud Scheduler to send weekly insights email
 * Requires scheduler secret authentication
 */
router.post('/internal/insights/send-weekly', schedulerAuth, async (_req: Request, res: Response) => {
  try {
    console.log('Starting weekly insights email generation...');

    // Generate the report
    const report = await insightsService.generateWeeklyReport();
    console.log('Report generated:', {
      weekRange: report.weekRange,
      topResources: report.engagement.topResources.length,
      contentGaps: report.contentGaps.length,
      hiddenGems: report.aiUsage.hiddenGems.length,
    });

    // Get admin recipients
    const recipients = await insightsService.getAdminRecipients();

    if (recipients.length === 0) {
      console.warn('No admin recipients found');
      res.status(200).json({
        success: true,
        message: 'Report generated but no recipients found',
        report: {
          weekRange: report.weekRange,
          generatedAt: report.generatedAt,
        },
      });
      return;
    }

    console.log(`Sending to ${recipients.length} recipients:`, recipients.map((r) => r.email));

    // Send the email
    const result = await emailService.sendWeeklyInsights(recipients, report);

    if (result.success) {
      console.log('Weekly insights email sent successfully');
      res.status(200).json({
        success: true,
        message: 'Weekly insights email sent',
        recipientCount: result.recipientCount,
        weekRange: report.weekRange,
      });
    } else {
      console.error('Failed to send weekly insights email:', result.error);
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error in send-weekly endpoint:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/insights/preview
 * Preview the weekly insights report without sending email
 * Requires admin authentication
 */
router.get('/admin/insights/preview', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const report = await insightsService.generateWeeklyReport();
    const recipients = await insightsService.getAdminRecipients();

    res.json({
      success: true,
      report,
      recipients,
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/insights/send-test
 * Send a test weekly insights email to the requesting admin
 * Requires admin authentication
 */
router.post('/admin/insights/send-test', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user?.email) {
      res.status(400).json({ error: 'User email not available' });
      return;
    }

    const report = await insightsService.generateWeeklyReport();

    const result = await emailService.sendWeeklyInsights(
      [{ email: user.email, name: user.name }],
      report
    );

    if (result.success) {
      res.json({
        success: true,
        message: `Test email sent to ${user.email}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
