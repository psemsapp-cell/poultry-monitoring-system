import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Mortality } from '../types';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

interface MortalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mortality: Mortality) => void;
  mortality?: Mortality | null;
  mode: 'add' | 'edit';
}

const MortalityModal: React.FC<MortalityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mortality,
  mode,
}) => {
  const [formData, setFormData] = useState({
    barn_id: '',
    cause: '',
    notes: '',
    date: '',
    quantity: '',
  });

  const [barns, setBarns] = useState<{ id: number; barn_name: string }[]>([]);
  const [capacityInfo, setCapacityInfo] = useState<{
    total_chickens: number;
    already_logged: number;
    remaining: number;
  } | null>(null);
  const [quantityError, setQuantityError] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  const apiUrl = import.meta.env.VITE_API_URL;
  const currentUserId = localStorage.getItem('user_id');

  const handleSnackbarClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  // Prefill form on edit
  useEffect(() => {
    if (mortality && mode === 'edit') {
      setFormData({
        barn_id: mortality.barn_id.toString(),
        cause: mortality.cause,
        notes: mortality.notes,
        date: mortality.date,
        quantity: mortality.quantity.toString(),
      });
    } else {
      setFormData({ barn_id: '', cause: '', notes: '', date: '', quantity: '' });
    }
    setQuantityError('');
    setCapacityInfo(null);
  }, [mortality, mode, isOpen]);

  // Fetch barns when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const fetchBarns = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/barn`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid barn data');
        setBarns(data);
      } catch (err: any) {
        setError('Could not load barn list');
        setSnackbar({ open: true, message: 'Could not load barn list', severity: 'error' });
      }
    };
    fetchBarns();
  }, [isOpen, apiUrl]);

  // ✅ Fetch remaining capacity whenever barn changes
  useEffect(() => {
    if (!formData.barn_id || !currentUserId) {
      setCapacityInfo(null);
      return;
    }
    const fetchCapacity = async () => {
      try {
        const res = await fetch(
          `${apiUrl}/api/barn/${formData.barn_id}/remaining-capacity?user_id=${currentUserId}`
        );
        const data = await res.json();
        setCapacityInfo(data);

        // Re-validate current quantity against new capacity
        const qty = parseInt(formData.quantity, 10);
        // In edit mode, add back the current record's own quantity since it's being replaced
        const editOffset = mode === 'edit' ? (mortality?.quantity ?? 0) : 0;
        const effectiveRemaining = data.remaining + editOffset;
        if (!isNaN(qty) && qty > effectiveRemaining) {
          setQuantityError(`Cannot exceed remaining capacity of ${effectiveRemaining}`);
        } else {
          setQuantityError('');
        }
      } catch (err) {
        console.error('Failed to fetch capacity:', err);
        setCapacityInfo(null);
      }
    };
    fetchCapacity();
  }, [formData.barn_id, currentUserId, apiUrl]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // ✅ Live quantity validation
    if (name === 'quantity' && capacityInfo) {
      const qty = parseInt(value, 10);
      const editOffset = mode === 'edit' ? (mortality?.quantity ?? 0) : 0;
      const effectiveRemaining = capacityInfo.remaining + editOffset;
      if (!isNaN(qty) && qty > effectiveRemaining) {
        setQuantityError(`Cannot exceed remaining capacity of ${effectiveRemaining}`);
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

    const quantityNum = Number(formData.quantity);
    if (!formData.quantity || isNaN(quantityNum)) {
      setSnackbar({ open: true, message: 'Quantity is required', severity: 'error' });
      return;
    }

    // ✅ Final guard before submit
    if (capacityInfo) {
      const editOffset = mode === 'edit' ? (mortality?.quantity ?? 0) : 0;
      const effectiveRemaining = capacityInfo.remaining + editOffset;
      if (quantityNum > effectiveRemaining) {
        setSnackbar({
          open: true,
          message: `Quantity cannot exceed remaining capacity of ${effectiveRemaining}`,
          severity: 'error',
        });
        return;
      }
    }

    const body = {
      user_id: mode === 'add' ? Number(currentUserId) : mortality?.user_id ?? Number(currentUserId),
      barn_id: Number(formData.barn_id),
      cause: formData.cause,
      quantity: quantityNum,
      notes: formData.notes,
      date: formData.date,
    };

    try {
      const url =
        mode === 'add'
          ? `${apiUrl}/api/mortality/add_mortality`
          : `${apiUrl}/api/mortality/${mortality?.id}`;
      const method = mode === 'add' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Something went wrong');
      }

      const saved = await res.json();

      onSave({
        id: saved.id || mortality?.id!,
        user_id: mortality?.user_id || Number(currentUserId),
        barn_id: body.barn_id,
        cause: body.cause,
        notes: body.notes,
        date: body.date,
        quantity: body.quantity,
      });

      setSnackbar({
        open: true,
        message: mode === 'add' ? 'Mortality record added successfully!' : 'Mortality record updated successfully!',
        severity: 'success',
      });

      onClose();
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || 'Something went wrong', severity: 'error' });
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={mode === 'add' ? 'Add Mortality Record' : 'Edit Mortality Record'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-600">{error}</div>}

          {/* Barn */}
          <div>
            <label className="block text-sm font-medium mb-2">Barn</label>
            <select
              name="barn_id"
              value={formData.barn_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Select Barn</option>
              {barns.map((barn) => (
                <option key={barn.id} value={barn.id}>
                  {barn.barn_name}
                </option>
              ))}
            </select>

            {/* ✅ Capacity info shown after barn selected */}
            {capacityInfo && formData.barn_id && (
              <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded px-3 py-2 border border-gray-200">
                🐔 Total chickens (active batches): <strong>{capacityInfo.total_chickens}</strong>
                &nbsp;|&nbsp;
                Already logged: <strong>{capacityInfo.already_logged}</strong>
                &nbsp;|&nbsp;
                <span className={capacityInfo.remaining === 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  Remaining: {capacityInfo.remaining + (mode === 'edit' ? (mortality?.quantity ?? 0) : 0)}
                </span>
              </div>
            )}
          </div>

          {/* Cause */}
          <div>
            <label className="block text-sm font-medium mb-2">Cause</label>
            <select
              name="cause"
              value={formData.cause}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">Select Cause</option>
              {['Disease','Heat Stress','Cold Stress','Injury','Predator Attack',
                'Equipment Malfunction','Feed Issues','Water Issues','Unknown','Other'
              ].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Quantity
              {capacityInfo && formData.barn_id && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  (max: {capacityInfo.remaining + (mode === 'edit' ? (mortality?.quantity ?? 0) : 0)})
                </span>
              )}
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min={0}
              max={
                capacityInfo
                  ? capacityInfo.remaining + (mode === 'edit' ? (mortality?.quantity ?? 0) : 0)
                  : undefined
              }
              className={`w-full px-3 py-2 border rounded ${
                quantityError ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {quantityError && (
              <p className="mt-1 text-xs text-red-600">{quantityError}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border rounded resize-none"
              placeholder="Enter detailed notes..."
              required
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!quantityError}
              className={`px-4 py-2 text-white rounded transition-colors duration-200 ${
                quantityError ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {mode === 'add' ? 'Add Record' : 'Update Record'}
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

export default MortalityModal;
