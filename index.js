
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { engine } from 'express-handlebars';
import { QueryTypes } from 'sequelize';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { db } from './storage.js';
import * as a from './services/attendanceService.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// HANDLEBARS
app.engine('xian', engine({
  extname: '.xian',
  defaultLayout: false,
  helpers: {
    json: x => JSON.stringify(x),

    date: x =>
      x ? String(x).slice(0, 10) : '',

    // Unicode escape prevents corrupted dash characters.
    datetime: x =>
      x
        ? new Date(x).toLocaleString('en-PH')
        : '\u2014',

    timeOnly: x =>
      x
        ? new Date(x).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : '\u2014',

    eq: (x, y) => x === y
  }
}));

app.set('view engine', 'xian');
app.set('views', path.join(__dirname, 'views'));

// MIDDLEWARE
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'CHANGE-ME',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax'
  }
}));

const wrap = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const secure = (req, res, next) =>
  req.session.staff &&
  ['hr_staff', 'admin'].includes(req.session.staff.role)
    ? next()
    : res.redirect('/login');

const render = (res, page, data = {}) =>
  res.render(page, {
    ...data,
    staff: res.req.session.staff
  });

// HOME: ONE UNIFIED PAGE
app.get('/', (req, res) => {
  res.redirect(
    req.session.staff ? '/dashboard' : '/login'
  );
});

// OLD KIOSK URL REDIRECTS TO LOGIN
app.get('/kiosk', (req, res) => {
  res.redirect('/login');
});

// ATTENDANCE RECORDING
// Supports both manual form submission and automatic QR scanning.
app.post('/kiosk/punch', wrap(async (req, res) => {
  const code = String(
    req.body?.code ||
    req.body?.employee_code ||
    ''
  ).trim();

  // Automatic QR scanner sends JSON.
  // Manual attendance form continues using redirects.
  const wantsJSON = Boolean(
    req.is('application/json')
  );

  try {
    const result = await a.punch(code);

    if (wantsJSON) {
      return res.status(200).json({
        success: true,
        name: result.name,
        action: result.action,
        time: result.time,
        message:
          `${result.name}: ${result.action} recorded at ${result.time}`
      });
    }

    req.session.message =
      `${result.name}: ${result.action} recorded at ${result.time}`;

    req.session.punchError = null;

    return res.redirect('/login');

  } catch (error) {
    if (wantsJSON) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    req.session.punchError = error.message;
    req.session.message = null;

    return res.redirect('/login');
  }
}));

// EMPLOYEE QR CARDS
app.get('/qr-cards', secure, wrap(async (req, res) => {
  const employees = await db.query(
    `SELECT employee_code, first_name, last_name
     FROM employees
     WHERE status = 'active'
     ORDER BY last_name, first_name`,
    {
      type: QueryTypes.SELECT
    }
  );

  render(res, 'qr-cards', {
    employees
  });
}));

// UNIFIED LOGIN PAGE
app.get('/login', (req, res) => {
  const error = req.session.error;
  const message = req.session.message;
  const punchError = req.session.punchError;

  req.session.error = null;
  req.session.message = null;
  req.session.punchError = null;

  render(res, 'login', {
    error,
    message,
    punchError
  });
});

// HR / ADMIN LOGIN
app.post('/login', wrap(async (req, res) => {
  const users = await db.query(
    `SELECT u.*, e.status AS employee_status
     FROM users u
     JOIN employees e ON e.id = u.employee_id
     WHERE u.username = :username
     LIMIT 1`,
    {
      replacements: {
        username: req.body.username
      },
      type: QueryTypes.SELECT
    }
  );

  const user = users[0];

  if (
    !user ||
    user.status !== 'active' ||
    user.employee_status !== 'active' ||
    !['admin', 'hr_staff'].includes(user.role) ||
    !(await bcrypt.compare(
      req.body.password || '',
      user.password
    ))
  ) {
    req.session.error =
      'Invalid credentials or access denied.';

    return res.redirect('/login');
  }

  req.session.regenerate(err => {
    if (err) {
      return res.status(500).send('Login failed.');
    }

    req.session.staff = {
      id: user.id,
      employee_id: user.employee_id,
      username: user.username,
      role: user.role
    };

    res.redirect('/dashboard');
  });
}));

// LOGOUT
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// PROTECTED ROUTES
app.use('/dashboard', secure);
app.use('/logs', secure);
app.use('/dtr', secure);
app.use('/summary', secure);
app.use('/holidays', secure);
app.use('/close-days', secure);

