const mongoose = require('mongoose');
const Ad = require('../models/Ad');
const AdEvent = require('../models/AdEvent');
require('../models/Admin');
const { NotFoundError, ValidationError } = require('../utils/errors');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function rangeMatch({ from, to } = {}) {
  if (!from && !to) return {};
  const occurredAt = {};
  if (from) occurredAt.$gte = from;
  if (to) occurredAt.$lte = to;
  return { occurredAt };
}

function summarizeCounts(countsByType) {
  const impressions = countsByType.IMPRESSION ?? 0;
  const clicks = countsByType.CLICK ?? 0;
  return { impressions, clicks, ctr: impressions > 0 ? clicks / impressions : 0 };
}

function adminFilter({ type, status, placement, q }) {
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (placement) filter.placement = placement;
  if (q) {
    const query = escapeRegExp(q);
    filter.$or = [
      { name: { $regex: query, $options: 'i' } },
      { 'google.adUnitId': { $regex: query, $options: 'i' } },
      { 'personal.title': { $regex: query, $options: 'i' } },
      { 'personal.body': { $regex: query, $options: 'i' } },
    ];
  }
  return filter;
}

function publicFilter({ type, placement }) {
  const now = new Date();
  const filter = {
    status: 'ACTIVE',
    $or: [
      { startsAt: { $lte: now }, endsAt: { $gte: now } },
      { startsAt: { $lte: now }, endsAt: null },
      { startsAt: null, endsAt: { $gte: now } },
      { startsAt: null, endsAt: null },
    ],
  };
  if (type) filter.type = type;
  if (placement) filter.placement = placement;
  return filter;
}

function normalizePersonal(source) {
  if (!source) return undefined;
  const personal = { ...(source.toObject ? source.toObject() : source) };
  const imageUrls = (personal.imageUrls ?? []).filter(Boolean);
  if (imageUrls.length === 0 && personal.imageUrl) {
    imageUrls.push(personal.imageUrl);
  }
  if (imageUrls.length > 0) {
    personal.imageUrl = imageUrls[0];
    personal.imageUrls = imageUrls;
  } else {
    delete personal.imageUrls;
  }
  return personal;
}

