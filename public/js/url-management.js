/**
 * URL Management - Delete and bulk operations
 */
(function() {
  'use strict';

  function handleDeleteClick(button) {
    var form = button.closest('form');
    var short = form.dataset.short || form.querySelector('input[name="short"]').value;
    var fullUrl = form.closest('tr').querySelector('td:nth-child(2)').textContent.trim();
    
    window.showDialog({
      title: 'Delete URL',
      description: 'Are you sure you want to delete this URL? This action cannot be undone.\n\n' + fullUrl,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      onConfirm: function() {
        form.submit();
      }
    });
  }

  function handleEditClick(button) {
    var short = button.dataset.short;
    var full = button.dataset.full;
    var aliases = button.dataset.aliases;
    showEditUrlDialog(short, full, aliases);
  }

  function initBulkDelete() {
    var selectAll = document.getElementById('selectAll');
    var deleteSelectedBtn = document.getElementById('deleteSelected');
    var bulkContainer = document.getElementById('bulkDeleteContainer');

    function updateBulkVisibility() {
      var anyChecked = !!document.querySelector('.url-select:checked');
      if (bulkContainer) {
        bulkContainer.style.display = anyChecked ? 'block' : 'none';
      }
    }

    if (selectAll) {
      selectAll.addEventListener('change', function() {
        var checkboxes = document.querySelectorAll('.url-select');
        checkboxes.forEach(function(cb) {
          cb.checked = selectAll.checked;
        });
        updateBulkVisibility();
      });
    }

    // Use event delegation for checkboxes as they might be re-ordered
    document.addEventListener('change', function(e) {
      if (e.target && e.target.classList.contains('url-select')) {
        if (!e.target.checked && selectAll) {
          selectAll.checked = false;
        }
        updateBulkVisibility();
      }
    });

    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener('click', function() {
        var selected = Array.prototype.slice
          .call(document.querySelectorAll('.url-select:checked'))
          .map(function(cb) {
            return cb.value;
          });

        if (selected.length === 0) {
          window.showDialog({
            title: 'No URLs selected',
            description: 'Please select at least one URL to delete.',
            confirmText: 'OK',
            variant: 'default',
            onConfirm: function() {}
          });
          return;
        }

        window.showDialog({
          title: 'Delete URLs',
          description: selected.length + ' URL' + (selected.length > 1 ? 's' : '') + ' selected. Are you sure you want to delete ' + (selected.length > 1 ? 'them' : 'it') + '? This action cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          variant: 'destructive',
          onConfirm: function() {
            var form = document.createElement('form');
            form.method = 'POST';
            form.action = '/delete';
            
            if (window.currentActiveSpaceId) {
              var spaceInput = document.createElement('input');
              spaceInput.type = 'hidden';
              spaceInput.name = 'space';
              spaceInput.value = window.currentActiveSpaceId;
              form.appendChild(spaceInput);
            }
            
            selected.forEach(function(value) {
              var input = document.createElement('input');
              input.type = 'hidden';
              input.name = 'selected';
              input.value = value;
              form.appendChild(input);
            });
            
            document.body.appendChild(form);
            form.submit();
          }
        });
      });
    }
  }

  function copyToClipboard(btn, text) {
    var fullUrl = window.location.protocol + '//' + text;
    navigator.clipboard.writeText(fullUrl).then(function() {
      var isActionButton = btn.classList.contains('action-btn') || btn.classList.contains('border');
      var originalHTML = btn.innerHTML;
      var originalClasses = btn.className;
      
      btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (isActionButton ? '16' : '14') + '" height="' + (isActionButton ? '16' : '14') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="' + (isActionButton ? 'w-4 h-4' : '') + '"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      
      if (isActionButton) {
        // Feedback for action buttons (outlined/styled)
        btn.classList.remove('bg-background', 'hover:bg-accent', 'border-input');
        btn.classList.add('bg-primary', 'text-primary-foreground', 'border-primary', 'is-copied');
      } else {
        // Feedback for inline buttons (non-outlined)
        btn.classList.add('text-primary');
        btn.classList.remove('text-muted-foreground');
      }
      
      setTimeout(function() {
        btn.innerHTML = originalHTML;
        btn.className = originalClasses;
      }, 2000);
    }).catch(function(err) {
      console.error('Could not copy text: ', err);
    });
  }

  function initSorting() {
    var table = document.querySelector('table');
    if (!table) return;

    var headers = table.querySelectorAll('th.sortable');
    var tbody = table.querySelector('tbody');
    var currentSort = { column: null, direction: 'asc' };

    headers.forEach(function(header) {
      header.addEventListener('click', function() {
        var column = header.getAttribute('data-sort');
        var type = header.getAttribute('data-type') || 'string';
        var direction = 'asc';

        if (currentSort.column === column) {
          direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        }

        currentSort = { column: column, direction: direction };

        // Update UI
        headers.forEach(function(h) {
          h.classList.remove('active', 'asc', 'desc');
          var icon = h.querySelector('.sort-icon');
          if (icon) icon.classList.add('opacity-0');
        });
        header.classList.add('active', direction);
        header.querySelector('.sort-icon').classList.remove('opacity-0');

        var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
        
        rows.sort(function(a, b) {
          var valA = getCellValue(a, column);
          var valB = getCellValue(b, column);

          if (type === 'number' || type === 'date') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
          } else {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
          }

          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
          return 0;
        });

        // Re-append sorted rows
        rows.forEach(function(row) {
          tbody.appendChild(row);
        });
      });
    });

    function getCellValue(row, column) {
      var cell;
      switch (column) {
        case 'full':
          cell = row.querySelector('td:nth-child(2)');
          break;
        case 'short':
          cell = row.querySelector('td:nth-child(3)');
          break;
        case 'alias':
          cell = row.querySelector('td:nth-child(4)');
          break;
        case 'clicks':
          cell = row.querySelector('td:nth-child(5)');
          break;
        case 'createdAt':
          cell = row.querySelector('td:nth-child(6)');
          break;
      }

      if (!cell) return '';
      
      var value = cell.getAttribute('data-value');
      if (value !== null) return value;
      
      if (column === 'alias') {
        return cell.querySelector('a') ? cell.querySelector('a').textContent.trim() : '';
      }
      
      return cell.textContent.trim();
    }
  }

  function showEditUrlDialog(short, full, aliases) {
    var body = 
      '<form id="editUrlForm" action="/shortUrls/' + short + '/edit" method="POST" class="space-y-4">' +
        '<input type="hidden" name="owner" value="' + window.currentOwnerToken + '" />' +
        '<input type="hidden" name="space" value="' + window.currentActiveSpaceId + '" />' +
        '<div>' +
          '<label for="editFullUrl" class="text-sm font-medium block mb-2">Destination URL</label>' +
          '<input type="url" id="editFullUrl" name="fullUrl" value="' + full + '" required class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />' +
        '</div>' +
        '<div>' +
          '<label for="editAliases" class="text-sm font-medium block mb-2">Aliases (comma-separated)</label>' +
          '<input type="text" id="editAliases" name="aliases" value="' + aliases + '" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="alias1, alias2" />' +
          '<p class="text-xs text-muted-foreground mt-2">Multiple aliases can be separated by commas.</p>' +
        '</div>' +
      '</form>';

    window.showDialog({
      title: 'Edit Short URL',
      description: 'Update the destination URL or aliases for this short link.',
      body: body,
      confirmText: 'Save Changes',
      onConfirm: function() {
        document.getElementById('editUrlForm').submit();
      }
    });
  }

  // Expose to global scope
  window.handleDeleteClick = handleDeleteClick;
  window.handleEditClick = handleEditClick;
  window.copyToClipboard = copyToClipboard;
  window.showEditUrlDialog = showEditUrlDialog;
  
  // Initialize on DOM ready
  function init() {
    initBulkDelete();
    initSorting();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

