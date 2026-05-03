const express = require('express');
const router = express.Router();
const controller = require('../controllers/BarnController');
const db = require('../config/db'); // ← ADD THIS LINE

// 🟢 Add a new barn
router.post('/add_barn', controller.addBarn);

// 🟢 Get all barns
router.get('/', controller.getBarns);

// 🟢 Get barns by user_id
router.get('/user_barn/:user_id', controller.getBarnsByUserId);

// 🟢 Get a single barn by its ID
router.get('/:id', controller.getBarnById);

// 🟢 Update barn by ID
router.put('/:id', controller.updateBarn);

// 🟢 Delete barn by ID
router.delete('/:id', controller.deleteBarn);

router.get('/availability/by-batch/:batchId', controller.getAvailabilityByBatchId);
router.get('/:barn_id/remaining-capacity', (req, res) => {
  const { barn_id } = req.params;
  const { user_id } = req.query;

  const sql = `
    SELECT
      COALESCE((SELECT SUM(b.no_chicken) FROM tbl_batch b
        WHERE b.barn_id = ? AND b.user_id = ? AND b.status = 'Active'), 0) AS total_chickens,
      COALESCE((SELECT SUM(d.quantity) FROM tbl_daily d
        INNER JOIN tbl_batch b ON d.batch_id = b.id
        WHERE b.barn_id = ? AND b.user_id = ? AND b.status = 'Active'), 0) AS already_logged
  `;

  db.query(sql, [barn_id, user_id, barn_id, user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    const { total_chickens, already_logged } = results[0];
    res.json({ total_chickens, already_logged, remaining: Math.max(0, total_chickens - already_logged) });
  });
});
module.exports = router;
