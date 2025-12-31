import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking requests table schema...');
  
  // Try to select if possible
  const { data, error } = await supabase
    .from('requests')
    .select('*')
    .limit(1);

  if (error) {
    console.error('REST API Error:', error.message);
    if (error.message.includes("column 'item_name' does not exist")) {
        console.log('CONFIRMED: Column item_name is missing.');
    }
  } else {
    console.log('Success! Sample columns:', data.length > 0 ? Object.keys(data[0]) : 'Empty table');
  }
}

checkSchema();
