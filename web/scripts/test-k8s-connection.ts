#!/usr/bin/env tsx

/**
 * Simple script to test Kubernetes connection
 */

// Load environment variables
import 'dotenv/config';
import { getClusters, getClusterConfig } from '../src/lib/k8s-client';

async function main(): Promise<void> {
  try {
    console.log('🔗 Testing Kubernetes connection...');
    console.log('');

    // List available clusters
    const clusters = await getClusters();
    console.log('Available clusters:');
    for (const cluster of clusters) {
      console.log(`  - ${cluster.name} (from ${cluster.source})`);
      console.log(`    Endpoint: ${cluster.endpoint}`);
    }
    console.log('');

    if (clusters.length === 0) {
      console.log('❌ No Kubernetes clusters configured.');
      console.log('Make sure KUBECONFIG_PRIMARY or another KUBECONFIG_* environment variable is set.');
      process.exit(1);
    }

    // Test connection to the first cluster
    const kc = await getClusterConfig();
    if (!kc) {
      console.log('❌ Could not get cluster configuration');
      process.exit(1);
    }

    const clusterInfo = kc.getClusterInfo();
    console.log(`✅ Successfully connected to cluster: ${clusterInfo.name}`);
    console.log(`   Endpoint: ${clusterInfo.endpoint}`);

  } catch (error) {
    console.error('❌ Error testing Kubernetes connection:', error);
    process.exit(1);
  }
}

// Run the script
main();