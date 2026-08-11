const crypto = require('crypto');
const BaseRepo = require('./baseRepo');

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof RegExp) && !(value instanceof Date);
}

function normalizeDateValue(value) {
    if (value instanceof Date) return value.toISOString();
    return value;
}

function matchesCondition(doc, filter = {}) {
    if (!filter || !Object.keys(filter).length) return true;

    return Object.entries(filter).every(([field, expected]) => {
        if (field === '$or' && Array.isArray(expected)) {
            return expected.some((clause) => matchesCondition(doc, clause));
        }

        const actual = doc?.[field];

        if (expected instanceof RegExp) {
            return expected.test(String(actual || ''));
        }

        if (isPlainObject(expected) && Array.isArray(expected.$in)) {
            return expected.$in.map((item) => String(item)).includes(String(actual));
        }

        if (isPlainObject(expected) && expected.$gt !== undefined) {
            return Number(actual) > Number(expected.$gt);
        }

        if (isPlainObject(expected) && expected.$gte !== undefined) {
            return Number(actual) >= Number(expected.$gte);
        }

        if (isPlainObject(expected) && expected.$lt !== undefined) {
            return Number(actual) < Number(expected.$lt);
        }

        if (isPlainObject(expected) && expected.$lte !== undefined) {
            return Number(actual) <= Number(expected.$lte);
        }

        if (expected instanceof Date) {
            return String(normalizeDateValue(actual)) === expected.toISOString();
        }

        if (expected === null) {
            return actual == null;
        }

        return String(actual ?? '') === String(expected);
    });
}

function sortDocuments(list, sort) {
    if (!sort) return [...list];

    const entries = typeof sort === 'string'
        ? [[sort.startsWith('-') ? sort.slice(1) : sort, sort.startsWith('-') ? -1 : 1]]
        : Object.entries(sort || {});

    return [...list].sort((a, b) => {
        for (const [field, directionRaw] of entries) {
            const direction = Number(directionRaw) < 0 || String(directionRaw).toLowerCase() === 'desc' ? -1 : 1;
            const av = a?.[field];
            const bv = b?.[field];
            if (av == null && bv == null) continue;
            if (av == null) return 1;
            if (bv == null) return -1;
            if (av > bv) return direction;
            if (av < bv) return -direction;
        }
        return 0;
    });
}

function pickComparableDoc(doc) {
    const clone = { ...(doc || {}) };
    delete clone._id;
    delete clone.id;
    delete clone.legacy_id;
    delete clone.legacy_collection;
    delete clone.created_at;
    delete clone.updated_at;
    delete clone.source_file;
    return clone;
}

class AdapterDocument {
    constructor(model, data = {}) {
        this.__model = model;
        Object.assign(this, data);
    }

    async save() {
        const plain = this.__model._normalizeOut(this);
        const saved = this._id
            ? await this.__model._repo._updateById(this._id, plain)
            : await this.__model._repo.insertOne(plain);

        const wrapped = this.__model._wrap(saved);
        Object.keys(this).forEach((key) => {
            if (!key.startsWith('__')) delete this[key];
        });
        Object.assign(this, wrapped);
        return this;
    }

    lean() {
        return this.__model._normalizeOut(this);
    }
}

class QueryAdapter {
    constructor(model, filter = {}, projection = null, options = {}) {
        this.model = model;
        this.filter = filter || {};
        this.projection = projection;
        this.options = { ...options };
        this.single = Boolean(options.single);
        this.leanMode = false;
    }

    sort(sort) {
        this.options.sort = sort;
        return this;
    }

    limit(limit) {
        this.options.limit = limit;
        return this;
    }

    lean() {
        this.leanMode = true;
        return this;
    }

    then(resolve, reject) {
        return this.exec().then(resolve, reject);
    }

    catch(reject) {
        return this.exec().catch(reject);
    }

    finally(handler) {
        return this.exec().finally(handler);
    }

