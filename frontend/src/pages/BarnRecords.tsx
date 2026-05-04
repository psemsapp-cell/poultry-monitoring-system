import React, { useEffect, useMemo, useState } from 'react';
import { Layers, FileText, Package, TrendingUp, Skull, Warehouse } from 'lucide-react';
import Table from '../components/Table';
import BatchModal from '../components/BatchModal';
import DailyLogModal from '../components/DailyLogModal';
import HarvestModal from '../components/HarvestModal';
import GrowthTrackingModal from '../components/GrowthTrackingModal';
import MortalityModal from '../components/MortalityModal';
import DeleteModal from '../components/DeleteModal';
import BarnModal from '../components/BarnModal';

import { Batch, DailyLog, Harvest, GrowthTracking, Mortality, Barn } from '../types';

const BarnRecords: React.FC = () => {
  const [activeTab, setActiveTab] = useState('batches');
  const [modalState, setModalState] = useState({
    batch: { isOpen: false, mode: 'add' as 'add' | 'edit', data: null as Batch | null },
    dailyLog: { isOpen: false, mode: 'add' as 'add' | 'edit', data: null as DailyLog | null },
    harvest: { isOpen: false, mode: 'add' as 'add' | 'edit', data: null as Harvest | null },
    growthTracking: { isOpen: false, mode: 'add' as 'add' | 'edit', data: null as GrowthTracking | null },
    mortality: { isOpen: false, mode: 'add' as 'add' | 'edit', data: null as Mortality | null },
    barn: { isOpen: false, mode: 'add' as 'add' | 'edit', data: null as Barn | null },
    delete: { isOpen: false, type: '', data: null as any, title: '', message: '', itemName: '' }
  });




  const tabs = [
    { id: 'batches', label: 'Batches', icon: Layers },
    { id: 'daily-logs', label: 'Daily Logs', icon: FileText },
    { id: 'harvest', label: 'Harvest', icon: Package },
    { id: 'growth-tracking', label: 'Growth Tracking', icon: TrendingUp },
  { id: 'mortality', label: 'Mortality', icon: Skull },
  { id: 'barn',       label: 'Barn',      icon: Warehouse },
  ];

  const batchColumns = [
 { key: 'display_id', label: 'Batch #', sortable: false },
  { key: 'batch_name', label: 'Batch Name', sortable: true },
    { key: 'barn_id', label: 'Barn', sortable: true },
    { key: 'breed', label: 'Breed', sortable: true },
    { key: 'no_chicken', label: 'No. of Chickens', sortable: true },
    { key: 'date_started', label: 'Date Deployed', sortable: true },
    { key: 'date_completed', label: 'Date Completed', sortable: true },
    { key: 'status', label: 'Status', sortable: true }
  ];

const dailyLogColumns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'batch_name', label: 'Batch Name', sortable: true },
  { key: 'date', label: 'Date', sortable: true },

  // ✅ Mortality Details
  { key: 'mortality_cause', label: 'Mortality Cause', sortable: true },
  { key: 'mortality_quantity', label: 'Mortality Qty', sortable: true },
  { key: 'mortality_notes', label: 'Mortality Notes', sortable: false },
];




  const growthTrackingColumns = [
    { key: 'batch_id', label: 'Batch ID', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'age', label: 'Age (days)', sortable: true },
    { key: 'total_weight', label: 'Total Weight (kg)', sortable: true },
    { key: 'no_chicken', label: 'No. of Chickens', sortable: true },
    { key: 'average_weight', label: 'Average Weight (kg)', sortable: true }
  ];

  const mortalityColumns = [
      { key: 'id', label: 'ID', sortable: true },
    { key: 'barn_name', label: 'Barn Name', sortable: true },
    { key: 'cause', label: 'Cause', sortable: true },
    { key: 'quantity', label: 'Quantity', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'notes', label: 'Notes', sortable: false },

  ];

    const harvestColumns = [
      { key: 'id', label: 'Harvest ID', sortable: true },
    { key: 'batch_name', label: 'Batch', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'no_harvest', label: 'Harvest', sortable: true },
    { key: 'no_boxes', label: 'Number of Boxes', sortable: true }
  ];

