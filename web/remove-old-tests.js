const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '__tests__', 'e2e');
const filesToRemove = [
    'repos.spec.ts',
    'projects.spec.ts',
    'teams.spec.ts',
    'project-manifests.spec.ts',
    'github-webhook-namespace.spec.ts',
    'project-environments-setup.spec.ts',
    'smoke.spec.ts',
    'pull-requests.spec.ts',
    'clusters.spec.ts',
    'team-authorization.spec.ts',
    'cluster-namespaces.spec.ts'
];

console.log('Removing old test files...');

filesToRemove.forEach(filename => {
    const filepath = path.join(testDir, filename);
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            console.log(`✓ Removed: ${filename}`);
        } else {
            console.log(`⚠ Not found: ${filename}`);
        }
    } catch (error) {
        console.error(`✗ Error removing ${filename}:`, error.message);
        process.exit(1);
    }
});

console.log('\n✓ All old test files removed successfully');
