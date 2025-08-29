#!/usr/bin/env node

/**
 * Script to merge coverage reports from Jest and Playwright
 * This combines LCOV coverage data from both test runners
 */

const fs = require('fs');
const path = require('path');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { createContext } = require('istanbul-lib-report');
const reports = require('istanbul-reports');

const coverageDir = path.join(__dirname, '..', 'coverage');
const artifactsDir = path.join(__dirname, '..', 'coverage-artifacts');
const jestCoverageFile = path.join(coverageDir, 'coverage-final.json');
const artifactsCoverageFile = path.join(artifactsDir, 'coverage-final.json');
const playwrightCoverageDir = path.join(__dirname, '..', 'test-results');
const mergedCoverageFile = path.join(coverageDir, 'coverage-merged.json');
const mergedLcovFile = path.join(coverageDir, 'lcov-merged.info');

async function mergeCoverage() {
  console.log('🔄 Merging coverage reports...');
  
  // Create coverage map
  const map = createCoverageMap();
  
  // Add Jest coverage if it exists
  if (fs.existsSync(jestCoverageFile)) {
    console.log('📊 Adding Jest coverage data from local...');
    const jestCoverage = JSON.parse(fs.readFileSync(jestCoverageFile, 'utf8'));
    map.merge(jestCoverage);
  } else if (fs.existsSync(artifactsCoverageFile)) {
    console.log('📊 Adding Jest coverage data from artifacts...');
    const jestCoverage = JSON.parse(fs.readFileSync(artifactsCoverageFile, 'utf8'));
    map.merge(jestCoverage);
  } else {
    console.log('⚠️  No Jest coverage files found, skipping...');
  }
  
  // Add Playwright coverage if directory exists
  if (fs.existsSync(playwrightCoverageDir)) {
    console.log('🎭 Looking for Playwright coverage data...');
    
    // Look for V8 coverage files from Playwright
    const findCoverageFiles = (dir) => {
      const files = [];
      if (fs.existsSync(dir)) {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            files.push(...findCoverageFiles(fullPath));
          } else if (item.includes('coverage') && item.endsWith('.json')) {
            files.push(fullPath);
          }
        }
      }
      return files;
    };
    
    const playwrightCoverageFiles = findCoverageFiles(playwrightCoverageDir);
    
    if (playwrightCoverageFiles.length > 0) {
      console.log(`📁 Found ${playwrightCoverageFiles.length} Playwright coverage file(s)`);
      
      for (const file of playwrightCoverageFiles) {
        try {
          const coverage = JSON.parse(fs.readFileSync(file, 'utf8'));
          map.merge(coverage);
          console.log(`✅ Merged coverage from ${path.basename(file)}`);
        } catch (error) {
          console.log(`⚠️  Failed to read coverage file ${file}:`, error.message);
        }
      }
    } else {
      console.log('⚠️  No Playwright coverage files found');
    }
  } else {
    console.log('⚠️  Playwright test results directory not found, skipping...');
  }
  
  // Ensure coverage directory exists
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }
  
  // Write merged coverage
  fs.writeFileSync(mergedCoverageFile, JSON.stringify(map.getCoverageSummary().data, null, 2));
  console.log(`💾 Merged coverage written to ${mergedCoverageFile}`);
  
  // Generate reports
  const context = createContext({
    dir: coverageDir,
    coverageMap: map,
    watermarks: {
      statements: [70, 90],
      functions: [70, 90],
      branches: [70, 90],
      lines: [70, 90]
    }
  });
  
  // Generate HTML report
  const htmlReport = reports.create('html', {
    subdir: 'html-merged',
    skipEmpty: false,
    skipFull: false
  });
  htmlReport.execute(context);
  console.log('📈 HTML coverage report generated in coverage/html-merged/');
  
  // Generate LCOV report for CI
  const lcovReport = reports.create('lcovonly', {
    file: 'lcov-merged.info'
  });
  lcovReport.execute(context);
  console.log('📄 LCOV coverage report generated as coverage/lcov-merged.info');
  
  // Generate text summary
  const textReport = reports.create('text-summary');
  textReport.execute(context);
  
  console.log('✅ Coverage merge completed successfully!');
}

// Run the merge
mergeCoverage().catch(error => {
  console.error('❌ Error merging coverage:', error);
  process.exit(1);
});