const barnColumns = [
  { key: 'id',          label: 'Barn ID',          sortable: true },
  { key: 'barn_name',        label: 'Barn Name',        sortable: true },
  { key: 'description', label: 'Description',      sortable: false },
  { key: 'date',             label: 'Date',             sortable: true },
];


 const [barns, setBarns] = useState<Barn[]>([]);
 const [harvests, setHarvests] = useState<Harvest[]>([]);
const [batches, setBatches] = useState<Batch[]>([]);
const [mortalities, setMortalities] = useState<Mortality[]>([]);
const [daily_logs, setDailyLogs] = useState<DailyLog[]>([]);
const [growthTrackingData, setGrowthTrackingData] = useState<GrowthTracking[]>([]);
const apiUrl = import.meta.env.VITE_API_URL;
const userId = localStorage.getItem('user_id');

useEffect(() => {
  if (!userId) return;

  let isMounted = true;

  const loadGrowthTracking = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/growth_tracking/user_growth/${userId}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) throw new Error('Failed to fetch growth tracking data');

      const data: GrowthTracking[] = await res.json();

      // Format dates safely
      const formatted: GrowthTracking[] = data.map(item => ({
        ...item,
        date: item.date
          ? (() => {
              const d = new Date(item.date);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              return `${yyyy}-${mm}-${dd}`;
            })()
          : '',
      }));

      if (isMounted) setGrowthTrackingData(formatted);
    } catch (err) {
      console.error('Fetch error (growth tracking):', err);
    }
  };

  loadGrowthTracking();

  return () => {
    isMounted = false;
  };
}, [apiUrl, userId]);



  //daily logs
  // Fetch daily logs
useEffect(() => {
  if (!userId) return;
  let isMounted = true;

  const loadDailyLogs = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/daily_logs/user_daily/${userId}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Failed to fetch daily logs');

      const data: DailyLog[] = await res.json();

      // Format dates to YYYY-MM-DD
      const formatted = data.map(daily_logs => {
        const formatDate = (date: string | null | undefined) => {
          if (!date) return '';
          const d = new Date(date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };

        return {
          ...daily_logs,
          date: formatDate(daily_logs.date)
        };
      });

      if (isMounted) setDailyLogs(formatted);

    } catch (err) {
      console.error('Fetch error (mortalities):', err);
    }
  };

  loadDailyLogs();
  return () => { isMounted = false; };
}, [apiUrl, userId]);


  //mortalities

  useEffect(() => {
  if (!userId) return;

  let isMounted = true;

  const loadMortalities = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/mortality/user_mortality/${userId}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) throw new Error('Failed to fetch mortalities');

      const data: Mortality[] = await res.json();

      // Format dates to YYYY-MM-DD
      const formatted = data.map(mortality => {
        const formatDate = (date: string | null | undefined) => {
          if (!date) return '';
          const d = new Date(date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };

        return {
          ...mortality,
          date: formatDate(mortality.date)
        };
      });

      if (isMounted) setMortalities(formatted);

    } catch (err) {
      console.error('Fetch error (mortalities):', err);
    }
  };

  loadMortalities();

  return () => { isMounted = false; };
}, [apiUrl, userId]);


  //BATCH
  useEffect(() => {
  if (!userId) return;

  let isMounted = true;

  const loadBatches = async () => {
    try {
const res = await fetch(`${apiUrl}/api/batch/user/${userId}`, {
  headers: { 'Cache-Control': 'no-cache' }
});


      if (!res.ok) throw new Error('Failed to fetch batches');

      const data: Batch[] = await res.json();

    // Format dates to YYYY-MM-DD if needed
const formatted = data.map(batch => {
  const formatDate = (date: string | null | undefined) => {
    if (!date) return ''; // return empty string if no value
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    ...batch,
    date_started: formatDate(batch.date_started),
    date_completed: formatDate(batch.date_completed),
  };
});


      if (isMounted) setBatches(formatted);
    } catch (err) {
      console.error('Fetch error (batches):', err);
    }
  };

  loadBatches();

  return () => { isMounted = false; };
}, [apiUrl, userId]);


  useEffect(() => {
  if (!userId) return;
  let isMounted = true;

  //harvest
  const loadHarvests = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/harvest/user_harvest/${userId}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Failed to fetch harvest records');

      const data: Harvest[] = await res.json();

      // ✅ Format date to YYYY-MM-DD
      const formatted = data.map(h => {
        const d = new Date(h.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return { ...h, date: `${yyyy}-${mm}-${dd}` };
      });

      if (isMounted) setHarvests(formatted);
    } catch (err) {
      console.error('Fetch error (harvest):', err);
    }
  };

  loadHarvests();
  return () => { isMounted = false; };
}, [apiUrl, userId]);



