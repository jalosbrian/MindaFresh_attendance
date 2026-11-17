
import { QueryTypes } from 'sequelize';
import { db } from '../storage.js';

const q = (sql, replacements = {}, transaction) =>
  db.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
    transaction
  });

const exec = (sql, replacements = {}, transaction) =>
  db.query(sql, { replacements, transaction });

const TZ = 'Asia/Manila';

export const dateKey = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);

const clock = d =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(d);

const localStamp = d =>
  `${dateKey(d)} ${clock(d)}:${
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      second: '2-digit'
    }).format(d)
  }`;

const minutes = value => {
  const [h, m] = String(value).split(':').map(Number);
  return h * 60 + m;
};

const localMinutes = d => minutes(clock(d));

const toDate = value => {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) {
    return new Date(text.replace(' ', 'T') + '+08:00');
  }

  return new Date(text);
};

const shiftStart = () =>
  minutes(process.env.SHIFT_START || '08:00');

const shiftEnd = () =>
  minutes(process.env.SHIFT_END || '17:00');

const overtimeMinimum = () => {
  const value = Number(process.env.OT_MIN_MINUTES ?? 30);
  return Number.isFinite(value) && value >= 0 ? value : 30;
};

const overtimeMaximum = () => {
  const value = Number(process.env.OT_MAX_MINUTES ?? 240);
  return Number.isFinite(value) && value >= 0 ? value : 240;
};

export const workday = date => {
  const configured = process.env.WORK_DAYS || '1,2,3,4,5,6';

  const allowed = configured
    .split(',')
    .map(Number);

  const day = new Date(`${date}T12:00:00Z`);
  const weekday = day.getUTCDay() || 7;

  return allowed.includes(weekday);
};

// REGULAR HOURS + UNDERTIME + OVERTIME
export const metrics = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) {
    return {
      hours_worked: '0.00',
      undertime_minutes: 0,
      overtime_minutes: 0
    };
  }

  const begin = toDate(timeIn);
  const end = toDate(timeOut);

  if (
    !begin ||
    !end ||
    !Number.isFinite(begin.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end < begin
  ) {
    return {
      hours_worked: '0.00',
      undertime_minutes: 0,
      overtime_minutes: 0
    };
  }

  const totalMinutes = Math.max(
    0,
    Math.floor((end.getTime() - begin.getTime()) / 60000)
  );

  // Fixed 60-minute lunch deduction.
  const regularMinutes = Math.max(0, totalMinutes - 60);

  const hoursWorked = Math.min(8, regularMinutes / 60);

  const endMinutes = localMinutes(end);

  const undertime = Math.max(0, shiftEnd() - endMinutes);

  const overtimeRaw = Math.max(0, endMinutes - shiftEnd());

  const overtime =
    overtimeRaw >= overtimeMinimum()
      ? Math.min(overtimeRaw, overtimeMaximum())
      : 0;

  return {
    hours_worked: hoursWorked.toFixed(2),
    undertime_minutes: undertime,
    overtime_minutes: overtime
  };
};

// FOUR-PUNCH SEQUENCE
export const nextAction = log => {
  if (!log) return 'Time in';
  if (!log.lunch_out) return 'Lunch out';
  if (!log.lunch_in) return 'Lunch in';
  if (!log.time_out) return 'Time out';
  return 'Complete';
};

export async function lookup(code) {
  const rows = await q(
    `SELECT id, employee_code, first_name, last_name, status
     FROM employees
     WHERE employee_code = :code`,
    { code }
  );

  return rows[0];
}

export async function getLog(employee_id, date = dateKey()) {
  const rows = await q(
    `SELECT *
     FROM attendance_logs
     WHERE employee_id = :employee_id
       AND log_date = :date`,
    { employee_id, date }
  );

  return rows[0];
}

