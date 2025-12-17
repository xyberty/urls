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

  function showEditSpaceDialog(id, name, currentDomain) {
    var domains = JSON.parse(document.getElementById('allowedDomainsData').textContent || '[]');
    var domainOptions = domains.map(function(d) {
      var selected = d === currentDomain ? ' selected' : '';
      return '<option value="' + d + '"' + selected + '>' + d + '</option>';
    }).join('');

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

  // Close dropdown when clicking outside
  setTimeout(function() {
    document.addEventListener('click', closeSpaceDropdown);
  }, 0);

  // Expose to global scope
  window.toggleSpaceDropdown = toggleSpaceDropdown;
  window.showCreateSpaceDialog = showCreateSpaceDialog;
  window.showEditSpaceDialog = showEditSpaceDialog;
  window.confirmDeleteSpace = confirmDeleteSpace;
})();

