require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('./logger');
const Category = require('../models/Category');
const Word = require('../models/Word');
const Phrase = require('../models/Phrase');
const { getNextValue, getCurrentValue, Counter } = require('../models/Counter');

const CONTENT_VERSION_COUNTER = 'contentVersion';

const CATEGORY_SEED = [
  { name: 'Greetings', slug: 'greetings', description: 'Start with warmth', icon: 'sun', status: 'ACTIVE' },
  { name: 'Classroom', slug: 'classroom', description: 'Help learning flow', icon: 'book-open', status: 'ACTIVE' },
  { name: 'Community', slug: 'community', description: 'Connect respectfully', icon: 'users', status: 'ACTIVE' },
  { name: 'Daily Conversation', slug: 'daily-conversation', description: 'Everyday moments', icon: 'message-circle', status: 'ACTIVE' },
  { name: 'Market', slug: 'market', description: 'Shop with confidence', icon: 'shopping-bag', status: 'ACTIVE' },
  { name: 'Directions', slug: 'directions', description: 'Find your way', icon: 'compass', status: 'ACTIVE' },
  { name: 'Emergency', slug: 'emergency', description: 'Get help quickly', icon: 'shield', status: 'ACTIVE' },
];

const WORD_SEED = {
  greetings: [
    { english: 'Hello', hausa: 'Sannu', description: 'A friendly greeting used at any time of day' },
    { english: 'Morning', hausa: 'Safiya', description: 'The early part of the day' },
    { english: 'Afternoon', hausa: 'Rana', description: 'The middle part of the day' },
    { english: 'Evening', hausa: 'Yamma', description: 'The later part of the day, before night' },
    { english: 'Night', hausa: 'Dare', description: 'The time when it is dark' },
    { english: 'Peace', hausa: 'Lafiya', description: 'State of well-being; often used in response to greetings' },
    { english: 'Thanks', hausa: 'Godiya', description: 'Expression of gratitude' },
    { english: 'Friend', hausa: 'Aboki', description: 'A person one knows and regards with affection' },
    { english: 'Family', hausa: 'Iyalai', description: 'A group of people related by blood or marriage' },
    { english: 'Welcome', hausa: 'Maraba', description: 'Greeted arrival' },
  ],
  classroom: [
    { english: 'Book', hausa: 'Littafi', description: 'A written or printed work' },
    { english: 'Teacher', hausa: 'Malami', description: 'A person who teaches, especially in a school' },
    { english: 'Student', hausa: 'Dalibi', description: 'A person who is studying' },
    { english: 'School', hausa: 'Makaranta', description: 'An institution for educating children' },
    { english: 'Pen', hausa: 'Alkalami', description: 'An instrument for writing with ink' },
    { english: 'Paper', hausa: 'Takarda', description: 'Material for writing or printing on' },
    { english: 'Read', hausa: 'Karanta', description: 'To look at and understand written or printed matter' },
    { english: 'Write', hausa: 'Rubuta', description: 'To mark letters, words, or symbols on a surface' },
    { english: 'Lesson', hausa: 'Darasi', description: 'A period of learning or teaching' },
    { english: 'Question', hausa: 'Tambaya', description: 'A sentence worded to elicit information' },
    { english: 'Answer', hausa: 'Amsa', description: 'A reaction to a question or situation' },
    { english: 'Class', hausa: 'Aji', description: 'A group of students taught together' },
  ],
  community: [
    { english: 'Name', hausa: 'Suna', description: 'The word or words by which a person is known' },
    { english: 'House', hausa: 'Gida', description: 'A building for human habitation' },
    { english: 'People', hausa: 'Mutane', description: 'Human beings in general or considered collectively' },
    { english: 'Village', hausa: 'Kauye', description: 'A group of houses and buildings, smaller than a town' },
    { english: 'Town', hausa: 'Gari', description: 'An urban area larger than a village' },
    { english: 'Country', hausa: 'Kasa', description: 'A nation with its own government' },
    { english: 'Work', hausa: 'Aiki', description: 'Activity involving mental or physical effort' },
    { english: 'Help', hausa: 'Taimako', description: 'To make it easier for someone to do something' },
    { english: 'Together', hausa: 'Tare', description: 'With or in proximity to another person or people' },
    { english: 'Respect', hausa: 'Girmama', description: 'A feeling of deep admiration for someone or something' },
    { english: 'Tomorrow', hausa: 'Gobe', description: 'The day after today' },
    { english: 'Yesterday', hausa: 'Jiya', description: 'The day before today' },
  ],
  'daily-conversation': [
    { english: 'Water', hausa: 'Ruwa', description: 'A clear liquid essential for life' },
    { english: 'Food', hausa: 'Abinci', description: 'Any nutritious substance that people eat or drink' },
    { english: 'Eat', hausa: 'Ci', description: 'To put food into the mouth and swallow it' },
    { english: 'Drink', hausa: 'Sha', description: 'To take liquid into the mouth and swallow it' },
    { english: 'Sleep', hausa: 'Barci', description: 'A natural state of rest for the body and mind' },
    { english: 'Go', hausa: 'Tafi', description: 'To move from one place to another' },
    { english: 'Come', hausa: 'Zo', description: 'To move towards the speaker' },
    { english: 'Day', hausa: 'Rana', description: 'A period of twenty-four hours' },
    { english: 'Time', hausa: 'Lokaci', description: 'The indefinite continued progress of existence' },
    { english: 'Man', hausa: 'Namiji', description: 'An adult human male' },
    { english: 'Woman', hausa: 'Mace', description: 'An adult human female' },
    { english: 'Child', hausa: 'Yaro', description: 'A young human being below the age of puberty' },
  ],
  market: [
    { english: 'Market', hausa: 'Kasuwa', description: 'A regular gathering of people for the purchase and sale of goods' },
    { english: 'Money', hausa: 'Kudi', description: 'A medium of exchange in the form of coins and banknotes' },
    { english: 'Price', hausa: 'Farashi', description: 'The amount of money expected or given in payment for something' },
    { english: 'Buy', hausa: 'Saya', description: 'To acquire in exchange for payment' },
    { english: 'Sell', hausa: 'Sayarwa', description: 'To give or hand over something in exchange for money' },
    { english: 'Cheap', hausa: 'Arha', description: 'Low in price, especially compared with similar items' },
    { english: 'Expensive', hausa: 'Tsada', description: 'Costing a lot of money' },
    { english: 'Bag', hausa: 'Jaka', description: 'A flexible container with an opening at the top' },
    { english: 'Shop', hausa: 'Shago', description: 'A place where goods or services are sold' },
    { english: 'Customer', hausa: 'Mabukaci', description: 'A person who buys goods or services from a shop or business' },
  ],
  directions: [
    { english: 'Road', hausa: 'Hanya', description: 'A paved way for traveling between places' },
    { english: 'Way', hausa: 'Hanya', description: 'A course of travel leading to a destination' },
    { english: 'Left', hausa: 'Hagu', description: 'The side of a person facing west that is toward the north' },
    { english: 'Right', hausa: 'Dama', description: 'The side of a person facing west that is toward the south' },
    { english: 'Straight', hausa: 'Kai tsaye', description: 'Extending or moving uniformly in one direction only' },
    { english: 'Near', hausa: 'Kusa', description: 'At or to a short distance away' },
    { english: 'Far', hausa: 'Nesa', description: 'At, to, or by a great distance' },
    { english: 'Stop', hausa: 'Tsaya', description: 'To cease from moving or doing something' },
    { english: 'Walk', hausa: 'Tafiya', description: 'To move at a regular pace by lifting and setting down each foot' },
    { english: 'Car', hausa: 'Mota', description: 'A road vehicle powered by an internal combustion engine' },
  ],
  emergency: [
    { english: 'Hospital', hausa: 'Asibiti', description: 'An institution providing medical and surgical treatment' },
    { english: 'Police', hausa: 'Yan sanda', description: 'The civil force of a state responsible for maintaining order' },
    { english: 'Doctor', hausa: 'Likita', description: 'A qualified medical practitioner' },
    { english: 'Sick', hausa: 'Ciwo', description: 'Affected by physical or mental illness' },
    { english: 'Pain', hausa: 'Rauni', description: 'Highly unpleasant physical sensation caused by illness or injury' },
    { english: 'Danger', hausa: 'Hadari', description: 'The possibility of suffering harm or injury' },
    { english: 'Fire', hausa: 'Wuta', description: 'Combustion in which materials are ignited and give off light and heat' },
    { english: 'Safe', hausa: 'Tsaro', description: 'Protected from or not exposed to danger or risk' },
    { english: 'Call', hausa: 'Kira', description: 'To cry out to someone in order to summon them' },
    { english: 'Quick', hausa: 'Sauri', description: 'Moving fast or doing something in a short time' },
  ],
};

