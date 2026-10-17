/* Keep unsaved dialog edits from being discarded by an accidental close. */
(() => {
 'use strict';
 const dialog = document.querySelector('#modal');
 if (!dialog || typeof dialog.showModal !== 'function') return;
 let currentForm = null;
 let initialValues = '';

 function values(form) {
  if (!form) return '';
  return JSON.stringify(Array.from(form.querySelectorAll('input, select, textarea'))
   .filter(field => !field.disabled && !field.readOnly && !['button', 'submit', 'reset', 'hidden'].includes(field.type))
   .map(field => {
    if (field.type === 'file') {
     return Array.from(field.files || [], file => [file.name, file.size, file.type, file.lastModified]);
    }
    if (field.type === 'checkbox' || field.type === 'radio') return field.checked;
    if (field.tagName === 'SELECT' && field.multiple) {
     return Array.from(field.options, option => [option.value, option.selected]);
    }
    return field.value;
   }));
 }

 function capture() {
  currentForm = dialog.querySelector('form');
  initialValues = values(currentForm);
 }
 function dirty() {
  if (!dialog.open) return false;
  const form = dialog.querySelector('form');
  if (form !== currentForm) capture();
  return Boolean(currentForm) && values(currentForm) !== initialValues;
 }
 function keepEditing() {
  return dirty() && !window.confirm('Discard your changes? Unsaved changes may be lost. If a save is already in progress, closing does not cancel it.');
 }

 const showModal = dialog.showModal;
 dialog.showModal = function (...args) {
  const result = showModal.apply(this, args);
  capture();
  return result;
 };
 // Successful saves and session cleanup call close() directly and remain unblocked.
 // Contextual launchers can set defaults immediately after opening a form.
 dialog.addEventListener('pf-form-prefill', capture);
 dialog.addEventListener('close', () => { currentForm = null; initialValues = ''; });
 document.addEventListener('click', event => {
  const button = event.target.closest?.('[data-action="close"]');
  if (button && dialog.contains(button) && keepEditing()) {
   event.preventDefault();
   event.stopImmediatePropagation();
  }
 }, true);
 dialog.addEventListener('cancel', event => {
  if (keepEditing()) event.preventDefault();
 });
 window.addEventListener('beforeunload', event => {
  if (!dirty()) return;
  event.preventDefault();
  event.returnValue = '';
 });
 // A new form can replace the open dialog after an invitation or another action.
 if (window.MutationObserver) {
  new window.MutationObserver(() => {
   if (dialog.querySelector('form') !== currentForm) capture();
  }).observe(dialog, { childList: true, subtree: true });
 }
 if (dialog.open) capture();
})();
