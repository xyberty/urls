/**
 * Import Links - Handle importing links from JSON
 */
(function() {
  'use strict';

  function handleImportLinks(spaceId, spaceDomain) {
    var pasteInput = document.getElementById('importPaste');
    var errorDiv = document.getElementById('importError');
    var errorText = document.getElementById('importErrorText');
    var previewDiv = document.getElementById('importPreview');
    var previewText = document.getElementById('importPreviewText');

    if (!pasteInput || !pasteInput.value.trim()) {
      if (errorDiv && errorText) {
        errorText.textContent = 'Please provide JSON data (upload a file or paste JSON)';
        errorDiv.classList.remove('hidden');
      }
      return;
    }

    var jsonText = pasteInput.value.trim();
    var importData;

    try {
      importData = JSON.parse(jsonText);
      if (!Array.isArray(importData)) {
        throw new Error('Data must be an array');
      }
    } catch (e) {
      if (errorDiv && errorText) {
        errorText.textContent = 'Invalid JSON: ' + e.message;
        errorDiv.classList.remove('hidden');
      }
      return;
    }

    // Hide errors and show loading
    if (errorDiv) errorDiv.classList.add('hidden');
    if (previewDiv) {
      previewText.textContent = 'Importing...';
      previewDiv.classList.remove('hidden');
    }

    // Disable confirm button and cancel button
    var confirmBtn = document.getElementById('dialog-confirm');
    var cancelBtn = document.getElementById('dialog-cancel');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Importing...';
    }
    if (cancelBtn) {
      cancelBtn.disabled = true;
    }

    // Send to backend
    fetch('/spaces/' + spaceId + '/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(importData)
    })
    .then(function(response) {
      return response.json().then(function(data) {
        if (!response.ok) {
          throw new Error(data.error || 'Import failed');
        }
        return data;
      });
    })
    .then(function(data) {
      var results = data.results;
      var message = 'Import completed!\n\n' +
        'Imported: ' + results.imported + '\n' +
        'Skipped: ' + results.skipped;
      
      if (results.errors && results.errors.length > 0) {
        message += '\n\nErrors:\n';
        results.errors.slice(0, 10).forEach(function(error) {
          message += 'Entry ' + (error.index + 1) + ': ' + error.reason + '\n';
        });
        if (results.errors.length > 10) {
          message += '... and ' + (results.errors.length - 10) + ' more errors';
        }
      }

      // Show success message
      var reloadTimeout;
      window.showDialog({
        title: 'Import Complete',
        description: message,
        confirmText: 'OK',
        onConfirm: function() {
          // Clear auto-reload timeout if user clicks OK
          if (reloadTimeout) {
            clearTimeout(reloadTimeout);
          }
          // Reload page to show imported links
          window.location.reload();
        }
      });
      
      // Auto-reload after 3 seconds if user doesn't click OK
      reloadTimeout = setTimeout(function() {
        window.location.reload();
      }, 3000);
    })
    .catch(function(error) {
      // Show error in a dialog
      window.showDialog({
        title: 'Import Failed',
        description: 'Import failed: ' + error.message,
        confirmText: 'OK',
        variant: 'destructive'
      });
    });
  }

  // Expose to global scope
  window.handleImportLinks = handleImportLinks;
})();

