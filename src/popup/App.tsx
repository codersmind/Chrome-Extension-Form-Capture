import React, { useState, useEffect } from 'react';
import './App.css';

interface FormSubmission {
  id: number;
  url: string;
  timestamp: string;
  formAction: string;
  formId: string;
  formMethod: string;
  data: Record<string, string>;
  pageTitle: string;
  domain: string;
}

interface Stats {
  total: number;
  today: number;
  domains: number;
  lastSubmission: string | null;
}

const App: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, domains: 0, lastSubmission: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExtensionState();
    loadFormData();
    loadStats();
    
    // Listen for new form submissions
    const handleMessage = (message: any) => {
      if (message.action === 'newFormSubmission') {
        setSubmissions(prev => [message.data, ...prev.slice(0, 4)]);
        loadStats();
      }
    };
    
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const loadExtensionState = () => {
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      setEnabled(result.extensionEnabled !== false);
    });
  };

  const loadFormData = () => {
    setLoading(true);
    console.log('Popup: Loading form data...');
    chrome.runtime.sendMessage({ action: 'getFormData' }, (response) => {
      console.log('Popup: Received response:', response);
      if (response && response.data) {
        console.log('Popup: Setting submissions:', response.data.length, 'items');
        setSubmissions(response.data.slice(0, 5)); // Show only latest 5
      } else {
        console.log('Popup: No data received');
      }
      setLoading(false);
    });
  };

  const loadStats = () => {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
      if (response && response.stats) {
        setStats(response.stats);
      }
    });
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    chrome.storage.sync.set({ extensionEnabled: checked });
  };

  const handleRefresh = () => loadFormData();
  
  const handleClear = () => {
    if (confirm('Clear all form data?')) {
      chrome.runtime.sendMessage({ action: 'clearAllData' }, () => {
        setSubmissions([]);
        setStats({ total: 0, today: 0, domains: 0, lastSubmission: null });
      });
    }
  };

  const handleExport = () => {
    chrome.runtime.sendMessage({ action: 'getFormData' }, (response) => {
      if (response && response.data) {
        const dataStr = JSON.stringify(response.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `form-submissions-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  };

  const openSidepanel = () => {
    console.log('Popup: Attempting to open sidepanel...');
    try {
      // Method 1: Try the sidepanel API
      if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
        console.log('Popup: Using sidepanel API');
        chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
        return;
      }
      
      // Method 2: Try opening in current tab
      if (chrome.tabs && chrome.tabs.query) {
        console.log('Popup: Using tabs API to open sidepanel');
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.create({ 
              url: chrome.runtime.getURL('src/sidepanel/index.html'),
              windowId: chrome.windows.WINDOW_ID_CURRENT 
            });
          }
        });
        return;
      }
      
      // Method 3: Fallback - open in new tab
      console.log('Popup: Using fallback method');
      chrome.tabs.create({ url: chrome.runtime.getURL('src/sidepanel/index.html') });
      
    } catch (error) {
      console.log('Popup: Error opening sidepanel:', error);
      // Final fallback
      try {
        chrome.tabs.create({ url: chrome.runtime.getURL('src/sidepanel/index.html') });
      } catch (fallbackError) {
        console.log('Popup: Fallback also failed:', fallbackError);
        alert('Unable to open sidepanel. Please try refreshing the extension.');
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="popup">
      <header className="popup-header">
        <h1>📝 Form Capture</h1>
        <div className="status-indicator">
          <div className={`status-dot ${enabled ? 'active' : 'inactive'}`}></div>
          <span>{enabled ? 'Active' : 'Inactive'}</span>
        </div>
      </header>

      <div className="stats-overview">
        <div className="stat-item">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.today}</span>
          <span className="stat-label">Today</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.domains}</span>
          <span className="stat-label">Sites</span>
        </div>
      </div>

      <div className="controls">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <span className="slider"></span>
          <span className="toggle-label">Capture Forms</span>
        </label>

        <div className="action-buttons">
          <button onClick={handleRefresh} disabled={loading} className="btn btn-sm">
            {loading ? '⏳' : '🔄'}
          </button>
          <button onClick={handleClear} className="btn btn-sm btn-danger">
            🗑️
          </button>
          <button onClick={handleExport} className="btn btn-sm">
            📥
          </button>
        </div>
      </div>

      <div className="recent-submissions">
        <div className="section-header">
          <h3>Recent Forms</h3>
          <button onClick={openSidepanel} className="btn btn-sm btn-primary">
            View All
          </button>
        </div>

        {submissions.length === 0 ? (
          <div className="empty-state">
            <p>No forms captured yet</p>
            <small>Submit a form on any website!</small>
          </div>
        ) : (
          <div className="submissions-list">
            {submissions.map((submission) => (
              <div key={submission.id} className="submission-item">
                <div className="submission-header">
                  <span className="domain">{submission.domain}</span>
                  <span className="time">{formatTimestamp(submission.timestamp)}</span>
                </div>
                <div className="submission-title">
                  {submission.pageTitle || submission.formId}
                </div>
                <div className="submission-data">
                  {Object.keys(submission.data).length} fields
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="popup-footer">
        <button onClick={openSidepanel} className="btn btn-primary full-width">
          Open Side Panel
        </button>
        <div style={{ marginTop: '8px', textAlign: 'center' }}>
          <small style={{ color: '#666', fontSize: '11px' }}>
            If sidepanel doesn't open, try right-clicking the extension icon
          </small>
        </div>
      </footer>
    </div>
  );
};

export default App;