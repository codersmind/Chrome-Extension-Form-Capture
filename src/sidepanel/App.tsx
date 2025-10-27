import React, { useState, useEffect } from 'react';
import '../styles/globals.css';

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
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, domains: 0, lastSubmission: null });
  const [loading, setLoading] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'starred' | 'archived'>('all');

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
    // First apply the active filter (all/starred/archived)
    let matchesActiveFilter = true;
    switch (activeFilter) {
      case 'starred':
        matchesActiveFilter = submission.starred === true;
        break;
      case 'archived':
        matchesActiveFilter = submission.archived === true;
        break;
      default:
        matchesActiveFilter = true; // 'all' shows everything
    }

    // Then apply date filter
    const matchesDateFilter = filter === 'all' || 
      (filter === 'today' && new Date(submission.timestamp).toDateString() === new Date().toDateString()) ||
      (filter === 'domain' && submission.domain.includes(searchTerm));
    
    // Then apply search filter
    const matchesSearch = searchTerm === '' || 
      submission.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.pageTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.formId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(submission.data).some(value => 
        value.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesActiveFilter && matchesDateFilter && matchesSearch;
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

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedItems.size === filteredSubmissions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredSubmissions.map(s => s.id)));
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

  return (
    <div className="w-full h-screen bg-white font-sans text-sm text-gray-900 flex flex-col">
      {/* Header */}
      <header className="p-5 border-b border-gray-200 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">📝 Form Capture</h1>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Total</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.today}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Today</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.domains}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Sites</div>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="p-5 border-b border-gray-200 bg-gray-50">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="mb-4">
          <div className="flex gap-1 bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                activeFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setActiveFilter('starred')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                activeFilter === 'starred'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⭐ Starred ({submissions.filter(s => s.starred === true).length})
            </button>
            <button
              onClick={() => setActiveFilter('archived')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all duration-200 ${
                activeFilter === 'archived'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📁 Archived ({submissions.filter(s => s.archived === true).length})
            </button>
          </div>
        </div>
        
        <div className="flex gap-2 mb-4">
          <button 
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              filter === 'all' 
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500'
            }`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              filter === 'today' 
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500'
            }`}
            onClick={() => setFilter('today')}
          >
            Today
          </button>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={loadFormData} disabled={loading} className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button onClick={handleExport} className="px-4 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2">
            Export
          </button>
          <button onClick={handleClear} className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2">
            Clear
          </button>
        </div>
      </div>

      {/* Submissions List */}
      <div className="flex-1 overflow-y-auto p-5">
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-10 text-gray-600">
            <p className="text-lg font-medium mb-2">
              {activeFilter === 'all' ? 'No form submissions found' :
               activeFilter === 'starred' ? 'No starred forms' : 'No archived forms'}
            </p>
            <small className="text-sm">
              {activeFilter === 'all' ? 'Submit a form on any website to see it here!' :
               activeFilter === 'starred' ? 'Star forms to mark them as important' : 'Archive forms to organize them'}
            </small>
          </div>
        ) : (
          <>
            {/* Selection Controls */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredSubmissions.length && filteredSubmissions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </label>
                {selectedItems.size > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedItems.size} selected
                  </span>
                )}
              </div>
              
              {/* Bulk Actions */}
              {selectedItems.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkStar}
                    className="px-3 py-1 text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-200 rounded font-medium transition-colors"
                    title="Mark as Important"
                  >
                    ⭐ Star
                  </button>
                  <button
                    onClick={handleBulkUnstar}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-800 hover:bg-gray-200 rounded font-medium transition-colors"
                    title="Remove Star"
                  >
                    ☆ Unstar
                  </button>
                  <button
                    onClick={handleBulkArchive}
                    className="px-3 py-1 text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 rounded font-medium transition-colors"
                    title="Archive"
                  >
                    📁 Archive
                  </button>
                  <button
                    onClick={handleBulkUnarchive}
                    className="px-3 py-1 text-xs bg-green-100 text-green-800 hover:bg-green-200 rounded font-medium transition-colors"
                    title="Unarchive"
                  >
                    📤 Unarchive
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 text-xs bg-red-100 text-red-800 hover:bg-red-200 rounded font-medium transition-colors"
                    title="Delete"
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          <div className="space-y-3">
            {filteredSubmissions.map((submission) => (
              <div 
                key={submission.id} 
                className={`border rounded-lg transition-all duration-200 ${
                  selectedItems.has(submission.id)
                    ? 'border-blue-500 bg-blue-50'
                    : selectedSubmission?.id === submission.id 
                      ? 'border-blue-500 bg-blue-50 shadow-md' 
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedSubmission(
                  selectedSubmission?.id === submission.id ? null : submission
                )}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedItems.has(submission.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectItem(submission.id);
                      }}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-2">
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
                      <div className="text-sm font-semibold text-gray-900 mb-1">
                        {submission.pageTitle || submission.formId}
                      </div>
                      <div className="text-xs text-gray-600 break-all">
                        {submission.url}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Expandable Details - Fixed to not collapse */}
                {selectedSubmission?.id === submission.id && (
                  <div className="border-t border-gray-200 bg-white p-4">
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Form Data</h4>
                      <div className="space-y-1">
                        {Object.entries(submission.data).map(([key, value]) => (
                          <div key={key} className="flex p-2 bg-gray-50 rounded text-xs">
                            <span className="font-semibold text-gray-900 min-w-[100px] mr-2">{key}:</span>
                            <span className="text-gray-700 break-words">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
    <div>
                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Form Details</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex p-2 bg-gray-50 rounded">
                          <span className="font-semibold text-gray-900 min-w-[80px]">Method:</span>
                          <span className="text-gray-700">{submission.formMethod}</span>
                        </div>
                        <div className="flex p-2 bg-gray-50 rounded">
                          <span className="font-semibold text-gray-900 min-w-[80px]">Action:</span>
                          <span className="text-gray-700 break-all">{submission.formAction}</span>
                        </div>
                        <div className="flex p-2 bg-gray-50 rounded">
                          <span className="font-semibold text-gray-900 min-w-[80px]">Form ID:</span>
                          <span className="text-gray-700">{submission.formId}</span>
                        </div>
                        {submission.formClass && (
                          <div className="flex p-2 bg-gray-50 rounded">
                            <span className="font-semibold text-gray-900 min-w-[80px]">Class:</span>
                            <span className="text-gray-700">{submission.formClass}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
