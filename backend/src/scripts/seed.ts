import { getDatabase, closeDatabase } from '../db';
import { domainRulesService } from '../services/domain-rules';

async function seed() {
  console.log('Seeding database...');

  try {
    // Initialize database
    getDatabase();

    // Load domain rules
    await domainRulesService.loadSeedData();

    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

seed();