// EMPLOYEE ATTENDANCE PUNCH
export async function punch(code) {
  const employee = await lookup(code);

  if (!employee || employee.status !== 'active') {
    throw Error('Unknown or inactive employee code.');
  }

  const date = dateKey();

  if (!workday(date)) {
    throw Error('No time-in on rest days.');
  }

  const holiday = await q(
    `SELECT id
     FROM holidays
     WHERE holiday_date = :date`,
    { date }
  );

  if (holiday.length) {
    throw Error('Punches are not allowed on holidays.');
  }

  return db.transaction(async transaction => {
    const rows = await q(
      `SELECT *
       FROM attendance_logs
       WHERE employee_id = :id
         AND log_date = :date
       FOR UPDATE`,
      { id: employee.id, date },
      transaction
    );

    const log = rows[0];
    const action = nextAction(log);

    if (action === 'Complete') {
      throw Error('You already timed out today.');
    }

    const now = new Date();
    const stamp = localStamp(now);

    const last = log && [
      log.time_out,
      log.lunch_in,
      log.lunch_out,
      log.time_in
    ].find(Boolean);

    if (last) {
      const lastDate = toDate(last);

      if (
        lastDate &&
        Number.isFinite(lastDate.getTime()) &&
        now.getTime() - lastDate.getTime() < 60000
      ) {
        throw Error(
          'Please wait at least one minute before punching again.'
        );
      }
    }

    if (!log) {
      const late = Math.max(
        0,
        localMinutes(now) - shiftStart()
      );

      await exec(
        `INSERT INTO attendance_logs
          (employee_id, log_date, time_in, late_minutes, status)
         VALUES
          (:id, :date, :stamp, :late, :status)`,
        {
          id: employee.id,
          date,
          stamp,
          late,
          status: late ? 'late' : 'present'
        },
        transaction
      );

      await exec(
        `UPDATE attendance_logs
         SET log_code = CONCAT('ATT-', LPAD(id, 4, '0'))
         WHERE employee_id = :employee_id
           AND log_date = :date
           AND log_code IS NULL`,
        {
          employee_id: employee.id,
          date
        },
        transaction
      );
    } else if (action === 'Lunch out') {
      await exec(
        `UPDATE attendance_logs
         SET lunch_out = :stamp
         WHERE id = :id`,
        { stamp, id: log.id },
        transaction
      );
    } else if (action === 'Lunch in') {
      await exec(
        `UPDATE attendance_logs
         SET lunch_in = :stamp
         WHERE id = :id`,
        { stamp, id: log.id },
        transaction
      );
    } else if (action === 'Time out') {
      const m = metrics(log.time_in, now);

      await exec(
        `UPDATE attendance_logs
         SET time_out = :stamp,
             hours_worked = :hours_worked,
             undertime_minutes = :undertime_minutes,
             overtime_minutes = :overtime_minutes
         WHERE id = :id`,
        {
          stamp,
          id: log.id,
          ...m
        },
        transaction
      );
    }

    return {
      name: `${employee.first_name} ${employee.last_name}`,
      action,
      time: clock(now)
    };
  });
}

// TODAY BOARD
export async function today(date = dateKey()) {
  const employees = await q(
    `SELECT
       e.employee_code,
       CONCAT(e.first_name, ' ', e.last_name) AS name,
       d.name AS department,
       l.*
     FROM employees e
     LEFT JOIN departments d
       ON d.id = e.department_id
     LEFT JOIN attendance_logs l
       ON l.employee_id = e.id
       AND l.log_date = :date
     WHERE e.status = 'active'
     ORDER BY e.last_name`,
    { date }
  );

  return employees.map(e => ({
    ...e,
    display_status:
      e.status && e.log_date
        ? e.status
        : 'not_yet_in'
  }));
}

// ATTENDANCE LOGS
export async function logs(from, to) {
  validateRange(from, to);

  return q(
    `SELECT
       l.*,
       e.employee_code,
       CONCAT(e.first_name, ' ', e.last_name) AS name
     FROM attendance_logs l
     JOIN employees e ON e.id = l.employee_id
     WHERE l.log_date BETWEEN :from AND :to
     ORDER BY l.log_date DESC, e.last_name`,
    { from, to }
  );
}