// DASHBOARD
app.get('/dashboard', wrap(async (req, res) => {
  const rows = await a.today();

  render(res, 'dashboard', {
    rows,
    counts: {
      present: rows.filter(
        x => x.display_status === 'present'
      ).length,

      late: rows.filter(
        x => x.display_status === 'late'
      ).length,

      absent: rows.filter(
        x => x.display_status === 'absent'
      ).length,

      on_leave: rows.filter(
        x => x.display_status === 'on_leave'
      ).length,

      not_yet_in: rows.filter(
        x => x.display_status === 'not_yet_in'
      ).length
    }
  });
}));

// ATTENDANCE LOGS
app.get('/logs', wrap(async (req, res) => {
  const from = req.query.from || a.dateKey();
  const to = req.query.to || from;

  a.validateRange(from, to);

  let rows = await a.logs(from, to);

  if (req.query.employee) {
    const search = String(
      req.query.employee
    ).toLowerCase();

    rows = rows.filter(r =>
      r.employee_code.toLowerCase().includes(search) ||
      r.name.toLowerCase().includes(search)
    );
  }

  if (req.query.status) {
    rows = rows.filter(
      r => r.status === req.query.status
    );
  }

  render(res, 'logs', {
    rows,
    from,
    to,
    employee: req.query.employee || '',
    status: req.query.status || ''
  });
}));

// CORRECT ATTENDANCE LOG
app.post('/logs/:id/correct', wrap(async (req, res) => {
  try {
    await a.correct(
      req.params.id,
      req.body,
      req.session.staff.employee_id
    );

    return res.redirect('/logs');

  } catch (error) {
    return res.status(400).send(error.message);
  }
}));

// HOLIDAYS
app.get('/holidays', wrap(async (req, res) => {
  render(res, 'holidays', {
    rows: await a.holidays()
  });
}));

app.post('/holidays', wrap(async (req, res) => {
  await a.addHoliday(req.body);
  res.redirect('/holidays');
}));

app.post('/holidays/:id', wrap(async (req, res) => {
  await a.editHoliday(
    req.params.id,
    req.body
  );

  res.redirect('/holidays');
}));

app.post('/holidays/:id/delete', wrap(async (req, res) => {
  await a.removeHoliday(req.params.id);
  res.redirect('/holidays');
}));

// PERIOD SUMMARY
app.get('/summary', wrap(async (req, res) => {
  const from = req.query.from ||
    a.dateKey().slice(0, 8) + '01';

  const to = req.query.to || a.dateKey();

  a.validateRange(from, to);

  render(res, 'summary', {
    rows: await a.getSummary(from, to),
    from,
    to,
    closed: req.query.closed,
    error: req.query.error
  });
}));

// CLOSE DAYS
app.post('/summary/close-days', wrap(async (req, res) => {
  const from = req.body.from;
  const to = req.body.to;

  try {
    a.validateRange(from, to);

    const count = await a.closeDays(from, to);

    return res.redirect(
      `/summary?from=${encodeURIComponent(from)}` +
      `&to=${encodeURIComponent(to)}` +
      `&closed=${count}`
    );

  } catch (error) {
    console.error('Close days failed:', error);

    return res.redirect(
      `/summary?from=${encodeURIComponent(from || '')}` +
      `&to=${encodeURIComponent(to || '')}` +
      `&error=${encodeURIComponent(error.message)}`
    );
  }
}));

// DAILY TIME RECORD
app.get('/dtr', wrap(async (req, res) => {
  const from = req.query.from ||
    a.dateKey().slice(0, 8) + '01';

  const to = req.query.to || a.dateKey();

  a.validateRange(from, to);

  const employee_id = String(
    req.query.employee_id || ''
  );

  const employees = await db.query(
    `SELECT id, employee_code, first_name, last_name
     FROM employees
     ORDER BY last_name, first_name`,
    {
      type: QueryTypes.SELECT
    }
  );

  const rows = (await a.logs(from, to)).filter(
    x =>
      !employee_id ||
      String(x.employee_id) === employee_id
  );

  render(res, 'dtr', {
    rows,
    from,
    to,
    employee_id,

    employees: employees.map(e => ({
      ...e,
      selected: String(e.id) === employee_id
    })),

    record_count: rows.length
  });
}));

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).send(
    'Error: ' +
    (
      process.env.NODE_ENV === 'production'
        ? 'Request failed'
        : err.message
    )
  );
});

// START SERVER
const port = Number(
  process.env.PORT || 3003
);

db.authenticate()
  .then(() => {
    app.listen(port, () => {
      console.log(
        `Attendance: http://localhost:${port}`
      );
    });
  })
  .catch(error => {
    console.error(
      'Database connection failed:',
      error.message
    );

    process.exit(1);
  });
