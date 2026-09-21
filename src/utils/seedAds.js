require('dotenv').config();
const mongoose = require('mongoose');
const env = require('../config/env');
const logger = require('./logger');
const Ad = require('../models/Ad');
const Admin = require('../models/Admin');

const AD_SEED = [
  // Google Ads
  {
    name: 'Home Banner - Test',
    type: 'GOOGLE',
    placement: 'HOME_TOP',
    status: 'ACTIVE',
    priority: 100,
    google: {
      adUnitId: 'ca-app-pub-3940256099942544/6300978111', // Google test ad unit
      format: 'BANNER',
      testMode: true,
    },
  },
  {
    name: 'Phrase Detail - Google Banner',
    type: 'GOOGLE',
    placement: 'PHRASE_DETAIL_BOTTOM',
    status: 'ACTIVE',
    priority: 80,
    google: {
      adUnitId: 'ca-app-pub-3940256099942544/6300978111',
      format: 'BANNER',
      testMode: true,
    },
  },
  {
    name: 'Home Interstitial - Test',
    type: 'GOOGLE',
    placement: 'HOME_BOTTOM',
    status: 'ACTIVE',
    priority: 60,
    google: {
      adUnitId: 'ca-app-pub-3940256099942544/1033173712', // Google test interstitial
      format: 'INTERSTITIAL',
      testMode: true,
    },
  },
  {
    name: 'Translate Rewarded - Test',
    type: 'GOOGLE',
    placement: 'TRANSLATE_BOTTOM',
    status: 'ACTIVE',
    priority: 50,
    google: {
      adUnitId: 'ca-app-pub-3940256099942544/5224354917', // Google test rewarded
      format: 'REWARDED',
      testMode: true,
    },
  },
  // Personal Ads
  {
    name: 'Learn Hausa Promo',
    type: 'PERSONAL',
    placement: 'HOME_TOP',
    status: 'ACTIVE',
    priority: 90,
    personal: {
      title: 'Learn Hausa Faster',
      body: 'Unlock premium lessons and practice with native speakers. Start your free trial today!',
      imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=200&fit=crop',
      targetUrl: 'https://example.com/premium',
      ctaText: 'Start Free Trial',
    },
  },
  {
    name: 'Premium Dictionary',
    type: 'PERSONAL',
    placement: 'PHRASE_DETAIL_BOTTOM',
    status: 'ACTIVE',
    priority: 70,
    personal: {
      title: 'Unlock Full Dictionary',
      body: 'Access 10,000+ Hausa words with audio, examples, and offline sync.',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop',
      targetUrl: 'https://example.com/dictionary',
      ctaText: 'Upgrade Now',
    },
  },
  {
    name: 'Community Event Promo',
    type: 'PERSONAL',
    placement: 'HOME_BOTTOM',
    status: 'DRAFT',
    priority: 40,
    personal: {
      title: 'Join Hausa Community',
      body: 'Connect with learners worldwide. Weekly practice sessions and cultural exchange.',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop',
      targetUrl: 'https://example.com/community',
      ctaText: 'Join Now',
    },
  },
  {
    name: 'Offline Pack Promo',
    type: 'PERSONAL',
    placement: 'PHRASES_BOTTOM',
    status: 'ACTIVE',
    priority: 75,
    personal: {
      title: 'Download Offline Pack',
      body: 'Get all phrases for offline access. Perfect for travel and poor connectivity.',
      imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop',
      targetUrl: 'https://example.com/offline',
      ctaText: 'Download',
    },
  },
];

async function run() {
  try {
    await mongoose.connect(env.mongodbUri);
    logger.info('Connected to MongoDB');

    // Get an admin user to set as creator
    const admin = await Admin.findOne().select('_id');
    if (!admin) {
      logger.error('No admin user found. Run seed:admin first.');
      process.exit(1);
    }

    // Clear existing ads
    await Ad.deleteMany({});
    logger.info('Cleared existing ads');

    // Insert seed ads
    const adsToCreate = AD_SEED.map(ad => ({
      ...ad,
      createdBy: admin._id,
      updatedBy: admin._id,
    }));

    const created = await Ad.insertMany(adsToCreate);
    logger.info({ count: created.length }, 'Seed ads created');

    // List created ads
    for (const ad of created) {
      logger.info({
        id: ad._id,
        name: ad.name,
        type: ad.type,
        placement: ad.placement,
        status: ad.status,
      }, 'Created ad');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Seed ads failed');
    process.exit(1);
  }
}

run();