//barn

useEffect(() => {
  if (!userId) return;

  let isMounted = true; // to prevent state update if component unmounts

  const loadBarns = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/barn/user_barn/${userId}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error('Failed to fetch barns');

      const data: Barn[] = await res.json();

      // ✅ Format each barn's date to YYYY-MM-DD
 const formatted = data.map(barn => {
  const d = new Date(barn.date);     // local timezone
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0'); // months are 0-based
  const dd = String(d.getDate()).padStart(2, '0');
  return { ...barn, date: `${yyyy}-${mm}-${dd}` };
});


      if (isMounted) setBarns(formatted);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  loadBarns();

  return () => {
    isMounted = false;
  };
}, [apiUrl, userId]);



  const handleAdd = () => {
    switch (activeTab) {
      case 'batches':
        setModalState(prev => ({
          ...prev,
          batch: { isOpen: true, mode: 'add', data: null }
        }));
        break;
      case 'daily-logs':
        setModalState(prev => ({
          ...prev,
          dailyLog: { isOpen: true, mode: 'add', data: null }
        }));
        break;
      case 'harvest':
        setModalState(prev => ({
          ...prev,
          harvest: { isOpen: true, mode: 'add', data: null }
        }));
        break;
case 'growth-tracking':
  setModalState(prev => ({
    ...prev,
    growthTracking: {
      isOpen: true,
      mode: 'add',
      data: {
        age: '',
        total_weight: '',
        no_chickens: '',
        average_weight_kg: ''
      } as unknown as GrowthTracking
    }
  }));
  break;



      case 'mortality':
        setModalState(prev => ({
          ...prev,
          mortality: { isOpen: true, mode: 'add', data: null }
        }));
        break;
           case 'barn':
        setModalState(prev => ({
          ...prev,
          barn: { isOpen: true, mode: 'add', data: null }
        }));
        break;
    }
  };

  const handleEdit = (item: any) => {
    switch (activeTab) {
 case 'batches':
  setModalState(prev => ({
    ...prev,
    batch: {
      isOpen: true,
      mode: 'edit',
      data: {
        ...item,
        no_of_chickens: item.no_chickens?.toString() ?? ''
      }
    }
  }));
  break;




        break;
      case 'daily-logs':
        setModalState(prev => ({
          ...prev,
          dailyLog: { isOpen: true, mode: 'edit', data: item }
        }));
        break;
  case 'harvest':
  setModalState(prev => ({
    ...prev,
    harvest: {
      isOpen: true,
      mode: 'edit',
      data: {
        ...item,
        harvest: item.no_harvest,          // rename to what the modal expects
        number_of_boxes: item.no_boxes     // rename to what the modal expects
      }
    }
  }));
  break;

      case 'growth-tracking':
  setModalState(prev => ({
    ...prev,
    growthTracking: { 
      isOpen: true, 
      mode: 'edit', 
      data: {
        ...item,
        age: item.age?.toString() ?? '',
        total_weight: item.total_weight?.toString() ?? '',
        no_chickens: item.no_chickens?.toString() ?? '',
        average_weight_kg: item.average_weight_kg?.toString() ?? ''
      } as GrowthTracking
    }
  }));
  break;

      case 'mortality':
        setModalState(prev => ({
          ...prev,
          mortality: { isOpen: true, mode: 'edit', data: item }
        }));
        break;

              case 'barn':
        setModalState(prev => ({
          ...prev,
          barn: { isOpen: true, mode: 'edit', data: item }
        }));
        break;
    }
  };

  const handleDelete = (item: any) => {
    const typeMap = {
      'batches': 'Batch',
      'daily-logs': 'Daily Log',
      'harvest': 'Harvest Record',
      'growth-tracking': 'Growth Tracking Record',
      'mortality': 'Mortality Record',
      'barn': 'Barn',
    };
    
 const itemName =
  activeTab === 'batches'
    ? item.id
    : activeTab === 'daily-logs'
    ? `${item.id} - ${item.date}`
    : activeTab === 'harvest'
    ? `${item.id} - ${item.date}`
    : activeTab === 'growth-tracking'
    ? `${item.id} - ${item.date}`
    : activeTab === 'barn'
    ? `${item.barn_name} - ${item.date}`         // ✅ show barn name & date
    : activeTab === 'mortality'
    ? `${item.id} - ${item.date} - Mortality` // ✅ show batch & date (customize text as needed)
    : `${item.barn_id} - ${item.date}`;

    
    setModalState(prev => ({
      ...prev,
      delete: {
        isOpen: true,
        type: activeTab,
        data: item,
        title: `Delete ${typeMap[activeTab as keyof typeof typeMap]}`,
        message: `Are you sure you want to delete this ${typeMap[activeTab as keyof typeof typeMap].toLowerCase()}? This action cannot be undone.`,
        itemName
      }
    }));
  };

  const closeModal = (modalType: string) => {
    setModalState(prev => ({
      ...prev,
      [modalType]: { ...prev[modalType as keyof typeof prev], isOpen: false, data: null }
    }));
  };

  const handleSaveBatch = (batchData: Partial<Batch>) => {
  if (modalState.batch.mode === 'add') {
    const newBatch: Batch = {
      id: batchData.id!,
      barn_id: batchData.barn_id!,
      batch_name: batchData.batch_name!,
      breed: batchData.breed!,
      no_chicken: batchData.no_chicken!,
      date_started: batchData.date_started!,
      date_completed: batchData.date_completed,
      status: batchData.status!,
    };
    setBatches(prev => [...prev, newBatch]);
  } else {
    setBatches(prev => prev.map(batch => 
      batch.id === modalState.batch.data?.id 
        ? {
            id: batchData.id!,
            barn_id: batchData.barn_id!,
            batch_name: batchData.batch_name!,
            breed: batchData.breed!,
            no_chicken: batchData.no_chicken!,
            date_started: batchData.date_started!,
            date_completed: batchData.date_completed,
            status: batchData.status!,
          }
        : batch
    ));
  }
};



