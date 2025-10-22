import React, { useState, useEffect } from 'react';
import './App.css';

interface FormSubmission {
  id: number;
  url: string;
  timestamp: string;
  formAction: string;
  formId: string;
  formMethod: string;
  formClass: string;
  data: Record<string, string>;
  pageTitle: string;
  domain: string;
  tabId?: number;
  tabUrl?: string;
}

interface Stats {
  total: number;
  today: number;
  domains: number;
  lastSubmission: string | null;
}

const App: React.FC = () => {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, domains: 0, lastSubmission: null });
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFormData();
    loadStats();
    
    // Listen for new form submissions
    const handleMessage = (message: any) => {
      if (message.action === 'newFormSubmission') {
        setSubmissions(prev => [message.data, ...prev.slice(0, 199)]);
        loadStats();
      }
    };
    
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const loadFormData = () => {
    setLoading(true);
    console.log('Sidepanel: Loading form data...');
    chrome.runtime.sendMessage({ action: 'getFormData' }, (response) => {
      console.log('Sidepanel: Received response:', response);
      if (response && response.data) {
        console.log('Sidepanel: Setting submissions:', response.data.length, 'items');
        setSubmissions(response.data);
      } else {
        console.log('Sidepanel: No data received');
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

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all form data?')) {
      chrome.runtime.sendMessage({ action: 'clearAllData' }, () => {
        setSubmissions([]);
        setStats({ total: 0, today: 0, domains: 0, lastSubmission: null });
      });
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(submissions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `form-submissions-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredSubmissions = submissions.filter(submission => {
    const matchesFilter = filter === 'all' || 
      (filter === 'today' && new Date(submission.timestamp).toDateString() === new Date().toDateString()) ||
      (filter === 'domain' && submission.domain.includes(searchTerm));
    
    const matchesSearch = searchTerm === '' || 
      submission.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.pageTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.formId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(submission.data).some(value => 
        value.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesFilter && matchesSearch;
  });

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="sidepanel">
      <header className="header">
        <h1>📝 Form Capture</h1>
        <div className="stats-grid">
          <div className="stat">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat">
            <span className="stat-number">{stats.today}</span>
            <span className="stat-label">Today</span>
          </div>
          <div className="stat">
            <span className="stat-number">{stats.domains}</span>
            <span className="stat-label">Sites</span>
          </div>
        </div>
      </header>

      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'today' ? 'active' : ''} 
            onClick={() => setFilter('today')}
          >
            Today
          </button>
        </div>

        <div className="action-buttons">
          <button onClick={loadFormData} disabled={loading} className="btn btn-secondary">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button onClick={handleExport} className="btn btn-secondary">
            Export
          </button>
          <button onClick={handleClear} className="btn btn-danger">
            Clear
          </button>
        </div>
      </div>

      <div className="submissions-list">
        {filteredSubmissions.length === 0 ? (
          <div className="empty-state">
            <p>No form submissions found</p>
            <small>Submit a form on any website to see it here!</small>
          </div>
        ) : (
          filteredSubmissions.map((submission) => (
            <div 
              key={submission.id} 
              className={`submission-item ${selectedSubmission?.id === submission.id ? 'selected' : ''}`}
              onClick={() => setSelectedSubmission(submission)}
            >
              <div className="submission-header">
                <div className="submission-meta">
                  <span className="domain">{submission.domain}</span>
                  <span className="time">{formatTimestamp(submission.timestamp)}</span>
                </div>
                <div className="submission-title">
                  {submission.pageTitle || submission.formId}
                </div>
                <div className="submission-url">
                  {submission.url}
                </div>
              </div>
              
              {selectedSubmission?.id === submission.id && (
                <div className="submission-details">
                  <div className="details-section">
                    <h4>Form Data</h4>
                    <div className="form-data">
                      {Object.entries(submission.data).map(([key, value]) => (
                        <div key={key} className="data-item">
                          <span className="data-key">{key}:</span>
                          <span className="data-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="details-section">
                    <h4>Form Details</h4>
                    <div className="form-meta">
                      <div><strong>Method:</strong> {submission.formMethod}</div>
                      <div><strong>Action:</strong> {submission.formAction}</div>
                      <div><strong>Form ID:</strong> {submission.formId}</div>
                      {submission.formClass && <div><strong>Class:</strong> {submission.formClass}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default App;
