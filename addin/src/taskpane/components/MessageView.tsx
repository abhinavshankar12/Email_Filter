import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { RiskBadge } from './RiskBadge';
import { RiskDetails } from './RiskDetails';
import { apiService } from '../services/api';
import { ProcessingDecision } from '../types';

interface MessageViewProps {
  messageId: string;
  userId: string;
}

export const MessageView: React.FC<MessageViewProps> = ({ messageId, userId }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [decision, setDecision] = React.useState<ProcessingDecision | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = React.useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadDecision();
  }, [messageId, userId]);

  const loadDecision = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get existing decision
      let result = await apiService.getDecision(messageId);

      // If not found, classify the message
      if (!result) {
        result = await apiService.classifyMessage(userId, messageId);
      }

      setDecision(result);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze message');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (feedbackType: 'mark_safe' | 'mark_junk' | 'report_phish') => {
    setSubmittingFeedback(true);
    setFeedbackSuccess(null);
    setError(null);

    try {
      await apiService.submitFeedback(userId, messageId, feedbackType);

      let message = 'Feedback submitted successfully';
      if (feedbackType === 'mark_safe') {
        message = 'Marked as safe. Sender added to allowlist.';
      } else if (feedbackType === 'mark_junk') {
        message = 'Marked as junk. Sender added to blocklist.';
      } else if (feedbackType === 'report_phish') {
        message = 'Reported as phishing. Message moved to Junk folder.';
      }

      setFeedbackSuccess(message);

      // Reload decision
      setTimeout(() => {
        loadDecision();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleViewHeaders = () => {
    Office.context.mailbox.item?.getAllInternetHeadersAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        const headers = result.value;
        // Open a dialog or display headers
        alert(`Email Headers:\n\n${headers}`);
      }
    });
  };

  if (loading) {
    return (
      <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { minHeight: 200 } }}>
        <Spinner size={SpinnerSize.large} label="Analyzing email..." />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack tokens={{ childrenGap: 15 }}>
        <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>
        <DefaultButton text="Retry" onClick={loadDecision} />
      </Stack>
    );
  }

  if (!decision) {
    return (
      <MessageBar messageBarType={MessageBarType.info}>No decision available</MessageBar>
    );
  }

  return (
    <Stack tokens={{ childrenGap: 20 }}>
      {feedbackSuccess && (
        <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setFeedbackSuccess(null)}>
          {feedbackSuccess}
        </MessageBar>
      )}

      <RiskBadge score={decision.riskScore} decision={decision.decision} />

      <RiskDetails decision={decision} />

      <Stack tokens={{ childrenGap: 10 }}>
        <h3>Actions</h3>

        {decision.decision === 'junk' && (
          <MessageBar messageBarType={MessageBarType.warning}>
            This email has been moved to your Junk Email folder.
          </MessageBar>
        )}

        <Stack horizontal tokens={{ childrenGap: 10 }}>
          <PrimaryButton
            text="Mark as Junk"
            onClick={() => handleFeedback('mark_junk')}
            disabled={submittingFeedback || decision.decision === 'junk'}
          />
          <DefaultButton
            text="Mark as Safe"
            onClick={() => handleFeedback('mark_safe')}
            disabled={submittingFeedback}
          />
        </Stack>

        <Stack horizontal tokens={{ childrenGap: 10 }}>
          <DefaultButton
            text="Report Phishing"
            onClick={() => handleFeedback('report_phish')}
            disabled={submittingFeedback}
            styles={{ root: { backgroundColor: '#d13438', color: 'white' } }}
          />
          <DefaultButton text="View Headers" onClick={handleViewHeaders} />
        </Stack>
      </Stack>

      <div style={{ marginTop: 20, fontSize: 12, color: '#666' }}>
        <p>
          <strong>Processed:</strong> {new Date(decision.processedAt).toLocaleString()}
        </p>
        <p>
          <strong>Processing time:</strong> {decision.processingTimeMs}ms
        </p>
        <p>
          <strong>ML used:</strong> {decision.mlUsed ? 'Yes' : 'No'}
        </p>
      </div>
    </Stack>
  );
};

