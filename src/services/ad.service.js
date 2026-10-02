const Ad = require('../models/Ad');
require('../models/Admin');
const { NotFoundError, ValidationError } = require('../utils/errors');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

async function listAds({ type, status, placement, q, page, limit }) {
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
  return { items, total };
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

module.exports = {
  listAds,
  getAd,
  createAd,
  updateAd,
  archiveAd,
  listPublicAds,
};
