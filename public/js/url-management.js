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

    var rowCheckboxes = document.querySelectorAll('.url-select');
    if (rowCheckboxes.length) {
      rowCheckboxes.forEach(function(cb) {
        cb.addEventListener('change', function() {
          if (!cb.checked && selectAll) {
            selectAll.checked = false;
          }
          updateBulkVisibility();
        });
      });
    }

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

  // Expose to global scope
  window.handleDeleteClick = handleDeleteClick;
  
  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBulkDelete);
  } else {
    initBulkDelete();
  }
})();

