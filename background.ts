// src/background.ts
console.log('Form Capture Extension: Background script loaded');

// Add context menu for sidepanel access
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'openSidepanel',
    title: 'Open Form Capture Sidepanel',
    contexts: ['action']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'openSidepanel' && tab?.windowId) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Form Capture Extension: Received message:', message.action);
  
  if (message.action === 'storeFormData') {
    console.log('Form Capture Extension: Storing form data:', message.data);
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      if (result.extensionEnabled !== false) {
        const storedData = {
          ...message.data,
          id: Date.now() + Math.random(), // Unique ID
          tabId: sender.tab?.id,
          tabUrl: sender.tab?.url,
        };
        
        chrome.storage.local.get(['formSubmissions'], (result) => {
          const existing = result.formSubmissions || [];
          existing.push(storedData);
          // Keep only last 200 submissions to manage storage
          chrome.storage.local.set({ 
            formSubmissions: existing.slice(-200),
            lastUpdated: new Date().toISOString()
          });
          
          // Notify sidepanel if it's open
          chrome.runtime.sendMessage({
            action: 'newFormSubmission',
            data: storedData
          }).catch(() => {
            // Ignore errors if no listeners
          });
        });
      }
    });
    sendResponse({ success: true });
  }

  if (message.action === 'toggleEnabled') {
    chrome.storage.sync.set({ extensionEnabled: message.enabled });
    sendResponse({ success: true });
  }

  // For sidepanel data sync
  if (message.action === 'getFormData') {
    chrome.storage.local.get(['formSubmissions'], (result) => {
      sendResponse({
        action: 'formDataResponse',
        data: result.formSubmissions || []
      });
    });
    return true; // Keep message channel open for async response
  }

  // Get form statistics
  if (message.action === 'getStats') {
    chrome.storage.local.get(['formSubmissions'], (result) => {
      const submissions = result.formSubmissions || [];
      const stats = {
        total: submissions.length,
        today: submissions.filter((s: any) => {
          const today = new Date().toDateString();
          return new Date(s.timestamp).toDateString() === today;
        }).length,
        domains: [...new Set(submissions.map((s: any) => s.domain))].length,
        lastSubmission: submissions[submissions.length - 1]?.timestamp || null
      };
      sendResponse({ stats });
    });
    return true;
  }

  // Clear all data
  if (message.action === 'clearAllData') {
    chrome.storage.local.set({ 
      formSubmissions: [],
      lastUpdated: new Date().toISOString()
    });
    sendResponse({ success: true });
  }
});