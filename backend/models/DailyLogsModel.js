const db = require('../config/db');

// 🔹 Get all daily logs (latest first)
exports.getAll = (callback) => {
  const sql = `
    SELECT id, user_id, batch_id, mortality_id, date, quantity
    FROM tbl_daily
    ORDER BY id DESC
  `;
  db.query(sql, callback);
};

// 🔹 Get daily logs with batch name and mortality cause for a specific user
exports.getByUserId = (userId, callback) => {
  const sql = `
    SELECT 
      d.id,
      d.user_id,
      d.batch_id,
      b.batch_name,
      d.mortality_id,
      m.cause AS mortality_cause,
      d.date,
      d.quantity
    FROM tbl_daily d
    LEFT JOIN tbl_batch    b ON d.batch_id    = b.id
    LEFT JOIN tbl_mortality m ON d.mortality_id = m.id
    WHERE d.user_id = ?
    ORDER BY d.date DESC
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Database error in getByUserId:', err);
      return callback(err);
    }
    callback(null, results);
  });
};

// 🔹 Get a single daily log by ID
exports.getById = (id, callback) => {
  const sql = 'SELECT * FROM tbl_daily WHERE id = ?';
  db.query(sql, [id], callback);
};

// ➕ Add a new daily mortality log
exports.create = (data, callback) => {
  const sql = `
    INSERT INTO tbl_daily (user_id, batch_id, mortality_id, date, quantity)
    VALUES (?, ?, ?, ?, ?)
  `;
  const values = [
    data.user_id,
    data.batch_id,
    data.mortality_id,
    data.date,
    data.quantity,
  ];
  db.query(sql, values, callback);
};

// ✏️ Update daily mortality log by ID
exports.update = (id, data, callback) => {
  const sql = `
    UPDATE tbl_daily
    SET batch_id = ?, mortality_id = ?, date = ?, quantity = ?
    WHERE id = ?
  `;
  const values = [
    data.batch_id,
    data.mortality_id,
    data.date,
    data.quantity,
    id,
  ];
  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Database query error:', err);
      return callback(err, null);
    }
    if (result.affectedRows === 0) {
      return callback(null, { message: 'Daily log not found' });
    }
    callback(null, result);
  });
};

// ❌ Delete daily log by ID
exports.delete = (id, callback) => {
  const sql = 'DELETE FROM tbl_daily WHERE id = ?';
  db.query(sql, [id], callback);
};
