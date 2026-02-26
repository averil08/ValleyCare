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

async function updateUnfinished() {
    console.log("Fetching patients...");
    const { data, error } = await supabase
        .from('patients')
        .select('*');

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const unfinished = data.filter(p => {
        // Only care about in progress or waiting
        if (p.status === 'done' || p.status === 'cancelled') return false;

        const regDateString = p.registered_at || p.appointment_datetime;
        if (!regDateString) return false;

        const regDate = new Date(regDateString);
        return regDate < today;
    });

    console.log(`Found ${unfinished.length} unfinished cases from previous days.`);

    if (unfinished.length === 0) {
        console.log("No records to update.");
        return;
    }

    // Update records
    let successCount = 0;
    let failCount = 0;

    for (const patient of unfinished) {
        const { error: updateError } = await supabase
            .from('patients')
            .update({ status: 'done', completed_at: new Date().toISOString() })
            .eq('id', patient.id);

        if (updateError) {
            console.error(`Failed to update ${patient.id} (${patient.name}):`, updateError);
            failCount++;
        } else {
            successCount++;
        }
    }

    console.log(`\nUpdate Summary:`);
    console.log(`Successfully updated to "done": ${successCount}`);
    console.log(`Failed to update: ${failCount}`);
}

updateUnfinished();
