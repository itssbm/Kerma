const { request, SCHEMA } = require('../db/supabaseClient');

class BaseRepo {
    constructor(tableName, options = {}) {
        this.tableName = tableName;
        this.schema = options.schema || SCHEMA;
        this.basePath = `${encodeURIComponent(this.tableName)}`;
    }

    _normalizeDocumentPayload(value) {
        if (value === null || value === undefined) return {};
        if (typeof value !== 'object' || Array.isArray(value)) return value;

        return Object.entries(value).reduce((acc, [key, v]) => {
            if (v === undefined) return acc;
            acc[key] = v;
            return acc;
        }, {});
    }

    _toRowData(payload, legacyId, createdAt = null, updatedAt = null) {
        const now = new Date().toISOString();
        const data = this._normalizeDocumentPayload(payload);
        return {
            legacy_collection: this.tableName,
            legacy_id: String(legacyId),
            legacy_payload: data,
            created_at: createdAt || now,
            updated_at: updatedAt || now,
            source_file: `${this.tableName}.jsonl`
        };
    }

    _rowToDoc(row) {
        const payload = this._normalizeDocumentPayload(row?.legacy_payload || {});
        return {
            ...(payload || {}),
            _id: row?.legacy_id,
            id: row?.legacy_id,
            legacy_id: row?.legacy_id,
            legacy_collection: row?.legacy_collection,
            created_at: row?.created_at,
            updated_at: row?.updated_at,
            source_file: row?.source_file
        };
    }

    _buildFilterParams(filter = {}) {
        const params = {};
        for (const [field, rawValue] of Object.entries(filter)) {
            if (rawValue === undefined) continue;
            if (rawValue && typeof rawValue === 'object' && rawValue.$in !== undefined && Array.isArray(rawValue.$in)) {
                const inValues = rawValue.$in.map((value) => String(value)).join(',');
                params[`legacy_payload->>${field}`] = `in.(${inValues})`;
                continue;
            }

            if (field === '$or' && Array.isArray(rawValue)) {
                const grouped = rawValue.map((clause) => {
                    if (!clause || typeof clause !== 'object') return null;
                    const inner = this._buildFilterParams(clause);
                    const keys = Object.keys(inner);
                    if (!keys.length) return null;
                    return keys.map((key) => `${key}=${inner[key]}`).join(',');
                }).filter(Boolean);

                if (!grouped.length) continue;
                params.or = grouped.join(',');
                continue;
            }

            if (field === 'legacy_id') {
                params[`legacy_id`] = `eq.${String(rawValue)}`;
                continue;
            }

            if (field === '_id') {
                params[`legacy_id`] = `eq.${String(rawValue)}`;
                continue;
            }

            if (rawValue === null) {
                params[`legacy_payload->>${field}`] = 'is.null';
                continue;
            }

            const value = String(rawValue);
            params[`legacy_payload->>${field}`] = `eq.${value}`;
        }

        return params;
    }

    _normalizeSortValue(sortField, direction) {
        if (!sortField) return null;

        const coreFieldMap = {
            _id: 'legacy_id',
            id: 'legacy_id',
            legacy_id: 'legacy_id',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            created_at: 'created_at',
            updated_at: 'updated_at',
            source_file: 'source_file',
            legacy_collection: 'legacy_collection'
        };

        const normalizedField = coreFieldMap[sortField] || `legacy_payload->>${sortField}`;
        const dir = String(direction || '').toLowerCase();
        if (typeof direction === 'number' && Number(direction) < 0) return `${normalizedField}.desc`;
        if (dir === '-1' || dir === 'desc' || dir === '-desc') return `${normalizedField}.desc`;
        if (dir === 'asc' || dir === '1' || dir === '1-') return `${normalizedField}.asc`;
        return `${normalizedField}.asc`;
    }

    _buildSort(sort = null) {
        if (!sort) return null;

        if (typeof sort === 'string') {
            const trimmed = sort.trim();
            if (!trimmed) return null;
            if (trimmed.startsWith('-')) {
                return this._normalizeSortValue(trimmed.substring(1), -1);
            }
            return this._normalizeSortValue(trimmed, 1);
        }

        if (Array.isArray(sort)) {
            const parts = sort
                .map((entry) => {
                    if (!entry || typeof entry !== 'object') return null;
                    const keys = Object.keys(entry);
                    if (!keys.length) return null;
                    return this._normalizeSortValue(keys[0], entry[keys[0]]);
                })
                .filter(Boolean);
            if (!parts.length) return null;
            return parts.join(',');
        }

        if (typeof sort === 'object') {
            const entries = Object.entries(sort).filter(([, v]) => v !== undefined && v !== null);
            if (!entries.length) return null;
            const [firstField, firstDir] = entries[0];
            return this._normalizeSortValue(firstField, firstDir);
        }

        return null;
    }

    _buildListOptions({ sort, limit, offset, fields = '*', order } = {}) {
        const params = {};

        if (Array.isArray(fields)) {
            params.select = fields.filter(Boolean).join(',');
        } else if (typeof fields === 'string' && fields.trim()) {
            params.select = fields.trim();
        } else {
            params.select = '*';
        }

        const normalizedOrder = order || this._buildSort(sort);
        if (normalizedOrder) params.order = normalizedOrder;

        if (typeof order === 'string' && order.trim()) {
            params.order = order.trim();
        }

        if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
            params.limit = String(Math.floor(limit));
        }

