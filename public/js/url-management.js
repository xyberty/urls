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
    var lastCheckedIndex = -1;
    var isShiftClick = false;

    function updateBulkVisibility() {
      var anyChecked = !!document.querySelector('.url-select:checked');
      if (bulkContainer) {
        bulkContainer.style.display = anyChecked ? 'block' : 'none';
      }
    }

    function updateSelectAllState() {
      if (!selectAll) return;
      var checkboxes = Array.prototype.slice.call(document.querySelectorAll('.url-select'));
      var allChecked = checkboxes.every(function(cb) { return cb.checked; });
      var anyChecked = checkboxes.some(function(cb) { return cb.checked; });
      selectAll.checked = allChecked;
      selectAll.indeterminate = anyChecked && !allChecked;
    }

    if (selectAll) {
      selectAll.addEventListener('change', function() {
        var checkboxes = document.querySelectorAll('.url-select');
        checkboxes.forEach(function(cb) {
          cb.checked = selectAll.checked;
        });
        updateBulkVisibility();
        // Reset last checked index when selecting all/none
        lastCheckedIndex = selectAll.checked ? checkboxes.length - 1 : -1;
      });
    }

    // Use event delegation for checkboxes as they might be re-ordered
    document.addEventListener('click', function(e) {
      if (e.target && e.target.classList.contains('url-select')) {
        var checkboxes = Array.prototype.slice.call(document.querySelectorAll('.url-select'));
        var currentIndex = checkboxes.indexOf(e.target);
        var currentCheckbox = checkboxes[currentIndex];
        
        // Handle Shift+click for range selection
        if (e.shiftKey && lastCheckedIndex !== -1 && currentIndex !== -1 && lastCheckedIndex !== currentIndex) {
          // Prevent default to handle the toggle ourselves
          e.preventDefault();
          e.stopPropagation();
          isShiftClick = true;
          
          // Get the state we want to apply (opposite of current, since we'll toggle)
          var targetState = !currentCheckbox.checked;
          
          // Select all checkboxes in the range to match the target state
          var start = Math.min(lastCheckedIndex, currentIndex);
          var end = Math.max(lastCheckedIndex, currentIndex);
          for (var i = start; i <= end; i++) {
            checkboxes[i].checked = targetState;
          }
          
          // Update lastCheckedIndex to the current checkbox
          lastCheckedIndex = currentIndex;
          
          // Update select all checkbox state
          updateSelectAllState();
          updateBulkVisibility();
          
          // Reset flag after a short delay
          setTimeout(function() {
            isShiftClick = false;
          }, 0);
        } else if (!e.shiftKey) {
          // Normal click - update lastCheckedIndex immediately (before checkbox toggles)
          lastCheckedIndex = currentIndex;
        }
      }
    });

    // Handle change event to update UI state
    document.addEventListener('change', function(e) {
      if (e.target && e.target.classList.contains('url-select')) {
        // Skip if this was a Shift+click (already handled in click handler)
        if (isShiftClick) {
          return;
        }
        
        // Update select all checkbox state
        updateSelectAllState();
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
          '<label for="editShort" class="text-sm font-medium block mb-2">Short Link</label>' +
          '<div class="flex space-x-2">' +
            '<input type="text" id="editShort" name="newShort" value="' + short + '" required readonly class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />' +
            '<button type="button" id="regenerateSlug" class="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-3">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>' +
              'Regenerate' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label for="editAliases" class="text-sm font-medium block mb-2">Aliases (comma-separated)</label>' +
          '<input type="text" id="editAliases" name="aliases" value="' + aliases + '" class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="alias1, alias2" />' +
          '<p class="text-xs text-muted-foreground mt-2">Multiple aliases can be separated by commas.</p>' +
        '</div>' +
      '</form>';

    window.showDialog({
      title: 'Edit Short URL',
      description: 'Update the destination URL, short link, or aliases for this link.',
      body: body,
      confirmText: 'Save Changes',
      onConfirm: function() {
        document.getElementById('editUrlForm').submit();
      }
    });

    // Add event listener for regeneration after dialog is shown
    setTimeout(function() {
      var regenBtn = document.getElementById('regenerateSlug');
      var shortInput = document.getElementById('editShort');
      if (regenBtn && shortInput) {
        regenBtn.addEventListener('click', function() {
          regenBtn.disabled = true;
          regenBtn.innerHTML = '<span class="animate-spin mr-2">...</span>Regenerating';
          
          fetch('/api/generate-slug')
            .then(function(response) { return response.json(); })
            .then(function(data) {
              if (data.slug) {
                shortInput.value = data.slug;
              }
            })
            .catch(function(err) {
              console.error('Error regenerating slug:', err);
            })
            .finally(function() {
              regenBtn.disabled = false;
              regenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 16h5v5"></path></svg>Regenerate';
            });
        });
      }
    }, 50);
  }

  function handleRowClick(e, row) {
    // Only handle on mobile (small screens)
    if (window.innerWidth >= 768) {
      return;
    }

    // Don't trigger if clicking on a link or button
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) {
      return;
    }

    var popover = document.getElementById('mobileActionsPopover');
    var urlText = document.getElementById('mobileActionsUrl');
    var shortLink = document.getElementById('mobileActionsShortLink');
    var copyShortBtn = document.getElementById('mobileActionsCopyShort');
    var editBtn = document.getElementById('mobileActionsEdit');
    var deleteBtn = document.getElementById('mobileActionsDelete');

    if (!popover || !row) return;

    var short = row.dataset.short;
    var full = row.dataset.full;
    var aliasesJson = row.dataset.aliases;
    var displayUrl = row.dataset.displayUrl;
    var fullShortUrl = row.dataset.fullShortUrl;
    var clicks = row.dataset.clicks || '0';
    var firstClick = row.dataset.firstClick;
    var lastClick = row.dataset.lastClick;
    var createdAt = row.dataset.createdAt;
    var updatedAt = row.dataset.updatedAt;
    var spaceSuffix = row.dataset.spaceSuffix || '';
    var domain = row.dataset.domain || '';

    // Parse aliases
    var aliases = [];
    try {
      aliases = aliasesJson ? JSON.parse(aliasesJson) : [];
    } catch (e) {
      // Fallback for old format (comma-separated)
      aliases = aliasesJson ? aliasesJson.split(',').filter(function(a) { return a.trim(); }) : [];
    }

    // Update popover content
    if (urlText) urlText.textContent = full;
    if (shortLink) {
      shortLink.textContent = displayUrl;
      shortLink.href = '//' + fullShortUrl;
    }

    // Update clicks
    var clicksEl = document.getElementById('mobileActionsClicks');
    if (clicksEl) clicksEl.textContent = clicks;

    // Update first click
    var firstClickEl = document.getElementById('mobileActionsFirstClick');
    if (firstClickEl) {
      if (firstClick) {
        firstClickEl.classList.remove('hidden');
        firstClickEl.querySelector('span:last-child').textContent = new Date(firstClick).toLocaleString();
      } else {
        firstClickEl.classList.add('hidden');
      }
    }

    // Update last click
    var lastClickEl = document.getElementById('mobileActionsLastClick');
    if (lastClickEl) {
      if (lastClick) {
        lastClickEl.classList.remove('hidden');
        lastClickEl.querySelector('span:last-child').textContent = new Date(lastClick).toLocaleString();
      } else {
        lastClickEl.classList.add('hidden');
      }
    }

    // Update created at
    var createdAtEl = document.getElementById('mobileActionsCreatedAt');
    if (createdAtEl && createdAt) {
      createdAtEl.textContent = new Date(createdAt).toLocaleString();
    }

    // Update updated at
    var updatedAtEl = document.getElementById('mobileActionsUpdatedAt');
    if (updatedAtEl) {
      if (updatedAt) {
        updatedAtEl.classList.remove('hidden');
        updatedAtEl.querySelector('span:last-child').textContent = new Date(updatedAt).toLocaleString();
      } else {
        updatedAtEl.classList.add('hidden');
      }
    }

    // Update aliases
    var aliasesContainer = document.getElementById('mobileActionsAliases');
    var aliasesList = document.getElementById('mobileActionsAliasesList');
    if (aliasesContainer && aliasesList) {
      aliasesList.innerHTML = '';
      if (aliases && aliases.length > 0) {
        aliasesContainer.classList.remove('hidden');
        aliases.forEach(function(alias) {
          var fullAliasUrl = domain + spaceSuffix + '/' + alias;
          var displayAliasUrl = domain + (spaceSuffix ? spaceSuffix + '/' : '/') + alias;
          var aliasDiv = document.createElement('div');
          aliasDiv.className = 'flex items-center space-x-2';
          var aliasLink = document.createElement('a');
          aliasLink.href = '//' + fullAliasUrl;
          aliasLink.target = '_blank';
          aliasLink.className = 'text-primary hover:underline font-mono text-xs flex-1 truncate';
          aliasLink.textContent = displayAliasUrl;
          var aliasCopyBtn = document.createElement('button');
          aliasCopyBtn.type = 'button';
          aliasCopyBtn.className = 'inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 flex-shrink-0';
          aliasCopyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"></path></svg>';
          aliasCopyBtn.onclick = function(e) {
            e.stopPropagation();
            var fullUrl = window.location.protocol + '//' + fullAliasUrl;
            navigator.clipboard.writeText(fullUrl).then(function() {
              var originalHTML = aliasCopyBtn.innerHTML;
              aliasCopyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
              aliasCopyBtn.classList.add('bg-primary', 'text-primary-foreground');
              setTimeout(function() {
                aliasCopyBtn.innerHTML = originalHTML;
                aliasCopyBtn.classList.remove('bg-primary', 'text-primary-foreground');
              }, 2000);
            }).catch(function(err) {
              console.error('Could not copy text: ', err);
            });
          };
          aliasDiv.appendChild(aliasLink);
          aliasDiv.appendChild(aliasCopyBtn);
          aliasesList.appendChild(aliasDiv);
        });
      } else {
        aliasesContainer.classList.add('hidden');
      }
    }

    // Set up copy button
    if (copyShortBtn) {
      copyShortBtn.onclick = function(e) {
        e.stopPropagation();
        var fullUrl = window.location.protocol + '//' + fullShortUrl;
        navigator.clipboard.writeText(fullUrl).then(function() {
          var originalHTML = copyShortBtn.innerHTML;
          copyShortBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
          copyShortBtn.classList.add('bg-primary', 'text-primary-foreground');
          setTimeout(function() {
            copyShortBtn.innerHTML = originalHTML;
            copyShortBtn.classList.remove('bg-primary', 'text-primary-foreground');
          }, 2000);
        }).catch(function(err) {
          console.error('Could not copy text: ', err);
        });
      };
    }

    // Set up edit button
    if (editBtn) {
      editBtn.onclick = function(e) {
        e.stopPropagation();
        closeMobileActionsPopover();
        var aliasesStr = Array.isArray(aliases) ? aliases.join(',') : aliases;
        showEditUrlDialog(short, full, aliasesStr);
      };
    }

    // Set up delete button
    if (deleteBtn) {
      deleteBtn.onclick = function(e) {
        e.stopPropagation();
        closeMobileActionsPopover();
        // Create a temporary button element to trigger the delete handler
        var tempButton = document.createElement('button');
        tempButton.className = 'delete-btn';
        tempButton.setAttribute('data-short', short);
        var tempForm = document.createElement('form');
        tempForm.action = '/delete';
        tempForm.method = 'POST';
        var spaceInput = document.createElement('input');
        spaceInput.type = 'hidden';
        spaceInput.name = 'space';
        spaceInput.value = window.currentActiveSpaceId || '';
        var shortInput = document.createElement('input');
        shortInput.type = 'hidden';
        shortInput.name = 'short';
        shortInput.value = short;
        tempForm.appendChild(spaceInput);
        tempForm.appendChild(shortInput);
        tempForm.appendChild(tempButton);
        document.body.appendChild(tempForm);
        handleDeleteClick(tempButton);
        document.body.removeChild(tempForm);
      };
    }

    // Show popover
    popover.classList.remove('hidden');
    popover.classList.add('flex');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileActionsPopover() {
    var popover = document.getElementById('mobileActionsPopover');
    if (popover) {
      popover.classList.add('hidden');
      popover.classList.remove('flex');
      document.body.style.overflow = '';
    }
  }

  // Close popover on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeMobileActionsPopover();
    }
  });

  // Expose to global scope
  window.handleDeleteClick = handleDeleteClick;
  window.handleEditClick = handleEditClick;
  window.copyToClipboard = copyToClipboard;
  window.showEditUrlDialog = showEditUrlDialog;
  window.handleRowClick = handleRowClick;
  window.closeMobileActionsPopover = closeMobileActionsPopover;
  
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