const PHRASE_SEED = {
  greetings: [
    { english: 'Good morning', hausa: 'Ina kwana' },
    { english: 'Good afternoon', hausa: 'Ina yini' },
    { english: 'Good evening', hausa: 'Barka da yamma' },
    { english: 'How are you?', hausa: 'Yaya kake?' },
    { english: 'I am fine', hausa: 'Lafiya lau' },
    { english: 'Welcome', hausa: 'Barka da zuwa' },
    { english: 'Thank you', hausa: 'Na gode' },
    { english: 'You are welcome', hausa: 'Babu komai' },
    { english: 'Please', hausa: 'Don Allah' },
    { english: 'Goodbye', hausa: 'Sai an jima' },
  ],
  classroom: [
    { english: 'Sit down', hausa: 'Zauna' },
    { english: 'Stand up', hausa: 'Tashi' },
    { english: 'Listen carefully', hausa: 'Ku saurara da kyau' },
    { english: 'Read this', hausa: 'Karanta wannan' },
    { english: 'Write your name', hausa: 'Rubuta sunanka' },
    { english: 'Do you understand?', hausa: 'Ka fahimta?' },
    { english: 'I understand', hausa: 'Na fahimta' },
    { english: 'Repeat after me', hausa: 'Maimaita bayana' },
    { english: 'Open your book', hausa: 'Bude littafinka' },
    { english: 'Any questions?', hausa: 'Akwai tambaya?' },
  ],
  community: [
    { english: 'What is your name?', hausa: 'Menene sunanka?' },
    { english: 'My name is...', hausa: 'Sunana...' },
    { english: 'Where do you live?', hausa: 'Ina kake zama?' },
    { english: 'I am from Nigeria', hausa: 'Ni dan Najeriya ne' },
    { english: 'I am here to help', hausa: 'Na zo ne don taimako' },
    { english: 'Let us work together', hausa: 'Mu yi aiki tare' },
    { english: 'This is important', hausa: 'Wannan yana da muhimmanci' },
    { english: 'Please tell me', hausa: 'Don Allah ka gaya mini' },
    { english: 'I need your help', hausa: 'Ina bukatar taimakonka' },
    { english: 'See you tomorrow', hausa: 'Sai gobe' },
  ],
  'daily-conversation': [
    { english: 'How is your day?', hausa: 'Yaya ranarka?' },
    { english: 'I am hungry', hausa: 'Ina jin yunwa' },
    { english: 'I am thirsty', hausa: 'Ina jin kishirwa' },
    { english: 'Let us go', hausa: 'Mu tafi' },
    { english: 'Wait a moment', hausa: 'Jira kadan' },
    { english: 'Come here', hausa: 'Zo nan' },
    { english: 'What happened?', hausa: 'Me ya faru?' },
    { english: 'I do not know', hausa: 'Ban sani ba' },
    { english: 'That is okay', hausa: 'Ba komai' },
    { english: 'See you later', hausa: 'Sai an jima' },
  ],
  market: [
    { english: 'How much is this?', hausa: 'Nawa ne wannan?' },
    { english: 'I want to buy this', hausa: 'Ina son in sayi wannan' },
    { english: 'That is too expensive', hausa: 'Wannan ya yi tsada sosai' },
    { english: 'Can you reduce the price?', hausa: 'Za ka rage farashin?' },
    { english: 'Do you have something smaller?', hausa: 'Kana da karami?' },
    { english: 'I am just looking', hausa: 'Ina kallo ne kawai' },
    { english: 'Give me two', hausa: 'Ba ni guda biyu' },
    { english: 'Do you accept cash?', hausa: 'Kuna karbar kudi?' },
    { english: 'Where is the market?', hausa: 'Ina kasuwa?' },
    { english: 'Thank you, I will come back', hausa: 'Na gode, zan dawo' },
  ],
  directions: [
    { english: 'Where is the school?', hausa: 'Ina makaranta?' },
    { english: 'Where is the hospital?', hausa: 'Ina asibiti?' },
    { english: 'Go straight', hausa: 'Je kai tsaye' },
    { english: 'Turn left', hausa: 'Juya hagu' },
    { english: 'Turn right', hausa: 'Juya dama' },
    { english: 'It is near here', hausa: 'Yana kusa da nan' },
    { english: 'It is far from here', hausa: 'Yana nesa da nan' },
    { english: 'Please show me the way', hausa: 'Don Allah nuna mini hanya' },
    { english: 'Can I walk there?', hausa: 'Zan iya tafiya can?' },
    { english: 'Stop here', hausa: 'Tsaya nan' },
  ],
  emergency: [
    { english: 'Help!', hausa: 'Taimako!' },
    { english: 'Call the police', hausa: 'Kira ’yan sanda' },
    { english: 'Call an ambulance', hausa: 'Kira motar asibiti' },
    { english: 'I am hurt', hausa: 'Na ji rauni' },
    { english: 'Someone is sick', hausa: 'Wani ba shi da lafiya' },
    { english: 'Where is the nearest hospital?', hausa: 'Ina asibitin da ya fi kusa?' },
    { english: 'Please stay calm', hausa: 'Don Allah ka kwantar da hankalinka' },
    { english: 'It is dangerous', hausa: 'Yana da hadari' },
    { english: 'I need a doctor', hausa: 'Ina bukatar likita' },
    { english: 'Do not move', hausa: 'Kada ka motsa' },
  ],
};