    async exec() {
        let rows = await this.model._findInternal(this.filter, this.options);
        if (this.options.sort) rows = sortDocuments(rows, this.options.sort);
        if (typeof this.options.limit === 'number') rows = rows.slice(0, this.options.limit);

        if (this.single) {
            const doc = rows[0] || null;
            if (!doc) return null;
            const projected = this.model._applyProjection(doc, this.projection);
            return this.leanMode ? this.model._normalizeOut(projected) : this.model._wrap(projected);
        }

        return this.leanMode
            ? rows.map((doc) => this.model._normalizeOut(this.model._applyProjection(doc, this.projection)))
            : rows.map((doc) => this.model._wrap(this.model._applyProjection(doc, this.projection)));
    }
}

function createSchemaShim(fields = []) {
    return {
        eachPath(callback) {
            ['_id', '__v', ...fields].forEach((field) => callback(field));
        }
    };
}

function createModelAdapter({ tableName, fields = [], uniqueKeys = [], normalizeIn = null, normalizeOut = null }) {
    const repo = new BaseRepo(tableName);

    class ModelAdapter {
        static _repo = repo;
        static schema = createSchemaShim(fields);

        static _normalizeOut(doc = {}) {
            const source = normalizeOut ? normalizeOut({ ...(doc || {}) }) : { ...(doc || {}) };
            const normalized = { ...source };
            if (normalized.created_at && normalized.createdAt === undefined) normalized.createdAt = normalized.created_at;
            if (normalized.updated_at && normalized.updatedAt === undefined) normalized.updatedAt = normalized.updated_at;
            return normalized;
        }

        static _normalizeIn(doc = {}) {
            return normalizeIn ? normalizeIn({ ...(doc || {}) }) : { ...(doc || {}) };
        }

        static _wrap(doc) {
            return new AdapterDocument(this, this._normalizeOut(doc));
        }

        static _applyProjection(doc, projection = null) {
            if (!projection || !doc) return doc;
            if (typeof projection !== 'string') return doc;

            const fields = projection
                .split(/\s+/)
                .map((field) => field.trim())
                .filter(Boolean);

            if (!fields.length) return doc;
            const picked = { _id: doc._id };
            fields.forEach((field) => {
                if (doc[field] !== undefined) picked[field] = doc[field];
            });
            return picked;
        }

        static async _loadAll(sort = null) {
            const docs = await this._repo.findMany({}, sort ? { sort } : {});
            return docs.map((doc) => this._normalizeOut(doc));
        }

        static _canUseRepoFilter(filter = {}) {
            return Object.entries(filter || {}).every(([field, value]) => {
                if (field === '$or') {
                    return Array.isArray(value) && value.every((clause) => this._canUseRepoFilter(clause));
                }
                if (value instanceof RegExp || value instanceof Date) return false;
                if (isPlainObject(value) && !Array.isArray(value.$in) && value.$gt === undefined && value.$gte === undefined && value.$lt === undefined && value.$lte === undefined) return false;
                return true;
            });
        }

        static async _findInternal(filter = {}, options = {}) {
            if (this._canUseRepoFilter(filter)) {
                const docs = await this._repo.findMany(filter, options);
                return docs.map((doc) => this._normalizeOut(doc)).filter((doc) => matchesCondition(doc, filter));
            }

            const docs = await this._loadAll();
            return docs.filter((doc) => matchesCondition(doc, filter));
        }

        static find(filter = {}, projection = null) {
            return new QueryAdapter(this, filter, projection, { single: false });
        }

        static findOne(filter = {}, projection = null) {
            return new QueryAdapter(this, filter, projection, { single: true });
        }

        static findById(id, projection = null) {
            return new QueryAdapter(this, { _id: id }, projection, { single: true });
        }

        static async findByIdAndUpdate(id, update = {}) {
            return this.findOneAndUpdate({ _id: id }, update);
        }

        static async findByIdAndDelete(id) {
            const found = await this.findOne({ _id: id });
            if (!found) return null;
            await this._repo.deleteOne({ legacy_id: id });
            return found;
        }

        static async create(document = {}) {
            const normalizedDoc = this._normalizeIn(document);
            await this._ensureNoDuplicate(normalizedDoc);
            const doc = await this._repo.insertOne(normalizedDoc);
            return this._wrap(doc);
        }

        static async insertMany(documents = [], options = {}) {
            const inserted = [];
            for (const doc of documents) {
                try {
                    const created = await this.create(doc);
                    inserted.push(created);
                } catch (err) {
                    if (options.ordered === false && err?.code === 11000) {
                        const duplicateError = new Error(err.message || 'Duplicate key');
                        duplicateError.code = 11000;
                        duplicateError.result = { nInserted: inserted.length };
                        throw duplicateError;
                    }
                    throw err;
                }
            }

            inserted.insertedCount = inserted.length;
            return inserted;
        }

        static async deleteOne(filter = {}) {
            const result = await this._repo.deleteOne(filter);
            return { deletedCount: result.deleted ? 1 : 0 };
        }

        static async deleteMany(filter = {}) {
            const docs = await this._findInternal(filter);
            for (const doc of docs) {
                await this._repo.deleteOne({ legacy_id: doc._id });
            }
            return { deletedCount: docs.length };
        }

        static async updateMany(filter = {}, update = {}) {
            const docs = await this._findInternal(filter);
            let modifiedCount = 0;
            for (const doc of docs) {
                const updated = await this._repo.findOneAndUpdate({ legacy_id: doc._id }, this._normalizeIn(update));
                if (updated) modifiedCount += 1;
            }
            return { matchedCount: docs.length, modifiedCount };
        }

        static async findOneAndUpdate(filter = {}, update = {}) {
            const docs = await this._findInternal(filter);
            const target = docs[0];
            if (!target) return null;

            const normalizedUpdate = this._normalizeIn(update?.$set || update || {});
            const nextPayload = { ...pickComparableDoc(target), ...normalizedUpdate };
            await this._ensureNoDuplicate(nextPayload, target._id);
            const updated = await this._repo.findOneAndUpdate({ legacy_id: target._id }, nextPayload);
            return updated ? this._wrap(updated) : null;
        }

        static async updateOne(filter = {}, update = {}, options = {}) {
            const existing = await this.findOne(filter);
            if (existing) {
                const updated = await this.findOneAndUpdate(filter, update);
                return { acknowledged: true, matchedCount: 1, modifiedCount: updated ? 1 : 0, upsertedCount: 0 };
            }

            if (options?.upsert) {
                const payload = { ...(filter || {}), ...(update?.$set || update || {}) };
                const created = await this.create(payload);
                return {
                    acknowledged: true,
                    matchedCount: 0,
                    modifiedCount: 0,
                    upsertedCount: created ? 1 : 0,
                    upsertedId: created?._id || null
                };
            }

            return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
        }

        static async countDocuments(filter = {}) {
            const docs = await this._findInternal(filter);
            return docs.length;
        }

        static async exists(filter = {}) {
            const docs = await this._findInternal(filter, { limit: 1 });
            return docs.length > 0;
        }

        static async _ensureNoDuplicate(document = {}, ignoreLegacyId = null) {
            for (const fieldsGroup of uniqueKeys) {
                if (!Array.isArray(fieldsGroup) || fieldsGroup.some((field) => !document[field])) continue;
                const filter = Object.fromEntries(fieldsGroup.map((field) => [field, document[field]]));
                const existing = await this._findInternal(filter);
                const conflict = existing.find((row) => row._id !== ignoreLegacyId);
                if (conflict) {
                    const err = new Error(`Duplicate key for ${fieldsGroup.join(', ')}`);
                    err.code = 11000;
                    throw err;
                }
            }
        }
    }

    return ModelAdapter;
}

module.exports = createModelAdapter;
