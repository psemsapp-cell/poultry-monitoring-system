export interface SensorReading {
  id: string;
  date: string;
  time: string;
  value: number;
  status: string;
}

export interface Barn {
  id: string;             // change number → string
  barn_name: string;
  description: string;
  date: string;
}


export interface Staff {
  id: number;
  full_name: string;
  email: string;
  address: string;
  password: string;
  role: string;
}



export interface Batch {
  id: number;
  barn_id: number;   // ✅ number, matches DB
  batch_name: string;
  breed: string;
  no_chicken: number;
  date_started: string;
  date_completed?: string | null;
  status: string;
}




export interface DailyLog {
  id: string;
  batch_id: string;
  date: string;
  mortality_id: number;
  quantity: number; 
  user_id: number;
    // optional if API already returns it
  batch_name?: string;

  // frontend-enriched fields
  mortality_cause?: string;
  mortality_quantity?: number;
  mortality_notes?: string;
}


// types/index.ts
export interface Mortality {
  id: number;
  user_id: number;
  barn_id: number; // <-- change from string to number
  cause: string;
  notes: string;
  date: string;
  quantity: number;
}


export interface Harvest {
  id: string;
  batch_id: string;
  date: string;
  harvest: number;
  number_of_boxes: number;
}

export interface GrowthTracking {
  id: string;
  batch_id: string;
  date: string;
  age: number;
  total_weight: number;
  no_chickens: number;
  average_weight_kg: number;
}

export interface ForecastData {
  actual_mortality: number;
  predicted_mortality: number;
  actual_harvest: number;
  predicted_harvest: number;
}

export interface BatchReport {
  id: string;
  date_started: string;
  date_completed?: string;
  avg_temperature: number;
  avg_humidity: number;
  avg_ammonia: number;
  avg_co2: number;
  mortality: number;
  harvest: number;
}