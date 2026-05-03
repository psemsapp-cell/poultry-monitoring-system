import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { DailyLog } from '../types';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: DailyLog) => void;
  log?: DailyLog | null;
  mode: 'add' | 'edit';
}

interface Batch {
  id: string;
  batch_name: string;
  no_chicken: number; // ✅ added
}

interface Mortality {
  id: number;
  cause: string;
  date: string;
}

const DailyLogModal: React.FC<DailyLogModalProps> = ({ isOpen, onClose, onSave, log, mode }) => {
  const [formData, setFormData] = useState({
    batch_id: '',
    date: '',
    mortality_id: '',
    quantity: ''
  });

  const [batches, setBatches] = useState<Batch[]>([]);
  const [mortalities, setMortalities] = useState<Mortality[]>([]);
  const [quantityError, setQuantityError] = useState<string>(''); // ✅ added
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  const apiUrl = import.meta.env.VITE_API_URL;
  const currentUserId = localStorage.getItem('user_id');

  useEffect(() => {
    if (isOpen) {
      fetch(`${apiUrl}/api/batch`)
        .then(res => res.json())
        .then(data => setBatches(data))
        .catch(err => console.error('Failed to fetch batches:', err));

      fetch(`${apiUrl}/api/mortality/user_mortality/${currentUserId}`)
        .then(res => res.json())
        .then(data => setMortalities(data))
        .catch(err => console.error('Failed to fetch mortalities:', err));
    }
  }, [isOpen, apiUrl, currentUserId]);

  useEffect(() => {
    if (log && mode === 'edit') {
      setFormData({
        batch_id: log.batch_id,
        date: log.date,
        mortality_id: log.mortality_id.toString(),
        quantity: log.quantity?.toString() ?? ''
      });
    } else {
      setFormData({ batch_id: '', date: '', mortality_id: '', quantity: '' });
    }
    setQuantityError(''); // ✅ clear error on open
  }, [log, mode, isOpen]);

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // ✅ Get max chickens for selected batch
  const getMaxChickens = (): number | null => {
    if (!formData.batch_id) return null;
    const selected = batches.find(b => String(b.id) === String(formData.batch_id));
    return selected ? Number(selected.no_chicken) : null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    // ✅ Live validation on quantity or batch change
    if (name === 'quantity' || name === 'batch_id') {
      const batchId = name === 'batch_id' ? value : formData.batch_id;
      const qty = name === 'quantity' ? parseInt(value, 10) : parseInt(formData.quantity, 10);
      const selected = batches.find(b => String(b.id) === String(batchId));
      const max = selected ? Number(selected.no_chicken) : null;

      if (max !== null && !isNaN(qty) && qty > max) {
        setQuantityError(`Cannot exceed ${max} chickens in batch "${selected?.batch_name}"`);
      } else {
        setQuantityError('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
      setSnackbar({ open: true, message: 'User not logged in', severity: 'error' });
      return;
    }

    // ✅ Block submit if quantity exceeds batch limit
    const max = getMaxChickens();
    const qty = parseInt(formData.quantity, 10);
    if (max !== null && qty > max) {
      setSnackbar({
        open: true,
        message: `Quantity cannot exceed ${max} chickens for this batch.`,
        severity: 'error'
      });
      return;
    }

    const body = {
      user_id: Number(currentUserId),
      batch_id: formData.batch_id,
      mortality_id: Number(formData.mortality_id),
      quantity: qty,
      date: formData.date
    };

    try {
      const url =
        mode === 'add'
          ? `${apiUrl}/api/daily_logs/add_daily`
          : `${apiUrl}/api/daily_logs/${log?.id}`;
      const method = mode === 'add' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Something went wrong');
      }

      const saved = await res.json();
      onSave({
        id: saved.id || log?.id!,
        user_id: body.user_id,
        batch_id: body.batch_id,
        mortality_id: body.mortality_id,
        quantity: body.quantity,
        date: body.date
      });

      setSnackbar({
        open: true,
        message: mode === 'add' ? 'Daily log added successfully!' : 'Daily log updated successfully!',
        severity: 'success'
      });

      setTimeout(() => window.location.reload(), 1000);
      onClose();
    } catch (err: any) {
      console.error(err);
      setSnackbar({ open: true, message: err.message || 'Something went wrong', severity: 'error' });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const maxChickens = getMaxChickens();

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={mode === 'add' ? 'Add Daily Log' : 'Edit Daily Log'} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Batch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
            <select
              name="batch_id"
              value={formData.batch_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Batch</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_name} ({batch.no_chicken} chickens)
                </option>
              ))}
            </select>
          </div>

          {/* Mortality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mortality</label>
            <select
              name="mortality_id"
              value={formData.mortality_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Mortality</option>
              {mortalities.map(m => (
                <option key={m.id} value={m.id}>
                  {m.cause}
                </option>
              ))}
            </select>
          </div>

          {/* Mortality Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mortality Quantity
              {/* ✅ Show max allowed */}
              {maxChickens !== null && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  (max: {maxChickens})
                </span>
              )}
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="Number of chicks that died today"
              min="1"
              max={maxChickens ?? undefined} // ✅ HTML max attr
              step="1"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                quantityError ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {/* ✅ Inline error message */}
            {quantityError && (
              <p className="mt-1 text-xs text-red-600">{quantityError}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!quantityError} // ✅ disable submit if invalid
              className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 ${
                quantityError
                  ? 'bg-blue-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {mode === 'add' ? 'Add Log' : 'Update Log'}
            </button>
          </div>

        </form>
      </Modal>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default DailyLogModal;
