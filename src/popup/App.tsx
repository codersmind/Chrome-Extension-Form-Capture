import React, { useState, useEffect } from 'react';
import '../styles/globals.css';

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
  starred?: boolean;
  archived?: boolean;
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
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'archived'>('all');

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

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedItems.size === submissions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(submissions.map(s => s.id)));
    }
  };

  const handleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // Bulk actions
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    
    if (confirm(`Delete ${selectedItems.size} selected form submission(s)?`)) {
      chrome.runtime.sendMessage({ 
        action: 'bulkDelete', 
        ids: Array.from(selectedItems) 
      }, () => {
        setSelectedItems(new Set());
        loadFormData();
        loadStats();
      });
    }
  };

  const handleBulkStar = () => {
    if (selectedItems.size === 0) return;
    
    chrome.runtime.sendMessage({ 
      action: 'bulkStar', 
      ids: Array.from(selectedItems),
      starred: true
    }, () => {
      setSelectedItems(new Set());
      loadFormData();
    });
  };

  const handleBulkUnstar = () => {
    if (selectedItems.size === 0) return;
    
    chrome.runtime.sendMessage({ 
      action: 'bulkStar', 
      ids: Array.from(selectedItems),
      starred: false
    }, () => {
      setSelectedItems(new Set());
      loadFormData();
    });
  };

  const handleBulkArchive = () => {
    if (selectedItems.size === 0) return;
    
    chrome.runtime.sendMessage({ 
      action: 'bulkArchive', 
      ids: Array.from(selectedItems),
      archived: true
    }, () => {
      setSelectedItems(new Set());
      loadFormData();
    });
  };

  const handleBulkUnarchive = () => {
    if (selectedItems.size === 0) return;
    
    chrome.runtime.sendMessage({ 
      action: 'bulkUnarchive', 
      ids: Array.from(selectedItems)
    }, () => {
      setSelectedItems(new Set());
      loadFormData();
    });
  };

  const handleToggleArchive = (id: number) => {
    chrome.runtime.sendMessage({ 
      action: 'toggleArchive', 
      id: id
    }, () => {
      loadFormData();
    });
  };

  const handleToggleStar = (id: number) => {
    chrome.runtime.sendMessage({ 
      action: 'toggleStar', 
      id: id
    }, () => {
      loadFormData();
    });
  };

  const openSidepanel = () => {
    console.log('Popup: Attempting to open sidepanel...');
    
    // Method 1: Try to get current window ID first
    chrome.windows.getCurrent((currentWindow) => {
      if (currentWindow && currentWindow.id) {
        console.log('Popup: Got current window ID:', currentWindow.id);
        
        // Try sidepanel API with valid window ID
        if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
          try {
            console.log('Popup: Using sidepanel API with window ID:', currentWindow.id);
            chrome.sidePanel.open({ windowId: currentWindow.id });
            return;
          } catch (sidepanelError) {
            console.log('Popup: Sidepanel API failed:', sidepanelError);
          }
        }
      }
      
      // Method 2: Fallback - open in new tab
      console.log('Popup: Using fallback method - opening in new tab');
      try {
        chrome.tabs.create({ 
          url: chrome.runtime.getURL('src/sidepanel/index.html')
        });
      } catch (tabError) {
        console.log('Popup: Tab creation failed:', tabError);
        
        // Method 3: Final fallback - direct URL
        const sidepanelUrl = chrome.runtime.getURL('src/sidepanel/index.html');
        console.log('Popup: Opening direct URL:', sidepanelUrl);
        window.open(sidepanelUrl, '_blank');
      }
    });
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

  // Filter submissions based on active filter
  const filteredSubmissions = submissions.filter(submission => {
    switch (activeFilter) {
      case 'starred':
        return submission.starred === true;
      case 'archived':
        return submission.archived === true;
      default:
        return true; // 'all' shows everything
    }
  });

  // Get counts for each filter
  const getFilterCounts = () => {
    const starredCount = submissions.filter(s => s.starred === true).length;
    const archivedCount = submissions.filter(s => s.archived === true).length;
    return { starredCount, archivedCount };
  };

  return (
    <div className="w-96 min-h-[500px] bg-white font-sans text-sm text-gray-900">
      {/* Header */}
      <header className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
        <h1 className="text-lg font-semibold text-gray-900">📝 Form Capture</h1>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{enabled ? 'Active' : 'Inactive'}</span>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="flex p-4 gap-4 bg-gray-50 border-b border-gray-200">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center flex-1">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center flex-1">
          <div className="text-2xl font-bold text-gray-900">{stats.today}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Today</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center flex-1">
          <div className="text-2xl font-bold text-gray-900">{stats.domains}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Sites</div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200">
        <label className="flex items-center gap-3 mb-3 cursor-pointer">
          <div className="toggle-switch">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </div>
          <span className="font-medium text-gray-900">Capture Forms</span>
        </label>

        <div className="flex gap-2 justify-end">
          <button 
            onClick={handleRefresh} 
            disabled={loading} 
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            {loading ? '⏳' : '🔄'}
          </button>
          <button onClick={handleClear} className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2">
            🗑️
          </button>
          <button onClick={handleExport} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2">
            📥
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all duration-200 ${
              activeFilter === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setActiveFilter('starred')}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all duration-200 ${
              activeFilter === 'starred'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ⭐ Starred ({getFilterCounts().starredCount})
          </button>
          <button
            onClick={() => setActiveFilter('archived')}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-md transition-all duration-200 ${
              activeFilter === 'archived'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📁 Archived ({getFilterCounts().archivedCount})
          </button>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {activeFilter === 'all' ? 'Recent Forms' : 
               activeFilter === 'starred' ? 'Starred Forms' : 'Archived Forms'}
            </h3>
            {filteredSubmissions.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItems.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-600">Select All</span>
              </label>
            )}
          </div>
          <button onClick={openSidepanel} className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2">
            View All
          </button>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedItems.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkStar}
                  className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded font-medium transition-colors"
                  title="Mark as Important"
                >
                  ⭐ Star
                </button>
                <button
                  onClick={handleBulkUnstar}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 rounded font-medium transition-colors"
                  title="Remove Star"
                >
                  ☆ Unstar
                </button>
                <button
                  onClick={handleBulkArchive}
                  className="px-2 py-1 text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 rounded font-medium transition-colors"
                  title="Archive"
                >
                  📁 Archive
                </button>
                <button
                  onClick={handleBulkUnarchive}
                  className="px-2 py-1 text-xs bg-green-100 text-green-800 hover:bg-green-200 rounded font-medium transition-colors"
                  title="Unarchive"
                >
                  📤 Unarchive
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-2 py-1 text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded font-medium transition-colors"
                  title="Delete"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <p className="font-medium mb-1">
              {activeFilter === 'all' ? 'No forms captured yet' :
               activeFilter === 'starred' ? 'No starred forms' : 'No archived forms'}
            </p>
            <small className="text-xs">
              {activeFilter === 'all' ? 'Submit a form on any website!' :
               activeFilter === 'starred' ? 'Star forms to mark them as important' : 'Archive forms to organize them'}
            </small>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSubmissions.map((submission) => (
              <div key={submission.id} className={`p-3 border rounded-lg transition-all duration-200 ${
                selectedItems.has(submission.id) 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
              }`}>
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedItems.has(submission.id)}
                    onChange={() => handleSelectItem(submission.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                          {submission.domain}
                        </span>
                        {submission.starred && (
                          <span className="text-yellow-500" title="Important">⭐</span>
                        )}
                        {submission.archived && (
                          <span className="text-purple-500" title="Archived">📁</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(submission.id);
                          }}
                          className={`text-sm transition-colors ${
                            submission.starred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                          }`}
                          title={submission.starred ? 'Remove star' : 'Mark as important'}
                        >
                          {submission.starred ? '⭐' : '☆'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleArchive(submission.id);
                          }}
                          className={`text-sm transition-colors ${
                            submission.archived ? 'text-green-500' : 'text-gray-400 hover:text-purple-500'
                          }`}
                          title={submission.archived ? 'Unarchive' : 'Archive'}
                        >
                          {submission.archived ? '📤' : '📁'}
                        </button>
                        <span className="text-xs text-gray-500">{formatTimestamp(submission.timestamp)}</span>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-gray-900 mb-1 truncate">
                      {submission.pageTitle || submission.formId}
                    </div>
                    <div className="text-xs text-gray-600">
                      {Object.keys(submission.data).length} fields
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="p-4 border-t border-gray-200 bg-gray-50">
        <button onClick={openSidepanel} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 w-full mb-2">
          Open Side Panel
        </button>
        <button 
          onClick={() => {
            const url = chrome.runtime.getURL('src/sidepanel/index.html');
            chrome.tabs.create({ url });
          }} 
          className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 w-full"
        >
          Open in New Tab
        </button>
        <div className="mt-2 text-center">
          <small className="text-xs text-gray-600">
            If sidepanel doesn't open, try the "Open in New Tab" button or right-click the extension icon
          </small>
        </div>
      </footer>
    </div>
  );
};

export default App;