// HR PAYROLL INTEGRATION
export async function getSummary(from, to) {
  validateRange(from, to);

  // Fill missing attendance rows before summarizing.
  await closeDays(from, to);

  return q(
    `SELECT
       e.id AS employee_id,
       e.employee_code,
       CONCAT(e.first_name, ' ', e.last_name) AS employee_name,

       COALESCE(SUM(
         CASE WHEN l.status IN ('present', 'late')
         THEN 1 ELSE 0 END
       ), 0) AS days_present,

       COALESCE(SUM(
         CASE WHEN l.status = 'late'
         THEN 1 ELSE 0 END
       ), 0) AS days_late,

       COALESCE(SUM(
         CASE WHEN l.status = 'absent'
         THEN 1 ELSE 0 END
       ), 0) AS days_absent,

       COALESCE(SUM(
         CASE WHEN l.status = 'on_leave'
         THEN 1 ELSE 0 END
       ), 0) AS days_on_leave,

       COALESCE(SUM(l.late_minutes), 0) AS late_minutes,

       COALESCE(SUM(l.undertime_minutes), 0)
         AS undertime_minutes,

       COALESCE(SUM(l.overtime_minutes), 0)
         AS overtime_minutes,

       COALESCE(ROUND(SUM(l.hours_worked), 2), 0)
         AS hours_worked,

       COALESCE(SUM(l.late_minutes), 0)
         AS total_late_minutes,

       COALESCE(SUM(l.undertime_minutes), 0)
         AS total_undertime_minutes,

       COALESCE(SUM(l.overtime_minutes), 0)
         AS total_overtime_minutes,

       COALESCE(ROUND(SUM(l.hours_worked), 2), 0)
         AS total_hours_worked

     FROM employees e
     LEFT JOIN attendance_logs l
       ON l.employee_id = e.id
       AND l.log_date BETWEEN :from AND :to

     WHERE e.status = 'active'

     GROUP BY e.id, e.employee_code,
              e.first_name, e.last_name

     ORDER BY e.last_name, e.first_name`,
    { from, to }
  );
}

// CLOSE MISSING ATTENDANCE DAYS
export async function closeDays(from, to) {
  validateRange(from, to);

  let created = 0;

  const todayKey = dateKey();

  for (
    let d = new Date(`${from}T12:00:00Z`);
    dateKey(d) <= to;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const date = dateKey(d);

    if (date >= todayKey || !workday(date)) {
      continue;
    }

    const holiday = await q(
      `SELECT id FROM holidays
       WHERE holiday_date = :date`,
      { date }
    );

    if (holiday.length) continue;

    const people = await q(
      `SELECT
         e.id,
         CASE
           WHEN EXISTS (
             SELECT 1
             FROM leave_requests r
             WHERE r.employee_id = e.id
               AND r.status = 'approved'
               AND :date BETWEEN r.start_date AND r.end_date
           )
           THEN 'on_leave'
           ELSE 'absent'
         END AS status
       FROM employees e
       WHERE e.status = 'active'`,
      { date }
    );

    for (const person of people) {
      await db.transaction(async transaction => {
        const existing = await q(
          `SELECT id
           FROM attendance_logs
           WHERE employee_id = :employee_id
             AND log_date = :date`,
          {
            employee_id: person.id,
            date
          },
          transaction
        );

        if (existing.length) return;

        const [result] = await exec(
          `INSERT IGNORE INTO attendance_logs
            (employee_id, log_date, status)
           VALUES
            (:employee_id, :date, :status)`,
          {
            employee_id: person.id,
            date,
            status: person.status
          },
          transaction
        );

        const inserted = await q(
          `SELECT id, log_code
           FROM attendance_logs
           WHERE employee_id = :employee_id
             AND log_date = :date`,
          {
            employee_id: person.id,
            date
          },
          transaction
        );

        if (inserted.length && !inserted[0].log_code) {
          await exec(
            `UPDATE attendance_logs
             SET log_code = CONCAT('ATT-', LPAD(id, 4, '0'))
             WHERE id = :id`,
            { id: inserted[0].id },
            transaction
          );
        }

        if (Number(result?.affectedRows || 0) === 1) {
          created++;
        }
      });
    }
  }

  return created;
}

