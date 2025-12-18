/**
 * Owner Token Management
 */
(function() {
  'use strict';

  function toggleTokenVisibility() {
    var input = document.getElementById('ownerTokenDisplay');
    var eyeIcon = document.getElementById('eyeIcon');
    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.innerHTML = '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line>';
    } else {
      input.type = 'password';
      eyeIcon.innerHTML = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>';
    }
  }

  function copyDashboardLink() {
    var url = new URL(window.location.href);
    url.searchParams.set('owner', window.currentOwnerToken);
    var fullUrl = url.toString();
    
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
  window.toggleTokenVisibility = toggleTokenVisibility;
  window.copyDashboardLink = copyDashboardLink;
  window.toggleOwnerDropdown = toggleOwnerDropdown;
})();

