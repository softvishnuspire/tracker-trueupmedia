const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testCreateFreelancerTask() {
    console.log('Attempting to create a freelancer task...');
    
    const taskData = {
        freelancer_name: 'Test Freelancer',
        freelancer_phone: '1234567890',
        freelancer_email: 'test@example.com',
        content_type: 'Post',
        scheduled_datetime: new Date().toISOString(),
        title: 'Test Freelancer Task',
        description: 'Test Description',
        status: 'PENDING'
    };

    const { data, error } = await supabase
        .from('content_items')
        .insert([taskData])
        .select();

    if (error) {
        console.error('Error creating task:', error.message);
    } else {
        console.log('Task created successfully:', data[0]);
    }
}

testCreateFreelancerTask();