// HR ATTENDANCE CORRECTIONS
export async function correct(id, body, actor) {
  if (!body.remarks?.trim()) {
    throw Error('Correction remarks are required.');
  }

  if (
    !['present', 'late', 'absent', 'on_leave']
      .includes(body.status)
  ) {
    throw Error('Invalid status.');
  }

  const log = (
    await q(
      `SELECT * FROM attendance_logs WHERE id = :id`,
      { id }
    )
  )[0];

  if (!log) {
    throw Error('Log not found.');
  }

  const values = {};

  for (const field of [
    'time_in',
    'lunch_out',
    'lunch_in',
    'time_out'
  ]) {
    const raw = String(body[field] || '').trim();

    values[field] = raw
      ? raw.replace('T', ' ') +
        (raw.length === 16 ? ':00' : '')
      : null;

    if (
      values[field] &&
      !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
        .test(values[field])
    ) {
      throw Error('Invalid time format.');
    }
  }

  if (values.lunch_in && !values.lunch_out) {
    throw Error('Lunch in requires lunch out.');
  }

  if (values.lunch_out && !values.time_in) {
    throw Error('Lunch out requires time in.');
  }

  if (values.time_out && !values.time_in) {
    throw Error('Time out requires time in.');
  }

  const times = [
    'time_in',
    'lunch_out',
    'lunch_in',
    'time_out'
  ].map(key => values[key]).filter(Boolean);

  if (times.some((v, i) => i > 0 && v < times[i - 1])) {
    throw Error('Punch times must be in chronological order.');
  }

  const logDate = String(log.log_date).slice(0, 10);

  const expectedDate = /^\d{4}-\d{2}-\d{2}$/.test(logDate)
    ? logDate
    : dateKey(new Date(log.log_date));

  if (times.some(v => v.slice(0, 10) !== expectedDate)) {
    throw Error('Punch date must match attendance date.');
  }

  if (
    ['absent', 'on_leave'].includes(body.status) &&
    times.length
  ) {
    throw Error('Absent/on-leave logs cannot have punches.');
  }

  const m = metrics(values.time_in, values.time_out);

  const late = values.time_in
    ? Math.max(
        0,
        minutes(values.time_in.slice(11, 16)) - shiftStart()
      )
    : 0;

  await exec(
    `UPDATE attendance_logs
     SET time_in = :time_in,
         lunch_out = :lunch_out,
         lunch_in = :lunch_in,
         time_out = :time_out,
         status = :status,
         remarks = :remarks,
         corrected_by_id = :actor,
         late_minutes = :late,
         hours_worked = :hours_worked,
         undertime_minutes = :undertime_minutes,
         overtime_minutes = :overtime_minutes
     WHERE id = :id`,
    {
      id,
      actor,
      status: body.status,
      remarks: body.remarks.trim(),
      late,
      ...m,
      ...values
    }
  );
}

// DATE VALIDATION
export function validateRange(from, to) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from || '') ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to || '') ||
    from > to
  ) {
    throw Error('Invalid date range.');
  }

  const days =
    (
      new Date(to + 'T12:00:00Z') -
      new Date(from + 'T12:00:00Z')
    ) / 86400000;

  if (days > 366) {
    throw Error('Date range must be 366 days or less.');
  }
}

// HOLIDAYS
export async function holidays() {
  return q(
    `SELECT * FROM holidays
     ORDER BY holiday_date DESC`
  );
}

export async function addHoliday(body) {
  if (!['regular', 'special'].includes(body.holiday_type)) {
    throw Error('Invalid holiday type.');
  }

  await exec(
    `INSERT INTO holidays
      (holiday_date, name, holiday_type)
     VALUES
      (:holiday_date, :name, :holiday_type)`,
    {
      holiday_date: body.holiday_date,
      name: body.name,
      holiday_type: body.holiday_type
    }
  );
}

export async function removeHoliday(id) {
  await exec(
    `DELETE FROM holidays WHERE id = :id`,
    { id }
  );
}

export async function editHoliday(id, body) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(body.holiday_date || '') ||
    !body.name?.trim() ||
    !['regular', 'special'].includes(body.holiday_type)
  ) {
    throw Error('Invalid holiday details.');
  }

  await exec(
    `UPDATE holidays
     SET holiday_date = :holiday_date,
         name = :name,
         holiday_type = :holiday_type
     WHERE id = :id`,
    {
      id,
      holiday_date: body.holiday_date,
      name: body.name.trim(),
      holiday_type: body.holiday_type
    }
  );
}

// DTR TIME FORMAT
export function dtrTime(value) {
  if (!value) return '';

  if (value instanceof Date) {
    return clock(value);
  }

  const text = String(value);

  if (text.includes('T')) {
    return clock(new Date(text));
  }

  return text.slice(11, 16);
}
