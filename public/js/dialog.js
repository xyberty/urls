/**
 * Dialog System - shadcn-style dialog component
 */
(function() {
  'use strict';

  var dialogOverlay = document.getElementById('dialog-overlay');
  var dialogContent = document.getElementById('dialog-content');
  var dialogTitle = document.getElementById('dialog-title');
  var dialogDescription = document.getElementById('dialog-description');
  var dialogConfirm = document.getElementById('dialog-confirm');
  var dialogCancel = document.getElementById('dialog-cancel');
  var dialogCallback = null;

  function showDialog(options) {
    dialogTitle.textContent = options.title || 'Confirm';
    dialogDescription.textContent = options.description || '';
    dialogConfirm.textContent = options.confirmText || 'Confirm';
    dialogCancel.textContent = options.cancelText || 'Cancel';
    
    // Clear and set body content if provided
    var dialogBody = document.getElementById('dialog-body');
    if (options.body) {
      dialogBody.innerHTML = options.body;
      dialogBody.style.display = 'block';
    } else {
      dialogBody.innerHTML = '';
      dialogBody.style.display = 'none';
    }
    
    // Set button styles based on variant
    if (options.variant === 'destructive') {
      dialogConfirm.className = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground hover:bg-destructive/90 h-10 px-4 py-2';
    } else {
      dialogConfirm.className = 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2';
    }
    
    dialogCallback = options.onConfirm || null;
    var cancelCallback = options.onCancel || null;
    
    // Remove old event listeners by cloning buttons
    var newConfirmBtn = dialogConfirm.cloneNode(true);
    var newCancelBtn = dialogCancel.cloneNode(true);
    dialogConfirm.parentNode.replaceChild(newConfirmBtn, dialogConfirm);
    dialogCancel.parentNode.replaceChild(newCancelBtn, dialogCancel);
    dialogConfirm = newConfirmBtn;
    dialogCancel = newCancelBtn;
    
    dialogConfirm.addEventListener('click', function() {
      if (dialogCallback) {
        dialogCallback();
      }
      closeDialog();
    });
    
    dialogCancel.addEventListener('click', function() {
      if (cancelCallback) {
        cancelCallback();
      }
      closeDialog();
    });
    
    dialogOverlay.classList.remove('hidden');
    dialogOverlay.classList.add('flex');
    document.body.style.overflow = 'hidden';
    
    // Animate in
    setTimeout(function() {
      dialogOverlay.style.opacity = '0';
      dialogContent.style.transform = 'scale(0.95)';
      dialogContent.style.opacity = '0';
      setTimeout(function() {
        dialogOverlay.style.transition = 'opacity 0.2s';
        dialogContent.style.transition = 'transform 0.2s, opacity 0.2s';
        dialogOverlay.style.opacity = '1';
        dialogContent.style.transform = 'scale(1)';
        dialogContent.style.opacity = '1';
      }, 10);
    }, 10);
  }

  function closeDialog() {
    dialogOverlay.style.transition = 'opacity 0.2s';
    dialogContent.style.transition = 'transform 0.2s, opacity 0.2s';
    dialogOverlay.style.opacity = '0';
    dialogContent.style.transform = 'scale(0.95)';
    dialogContent.style.opacity = '0';
    
    setTimeout(function() {
      dialogOverlay.classList.add('hidden');
      dialogOverlay.classList.remove('flex');
      document.body.style.overflow = '';
      dialogCallback = null;
    }, 200);
  }

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !dialogOverlay.classList.contains('hidden')) {
      closeDialog();
    }
  });

  // Expose to global scope
  window.showDialog = showDialog;
  window.closeDialog = closeDialog;
})();

