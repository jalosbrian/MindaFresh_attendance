
document.addEventListener('DOMContentLoaded', () => {
  // Find logout buttons and links throughout the system.
  const logoutControls = document.querySelectorAll(
    'a[href="/logout"], form[action="/logout"] button[type="submit"], button[onclick*="logout-dialog"], #logout-btn'
  );

  if (!logoutControls.length) return;

  // Remove any existing logout modal to avoid duplicates.
  document.querySelectorAll('#logout-dialog').forEach(el => el.remove());

  const style = document.createElement('style');

  style.textContent = `
    #global-logout-dialog {
      width: min(420px, 92vw);
      border: none;
      border-radius: 18px;
      padding: 30px;
      background: #fff;
      color: #43291e;
      box-shadow: 0 24px 70px rgba(0,0,0,.25);
      box-sizing: border-box;
    }

    #global-logout-dialog:not([open]) {
      display: none;
    }

    #global-logout-dialog::backdrop {
      background: rgba(20,14,10,.6);
    }

    #global-logout-dialog h2 {
      margin: 0 0 12px;
      text-align: center;
      font-size: 22px;
    }

    #global-logout-dialog p {
      color: #806b60;
      text-align: center;
      line-height: 1.6;
    }

    #global-logout-dialog .logout-actions {
      display: flex;
      gap: 12px;
      margin-top: 25px;
    }

    #global-logout-dialog .logout-actions button {
      flex: 1;
      padding: 12px;
      border-radius: 9px;
      cursor: pointer;
      font-weight: 600;
    }

    #global-logout-dialog .cancel {
      background: white;
      border: 1px solid #e5d4ca;
      color: #43291e;
    }

    #global-logout-dialog .confirm {
      background: #d6420b;
      color: white;
      border: 1px solid #d6420b;
    }
  `;

  document.head.appendChild(style);

  const dialog = document.createElement('dialog');
  dialog.id = 'global-logout-dialog';

  dialog.innerHTML = `
    <h2>Are you sure you want to log out?</h2>
    <p>
      You will need to log in again to access
      your MindaFresh Attendance account.
    </p>
    <div class="logout-actions">
      <button type="button" class="cancel">Cancel</button>
      <button type="button" class="confirm">Yes, Log Out</button>
    </div>
  `;

  document.body.appendChild(dialog);

  let pendingControl = null;

  logoutControls.forEach(control => {
    // Remove inline onclick to prevent the old modal opening.
    control.removeAttribute('onclick');

    control.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      pendingControl = control;
      dialog.showModal();
    });
  });

  dialog.querySelector('.cancel').addEventListener('click', () => {
    dialog.close();
  });

  dialog.querySelector('.confirm').addEventListener('click', () => {
    if (!pendingControl) return;

    const form = pendingControl.closest('form');

    if (form && form.action.endsWith('/logout')) {
      HTMLFormElement.prototype.submit.call(form);
    } else {
      window.location.assign('/logout');
    }
  });
});