const mortalityById = useMemo(() => {
  const map = new Map<string, Mortality>();
  for (const m of mortalities) map.set(String(m.id), m);
  return map;
}, [mortalities]);

const batchById = useMemo(() => {
  const map = new Map<string, Batch>();
  for (const b of batches) map.set(String(b.id), b);
  return map;
}, [batches]);

const dailyLogsWithMortalityDetails = useMemo(() => {
  return daily_logs.map((log: any) => {
    const mort = mortalityById.get(String(log.mortality_id));
    const batch = batchById.get(String(log.batch_id));
    return {
      ...log,
      batch_name: log.batch_name ?? batch?.batch_name ?? '',
      mortality_cause: mort?.cause ?? '—',
      mortality_quantity: log.quantity ?? 0,     // ✅ reads from tbl_daily.quantity
      mortality_notes: mort?.notes ?? '—',
    };
  });
}, [daily_logs, mortalityById, batchById]);



  const handleSaveDailyLog = (logData: Partial<DailyLog>) => {
    if (modalState.dailyLog.mode === 'add') {
      const newLog = {
        ...logData,
        id: Date.now().toString(),
        batch_id: logData.batch_id!,
        date: logData.date!,
        mortality_id: logData.mortality_id!,
      } as DailyLog;
      setDailyLogs(prev => [...prev, newLog]);
    } else {
      setDailyLogs(prev => prev.map(log => 
        log.id === modalState.dailyLog.data?.id 
          ? { ...log, ...logData } 
          : log
      ));
    }
  };

  const handleSaveHarvest = (harvestData: Partial<Harvest>) => {
    if (modalState.harvest.mode === 'add') {
      const newHarvest = {
        ...harvestData,
        id: Date.now().toString(),
        batch_id: harvestData.batch_id!,
        date: harvestData.date!,
        harvest: harvestData.harvest!,
        number_of_boxes: harvestData.number_of_boxes!
      } as Harvest;
      setHarvests(prev => [...prev, newHarvest]);
    } else {
      setHarvests(prev => prev.map(harvest => 
        harvest.id === modalState.harvest.data?.id 
          ? { ...harvest, ...harvestData } 
          : harvest
      ));
    }
  };

  const handleSaveGrowthTracking = (growthData: Partial<GrowthTracking>) => {
    if (modalState.growthTracking.mode === 'add') {
      const newGrowth = {
        ...growthData,
        id: Date.now().toString(),
        batch_id: growthData.batch_id!,
        date: growthData.date!,
        age: growthData.age!,
        total_weight: growthData.total_weight!,
        no_chickens: growthData.no_chickens!,
        average_weight_kg: growthData.average_weight_kg!
      } as GrowthTracking;
      setGrowthTrackingData(prev => [...prev, newGrowth]);
    } else {
      setGrowthTrackingData(prev => prev.map(growth => 
        growth.id === modalState.growthTracking.data?.id 
          ? { ...growth, ...growthData } 
          : growth
      ));
    }
  };

