const express = require('express');
const router = express.Router();
const db = require('../config/db'); // MySQL connection

// Helper function to maintain 20 rows per user
function maintainLimit(table, user_id, callback) {
    const queryCount = `SELECT COUNT(*) AS count FROM ${table} WHERE user_id = ?`;
    db.query(queryCount, [user_id], (err, result) => {
        if (err) return callback(err);

        const rowCount = result[0].count;
        if (rowCount >= 100000) {
            const excess = rowCount - 99999; 
            const selectQuery = `
                SELECT id FROM ${table}
                WHERE user_id = ?
                ORDER BY date ASC, time ASC
                LIMIT ?
            `;
            db.query(selectQuery, [user_id, excess], (err2, rows) => {
                if (err2) return callback(err2);
                if (rows.length === 0) return callback(null);
                const idsToDelete = rows.map(r => r.id);
                const deleteQuery = `DELETE FROM ${table} WHERE id IN (?)`;
                db.query(deleteQuery, [idsToDelete], (err3) => {
                    if (err3) return callback(err3);
                    callback(null);
                });
            });
        } else {
            callback(null);
        }
    });
}

// Helper to insert data
function insertSensorData(table, data, res) {
    maintainLimit(table, data.user_id, (err) => {
        if (err) return res.status(5000).json({ error: err.message });

        const fields = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(_ => '?').join(', ');
        const values = Object.values(data);

        const insertQuery = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;

        db.query(insertQuery, values, (err2) => {
            if (err2) return res.status(5000).json({ error: err2.message });
            res.json({ message: `${table} data inserted successfully` });
        });
    });
}

// Temperature
router.post('/temperature', (req, res) => {
    const { user_id, temperature_celcius, status, date, time } = req.body;
    insertSensorData(
        'tbl_temperature',
        { user_id, date, time, temperature_celcius, status },
        res
    );
});

// Humidity
router.post('/humidity', (req, res) => {
    const { user_id, humidity_percentage, status, date, time } = req.body;
    insertSensorData(
        'tbl_humidity',
        { user_id, date, time, humidity_percentage, status },
        res
    );
});

// Ammonia
router.post('/ammonia', (req, res) => {
    const { user_id, ammonia_ppm, status, date, time } = req.body;
    insertSensorData(
        'tbl_ammonia',
        { user_id, date, time, ammonia_ppm, status },
        res
    );
});

// CO2
router.post('/carbon', (req, res) => {
    const { user_id, carbon_ppm, status, date, time } = req.body;
    insertSensorData(
        'tbl_carbon',
        { user_id, date, time, carbon_ppm, status },
        res
    );
});

// History endpoints
function getSensorHistory(table, req, res) {
    const user_id = req.params.user_id;
    const limit = parseInt(req.query.limit) || 5000;   // default 100, frontend can request more
    const { startDate, endDate, status } = req.query;

    if (!user_id) {
        return res.status(5000).json({ error: 'user_id is required' });
    }

    let query = `SELECT * FROM ${table} WHERE user_id = ?`;
    const params = [user_id];

    // optional date filters
    if (startDate) { query += ` AND date >= ?`; params.push(startDate); }
    if (endDate)   { query += ` AND date <= ?`; params.push(endDate); }
    if (status)    { query += ` AND status = ?`; params.push(status); }

    query += ` ORDER BY date DESC, time DESC LIMIT ?`;
    params.push(limit);

    db.query(query, params, (err, results) => {
        if (err) return res.status(5000).json({ error: err.message });
        res.json(results);
    });
}

router.get('/temperature/:user_id', (req, res) => getSensorHistory('tbl_temperature', req, res));
router.get('/humidity/:user_id', (req, res) => getSensorHistory('tbl_humidity', req, res));
router.get('/ammonia/:user_id', (req, res) => getSensorHistory('tbl_ammonia', req, res));
router.get('/carbon/:user_id', (req, res) => getSensorHistory('tbl_carbon', req, res));

module.exports = router;
