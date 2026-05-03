import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Calendar, Filter, X } from 'lucide-react';
import { SensorReading } from '../types/index';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";
import axios from 'axios';

const firebaseConfig = {
  databaseURL: "https://psemsapp-6ea85-default-rtdb.asia-southeast1.firebasedatabase.app",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

interface SensorPageProps {
  title: string;
  unit: string;
  sensorType: string;
}

type Status =
  | 'Normal - 18°C to 30°C'
  | 'Harmful - May cause stress or illness'
  | 'Harmful - Risk of heat stress or death'
  | 'Normal - 50% to 70%'
  | 'Warning - May cause dehydration, respiratory stress, poor air quality'
  | 'Warning - Increased risk of disease'
  | 'Safe - Normal ventilation'
  | 'Ventilation should be improved; Acceptable short-term - Mild stress'
  | 'Hazardous - Respiratory distress; immediate ventilation improvement is required'
  | 'Ideal (Safe) - Best condition. No harm to poultry or workers. Promotes healthy growth & respiration'
  | 'Acceptable (Not Ideal) - Prolonged exposure may cause mild stress or irritation. Improve litter/ventilation'
  | 'Harmful - Unsafe. Risk of respiratory disease, eye irritation, poor growth. Immediate action needed';

// ─── Chart filter mode ─────────────────────────────────────────────────────
// 'relative' = last hour / day / week / month / all
// 'specific' = a single specific date (shows 24h view)
type ChartFilterMode = 'relative' | 'specific';

const SensorPage: React.FC<SensorPageProps> = ({ title, unit, sensorType }) => {
  // Chart filter
  const [chartFilterMode, setChartFilterMode] = useState<ChartFilterMode>('relative');
  const [dateRange, setDateRange] = useState<'hour' | 'day' | 'week' | 'month' | 'all'>('all');
  const [specificDate, setSpecificDate] = useState<string>(''); // YYYY-MM-DD

  // Logs filter
  const [statusFilter, setStatusFilter] = useState('all');
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');

  const [sensorData, setSensorData] = useState<SensorReading[]>([]);

  const apiUrls = import.meta.env.VITE_API_URL;
  const currentUserId = localStorage.getItem('user_id');

  // ─── Firebase + API fetch ────────────────────────────────────────────────

  useEffect(() => {
    const envRef = ref(db, "environment");

    const classifyStatus = (type: string, value: number): Status => {
      switch (type) {
        case "temperature":
          if (value < 18) return "Harmful - May cause stress or illness";
          if (value > 30) return "Harmful - Risk of heat stress or death";
          return "Normal - 18°C to 30°C";
        case "humidity":
          if (value < 50) return "Warning - May cause dehydration, respiratory stress, poor air quality";
          if (value > 70) return "Warning - Increased risk of disease";
          return "Normal - 50% to 70%";
        case "co2":
          if (value >= 3000) return "Hazardous - Respiratory distress; immediate ventilation improvement is required";
          if (value >= 2500) return "Ventilation should be improved; Acceptable short-term - Mild stress";
          return "Safe - Normal ventilation";
        case "ammonia":
          if (value > 25) return "Harmful - Unsafe. Risk of respiratory disease, eye irritation, poor growth. Immediate action needed";
          if (value > 10) return "Acceptable (Not Ideal) - Prolonged exposure may cause mild stress or irritation. Improve litter/ventilation";
          return "Ideal (Safe) - Best condition. No harm to poultry or workers. Promotes healthy growth & respiration";
        default:
          return "Normal - 18°C to 30°C";
      }
    };

    const fetchHistory = async () => {
      if (!currentUserId || !apiUrls) return;

      let historyUrl = "";
      if (sensorType === "temperature") historyUrl = `${apiUrls}/api/sensor/temperature/${currentUserId}`;
      if (sensorType === "humidity")    historyUrl = `${apiUrls}/api/sensor/humidity/${currentUserId}`;
      if (sensorType === "ammonia")     historyUrl = `${apiUrls}/api/sensor/ammonia/${currentUserId}`;
      if (sensorType === "co2")         historyUrl = `${apiUrls}/api/sensor/carbon/${currentUserId}`;
      if (!historyUrl) return;

      try {
        const response = await axios.get(historyUrl);
        if (Array.isArray(response.data)) {
          const mapped = response.data.map((row: any) => {
            const value =
              sensorType === "temperature" ? Number(row.temperature_celcius)
              : sensorType === "humidity"  ? Number(row.humidity_percentage)
              : sensorType === "ammonia"   ? Number(row.ammonia_ppm)
              :                              Number(row.carbon_ppm);

            const rawDate: string = row.date ?? '';
            const cleanDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

            return {
              id: row.id?.toString() ?? "",
              date: cleanDate,
              time: row.time,
              value,
              status: row.status || classifyStatus(sensorType, value)
            } as SensorReading;
          });

          setSensorData(mapped);
          localStorage.setItem(`sensor_${sensorType}_${currentUserId}`, JSON.stringify(mapped));
        }
      } catch (err) {
        console.error("Failed to load sensor history:", err);
      }
    };

    const cacheKey = `sensor_${sensorType}_${currentUserId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setSensorData(JSON.parse(cached)); } catch { setSensorData([]); }
    } else {
      setSensorData([]);
    }

    fetchHistory();

    const unsub = onValue(envRef, async (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      const now = new Date();
      const date = now.toISOString().split("T")[0];
      const time = now.toTimeString().split(" ")[0];

      let sensorValue: number | undefined;
      if (sensorType === "temperature") sensorValue = data.temperature;
      if (sensorType === "humidity")    sensorValue = data.humidity;
      if (sensorType === "ammonia")     sensorValue = data.nh3;
      if (sensorType === "co2")         sensorValue = data.co2;
      if (sensorValue === undefined) return;

      const newReading: SensorReading = {
        date, time, value: sensorValue,
        status: classifyStatus(sensorType, sensorValue),
        id: ""
      };

      setSensorData(prev => {
        const updated = [newReading, ...prev];
        localStorage.setItem(`sensor_${sensorType}_${currentUserId}`, JSON.stringify(updated));
        return updated;
      });

      const payload: any = { user_id: currentUserId, date, time, status: newReading.status };
      let apiUrl = "";
      if (sensorType === "temperature") { apiUrl = `${apiUrls}/api/sensor/temperature`; payload.temperature_celcius = sensorValue; }
      if (sensorType === "humidity")    { apiUrl = `${apiUrls}/api/sensor/humidity`;    payload.humidity_percentage = sensorValue; }
      if (sensorType === "ammonia")     { apiUrl = `${apiUrls}/api/sensor/ammonia`;     payload.ammonia_ppm = sensorValue; }
      if (sensorType === "co2")         { apiUrl = `${apiUrls}/api/sensor/carbon`;      payload.carbon_ppm = sensorValue; }

      try { await axios.post(apiUrl, payload); } catch (err) { console.error("Failed to save sensor reading:", err); }
    });

    return () => unsub();
  }, [sensorType, apiUrls, currentUserId]);

  // ─── Chart data ──────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    let filtered: SensorReading[] = [];

    if (chartFilterMode === 'specific' && specificDate) {
      // Show every reading for that exact date, grouped by time (HH:MM:SS)
      filtered = sensorData.filter(r => r.date === specificDate);

      // Group by 30-min bucket for cleaner chart
      const grouped = new Map<string, { total: number; count: number }>();
      filtered.forEach(r => {
        const [hh, mm] = r.time.split(':');
        const bucket = `${hh}:${mm.startsWith('3') ? '30' : '00'}`;
        const prev = grouped.get(bucket) || { total: 0, count: 0 };
        prev.total += r.value;
        prev.count += 1;
        grouped.set(bucket, prev);
      });

      return Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, { total, count }]) => ({
          time,
          value: parseFloat((total / count).toFixed(2))
        }));
    }

    // Relative mode
    if (dateRange === 'all') {
      filtered = sensorData;
    } else {
      const now = new Date();
      const cutoff = new Date(now);
      if (dateRange === 'hour')  cutoff.setHours(now.getHours() - 1);
      if (dateRange === 'day')   cutoff.setDate(now.getDate() - 1);
      if (dateRange === 'week')  cutoff.setDate(now.getDate() - 7);
      if (dateRange === 'month') cutoff.setDate(now.getDate() - 30);
      filtered = sensorData.filter(r => new Date(`${r.date}T${r.time}`) >= cutoff);
    }

    // Group by date (all-time) or by time (short ranges)
    return filtered
      .reduce((acc: any[], reading) => {
        const timeKey = dateRange === 'all' ? reading.date : reading.time;
        const existing = acc.find(item => item.time === timeKey);
        if (existing) {
          existing.count++;
          existing.totalValue += reading.value;
          existing.value = existing.totalValue / existing.count;
        } else {
          acc.push({ time: timeKey, value: reading.value, totalValue: reading.value, count: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [sensorData, chartFilterMode, specificDate, dateRange]);

  // ─── Chart title ─────────────────────────────────────────────────────────

  const chartTitle = useMemo(() => {
    if (chartFilterMode === 'specific' && specificDate) {
      const d = new Date(specificDate + 'T00:00:00');
      const label = d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
      return `${title} on ${label} (24-hour view)`;
    }
    return `${dateRange === 'all' ? 'Daily Average' : 'Hourly Average'} ${title}`;
  }, [chartFilterMode, specificDate, dateRange, title]);

  // ─── Available dates for the specific date picker ────────────────────────
  const availableDates = useMemo(() => {
    const dates = new Set(sensorData.map(r => r.date));
    return Array.from(dates).sort();
  }, [sensorData]);

  // ─── Logs filters ────────────────────────────────────────────────────────

  const getStatusOptions = () => {
    switch (sensorType) {
      case "temperature": return ["Normal - 18°C to 30°C", "Harmful - May cause stress or illness", "Harmful - Risk of heat stress or death"];
      case "humidity":    return ["Normal - 50% to 70%", "Warning - May cause dehydration, respiratory stress, poor air quality", "Warning - Increased risk of disease"];
      case "co2":         return ["Safe - Normal ventilation", "Ventilation should be improved; Acceptable short-term - Mild stress", "Hazardous - Respiratory distress; immediate ventilation improvement is required"];
      case "ammonia":     return [
        "Ideal (Safe) - Best condition. No harm to poultry or workers. Promotes healthy growth & respiration",
        "Acceptable (Not Ideal) - Prolonged exposure may cause mild stress or irritation. Improve litter/ventilation",
        "Harmful - Unsafe. Risk of respiratory disease, eye irritation, poor growth. Immediate action needed"
      ];
      default: return [];
    }
  };

  const filteredLogs = useMemo(() => {
    let filtered = sensorData;
    if (logStartDate) filtered = filtered.filter(r => r.date >= logStartDate);
    if (logEndDate)   filtered = filtered.filter(r => r.date <= logEndDate);
    if (statusFilter !== 'all') filtered = filtered.filter(r => r.status === statusFilter);
    return filtered;
  }, [sensorData, logStartDate, logEndDate, statusFilter]);

  const getStatusBadge = (status: string) => {
    let badgeClass = "";
    if (status.startsWith("Normal") || status.startsWith("Safe") || status.startsWith("Ideal"))
      badgeClass = "bg-green-100 text-green-800";
    else if (status.startsWith("Warning") || status.startsWith("Acceptable") || status.includes("improved"))
      badgeClass = "bg-yellow-100 text-yellow-800";
    else if (status.startsWith("Harmful") || status.startsWith("Critical") || status.startsWith("Hazardous"))
      badgeClass = "bg-red-100 text-red-800";
    else
      badgeClass = "bg-gray-100 text-gray-800";

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeClass}`}>
        {status}
      </span>
    );
  };

  const tableData = filteredLogs.map(r => ({
    ...r,
    value: `${r.value.toFixed(2)} ${unit}`,
    status: getStatusBadge(r.status)
  }));

  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'time', label: 'Time' },
    { key: 'value', label: `${title} (${unit})` },
    { key: 'status', label: 'Status' }
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{title} Monitoring</h1>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">

        {/* Chart filter controls */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            <button
              onClick={() => setChartFilterMode('relative')}
              className={`px-3 py-1.5 transition-colors ${
                chartFilterMode === 'relative'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Relative
            </button>
            <button
              onClick={() => setChartFilterMode('specific')}
              className={`px-3 py-1.5 transition-colors border-l border-gray-300 ${
                chartFilterMode === 'specific'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Specific Date
            </button>
          </div>

          {/* Relative range dropdown */}
          {chartFilterMode === 'relative' && (
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="hour">Last hour</option>
              <option value="day">Last 24 hours</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          )}

          {/* Specific date picker */}
          {chartFilterMode === 'specific' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                min={availableDates[0] ?? ''}
                max={availableDates[availableDates.length - 1] ?? ''}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {specificDate && (
                <button
                  onClick={() => setSpecificDate('')}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear date"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {specificDate && chartData.length === 0 && (
                <span className="text-sm text-amber-600">No data for this date</span>
              )}
              {specificDate && chartData.length > 0 && (
                <span className="text-sm text-gray-400">{chartData.length} data points</span>
              )}
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-4">{chartTitle}</h3>

        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              label={{ value: `${title} (${unit})`, angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, title]}
              labelFormatter={(label) =>
                chartFilterMode === 'specific' && specificDate
                  ? `${specificDate} ${label}`
                  : dateRange === 'all'
                  ? `Date: ${label}`
                  : `Time: ${label}`
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3B82F6' }}
              activeDot={{ r: 6, fill: '#1D4ED8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 space-y-3">

          {/* Title + Status filter */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">{title} Logs</h3>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                {getStatusOptions().map((status, idx) => (
                  <option key={idx} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date range picker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">From:</label>
              <input
                type="date"
                value={logStartDate}
                onChange={(e) => setLogStartDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">To:</label>
              <input
                type="date"
                value={logEndDate}
                onChange={(e) => setLogEndDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(logStartDate || logEndDate) && (
              <button
                onClick={() => { setLogStartDate(''); setLogEndDate(''); }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear
              </button>
            )}
            <span className="text-sm text-gray-400">
              {filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found
            </span>
          </div>

        </div>

        <div className="overflow-x-auto">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400">
                      No records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  tableData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.value}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SensorPage;