async function seedCategories() {
  const bySlug = {};
  for (const cat of CATEGORY_SEED) {
    const doc = await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    bySlug[cat.slug] = doc;
    logger.info({ slug: cat.slug, id: doc._id.toString() }, 'Category seeded');
  }
  return bySlug;
}

async function seedWords(categoriesBySlug) {
  let totalWords = 0;
  let publishedVersion = 0;
  for (const [slug, words] of Object.entries(WORD_SEED)) {
    const category = categoriesBySlug[slug];
    if (!category) {
      logger.warn({ slug }, 'Skipping words: no matching category');
      continue;
    }
    for (const w of words) {
      publishedVersion = await getNextValue(CONTENT_VERSION_COUNTER);
      const payload = {
        ...w,
        categoryId: category._id,
        status: 'PUBLISHED',
        version: publishedVersion,
      };
      await Word.findOneAndUpdate(
        { english: w.english, hausa: w.hausa, categoryId: category._id },
        { $setOnInsert: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      totalWords++;
    }
  }
  logger.info({ count: totalWords, latestVersion: publishedVersion }, 'Words seeded');
  return totalWords;
}

async function seedPhrases(categoriesBySlug) {
  let totalPhrases = 0;
  let latestVersion = await getCurrentValue(CONTENT_VERSION_COUNTER);
  for (const [slug, phrases] of Object.entries(PHRASE_SEED)) {
    const category = categoriesBySlug[slug];
    if (!category) {
      logger.warn({ slug }, 'Skipping phrases: no matching category');
      continue;
    }
    for (const p of phrases) {
      latestVersion = await getNextValue(CONTENT_VERSION_COUNTER);
      const payload = {
        english: p.english,
        hausa: p.hausa,
        categoryId: category._id,
        status: 'PUBLISHED',
        version: latestVersion,
      };
      await Phrase.findOneAndUpdate(
        { english: p.english, hausa: p.hausa, categoryId: category._id },
        { $setOnInsert: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      totalPhrases++;
    }
  }
  logger.info({ count: totalPhrases, latestVersion }, 'Phrases seeded');
  return totalPhrases;
}

async function seedContent() {
  await mongoose.connect(env.mongodbUri);
  logger.info('Connected to MongoDB for content seeding');

  const startVersion = await getCurrentValue(CONTENT_VERSION_COUNTER);
  logger.info({ startVersion }, 'Initial content version');

  const categoriesBySlug = await seedCategories();
  const wordCount = await seedWords(categoriesBySlug);
  const phraseCount = await seedPhrases(categoriesBySlug);

  const endVersion = await getCurrentValue(CONTENT_VERSION_COUNTER);
  logger.info({ wordCount, phraseCount, endVersion }, 'Content seed complete');

  await mongoose.disconnect();
}

seedContent()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, 'Content seed failed');
    process.exit(1);
  });
