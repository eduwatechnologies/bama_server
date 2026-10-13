/**
 * Migration script to convert existing Word and Phrase documents
 * from the old format (english, hausa fields) to the new format
 * (translations map, audio map).
 *
 * Run with: node scripts/migrate-to-multilang.js
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const Word = require('../src/models/Word');
const Phrase = require('../src/models/Phrase');
const Counter = require('../src/models/Counter');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bama';

async function connect() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
}

async function migrateWords() {
  console.log('\n--- Migrating Words ---');
  const words = await Word.find({}).lean();
  console.log(`Found ${words.length} words to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const word of words) {
    // Check if already migrated (has translations field)
    if (word.translations && word.translations.en) {
      skipped++;
      continue;
    }

    const translations = {
      en: word.english || '',
      ha: word.hausa || '',
    };

    const audio = {};
    if (word.audio?.url) {
      audio.ha = word.audio.url;
    }

    const exampleSentence = {};
    if (word.exampleSentence?.english) {
      exampleSentence.en = word.exampleSentence.english;
    }
    if (word.exampleSentence?.hausa) {
      exampleSentence.ha = word.exampleSentence.hausa;
    }

    await Word.updateOne(
      { _id: word._id },
      {
        $set: {
          translations,
          audio,
          exampleSentence: Object.keys(exampleSentence).length > 0 ? exampleSentence : undefined,
        },
        $unset: {
          english: '',
          hausa: '',
          // Keep audio field for backward compat but it will be ignored
        },
      }
    );
    migrated++;
  }

  console.log(`Migrated: ${migrated}, Skipped (already migrated): ${skipped}`);
}

async function migratePhrases() {
  console.log('\n--- Migrating Phrases ---');
  const phrases = await Phrase.find({}).lean();
  console.log(`Found ${phrases.length} phrases to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const phrase of phrases) {
    // Check if already migrated (has translations field)
    if (phrase.translations && phrase.translations.en) {
      skipped++;
      continue;
    }

    const translations = {
      en: phrase.english || '',
      ha: phrase.hausa || '',
    };

    const audio = {};
    if (phrase.audio?.url) {
      audio.ha = phrase.audio.url;
    }

    await Phrase.updateOne(
      { _id: phrase._id },
      {
        $set: {
          translations,
          audio,
        },
        $unset: {
          english: '',
          hausa: '',
        },
      }
    );
    migrated++;
  }

  console.log(`Migrated: ${migrated}, Skipped (already migrated): ${skipped}`);
}

async function seedLanguages() {
  console.log('\n--- Seeding Languages ---');
  const Language = require('../src/models/Language');

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', isRTL: false, flag: '🇺🇸', isActive: true, order: 0 },
    { code: 'ha', name: 'Hausa', nativeName: 'Hausa', isRTL: false, flag: '🇳🇬', isActive: true, order: 1 },
  ];

  for (const lang of languages) {
    const existing = await Language.findOne({ code: lang.code });
    if (!existing) {
      await Language.create({ ...lang, createdBy: null, updatedBy: null });
      console.log(`Created language: ${lang.code} (${lang.name})`);
    } else {
      console.log(`Language ${lang.code} already exists, skipping`);
    }
  }
}

async function incrementContentVersion() {
  console.log('\n--- Incrementing Content Version ---');
  // Force a full sync by incrementing the content version counter
  const { getNextValue } = require('../src/models/Counter');
  const newVersion = await getNextValue('contentVersion');
  console.log(`Content version incremented to: ${newVersion}`);
}

async function main() {
  try {
    await connect();
    await seedLanguages();
    await migrateWords();
    await migratePhrases();
    await incrementContentVersion();
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();