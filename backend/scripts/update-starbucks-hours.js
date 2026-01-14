const db = require('../src/database');

async function updateStarbucksHours() {
  console.log('🔄 Updating Starbucks hours...');
  
  try {
    await db.init();
    
    // Get current dining hours
    const currentHours = await db.getFacilityHours('dining');
    console.log(`📊 Found ${currentHours.length} existing dining hour records`);
    
    // Filter out Starbucks hours
    const otherDiningHours = currentHours.filter(h => h.section_name !== 'Starbucks');
    console.log(`✂️  Removed ${currentHours.length - otherDiningHours.length} Starbucks records`);
    
    // Define new Starbucks hours
    // Mon-Thu: 8:00 AM - 5:00 PM
    // Fri: 7:30 AM - 9:00 PM
    // Sat-Sun: 1:00 PM - 8:00 PM
    const newStarbucksHours = [
      { section_name: "Starbucks", day_of_week: "Monday", open_time: "8:00 AM", close_time: "5:00 PM", is_closed: false },
      { section_name: "Starbucks", day_of_week: "Tuesday", open_time: "8:00 AM", close_time: "5:00 PM", is_closed: false },
      { section_name: "Starbucks", day_of_week: "Wednesday", open_time: "8:00 AM", close_time: "5:00 PM", is_closed: false },
      { section_name: "Starbucks", day_of_week: "Thursday", open_time: "8:00 AM", close_time: "5:00 PM", is_closed: false },
      { section_name: "Starbucks", day_of_week: "Friday", open_time: "7:30 AM", close_time: "9:00 PM", is_closed: false },
      { section_name: "Starbucks", day_of_week: "Saturday", open_time: "1:00 PM", close_time: "8:00 PM", is_closed: false },
      { section_name: "Starbucks", day_of_week: "Sunday", open_time: "1:00 PM", close_time: "8:00 PM", is_closed: false }
    ];
    
    // Combine: other dining locations + new Starbucks hours
    const allHours = [
      ...otherDiningHours.map(h => ({
        section_name: h.section_name,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed || false,
        notes: h.notes || null
      })),
      ...newStarbucksHours
    ];
    
    console.log(`📝 Updating database with ${allHours.length} total records (including ${newStarbucksHours.length} Starbucks records)`);
    
    // Update the database
    await db.updateFacilityHours('dining', allHours);
    
    console.log('✅ Starbucks hours updated successfully!');
    console.log('\nNew Starbucks Hours:');
    console.log('  Mon-Thu: 8:00 AM - 5:00 PM');
    console.log('  Friday:  7:30 AM - 9:00 PM');
    console.log('  Sat-Sun: 1:00 PM - 8:00 PM');
    
  } catch (error) {
    console.error('❌ Error updating Starbucks hours:', error.message);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run the update
updateStarbucksHours();

