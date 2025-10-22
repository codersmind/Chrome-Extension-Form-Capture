// src/content/main.tsx
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './views/App';

// Handle HMR connection errors gracefully
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (event.message && event.message.includes('HMRPort is not initialized')) {
      console.log('HMR connection issue - this is normal in development mode');
      event.preventDefault();
    }
  });
}

// Debug logging
console.log('Form Capture Extension: Content script loaded on', window.location.href);

const FormCapture: React.FC = () => {
  useEffect(() => {
    // Initialize form capture
    initializeFormCapture();
    
    // Watch for dynamic forms
    const observer = new MutationObserver(() => {
      attachFormListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);

  const initializeFormCapture = () => {
    console.log('Form Capture Extension: Initializing form capture');
    // Check if extension is enabled
    chrome.storage.sync.get(['extensionEnabled'], (result) => {
      console.log('Form Capture Extension: Extension enabled?', result.extensionEnabled !== false);
      if (result.extensionEnabled !== false) {
        attachFormListeners();
      }
    });
  };

  const attachFormListeners = () => {
    const forms = document.querySelectorAll('form:not([data-form-captured])');
    console.log('Form Capture Extension: Found', forms.length, 'forms to attach listeners to');
    forms.forEach((formElement) => {
      const form = formElement as HTMLFormElement;
      console.log('Form Capture Extension: Attaching listener to form:', form.id || form.name || 'unnamed');
      // Mark form as captured to avoid duplicate listeners
      form.setAttribute('data-form-captured', 'true');

      // Capture form submission
      form.addEventListener('submit', () => {
        console.log('Form Capture Extension: Form submitted!', form.id || form.name || 'unnamed');
        try {
          const formData = new FormData(form);
          const dataObject: Record<string, string> = {};
          
          // Extract all form data
          formData.forEach((value, key) => {
            if (typeof value === 'string') {
              dataObject[key] = value;
            } else if (value instanceof File) {
              dataObject[key] = `[File: ${value.name}]`;
            }
          });

          // Get form metadata
          const formElements = Array.from(form.elements) as HTMLInputElement[];
          const additionalData: Record<string, string> = {};
          
          formElements.forEach((element) => {
            if (element.name && !dataObject[element.name]) {
              if (element.type === 'checkbox' || element.type === 'radio') {
                additionalData[element.name] = element.checked ? 'true' : 'false';
              } else if (element.value) {
                additionalData[element.name] = element.value;
              }
            }
          });

          const submitData = {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            formAction: form.action || window.location.href,
            formId: form.id || form.name || `form-${Date.now()}`,
            formMethod: form.method || 'GET',
            formClass: form.className || '',
            data: { ...dataObject, ...additionalData },
            pageTitle: document.title,
            domain: window.location.hostname,
          };

          // Send to background script
          chrome.runtime.sendMessage({ 
            action: 'storeFormData', 
            data: submitData 
          }, () => {
            if (chrome.runtime.lastError) {
              console.log('Form capture extension:', chrome.runtime.lastError.message);
            }
          });

        } catch (error) {
          console.log('Form capture error:', error);
        }
      });

      // Also capture form changes for better data collection
      const inputs = form.querySelectorAll('input, textarea, select');
      inputs.forEach((input) => {
        input.addEventListener('change', () => {
          // Store intermediate form state (optional)
        });
      });
    });
  };

  return <App/>; // Invisible component
};

// Mount invisible React component
const mountReactApp = () => {
  try {
    if (!document.body) {
      // If body doesn't exist yet, wait a bit more
      setTimeout(mountReactApp, 100);
      return;
    }
    
    const container = document.createElement('div');
    container.style.display = 'none'; // Make it completely invisible
    container.id = 'form-capture-container';
    document.body.appendChild(container);
    createRoot(container).render(<FormCapture />);
  } catch (error) {
    console.log('Form capture extension: React mounting error', error);
    // Fallback: just run the form capture logic without React
    initializeFormCaptureFallback();
  }
};

// Fallback function without React
const initializeFormCaptureFallback = () => {
  // Check if extension is enabled
  chrome.storage.sync.get(['extensionEnabled'], (result) => {
    if (result.extensionEnabled !== false) {
      attachFormListenersFallback();
    }
  });
};

const attachFormListenersFallback = () => {
  const forms = document.querySelectorAll('form:not([data-form-captured])');
  forms.forEach((formElement) => {
    const form = formElement as HTMLFormElement;
    form.setAttribute('data-form-captured', 'true');

    form.addEventListener('submit', () => {
      try {
        const formData = new FormData(form);
        const dataObject: Record<string, string> = {};
        
        formData.forEach((value, key) => {
          if (typeof value === 'string') {
            dataObject[key] = value;
          } else if (value instanceof File) {
            dataObject[key] = `[File: ${value.name}]`;
          }
        });

        const submitData = {
          url: window.location.href,
          timestamp: new Date().toISOString(),
          formAction: form.action || window.location.href,
          formId: form.id || form.name || `form-${Date.now()}`,
          formMethod: form.method || 'GET',
          formClass: form.className || '',
          data: dataObject,
          pageTitle: document.title,
          domain: window.location.hostname,
        };

        chrome.runtime.sendMessage({ 
          action: 'storeFormData', 
          data: submitData 
        }, () => {
          if (chrome.runtime.lastError) {
            console.log('Form capture extension:', chrome.runtime.lastError.message);
          }
        });
      } catch (error) {
        console.log('Form capture error:', error);
      }
    });
  });
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountReactApp);
} else {
  mountReactApp();
}