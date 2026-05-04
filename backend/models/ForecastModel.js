// models/ForecastModel.js
const db = require('../config/db');

exports.getAll = (filters, callback) => {
  let sql = `
    SELECT
      f.id,
      f.batch_id,
      b.batch_name,
      b.breed,
      DATE_FORMAT(f.date, '%Y-%m') AS month,
      f.actual_mortality,
      f.predicted_mortality,
      f.harvest_mortality,
      f.actual_harvest,
      f.predicted_harvest
    FROM tbl_forecast f
    JOIN tbl_batch b ON f.batch_id = b.id
    WHERE 1=1
  `;

  const params = [];

  if (filters.startDate) {
    sql += ` AND f.date >= ?`;
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    sql += ` AND f.date <= ?`;
    params.push(filters.endDate);
  }

  if (filters.batchId) {
    sql += ` AND f.batch_id = ?`;
    params.push(filters.batchId);
  }

  if (filters.breed) {
    sql += ` AND b.breed = ?`;
    params.push(filters.breed);
  }

  sql += ` ORDER BY f.date ASC`;

  db.query(sql, params, callback);
};