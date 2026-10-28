import { execSync } from 'child_process';

console.log('======================================================');
console.log('🧪 RUNNING COMPREHENSIVE SUITE: ALL TESTS (ITEMS & BATCHES)');
console.log('======================================================\n');

const testFiles = [
  'src/utils/bulkImportValidation.test.ts',
  'src/utils/acceptanceTests.test.ts',
  'src/utils/batchImportValidation.test.ts',
  'src/utils/batchAcceptanceTests.test.ts',
  'src/utils/notificationTests.test.ts'
];

let allPassed = true;

for (const file of testFiles) {
  try {
    console.log(`\n▶️ Executing ${file}...`);
    execSync(`npx tsx ${file}`, { stdio: 'inherit' });
  } catch (err) {
    allPassed = false;
    console.error(`❌ Test suite failed in ${file}`);
    process.exit(1);
  }
}

if (allPassed) {
  console.log('\n======================================================');
  console.log('🎉 ALL TEST SUITES PASSED CLEANLY (100% SUCCESS)');
  console.log('======================================================\n');
}