function toPublicAd(ad) {
  const source = ad.toObject();
  const personal = normalizePersonal(source.personal);
  return {
    _id: source._id.toString(),
    name: source.name,
    type: source.type,
    placement: source.placement,
    status: source.status,
    priority: source.priority,
    startsAt: source.startsAt,
    endsAt: source.endsAt,
    ...(source.google ? { google: source.google } : {}),
    ...(personal ? { personal } : {}),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

function assertProviderPayload(data) {
  if (data.type === 'GOOGLE' && !data.google) {
    throw new ValidationError('Google ads require a google payload');
  }
  if (data.type === 'PERSONAL' && !data.personal) {
    throw new ValidationError('Personal ads require a personal payload');
  }
  if (data.type === 'GOOGLE' && data.personal) {
    throw new ValidationError('Personal ad content is not allowed for Google ads');
  }
  if (data.type === 'PERSONAL' && data.google) {
    throw new ValidationError('Google ad content is not allowed for personal ads');
  }
}

async function listAds({ type, status, placement, q, page, limit, from, to }) {
  const filter = adminFilter({ type, status, placement, q });
  const [items, total] = await Promise.all([
    Ad.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Ad.countDocuments(filter),
  ]);
  const statsMap = await getAdsStats(
    items.map((ad) => ad._id.toString()),
    { from, to }
  );
  const itemsWithMetrics = items.map((ad) => {
    const plain = ad.toObject();
    return {
      ...plain,
      metrics: statsMap[plain._id.toString()] ?? { impressions: 0, clicks: 0, ctr: 0 },
    };
  });
  return { items: itemsWithMetrics, total };
}

async function getAd(id) {
  const ad = await Ad.findById(id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');
  if (!ad) throw new NotFoundError('Ad not found');
  return ad;
}

async function createAd(data, adminId) {
  assertProviderPayload(data);
  const payload = {
    ...data,
    ...(data.personal ? { personal: normalizePersonal(data.personal) } : {}),
    createdBy: adminId,
    updatedBy: adminId,
  };
  const ad = await Ad.create(payload);
  return getAd(ad._id);
}

async function updateAd(id, data, adminId) {
  const ad = await Ad.findById(id);
  if (!ad) throw new NotFoundError('Ad not found');

  if (data.type && data.type !== ad.type) {
    throw new ValidationError('Ad type cannot be changed');
  }

  const updates = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
  if (data.google) {
    updates.google = { ...(ad.google?.toObject?.() ?? {}), ...data.google };
  }
  if (data.personal) {
    updates.personal = normalizePersonal({
      ...(ad.personal?.toObject?.() ?? {}),
      ...data.personal,
    });
  }

  assertProviderPayload({ ...ad.toObject(), ...updates, type: ad.type });
  Object.assign(ad, updates, { updatedBy: adminId });
  await ad.save();
  return getAd(ad._id);
}

async function archiveAd(id, adminId) {
  const ad = await Ad.findById(id);
  if (!ad) throw new NotFoundError('Ad not found');
  ad.status = 'ARCHIVED';
  ad.updatedBy = adminId;
  await ad.save();
  return getAd(ad._id);
}

async function listPublicAds({ type, placement, limit }) {
  const filter = publicFilter({ type, placement });
  const ads = await Ad.find(filter)
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
  return ads.map(toPublicAd);
}

/**
 * Persists a batch of client-reported ad interactions. Unknown ad ids are
 * dropped rather than failing the whole batch so a stale client cannot
 * poison otherwise-valid events.
 */
async function recordAdEvents({ installationId, platform, appVersion, events }) {
  const adIds = [...new Set(events.map((event) => event.adId))];
  const known = await Ad.find({ _id: { $in: adIds } }).select('_id');
  const knownIds = new Set(known.map((ad) => ad._id.toString()));

  const docs = events
    .filter((event) => knownIds.has(event.adId))
    .map((event) => ({
      adId: event.adId,
      type: event.type,
      placement: event.placement,
      installationId,
      platform,
      appVersion,
      targetUrl: event.targetUrl,
      ...(event.at ? { occurredAt: event.at } : {}),
    }));

  if (docs.length === 0) return { accepted: 0 };
  await AdEvent.insertMany(docs, { ordered: false });
  return { accepted: docs.length };
}

/**
 * Aggregated performance for one ad: totals, CTR, unique installations, and a
 * per-day time series of impressions and clicks.
 */
async function getAdStats(adId, range = {}) {
  const match = { adId: new mongoose.Types.ObjectId(adId), ...rangeMatch(range) };
  const [byType, byDay, installs] = await Promise.all([
    AdEvent.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    AdEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' } },
            type: '$type',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
    AdEvent.distinct('installationId', match),
  ]);

  const countsByType = Object.fromEntries(byType.map((row) => [row._id, row.count]));
  const summary = summarizeCounts(countsByType);

  const seriesByDate = new Map();
  for (const row of byDay) {
    const entry = seriesByDate.get(row._id.date) ?? {
      date: row._id.date,
      impressions: 0,
      clicks: 0,
    };
    if (row._id.type === 'IMPRESSION') entry.impressions += row.count;
    else if (row._id.type === 'CLICK') entry.clicks += row.count;
    seriesByDate.set(row._id.date, entry);
  }

  return {
    adId,
    ...summary,
    uniqueInstallations: installs.filter(Boolean).length,
    series: [...seriesByDate.values()],
  };
}

/** Rollup for many ads at once, keyed by ad id, used by the admin list. */
async function getAdsStats(adIds, range = {}) {
  if (adIds.length === 0) return {};
  const match = {
    adId: { $in: adIds.map((id) => new mongoose.Types.ObjectId(id)) },
    ...rangeMatch(range),
  };
  const rows = await AdEvent.aggregate([
    { $match: match },
    { $group: { _id: { adId: '$adId', type: '$type' }, count: { $sum: 1 } } },
  ]);

  const map = {};
  for (const id of adIds) map[id] = { impressions: 0, clicks: 0, ctr: 0 };
  for (const row of rows) {
    const entry = map[row._id.adId.toString()];
    if (!entry) continue;
    if (row._id.type === 'IMPRESSION') entry.impressions += row.count;
    else if (row._id.type === 'CLICK') entry.clicks += row.count;
  }
  for (const entry of Object.values(map)) {
    entry.ctr = entry.impressions > 0 ? entry.clicks / entry.impressions : 0;
  }
  return map;
}

module.exports = {
  listAds,
  getAd,
  createAd,
  updateAd,
  archiveAd,
  listPublicAds,
  recordAdEvents,
  getAdStats,
  getAdsStats,
};
