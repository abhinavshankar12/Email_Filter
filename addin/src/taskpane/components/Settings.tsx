import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { TextField } from '@fluentui/react/lib/TextField';
import { Toggle } from '@fluentui/react/lib/Toggle';
import { PrimaryButton, DefaultButton } from '@fluentui/react/lib/Button';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { apiService } from '../services/api';
import './Settings.css';

export const Settings: React.FC = () => {
  const [apiBaseUrl, setApiBaseUrl] = React.useState(
    localStorage.getItem('apiBaseUrl') || 'http://localhost:3000/api'
  );
  const [mlEnabled, setMlEnabled] = React.useState(
    localStorage.getItem('mlEnabled') !== 'false'
  );
  const [privacyMode, setPrivacyMode] = React.useState(
    localStorage.getItem('privacyMode') === 'true'
  );
  const [saved, setSaved] = React.useState(false);

  const handleSave = () => {
    localStorage.setItem('apiBaseUrl', apiBaseUrl);
    localStorage.setItem('mlEnabled', mlEnabled.toString());
    localStorage.setItem('privacyMode', privacyMode.toString());

    apiService.setBaseUrl(apiBaseUrl);

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setApiBaseUrl('http://localhost:3000/api');
    setMlEnabled(true);
    setPrivacyMode(false);
  };

  const handleExportLogs = async () => {
    try {
      const userId = Office.context.mailbox.userProfile.emailAddress;
      const url = `${apiBaseUrl}/admin/decisions/export?userId=${encodeURIComponent(userId)}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Stack tokens={{ childrenGap: 20 }} className="settings-container">
      {saved && (
        <MessageBar messageBarType={MessageBarType.success}>Settings saved successfully!</MessageBar>
      )}

      <h3>API Configuration</h3>
      <TextField
        label="Backend API URL"
        value={apiBaseUrl}
        onChange={(_, value) => setApiBaseUrl(value || '')}
        description="The base URL of the Invora backend service"
      />

      <h3>Processing Options</h3>
      <Toggle
        label="Enable ML Classification"
        checked={mlEnabled}
        onChange={(_, checked) => setMlEnabled(checked || false)}
        onText="Enabled"
        offText="Disabled"
      />
      <p className="setting-description">
        Use machine learning for enhanced email classification. May increase processing time.
      </p>

      <Toggle
        label="Privacy Mode"
        checked={privacyMode}
        onChange={(_, checked) => setPrivacyMode(checked || false)}
        onText="Enabled"
        offText="Disabled"
      />
      <p className="setting-description">
        When enabled, email bodies are not sent to external ML services. Only metadata and features are analyzed.
      </p>

      <h3>Data Management</h3>
      <DefaultButton text="Export Decision Log" onClick={handleExportLogs} />
      <p className="setting-description">
        Download a CSV file of all email classification decisions for audit purposes.
      </p>

      <Stack horizontal tokens={{ childrenGap: 10 }}>
        <PrimaryButton text="Save Settings" onClick={handleSave} />
        <DefaultButton text="Reset to Defaults" onClick={handleReset} />
      </Stack>

      <div className="settings-footer">
        <p>
          <strong>Invora Email Filter</strong> v1.0.0
        </p>
        <p>For support and documentation, visit our GitHub repository.</p>
      </div>
    </Stack>
  );
};

