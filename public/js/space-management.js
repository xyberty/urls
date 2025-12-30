/**
 * Space Management - Create, edit, and switch spaces
 */
(function() {
  'use strict';

  function toggleSpaceDropdown() {
    var dropdown = document.getElementById('spaceDropdown');
    if (dropdown) {
      dropdown.classList.toggle('hidden');
    }
  }

  function closeSpaceDropdown(event) {
    var dropdown = document.getElementById('spaceDropdown');
    var spaceBtn = document.getElementById('spaceBtn');
    
    if (dropdown && spaceBtn && !dropdown.contains(event.target) && !spaceBtn.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  }

  function showCreateSpaceDialog() {
    var domains = JSON.parse(document.getElementById('allowedDomainsData').textContent || '[]');
    var domainOptions = domains.map(function(d) {
      return '<option value="' + d + '">' + d + '</option>';
    }).join('');

    var body = 
      '<form id="createSpaceForm" action="/spaces" method="POST" class="space-y-4">' +
        '<div>' +
          '<label for="spaceName" class="text-sm font-medium block mb-2">Space Name</label>' +
          '<input type="text" id="spaceName" name="name" required class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. Personal, Work" />' +
        '</div>' +
        '<div>' +
          '<label for="spaceDomain" class="text-sm font-medium block mb-2">Domain</label>' +
          '<select id="spaceDomain" name="domain" required class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">' +
            domainOptions +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label for="spaceSuffix" class="text-sm font-medium block mb-2">Path Suffix <span class="text-muted-foreground">(optional)</span></label>' +
          '<input type="text" id="spaceSuffix" name="suffix" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. to, api, docs" />' +
          '<p class="text-xs text-muted-foreground mt-1">URLs will be accessible at domain.com/suffix/shortcode</p>' +
        '</div>' +
      '</form>';

    window.showDialog({
      title: 'Create New Space',
      description: 'Spaces allow you to group URLs and assign them to specific domains.',
      body: body,
      confirmText: 'Create Space',
      onConfirm: function() {
        document.getElementById('createSpaceForm').submit();
      }
    });
  }

  function showEditSpaceDialog(id, name, currentDomain, currentSuffix) {
    var domains = JSON.parse(document.getElementById('allowedDomainsData').textContent || '[]');
    var domainOptions = domains.map(function(d) {
      var selected = d === currentDomain ? ' selected' : '';
      return '<option value="' + d + '"' + selected + '>' + d + '</option>';
    }).join('');
    
    // Remove leading slash from suffix for display
    var displaySuffix = (currentSuffix || '').replace(/^\//, '');

    var body = 
      '<form id="editSpaceForm" action="/spaces/' + id + '/edit" method="POST" class="space-y-4">' +
        '<div>' +
          '<label for="editSpaceName" class="text-sm font-medium block mb-2">Space Name</label>' +
          '<input type="text" id="editSpaceName" name="name" value="' + name + '" required class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />' +
        '</div>' +
        '<div>' +
          '<label for="editSpaceDomain" class="text-sm font-medium block mb-2">Domain</label>' +
          '<select id="editSpaceDomain" name="domain" required class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">' +
            domainOptions +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label for="editSpaceSuffix" class="text-sm font-medium block mb-2">Path Suffix <span class="text-muted-foreground">(optional)</span></label>' +
          '<input type="text" id="editSpaceSuffix" name="suffix" value="' + (displaySuffix || '') + '" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="e.g. to, api, docs" />' +
          '<p class="text-xs text-muted-foreground mt-1">URLs will be accessible at domain.com/suffix/shortcode</p>' +
        '</div>' +
      '</form>';

    window.showDialog({
      title: 'Edit Space',
      description: 'Update the name or domain for this space.',
      body: body,
      confirmText: 'Save Changes',
      onConfirm: function() {
        document.getElementById('editSpaceForm').submit();
      }
    });
  }

  function confirmDeleteSpace(id, name) {
    window.showDialog({
      title: 'Delete Space',
      description: 'Are you sure you want to delete the space "' + name + '"? This will also delete ALL shortened URLs associated with this space. This action cannot be undone.',
      variant: 'destructive',
      confirmText: 'Delete Space',
      onConfirm: function() {
        var form = document.createElement('form');
        form.method = 'POST';
        form.action = '/spaces/' + id + '/delete';
        document.body.appendChild(form);
        form.submit();
      }
    });
  }

  function showImportLinksDialog(spaceId, spaceName, spaceDomain) {
    var body = 
      '<div class="space-y-4">' +
        '<div class="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">' +
          '<p class="font-medium mb-1">Importing into: <span class="text-foreground">' + spaceName + '</span></p>' +
          '<p>Domain: <span class="text-foreground">' + spaceDomain + '</span></p>' +
          '<p class="mt-2">Only entries with matching domainName will be imported.</p>' +
        '</div>' +
        '<div>' +
          '<label for="importFile" class="text-sm font-medium block mb-2">Upload JSON File</label>' +
          '<input type="file" id="importFile" accept=".json,application/json" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />' +
        '</div>' +
        '<div class="relative">' +
          '<div class="absolute inset-0 flex items-center">' +
            '<span class="w-full border-t"></span>' +
          '</div>' +
          '<div class="relative flex justify-center text-xs uppercase">' +
            '<span class="bg-card px-2 text-muted-foreground">Or</span>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label for="importPaste" class="text-sm font-medium block mb-2">Paste JSON from Clipboard</label>' +
          '<textarea id="importPaste" rows="8" placeholder="Paste your JSON array here..." class="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"></textarea>' +
        '</div>' +
        '<div id="importPreview" class="hidden rounded-md border border-input bg-muted/50 p-3">' +
          '<p class="text-xs font-medium mb-1">Preview:</p>' +
          '<p id="importPreviewText" class="text-xs text-muted-foreground"></p>' +
        '</div>' +
        '<div id="importError" class="hidden rounded-md bg-destructive/10 border border-destructive/20 p-3">' +
          '<p class="text-xs text-destructive font-medium mb-1">Error</p>' +
          '<p id="importErrorText" class="text-xs text-destructive/80"></p>' +
        '</div>' +
      '</div>';

    // Show dialog first
    window.showDialog({
      title: 'Import Links',
      description: 'Import links from a JSON file or paste JSON data. Each entry must have a domainName matching the space domain.',
      body: body,
      confirmText: 'Import',
      onConfirm: function() {
        // Handle import - dialog will close automatically, but we'll show results in a new dialog
        if (window.handleImportLinks) {
          window.handleImportLinks(spaceId, spaceDomain);
        }
      }
    });

    // Set up file input handler
    var fileInput = document.getElementById('importFile');
    var pasteInput = document.getElementById('importPaste');
    
    if (fileInput) {
      fileInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (file) {
          var reader = new FileReader();
          reader.onload = function(e) {
            pasteInput.value = e.target.result;
            validateImportData(e.target.result);
          };
          reader.onerror = function() {
            showImportError('Failed to read file');
          };
          reader.readAsText(file);
        }
      });
    }

    if (pasteInput) {
      pasteInput.addEventListener('input', function() {
        validateImportData(pasteInput.value);
      });
    }
  }

  function validateImportData(jsonText) {
    var previewDiv = document.getElementById('importPreview');
    var errorDiv = document.getElementById('importError');
    var previewText = document.getElementById('importPreviewText');
    var errorText = document.getElementById('importErrorText');

    if (!jsonText || !jsonText.trim()) {
      previewDiv.classList.add('hidden');
      errorDiv.classList.add('hidden');
      return;
    }

    try {
      var data = JSON.parse(jsonText);
      if (!Array.isArray(data)) {
        throw new Error('Data must be an array');
      }

      var validCount = 0;
      var invalidCount = 0;
      for (var i = 0; i < data.length; i++) {
        var entry = data[i];
        if (entry.url && entry.domainName) {
          validCount++;
        } else {
          invalidCount++;
        }
      }

      previewText.textContent = 'Found ' + data.length + ' entries (' + validCount + ' valid, ' + invalidCount + ' invalid)';
      previewDiv.classList.remove('hidden');
      errorDiv.classList.add('hidden');
    } catch (e) {
      errorText.textContent = e.message;
      previewDiv.classList.add('hidden');
      errorDiv.classList.remove('hidden');
    }
  }

  function showImportError(message) {
    var errorDiv = document.getElementById('importError');
    var errorText = document.getElementById('importErrorText');
    if (errorDiv && errorText) {
      errorText.textContent = message;
      errorDiv.classList.remove('hidden');
    }
  }

  // Close dropdown when clicking outside
  setTimeout(function() {
    document.addEventListener('click', closeSpaceDropdown);
  }, 0);

  // Expose to global scope
  window.toggleSpaceDropdown = toggleSpaceDropdown;
  window.showCreateSpaceDialog = showCreateSpaceDialog;
  window.showEditSpaceDialog = showEditSpaceDialog;
  window.confirmDeleteSpace = confirmDeleteSpace;
  window.showImportLinksDialog = showImportLinksDialog;
})();