const handleSaveMortality = (mortalityData: Partial<Mortality>) => {
  if (modalState.mortality.mode === 'add') {
    const newMortality: Mortality = {
      ...mortalityData,
      id: Date.now(), // ✅ number
      barn_id: mortalityData.barn_id!, 
      cause: mortalityData.cause!,
      notes: mortalityData.notes!,
      date: mortalityData.date!,
      quantity: mortalityData.quantity!,
      user_id: mortalityData.user_id!, // ✅ fallback if needed
    };
    setMortalities(prev => [...prev, newMortality]);
  } else {
    setMortalities(prev =>
  prev.map(mortality =>
    mortality.id === modalState.mortality.data?.id
      ? { ...mortality, ...mortalityData, user_id: mortality.user_id } // ✅ keep original
      : mortality
  )
);

  }
};


  const handleSaveBarn = (barnData: Partial<Barn>) => {
  if (modalState.barn.mode === 'add') {
    const newBarn = {
      ...barnData,
      id: Date.now().toString(),        // generate a unique id
      barn_name: barnData.barn_name!,
      barn_description: barnData.description!,
      date: barnData.date!
    } as Barn;

    setBarns(prev => [...prev, newBarn]);
  } else {
    setBarns(prev =>
      prev.map(barn =>
        barn.id === modalState.barn.data?.id
          ? { ...barn, ...barnData }
          : barn
      )
    );
  }
};


  const handleConfirmDelete = async () => {
  const { type, data } = modalState.delete;

  switch (type) {
    case "batches": {
      const res = await fetch(`${apiUrl}/api/batch/${data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete batch");

      setBatches((prev) => prev.filter((batch) => batch.id !== data.id));
      break;
    }

    case "daily-logs": {
     const res = await fetch(`${apiUrl}/api/daily_logs/${data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete batch");

      setDailyLogs((prev) => prev.filter((daily_logs) => daily_logs.id !== data.id));
      break;
    }

    case "harvest": {
      const res = await fetch(`${apiUrl}/api/harvest/${data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete harvest record");

      setHarvests((prev) => prev.filter((h) => h.id !== data.id));
      break;
    }

    case "growth-tracking": {
    const res = await fetch(`${apiUrl}/api/growth_tracking/${data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete batch");

      setGrowthTrackingData((prev) => prev.filter((growth_tracking) => growth_tracking.id !== data.id));
      break;
    }

    case "mortality": {
  const res = await fetch(`${apiUrl}/api/mortality/${data.id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Failed to delete mortality");

  // ✅ Update the mortalities state, not batches
  setMortalities((prev) => prev.filter((mortality) => mortality.id !== data.id));

  // Optionally, reload from server to get the latest data
  // await loadMortalities(); // you can call your fetch function again if needed
  break;
}


    case "barn": {
      const res = await fetch(`${apiUrl}/api/barn/${data.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete barn");

      setBarns((prev) => prev.filter((barn) => barn.id !== data.id));
      break;
    }

    default:
      break;
  }

  closeModal("delete");
};


  const formatBatchData = (data: any[]) => {
    return data.map((batch,index) => ({
      ...batch,
      display_id: index+1,
      date_completed: batch.date_completed || 'N/A',
      status: (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          batch.status === 'Active' 
            ? 'bg-green-100 text-green-800'
            : batch.status === 'Completed'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {batch.status}
        </span>
      )
    }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'batches':
        return (
          <Table
            columns={batchColumns}
            data={formatBatchData(batches)}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            title="Batches"
          />
        );
     case 'daily-logs':
  return (
    <Table
      columns={dailyLogColumns}
      data={dailyLogsWithMortalityDetails}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      title="Daily Logs"
    />
  );

      case 'harvest':
        return (
          <Table
            columns={harvestColumns}
            data={harvests}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            title="Harvest Records"
          />
        );
      case 'growth-tracking':
        return (
          <Table
            columns={growthTrackingColumns}
            data={growthTrackingData}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            title="Growth Tracking"
          />
        );
      case 'mortality':
        return (
          <Table
            columns={mortalityColumns}
            data={mortalities}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            title="Mortality Records"
          />
        );
             case 'barn':
        return (
          <Table
            columns={barnColumns}
            data={barns}  
            onAdd={handleAdd}
            onEdit={handleEdit}
            onDelete={handleDelete}
            title="Barn Records"
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Barn Records</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>

      {/* Modals */}
      <BatchModal
        isOpen={modalState.batch.isOpen}
        onClose={() => closeModal('batch')}
        onSave={handleSaveBatch}
        batch={modalState.batch.data}
        mode={modalState.batch.mode}
      />

      <DailyLogModal
        isOpen={modalState.dailyLog.isOpen}
        onClose={() => closeModal('dailyLog')}
        onSave={handleSaveDailyLog}
        log={modalState.dailyLog.data}
        mode={modalState.dailyLog.mode}
      />

      <HarvestModal
        isOpen={modalState.harvest.isOpen}
        onClose={() => closeModal('harvest')}
        onSave={handleSaveHarvest}
        harvest={modalState.harvest.data}
        mode={modalState.harvest.mode}
      />

      <GrowthTrackingModal
        isOpen={modalState.growthTracking.isOpen}
        onClose={() => closeModal('growthTracking')}
        onSave={handleSaveGrowthTracking}
        growth={modalState.growthTracking.data}
        mode={modalState.growthTracking.mode}
      />

      <MortalityModal
        isOpen={modalState.mortality.isOpen}
        onClose={() => closeModal('mortality')}
        onSave={handleSaveMortality}
        mortality={modalState.mortality.data}
        mode={modalState.mortality.mode}
      />


     <BarnModal
        isOpen={modalState.barn.isOpen}
        onClose={() => closeModal('barn')}
        onSave={handleSaveBarn}
        barn={modalState.barn.data}
        mode={modalState.barn.mode}
      />


      <DeleteModal
        isOpen={modalState.delete.isOpen}
        onClose={() => closeModal('delete')}
        onConfirm={handleConfirmDelete}
        title={modalState.delete.title}
        message={modalState.delete.message}
        itemName={modalState.delete.itemName}
      />
    </>
  );
};

export default BarnRecords;