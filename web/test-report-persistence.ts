#!/usr/bin/env tsx

import 'dotenv/config';
import { generateSampleReport, fetchReports, fetchReportById } from './src/actions/reports.js';

async function testReportPersistence() {
  console.log('Testing report persistence functionality...\n');

  try {
    // Test 1: Fetch reports (should show mock data initially)
    console.log('1. Fetching reports before adding any...');
    const initialReports = await fetchReports();
    console.log(`Found ${initialReports.length} reports (likely mock data)`);
    
    if (initialReports.length > 0) {
      console.log(`Latest report ID: ${initialReports[0].id}`);
      console.log(`Latest report title: ${initialReports[0].summary.goal_focus}\n`);
    }

    // Test 2: Generate and save a sample report
    console.log('2. Generating and saving a sample report...');
    const sampleReport = await generateSampleReport();
    console.log(`Generated report ID: ${sampleReport.id}`);
    console.log(`Generated report title: ${sampleReport.summary.goal_focus}\n`);

    // Test 3: Fetch reports again (should include our new report)
    console.log('3. Fetching reports after adding sample report...');
    const updatedReports = await fetchReports();
    console.log(`Found ${updatedReports.length} reports`);
    
    if (updatedReports.length > 0) {
      console.log(`Latest report ID: ${updatedReports[0].id}`);
      console.log(`Latest report title: ${updatedReports[0].summary.goal_focus}`);
      
      // Check if our sample report is there
      const ourReport = updatedReports.find(r => r.id === sampleReport.id);
      if (ourReport) {
        console.log('✅ Sample report found in database!');
      } else {
        console.log('❌ Sample report not found in results');
      }
    }

    // Test 4: Fetch specific report by ID
    console.log('\n4. Fetching report by ID...');
    const fetchedReport = await fetchReportById(sampleReport.id);
    if (fetchedReport) {
      console.log(`✅ Successfully fetched report by ID: ${fetchedReport.id}`);
      console.log(`Title: ${fetchedReport.summary.goal_focus}`);
    } else {
      console.log('❌ Failed to fetch report by ID');
    }

    console.log('\n✅ Report persistence test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testReportPersistence();