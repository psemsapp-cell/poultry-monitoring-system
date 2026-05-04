const MonthlyForecast = require('../models/ForecastModel');

exports.getForecast = (req, res) => {
  const filters = {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    batchId: req.query.batchId,
    breed: req.query.breed,
  };

  MonthlyForecast.getAll(filters, (err, results) => {
    if (err) {
      console.error('Forecast query error:', err);
      return res.status(500).json({ error: err.message });
    }

   const formatted = results.map(row => ({
  month: row.month,
  batchId: row.batch_id,
  batch: row.batch_name,
  breed: row.breed,
  actualMortality: row.actual_mortality,
  predictedMortality: row.predicted_mortality,
  actualHarvest: row.actual_harvest,
  predictedHarvest: row.predicted_harvest,  // ✅ must be this exact column
}));

    res.json(formatted);
  });
};
