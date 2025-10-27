import fs from 'fs';
import path from 'path';
import { getDatabase, closeDatabase } from '../db';
import { messageProcessor } from '../services/message-processor';
import { graphClient } from '../services/graph-client';
import { featureExtractor } from '../services/feature-extractor';
import { scorer } from '../services/scorer';

interface TestEmail {
  name: string;
  description: string;
  message: any;
  headers: any[];
  expectedDecision: string;
  expectedScoreRange: [number, number];
}

async function runTests() {
  console.log('=== Invora Email Filter Test Runner ===\n');

  // Load synthetic test emails
  const testDataPath = path.join(__dirname, '../test-data/synthetic-emails.json');
  const testEmails: TestEmail[] = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

  let passed = 0;
  let failed = 0;
  const results: any[] = [];

  for (const testEmail of testEmails) {
    console.log(`\nTesting: ${testEmail.name}`);
    console.log(`  Description: ${testEmail.description}`);

    try {
      // Extract features
      const features = await featureExtractor.extract(
        testEmail.message,
        testEmail.headers,
        'test-user@example.com'
      );

      // Calculate score
      const scoringResult = scorer.score(features);

      // Check if results match expectations
      const scoreInRange =
        scoringResult.finalScore >= testEmail.expectedScoreRange[0] &&
        scoringResult.finalScore <= testEmail.expectedScoreRange[1];

      const decisionMatches = scoringResult.decision === testEmail.expectedDecision;

      const testPassed = scoreInRange && decisionMatches;

      if (testPassed) {
        passed++;
        console.log(`  ✓ PASSED`);
      } else {
        failed++;
        console.log(`  ✗ FAILED`);
      }

      console.log(`  Expected: ${testEmail.expectedDecision} (${testEmail.expectedScoreRange[0]}-${testEmail.expectedScoreRange[1]})`);
      console.log(`  Actual: ${scoringResult.decision} (${scoringResult.finalScore})`);
      console.log(`  Reasons: ${scoringResult.reasons.length} risk factors detected`);

      results.push({
        name: testEmail.name,
        passed: testPassed,
        expected: {
          decision: testEmail.expectedDecision,
          scoreRange: testEmail.expectedScoreRange,
        },
        actual: {
          decision: scoringResult.decision,
          score: scoringResult.finalScore,
          reasons: scoringResult.reasons.map((r) => r.description),
        },
      });
    } catch (error) {
      failed++;
      console.log(`  ✗ ERROR: ${error}`);
      results.push({
        name: testEmail.name,
        passed: false,
        error: String(error),
      });
    }
  }

  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${testEmails.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / testEmails.length) * 100).toFixed(1)}%`);

  // Write detailed results
  const resultsPath = path.join(__dirname, '../../test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nDetailed results written to: ${resultsPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});

