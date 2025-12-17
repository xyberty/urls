/**
 * Owner Token Management
 */
(function() {
  'use strict';

  function handleOwnerTokenKeydown(event, element) {
    if (event.key === 'Enter') {
      event.preventDefault();
      element.blur();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      element.value = window.currentOwnerToken;
      element.blur();
    }
  }

  function handleOwnerTokenChange(element) {
    var newToken = element.value.trim();
    
    // Remove any non-printable characters
    newToken = newToken.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    
    var oldToken = window.currentOwnerToken;
    
    // Validate token format: URL-safe characters, 1-128 chars
    if (!newToken || newToken.length < 1 || newToken.length > 128) {
      alert('Invalid owner token format. Token must be 1-128 characters long. Current length: ' + newToken.length);
      element.value = oldToken;
      return;
    }
    
    // Allow URL-safe characters: alphanumeric, dash, underscore, dot, tilde, at sign
    if (!/^[a-zA-Z0-9._~@-]+$/.test(newToken)) {
      var invalidChars = newToken.split('').filter(function(c) {
        return !/^[a-zA-Z0-9._~@-]$/.test(c);
      });
      alert('Invalid owner token format. Use only URL-safe characters (letters, numbers, dash, underscore, dot, tilde, at). Invalid characters found: ' + JSON.stringify(invalidChars));
      element.value = oldToken;
      return;
    }

    if (newToken === oldToken) {
      return; // No change
    }

    // Show loading state
    element.style.opacity = '0.5';
    element.disabled = true;

    // Call API to change owner
    fetch('/change-owner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newOwner: newToken })
    })
    .then(function(response) {
      if (!response.ok) {
        return response.json().then(function(err) {
          throw new Error(err.error || 'Failed to change owner token');
        });
      }
      return response.json();
    })
    .then(function(data) {
      if (data.success) {
        // Update URL with new owner token
        var url = new URL(window.location.href);
        url.searchParams.set('owner', newToken);
        window.location.href = url.toString();
      } else {
        throw new Error(data.error || 'Failed to change owner token');
      }
    })
    .catch(function(error) {
      console.error('Error changing owner:', error);
      alert('Failed to change owner token: ' + (error.message || error));
      element.value = oldToken;
      element.style.opacity = '1';
      element.disabled = false;
    });
  }

  function copyDashboardLink() {
    var fullUrl = window.location.href;
    
    function updateButton(btn, success) {
      var originalHTML = btn.innerHTML;
      if (success) {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><polyline points="20 6 9 17 4 12"></polyline></svg>Copied!';
        btn.classList.remove('border-input', 'bg-background', 'hover:bg-accent');
        btn.classList.add('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90', 'border-primary');
        setTimeout(function() {
          btn.innerHTML = originalHTML;
          btn.classList.remove('bg-primary', 'text-primary-foreground', 'hover:bg-primary/90', 'border-primary');
          btn.classList.add('border-input', 'bg-background', 'hover:bg-accent');
        }, 2000);
      }
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
        var btn = document.getElementById('copyLinkBtn');
        updateButton(btn, true);
      } catch (err) {
        alert('Failed to copy. Please copy the URL manually: ' + text);
      }
      document.body.removeChild(textArea);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(function() {
        var btn = document.getElementById('copyLinkBtn');
        updateButton(btn, true);
      }).catch(function(err) {
        console.error('Failed to copy:', err);
        fallbackCopy(fullUrl);
      });
    } else {
      fallbackCopy(fullUrl);
    }
  }

  function toggleOwnerDropdown() {
    var dropdown = document.getElementById('ownerDropdown');
    if (dropdown) {
      dropdown.classList.toggle('hidden');
    }
  }

  function closeOwnerDropdown(event) {
    var dropdown = document.getElementById('ownerDropdown');
    var avatarBtn = document.getElementById('avatarBtn');
    
    if (dropdown && avatarBtn && !dropdown.contains(event.target) && !avatarBtn.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  }

  // Close dropdown when clicking outside
  // Use setTimeout to ensure DOM is ready
  setTimeout(function() {
    document.addEventListener('click', closeOwnerDropdown);
  }, 0);

  // Expose to global scope
  window.handleOwnerTokenKeydown = handleOwnerTokenKeydown;
  window.handleOwnerTokenChange = handleOwnerTokenChange;
  window.copyDashboardLink = copyDashboardLink;
  window.toggleOwnerDropdown = toggleOwnerDropdown;
})();

