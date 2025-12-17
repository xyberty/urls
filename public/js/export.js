/**
 * Export Dialog System
 */
(function() {
  'use strict';

  var exportData = null;
  var exportOwner = null;

  function showExportDialog() {
    var overlay = document.getElementById('export-dialog-overlay');
    var content = document.getElementById('export-dialog-content');
    var loading = document.getElementById('export-loading');
    var exportContent = document.getElementById('export-content');
    var exportError = document.getElementById('export-error');
    
    // Reset state
    loading.classList.remove('hidden');
    exportContent.classList.add('hidden');
    exportError.classList.add('hidden');
    exportData = null;
    
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
    // Animate in
    setTimeout(function() {
      overlay.style.opacity = '0';
      content.style.transform = 'scale(0.95)';
      content.style.opacity = '0';
      setTimeout(function() {
        overlay.style.transition = 'opacity 0.2s';
        content.style.transition = 'transform 0.2s, opacity 0.2s';
        overlay.style.opacity = '1';
        content.style.transform = 'scale(1)';
        content.style.opacity = '1';
      }, 10);
    }, 10);
  }

  function closeExportDialog() {
    var overlay = document.getElementById('export-dialog-overlay');
    var content = document.getElementById('export-dialog-content');
    
    overlay.style.transition = 'opacity 0.2s';
    content.style.transition = 'transform 0.2s, opacity 0.2s';
    overlay.style.opacity = '0';
    content.style.transform = 'scale(0.95)';
    content.style.opacity = '0';
    
    setTimeout(function() {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
      document.body.style.overflow = '';
      exportData = null;
    }, 200);
  }

  function displayExportData(data) {
    var loading = document.getElementById('export-loading');
    var exportContent = document.getElementById('export-content');
    var exportJson = document.getElementById('export-json');
    var exportStats = document.getElementById('export-stats');
    
    var jsonString = JSON.stringify(data, null, 2);
    exportJson.value = jsonString;
    
    var urlCount = Array.isArray(data) ? data.length : 0;
    var totalClicks = Array.isArray(data) ? data.reduce(function(sum, url) {
      return sum + (url.clicks || 0);
    }, 0) : 0;
    
    exportStats.textContent = urlCount + ' URL' + (urlCount !== 1 ? 's' : '') + ' • ' + totalClicks + ' total click' + (totalClicks !== 1 ? 's' : '');
    
    loading.classList.add('hidden');
    exportContent.classList.remove('hidden');
  }

  function showExportError(message) {
    var loading = document.getElementById('export-loading');
    var exportContent = document.getElementById('export-content');
    var exportError = document.getElementById('export-error');
    var errorMessage = document.getElementById('export-error-message');
    
    errorMessage.textContent = message;
    loading.classList.add('hidden');
    exportContent.classList.add('hidden');
    exportError.classList.remove('hidden');
  }

  function copyExportToClipboard() {
    if (!exportData) return;
    
    var jsonString = JSON.stringify(exportData, null, 2);
    var copyBtn = document.getElementById('export-copy-btn');
    var originalHTML = copyBtn.innerHTML;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonString).then(function() {
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!';
        copyBtn.classList.remove('border-input', 'bg-background', 'hover:bg-accent');
        copyBtn.classList.add('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90', 'border-primary');
        
        setTimeout(function() {
          copyBtn.innerHTML = originalHTML;
          copyBtn.classList.remove('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90', 'border-primary');
          copyBtn.classList.add('border-input', 'bg-background', 'hover:bg-accent');
        }, 2000);
      }).catch(function(err) {
        console.error('Failed to copy:', err);
        fallbackCopy(jsonString);
      });
    } else {
      fallbackCopy(jsonString);
    }
  }

  function downloadExport() {
    if (!exportData || !exportOwner) return;
    
    var jsonString = JSON.stringify(exportData, null, 2);
    var blob = new Blob([jsonString], { type: 'application/json' });
    var url = window.URL.createObjectURL(blob);
    
    var a = document.createElement('a');
    a.href = url;
    a.download = 'urls-' + exportOwner + '.json';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Show feedback
    var downloadBtn = document.getElementById('export-download-btn');
    var originalHTML = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Downloaded!';
    
    setTimeout(function() {
      downloadBtn.innerHTML = originalHTML;
    }, 2000);
  }

  function fallbackCopy(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      var copyBtn = document.getElementById('export-copy-btn');
      var originalHTML = copyBtn.innerHTML;
      copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!';
      copyBtn.classList.remove('border-input', 'bg-background', 'hover:bg-accent');
      copyBtn.classList.add('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90', 'border-primary');
      setTimeout(function() {
        copyBtn.innerHTML = originalHTML;
        copyBtn.classList.remove('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90', 'border-primary');
        copyBtn.classList.add('border-input', 'bg-background', 'hover:bg-accent');
      }, 2000);
    } catch (err) {
      alert('Failed to copy. Please select and copy manually.');
    }
    document.body.removeChild(textArea);
  }

  function exportUrls() {
    var owner = window.currentOwnerToken;
    if (!owner) return;
    
    exportOwner = owner;
    showExportDialog();
    
    // Fetch the export data
    fetch('/export?owner=' + encodeURIComponent(exportOwner))
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Export failed: ' + response.statusText);
        }
        return response.json();
      })
      .then(function(data) {
        exportData = data;
        displayExportData(data);
      })
      .catch(function(error) {
        console.error('Export error:', error);
        showExportError(error.message);
      });
  }

  // Close export dialog on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var exportOverlay = document.getElementById('export-dialog-overlay');
      if (exportOverlay && !exportOverlay.classList.contains('hidden')) {
        closeExportDialog();
      }
    }
  });

  // Expose to global scope
  window.exportUrls = exportUrls;
  window.copyExportToClipboard = copyExportToClipboard;
  window.downloadExport = downloadExport;
  window.closeExportDialog = closeExportDialog;
})();

