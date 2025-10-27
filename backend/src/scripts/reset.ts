import { getDatabase, closeDatabase } from '../db';
import fs from 'fs';
import { config } from '../config';

function reset() {
  console.log('Resetting database...');

  try {
    // Close any existing connections
    closeDatabase();

    // Delete database file
    if (fs.existsSync(config.database.path)) {
      fs.unlinkSync(config.database.path);
      console.log('Database file deleted');
    }

    // Re-initialize (will create new schema)
    getDatabase();
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

reset();

