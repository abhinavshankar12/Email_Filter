import * as React from 'react';
import { Stack } from '@fluentui/react/lib/Stack';
import { MessageView } from './MessageView';
import { Settings } from './Settings';
import { apiService } from '../services/api';
import './App.css';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<'message' | 'settings'>('message');
  const [messageId, setMessageId] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Get current message and user
    Office.context.mailbox.item?.getItemIdAsync((result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        setMessageId(result.value);
      }
    });

    // Get user email
    const userEmail = Office.context.mailbox.userProfile.emailAddress;
    setUserId(userEmail);

    // Set API base URL from settings or default
    const apiBaseUrl = localStorage.getItem('apiBaseUrl') || 'http://localhost:3000/api';
    apiService.setBaseUrl(apiBaseUrl);
  }, []);

  return (
    <div className="app-container">
      <Stack tokens={{ childrenGap: 10 }} className="app-content">
        <div className="app-header">
          <h2>Invora Email Filter</h2>
          <div className="app-tabs">
            <button
              className={activeTab === 'message' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('message')}
            >
              Analysis
            </button>
            <button
              className={activeTab === 'settings' ? 'tab active' : 'tab'}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
          </div>
        </div>

        <div className="app-body">
          {activeTab === 'message' && messageId && userId && (
            <MessageView messageId={messageId} userId={userId} />
          )}
          {activeTab === 'settings' && <Settings />}
        </div>
      </Stack>
    </div>
  );
};