        if (typeof offset === 'number' && Number.isFinite(offset) && offset > 0) {
            params.offset = String(Math.floor(offset));
        }

        return params;
    }

    async _runGet(query = {}, options = {}) {
        const params = {
            ...this._buildFilterParams(query),
            ...this._buildListOptions(options)
        };

        const response = await request(this.tableName, {
            method: 'GET',
            query: params,
            headers: {
                'x-supabase-schema': this.schema,
                Prefer: 'return=representation'
            }
        });

        const rows = Array.isArray(response.data) ? response.data : [];
        return rows;
    }

    async findMany(filter = {}, options = {}) {
        const rows = await this._runGet(filter, options);
        return rows.map((row) => this._rowToDoc(row));
    }

    async findOne(filter = {}, options = {}) {
        const rows = await this._runGet(filter, { ...options, limit: options.limit ?? 1 });
        return rows[0] ? this._rowToDoc(rows[0]) : null;
    }

    async insertOne(document = {}, options = {}) {
        const rows = await this.insertMany([document], options);
        return rows[0] || null;
    }

    async insertMany(documents = [], options = {}) {
        if (!Array.isArray(documents) || documents.length === 0) {
            return [];
        }

        const rows = documents.map((doc) => {
            const legacyId = (doc.legacy_id || doc._id || doc.id || crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`).toString();
            return this._toRowData(doc, legacyId);
        });

        const response = await request(this.tableName, {
            method: 'POST',
            query: {
                columns: 'legacy_collection,legacy_id,legacy_payload,created_at,updated_at,source_file',
                on_conflict: 'legacy_collection,legacy_id'
            },
            headers: {
                'x-supabase-schema': this.schema,
                Prefer: 'resolution=merge-duplicates,return=representation'
            },
            body: rows
        });

        return Array.isArray(response.data) ? response.data.map((row) => this._rowToDoc(row)) : [];
    }

    async upsertOne(filter = {}, payload = {}, options = {}) {
        const existing = await this.findOne(filter, options);
        const legacyId = existing?.legacy_id || payload.legacy_id || payload._id || payload.id || null;

        if (existing) {
            return this._updateById(legacyId, payload, options);
        }

        if (!legacyId) {
            return this.insertOne(payload, options);
        }

        const rows = [this._toRowData(payload, legacyId, existing?.created_at)];
        const response = await request(this.tableName, {
            method: 'POST',
            query: {
                columns: 'legacy_collection,legacy_id,legacy_payload,created_at,updated_at,source_file',
                on_conflict: 'legacy_collection,legacy_id'
            },
            headers: {
                'x-supabase-schema': this.schema,
                Prefer: 'resolution=merge-duplicates,return=representation'
            },
            body: rows
        });

        const row = Array.isArray(response.data) ? response.data[0] : null;
        return row ? this._rowToDoc(row) : null;
    }

    async findOneAndUpdate(filter = {}, update = {}, options = {}) {
        const existing = await this.findOne(filter, options);
        if (!existing) return null;

        const patch = this._normalizeDocumentPayload(update.$set || update || {});
        const merged = {
            ...this._normalizeDocumentPayload(existing),
            ...patch,
            _id: existing._id,
            id: existing._id,
            updated_at: new Date().toISOString()
        };

        return this._updateById(existing._id, merged, options);
    }

    async _updateById(legacyId, doc = {}, options = {}) {
        const existing = await this.findOne({ legacy_id: legacyId }, options);
        if (!existing) return null;

        const payload = {
            ...this._normalizeDocumentPayload(existing),
            ...this._normalizeDocumentPayload(doc)
        };
        delete payload._id;
        delete payload.id;
        delete payload.legacy_id;
        delete payload.legacy_collection;

        const row = this._toRowData(payload, legacyId, existing.created_at, new Date().toISOString());

        const response = await request(this.tableName, {
            method: 'POST',
            query: {
                columns: 'legacy_collection,legacy_id,legacy_payload,created_at,updated_at,source_file',
                on_conflict: 'legacy_collection,legacy_id'
            },
            headers: {
                'x-supabase-schema': this.schema,
                Prefer: 'resolution=merge-duplicates,return=representation'
            },
            body: [row]
        });

        const rowData = Array.isArray(response.data) ? response.data[0] : null;
        return rowData ? this._rowToDoc(rowData) : null;
    }

    async deleteOne(filter = {}) {
        const target = await this.findOne(filter);
        if (!target) return { deleted: false };

        const res = await request(this.tableName, {
            method: 'DELETE',
            query: {
                legacy_collection: `eq.${this.tableName}`,
                legacy_id: `eq.${target.legacy_id}`
            },
            headers: {
                'x-supabase-schema': this.schema,
                Prefer: 'return=minimal'
            }
        });

        return {
            deleted: true,
            count: Number(String(res.count || '').match(/\/(\d+)$/)?.[1] || 1)
        };
    }
}

module.exports = BaseRepo;

