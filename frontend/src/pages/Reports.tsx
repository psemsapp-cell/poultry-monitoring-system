import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import logo from '../images/image-removebg-preview.png';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { Printer } from 'lucide-react';
import Table from '../components/Table';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';

const firebaseConfig = {
  databaseURL: "https://psemsapp-6ea85-default-rtdb.asia-southeast1.firebasedatabase.app",
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

interface Forecast {
  month: string;
  actualMortality: number;
  predictedMortality: number;
  actualHarvest: number;
  predictedHarvest: number;
}

interface SensorReading {
  date: string;
  time: string;
  value: number;
  type: string;
  status: string;
  id: string;
}

interface BatchReportRow {
  batch_id: number;
  batch_name: string;
  breed: string;
  total_chickens: number;
  date_started: string;
  date_completed: string;
  status: string;
  harvested_chickens: number;
  harvested_boxes: number;
  mortality_count: number;
  mortality_rate: number;
  avg_temperature: number | null;
  avg_humidity: number | null;
  avg_ammonia: number | null;
  avg_co2: number | null;
  predicted_mortality: number | null;
  predicted_harvest: number | null;
}

type MortalityRow = {
  id?: number;
  barn: string;
  barn_id?: number;
  barnName?: string;
  mortality: number;
  cause?: string;
  date: string;
};

const Reports: React.FC = () => {
  const [harvestData, setHarvestData] = useState<any[]>([]);
  const [mortalityData, setMortalityData] = useState<MortalityRow[]>([]);
  const [forecastData, setForecastData] = useState<Forecast[]>([]);
  const [batchReports, setBatchReports] = useState<BatchReportRow[]>([]);
  const [sensorData, setSensorData] = useState<SensorReading[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const allowedYears = [2025, 2026];
    const yearToUse = allowedYears.includes(currentYear) ? currentYear : 2026;
    return `${yearToUse}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const printableRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL;
  const currentUserId = localStorage.getItem('user_id');

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return `${new Date(Number(year), Number(month) - 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    })}`;
  };

  // ─── FETCHERS ──────────────────────────────────────────────────────────────

  const fetchHarvest = useCallback(async () => {
    if (!apiUrl || !currentUserId) return;
    const res = await fetch(`${apiUrl}/api/harvest_data/${currentUserId}`);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    const formatted = arr.map((item: any) => ({
      batch: String(item.batch_name ?? item.batch ?? '').trim(),
      barn: String(item.barn_name ?? item.barn ?? item.barnName ?? '').trim(),
      barn_id: item.barn_id != null ? Number(item.barn_id) : item.barnId != null ? Number(item.barnId) : undefined,
      chickens: Number(item.no_harvest ?? item.chickens ?? 0),
      boxes: Number(item.no_boxes ?? item.boxes ?? 0),
      date: String(item.date ?? item.harvest_date ?? '').slice(0, 10),
    }));
    setHarvestData(formatted);
  }, [apiUrl, currentUserId]);

  const fetchMortality = useCallback(async () => {
    if (!apiUrl || !currentUserId) return;
    const res = await fetch(`${apiUrl}/api/mortality_data/${currentUserId}`);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    const formatted: MortalityRow[] = arr.map((item: any) => ({
      id: item.id ?? item.mortality_id ?? item.mortalityId,
      barn: String(item.barn_name ?? item.barn ?? item.barnName ?? '').trim(),
      barn_id: item.barn_id != null ? Number(item.barn_id) : item.barnId != null ? Number(item.barnId) : undefined,
      mortality: Number(item.quantity ?? item.mortality ?? 0),
      cause: String(item.cause ?? ''),
      date: String(item.date ?? '').slice(0, 10),
    }));
    setMortalityData(formatted);
  }, [apiUrl, currentUserId]);

  // ✅ FIX 1: Map both camelCase and snake_case field names from the API response
  const fetchForecast = useCallback(async () => {
    if (!apiUrl || !currentUserId) return;
    try {
      const res = await fetch(`${apiUrl}/api/monthly_forecast/?user_id=${currentUserId}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];

      const mapped: Forecast[] = arr.map((item: any) => ({
        month: item.month ?? item.month_year ?? '',
        // ✅ Accept both camelCase (actualMortality) and snake_case (actual_mortality)
        actualMortality:    Number(item.actualMortality    ?? item.actual_mortality    ?? 0),
        predictedMortality: Number(item.predictedMortality ?? item.predicted_mortality ?? 0),
        actualHarvest:      Number(item.actualHarvest      ?? item.actual_harvest      ?? 0),
        predictedHarvest:   Number(item.predictedHarvest   ?? item.predicted_harvest   ?? 0),
      }));

      setForecastData(mapped);
    } catch (err) {
      console.error('Error fetching forecast:', err);
    }
  }, [apiUrl, currentUserId]);

  const fetchBatchReports = useCallback(async () => {
    if (!apiUrl || !currentUserId) return;
    const res = await axios.get<BatchReportRow[]>(
      `${apiUrl}/api/reports/batch-report?user_id=${currentUserId}&month=${selectedMonth}`
    );
    setBatchReports(Array.isArray(res.data) ? res.data : []);
  }, [apiUrl, currentUserId, selectedMonth]);

  const fetchSensorHistory = useCallback(async () => {
    if (!apiUrl || !currentUserId) return;
    try {
      const res = await fetch(
        `${apiUrl}/api/reports/sensor-history?user_id=${currentUserId}&month=${selectedMonth}`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setSensorData(data.map((d: any) => ({
          date: String(d.date).slice(0, 10),
          time: String(d.time),
          value: Number(d.value),
          type: d.type,
          status: d.status,
          id: `${d.type}-${d.date}-${d.time}`,
        })));
      }
    } catch (err) {
      console.error('Error fetching sensor history:', err);
    }
  }, [apiUrl, currentUserId, selectedMonth]);

  useEffect(() => {
    fetchHarvest().catch(console.error);
    fetchMortality().catch(console.error);
    fetchForecast().catch(console.error);
    fetchBatchReports().catch(console.error);
    fetchSensorHistory().catch(console.error);
  }, [fetchHarvest, fetchMortality, fetchForecast, fetchBatchReports, fetchSensorHistory]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      fetchHarvest(),
      fetchMortality(),
      fetchForecast(),
      fetchBatchReports(),
      fetchSensorHistory(),
    ]);
  }, [fetchHarvest, fetchMortality, fetchForecast, fetchBatchReports, fetchSensorHistory]);

  // ─── BATCH REPORT TABLE ────────────────────────────────────────────────────

  const formatBatchReportData = (data: BatchReportRow[]) => {
    return (Array.isArray(data) ? data : []).map((d) => ({
      ...d,
      date_started: d.date_started ? new Date(d.date_started).toISOString().split('T')[0] : '',
      date_completed: d.date_completed ? new Date(d.date_completed).toISOString().split('T')[0] : '',
      avg_temperature: d.avg_temperature == null ? '—' : Number(d.avg_temperature).toFixed(2),
      avg_humidity: d.avg_humidity == null ? '—' : Number(d.avg_humidity).toFixed(2),
      avg_ammonia: d.avg_ammonia == null ? '—' : Number(d.avg_ammonia).toFixed(2),
      avg_co2: d.avg_co2 == null ? '—' : Number(d.avg_co2).toFixed(2),
    }));
  };

  const batchReportColumns = [
    { key: 'batch_id', label: 'ID', sortable: true },
    { key: 'batch_name', label: 'Batch Name', sortable: true },
    { key: 'date_started', label: 'Date Started', sortable: true },
    { key: 'date_completed', label: 'Date Completed', sortable: true },
    { key: 'avg_temperature', label: 'Avg Temperature (°C)', sortable: true },
    { key: 'avg_humidity', label: 'Avg Humidity (%)', sortable: true },
    { key: 'avg_ammonia', label: 'Avg Ammonia (ppm)', sortable: true },
    { key: 'avg_co2', label: 'Avg CO₂ (ppm)', sortable: true },
  ];

  // ─── FIREBASE: live readings ───────────────────────────────────────────────

  useEffect(() => {
    if (!currentUserId) return;
    const envRef = ref(db, 'environment');
    const unsubscribe = onValue(envRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0];

        const classifyStatus = (type: string, value: number) => {
          switch (type) {
            case 'temperature': return value > 35 ? 'Critical' : value > 30 ? 'Warning' : 'Normal';
            case 'humidity': return value > 85 ? 'Warning' : 'Normal';
            case 'ammonia': return value > 10 ? 'Critical' : value > 5 ? 'Warning' : 'Normal';
            case 'co2': return value > 1200 ? 'Critical' : value > 1000 ? 'Warning' : 'Normal';
            default: return 'Normal';
          }
        };

        const currentMonth = new Date().toISOString().slice(0, 7);
        if (date.startsWith(selectedMonth) || selectedMonth === currentMonth) {
          const newReadings: SensorReading[] = [
            { type: 'temperature', value: data.temperature },
            { type: 'humidity', value: data.humidity },
            { type: 'ammonia', value: data.nh3 },
            { type: 'co2', value: data.co2 },
          ].map(r => ({
            date,
            time,
            value: Number(r.value),
            type: r.type,
            status: classifyStatus(r.type, Number(r.value)),
            id: `live-${r.type}-${time}`,
          }));

          setSensorData(prev => {
            const filtered = prev.filter(d => !d.id.startsWith('live-'));
            return [...newReadings, ...filtered];
          });
        }
      }
    });
    return () => unsubscribe();
  }, [currentUserId, selectedMonth]);

  // ─── DERIVED DATA ──────────────────────────────────────────────────────────

  const filteredSensorData = useMemo(() => {
    return sensorData.filter(d => d.date.startsWith(selectedMonth));
  }, [sensorData, selectedMonth]);

  const chartDataByType = (type: string) => {
    const readings = filteredSensorData.filter(d => d.type === type);
    const grouped = new Map<string, { total: number; count: number }>();
    readings.forEach(d => {
      const existing = grouped.get(d.date) || { total: 0, count: 0 };
      existing.total += d.value;
      existing.count += 1;
      grouped.set(d.date, existing);
    });
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { total, count }]) => ({
        time: date.slice(5),
        value: parseFloat((total / count).toFixed(2)),
      }));
  };

  const barnNameById = useMemo(() => {
    const map = new Map<number, string>();
    harvestData.forEach((h: any) => {
      const id = Number(h?.barn_id);
      const name = String(h?.barn ?? h?.barn_name ?? '').trim();
      if (Number.isFinite(id) && id > 0 && name) map.set(id, name);
    });
    return map;
  }, [harvestData]);

  const mortalityChartData = useMemo(() => {
    const inMonth = (r: MortalityRow) => !r.date || r.date.startsWith(selectedMonth);
    const grouped = new Map<number, { label: string; mortality: number }>();
    mortalityData.filter(inMonth).forEach((r) => {
      const barnId = r.barn_id != null ? Number(r.barn_id) : 0;
      const barnName =
        (barnId && barnNameById.get(barnId)) ||
        String(r.barn ?? '').trim() ||
        (barnId ? `Barn #${barnId}` : 'Unknown Barn');
      const prev = grouped.get(barnId) || { label: barnName, mortality: 0 };
      prev.mortality += Number(r.mortality || 0);
      grouped.set(barnId, prev);
    });
    return Array.from(grouped.values());
  }, [mortalityData, selectedMonth, barnNameById]);

  // ✅ FIX 2: Filter forecastData by selectedMonth so the summary matches the selected month
  const latest: Forecast | null = useMemo(() => {
    const filtered = forecastData.filter(f =>
      f.month && String(f.month).startsWith(selectedMonth)
    );
    // Use month-filtered entry if available, otherwise fall back to last entry overall
    if (filtered.length > 0) return filtered[filtered.length - 1];
    return forecastData.length > 0 ? forecastData[forecastData.length - 1] : null;
  }, [forecastData, selectedMonth]);

  const batchSummaryReport = useMemo(() => {
    return batchReports.map((r) => ({
      batch: r.batch_name,
      harvestedChickens: r.harvested_chickens,
      harvestedBoxes: r.harvested_boxes,
      mortalityCount: r.mortality_count,
      mortalityRate: Number(r.mortality_rate).toFixed(2),
      avgTemperature: r.avg_temperature != null ? Number(r.avg_temperature).toFixed(2) : '—',
      avgHumidity: r.avg_humidity != null ? Number(r.avg_humidity).toFixed(2) : '—',
      avgAmmonia: r.avg_ammonia != null ? Number(r.avg_ammonia).toFixed(2) : '—',
      avgCO2: r.avg_co2 != null ? Number(r.avg_co2).toFixed(2) : '—',
      predictedHarvest: r.predicted_harvest ?? '—',
      predictedMortality: r.predicted_mortality ?? '—',
    }));
  }, [batchReports]);

  // ─── PRINT ─────────────────────────────────────────────────────────────────

  const handlePrintReport = () => {
    if (!printableRef.current) return;
    const printContents = printableRef.current.innerHTML;
    const monthDisplay = formatMonthDisplay(selectedMonth);
    const newWin = window.open('', '', 'width=900,height=700');
    if (newWin) {
      newWin.document.write(`
        <html>
          <head>
            <title>Farm Monthly Report</title>
            <style>
              body { font-family: 'Segoe UI', sans-serif; padding: 40px; background: #fff; color:#111827; line-height:1.6;}
              .header { text-align:center; border-bottom:2px solid #1e3a8a; padding-bottom:10px; margin-bottom:30px;}
              .header img { width:80px; height:80px; margin-bottom:10px;}
              .header h1 { font-size:22px; margin:5px 0; color:#1e3a8a;}
              .header h3 { font-size:16px; margin:0; color:#374151;}
              .date { text-align:right; font-size:14px; color:#374151; margin-bottom:20px;}
              .section { margin-bottom:30px;}
              table { width:100%; border-collapse:collapse; margin-top:15px; font-size:13px;}
              th, td { border:1px solid #d1d5db; padding:10px; text-align:center;}
              th { background-color:#1e40af; color:white; font-weight:600;}
              tr:nth-child(even){ background-color:#f9fafb;}
              footer { text-align:center; margin-top:40px; font-size:12px; color:#6b7280;}
              @media print { button{ display:none;} body{ padding:20mm; }}
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${logo}" alt="PSEMS Logo" />
              <h1>POULTRY SENSE ENVIRONMENTAL MONITORING SYSTEM</h1>
              <h3>Farm Monthly Report: ${monthDisplay}</h3>
            </div>
            <div class="date">Date: ${new Date().toLocaleDateString()}</div>
            <div class="content">${printContents}</div>
            <footer><p>Generated automatically by PSEMS System</p></footer>
          </body>
        </html>
      `);
      newWin.document.close();
      newWin.focus();
      newWin.print();
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={refreshAll}
            className="flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors duration-200"
          >
            Refresh Data
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Printer className="h-4 w-4 mr-2" /> Print Report
          </button>
        </div>
      </div>

      <div className="mb-4">
        <label className="mr-2 font-medium">Select Month:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          {[2025, 2026].map((year) =>
            Array.from({ length: 12 }, (_, i) => {
              const month = String(i + 1).padStart(2, '0');
              return (
                <option key={`${year}-${month}`} value={`${year}-${month}`}>
                  {formatMonthDisplay(`${year}-${month}`)}
                </option>
              );
            })
          )}
        </select>
      </div>

      <div ref={printableRef}>
        {/* ── Monthly Summary Table ── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 section">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Generated Monthly Report Summary ({formatMonthDisplay(selectedMonth)})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="border px-3 py-2">Batch No.</th>
                  <th className="border px-3 py-2">Harvested Chickens</th>
                  <th className="border px-3 py-2">Harvested Boxes</th>
                  <th className="border px-3 py-2">Mortality Count</th>
                  <th className="border px-3 py-2">Mortality Rate (%)</th>
                  <th className="border px-3 py-2">Avg Temp (°C)</th>
                  <th className="border px-3 py-2">Avg Humidity (%)</th>
                  <th className="border px-3 py-2">Avg Ammonia (ppm)</th>
                  <th className="border px-3 py-2">Avg CO₂ (ppm)</th>
                  <th className="border px-3 py-2">Forecast Harvest</th>
                  <th className="border px-3 py-2">Forecast Mortality</th>
                </tr>
              </thead>
              <tbody>
                {batchSummaryReport.length > 0 ? (
                  batchSummaryReport.map((row, idx) => (
                    <tr key={idx} className="text-center even:bg-gray-50">
                      <td className="border px-3 py-2 font-semibold">{row.batch}</td>
                      <td className="border px-3 py-2">{row.harvestedChickens}</td>
                      <td className="border px-3 py-2">{row.harvestedBoxes}</td>
                      <td className="border px-3 py-2 text-red-600 font-semibold">{row.mortalityCount}</td>
                      <td className="border px-3 py-2">{row.mortalityRate}%</td>
                      <td className="border px-3 py-2">{row.avgTemperature}</td>
                      <td className="border px-3 py-2">{row.avgHumidity}</td>
                      <td className="border px-3 py-2">{row.avgAmmonia}</td>
                      <td className="border px-3 py-2">{row.avgCO2}</td>
                      <td className="border px-3 py-2 font-semibold">{row.predictedHarvest}</td>
                      <td className="border px-3 py-2 font-semibold">{row.predictedMortality}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="border px-3 py-4 text-center text-gray-500">
                      No data available for this month.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Harvest & Mortality Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 section">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Harvest Data</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={harvestData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="batch" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="chickens" fill="#3B82F6" name="Chickens" />
                <Bar dataKey="boxes" fill="#10B981" name="Boxes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mortality Data</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mortalityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="mortality" fill="#EF4444" name="Mortality" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Sensor Line Charts ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 section">
          {(['temperature', 'humidity', 'ammonia', 'co2'] as const).map(type => {
            const meta: Record<string, { title: string; unit: string }> = {
              temperature: { title: 'Temperature', unit: '°C' },
              humidity:    { title: 'Humidity',    unit: '%'  },
              ammonia:     { title: 'Ammonia',     unit: 'ppm'},
              co2:         { title: 'CO₂',         unit: 'ppm'},
            };
            const { title, unit } = meta[type];
            const chartData = chartDataByType(type);
            return (
              <div key={type} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Daily Average {title} ({formatMonthDisplay(selectedMonth)})
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis label={{ value: `${title} (${unit})`, angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, title]}
                      labelFormatter={label => `Date: ${selectedMonth}-${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>

        {/* ── Forecast Summary ── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 section">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">Forecast Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Actual Mortality</p>
              {/* ✅ FIX 3: Show 0 explicitly instead of hiding it, use '—' only when truly null */}
              <p className="text-2xl font-bold text-red-600">
                {latest != null ? latest.actualMortality : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Predicted Mortality</p>
              <p className="text-2xl font-bold text-orange-600">
                {latest != null ? latest.predictedMortality : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Actual Harvest</p>
              <p className="text-2xl font-bold text-green-600">
                {latest != null ? latest.actualHarvest : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Predicted Harvest</p>
              <p className="text-2xl font-bold text-blue-600">
                {latest != null ? latest.predictedHarvest : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Batch Reports Table ── */}
        <div className="section">
          <Table
            columns={batchReportColumns}
            data={formatBatchReportData(batchReports)}
            title="Batch Reports"
            searchable={false}
          />
        </div>
      </div>
    </div>
  );
};

export default Reports;
