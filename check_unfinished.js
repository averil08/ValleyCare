import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';
env.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUnfinished() {
    const { data, error } = await supabase
        .from('patients')
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const unfinished = data.filter(p => {
        // Only care about in progress or waiting
        if (p.status === 'done' || p.status === 'cancelled') return false;

        // Sometimes no status means waiting

        const regDateString = p.registered_at || p.appointment_datetime;
        if (!regDateString) return false;

        const regDate = new Date(regDateString);
        return regDate < today;
    });

    console.log(`Total patients in DB: ${data.length}`);
    console.log(`Unfinished from previous days: ${unfinished.length}`);
    if (unfinished.length > 0) {
        console.log('Sample unfinished cases:');
        unfinished.forEach(p => console.log(`ID: ${p.id}, Status: ${p.status}, Date: ${p.registered_at || p.appointment_datetime}, Name: ${p.name}, QueueNo: ${p.queue_no}`));
    }
}
checkUnfinished();
