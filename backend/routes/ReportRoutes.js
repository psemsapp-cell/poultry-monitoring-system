const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/batch-report', (req, res) => {
  const userId = req.query.user_id ? Number(req.query.user_id) : null;
  const month = req.query.month || null;

  if (!userId) return res.status(400).json({ error: 'user_id is required' });

  let monthFilter = '';
  const params = [userId];

  if (month) {
    monthFilter = `AND (
      DATE_FORMAT(b.date_started, '%Y-%m') <= ?
      AND DATE_FORMAT(COALESCE(b.date_completed, CURDATE()), '%Y-%m') >= ?
    )`;
    params.push(month, month);
  }

  const query = `
    SELECT
      b.id AS batch_id,
      b.batch_name,
      b.breed,
      b.no_chicken AS total_chickens,
      b.date_started,
      b.date_completed,
      b.status,

      COALESCE((
        SELECT SUM(CAST(hv.no_harvest AS UNSIGNED))
        FROM tbl_harvest hv
        WHERE hv.user_id = b.user_id
          AND hv.batch_id = b.id
      ), 0) AS harvested_chickens,

      COALESCE((
        SELECT SUM(CAST(hv.no_boxes AS UNSIGNED))
        FROM tbl_harvest hv
        WHERE hv.user_id = b.user_id
          AND hv.batch_id = b.id
      ), 0) AS harvested_boxes,

      COALESCE((
        SELECT SUM(m.quantity)
        FROM tbl_mortality m
        WHERE m.user_id = b.user_id
          AND m.barn_id = b.barn_id
          AND m.date BETWEEN DATE(b.date_started) AND DATE(COALESCE(b.date_completed, CURDATE()))
      ), 0) AS mortality_count,

      ROUND(
        COALESCE((
          SELECT SUM(m.quantity)
          FROM tbl_mortality m
          WHERE m.user_id = b.user_id
            AND m.barn_id = b.barn_id
            AND m.date BETWEEN DATE(b.date_started) AND DATE(COALESCE(b.date_completed, CURDATE()))
        ), 0) / NULLIF(CAST(b.no_chicken AS UNSIGNED), 0) * 100, 2
      ) AS mortality_rate,

      (SELECT ROUND(AVG(t.temperature_celcius), 2) FROM tbl_temperature t
       WHERE t.user_id = b.user_id
         AND t.date BETWEEN DATE(b.date_started) AND DATE(COALESCE(b.date_completed, CURDATE()))
      ) AS avg_temperature,

      (SELECT ROUND(AVG(h.humidity_percentage), 2) FROM tbl_humidity h
       WHERE h.user_id = b.user_id
         AND h.date BETWEEN DATE(b.date_started) AND DATE(COALESCE(b.date_completed, CURDATE()))
      ) AS avg_humidity,

      (SELECT ROUND(AVG(a.ammonia_ppm), 2) FROM tbl_ammonia a
       WHERE a.user_id = b.user_id
         AND a.date BETWEEN DATE(b.date_started) AND DATE(COALESCE(b.date_completed, CURDATE()))
      ) AS avg_ammonia,

      (SELECT ROUND(AVG(c.carbon_ppm), 2) FROM tbl_carbon c
       WHERE c.user_id = b.user_id
         AND c.date BETWEEN DATE(b.date_started) AND DATE(COALESCE(b.date_completed, CURDATE()))
      ) AS avg_co2,

      NULL AS predicted_mortality,
      NULL AS predicted_harvest

    FROM tbl_batch b
    WHERE b.user_id = ?
    ${monthFilter}
    ORDER BY b.date_started DESC;
  `;

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Sensor History (for hourly charts in Reports page)
router.get('/sensor-history', (req, res) => {
  const { user_id, month } = req.query;

  if (!user_id || !month) {
    return res.status(400).json({ error: 'user_id and month are required' });
  }

  const query = `
    SELECT 'temperature' as type, date, time, temperature_celcius as value, status
    FROM tbl_temperature
    WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?

    UNION ALL

    SELECT 'humidity' as type, date, time, humidity_percentage as value, status
    FROM tbl_humidity
    WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?

    UNION ALL

    SELECT 'ammonia' as type, date, time, ammonia_ppm as value, status
    FROM tbl_ammonia
    WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?

    UNION ALL

    SELECT 'co2' as type, date, time, carbon_ppm as value, status
    FROM tbl_carbon
    WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ?

    ORDER BY date ASC, time ASC
  `;

  const params = [
    user_id, month,
    user_id, month,
    user_id, month,
    user_id, month,
  ];

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
