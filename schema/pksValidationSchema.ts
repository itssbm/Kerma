import { z } from 'zod';

/**
 * Validation contract for the four PKS document forms.
 *
 * Form controls commonly submit strings, so numeric and date helpers accept
 * the corresponding form values and return typed numbers/Date objects.
 * Calculated totals remain optional inputs and are checked when supplied;
 * the server should still calculate and persist the authoritative values.
 */

export const PKS_KATEGORI = [
  'PKS_PENDIDIKAN',
  'PKS_MITRA_INDUSTRI',
  'PKS_MITRA_KAMPUS',
  'PKS_MITRA_PEMERINTAH'
] as const;

export const POSISI_SBM_ITB = ['PIHAK_PERTAMA', 'PIHAK_KEDUA'] as const;
export const JENIS_LEMBAGA = [
  'Perseroan Terbatas',
  'Perguruan Tinggi Negeri',
  'Pemerintah Daerah',
  'Yayasan',
  'Lainnya'
] as const;
export const JANGKA_WAKTU_SATUAN = ['Tahun', 'Bulan'] as const;
export const LOKASI_PERKULIAHAN = [
  'Kampus ITB Bandung',
  'Kampus ITB Jakarta',
  'In-House Mitra',
  'Hybrid/Online'
] as const;
export const STRATA_PROGRAM = ['Magister', 'Doktor'] as const;
export const SEMESTER_PROGRAM = ['Semester I', 'Semester II', 'Semester Pendek'] as const;
export const SKEMA_PENDANAAN_INDUSTRI = [
  'Nirbiaya (Beban Masing-masing)',
  'Sponsor / Investasi Industri',
  'Kontrak Terpisah (Adendum/IA)'
] as const;
export const SKEMA_KEPEMILIKAN_HKI = [
  'Milik Bersama (Joint IP)',
  'Perjanjian Terpisah',
  'Sesuai Kontribusi'
] as const;
export const FREKUENSI_EVALUASI = ['Tahunan', 'Semesteran'] as const;
export const SKEMA_PEMBAYARAN = ['TERMIN', 'LUMPSUM', 'DESKRIPSI_BEBAS'] as const;
export const FOKUS_KEGIATAN_PEMERINTAH = [
  'Penelitian & kajian pengembangan potensi daerah',
  'Pendampingan UMKM & Ekonomi Kreatif',
  'Transformasi digital & teknologi tepat guna',
  'Penyusunan Rekomendasi Kebijakan (Policy Brief)'
] as const;

const requiredText = (label: string) => z
  .string({
    required_error: `${label} wajib diisi.`,
    invalid_type_error: `${label} harus berupa teks.`
  })
  .trim()
  .min(1, `${label} wajib diisi.`);

const numberFromForm = (
  label: string,
  options: { integer?: boolean; min?: number } = {}
) => {
  let numberSchema = z.number({
    required_error: `${label} wajib diisi.`,
    invalid_type_error: `${label} harus berupa angka.`
  }).finite(`${label} harus berupa angka yang valid.`);

  if (options.integer) numberSchema = numberSchema.int(`${label} harus berupa bilangan bulat.`);
  if (options.min !== undefined) numberSchema = numberSchema.min(
    options.min,
    `${label} minimal ${options.min}.`
  );

  return z.preprocess(value => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (typeof value === 'string') return Number(value.trim());
    return value;
  }, numberSchema);
};

const optionalNumberFromForm = (
  label: string,
  options: { integer?: boolean; min?: number } = {}
) => z.preprocess(
  value => value === '' || value === null || value === undefined
    ? undefined
    : typeof value === 'string' ? Number(value.trim()) : value,
  numberFromForm(label, options).optional()
);

const positiveNumber = (label: string) => numberFromForm(label, { min: 0.000000001 });
const nonNegativeNumber = (label: string) => numberFromForm(label, { min: 0 });
const nonNegativeInteger = (label: string) => numberFromForm(label, { integer: true, min: 0 });
const positiveInteger = (label: string) => numberFromForm(label, { integer: true, min: 1 });
const optionalNonNegativeNumber = (label: string) => optionalNumberFromForm(label, { min: 0 });

const dateFromForm = (label: string) => z.preprocess(
  value => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    return value;
  },
  z.date({
    required_error: `${label} wajib diisi.`,
    invalid_type_error: `${label} harus berupa tanggal yang valid.`
  })
);

const optionalDateFromForm = (label: string) => z.preprocess(
  value => {
    if (value === '' || value === null || value === undefined) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    return value;
  },
  z.date({ invalid_type_error: `${label} harus berupa tanggal yang valid.` }).optional()
);

const stringArray = (label: string, minimum = 0) => z.preprocess(
  value => {
    if (value === '' || value === null || value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  },
  z.array(requiredText(`${label} item`), {
    invalid_type_error: `${label} harus berupa daftar teks.`
  }).min(minimum, `${label} minimal ${minimum} item.`)
);

const booleanFromForm = (defaultValue: boolean) => z.preprocess(
  value => {
    if (value === '' || value === null || value === undefined) return defaultValue;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  },
  z.boolean().default(defaultValue)
);

const listOrText = (label: string) => z.union([
  requiredText(label),
  stringArray(label, 1)
]);

export const PksSignatorySchema = z.object({
  nama_lengkap: requiredText('Nama lengkap penandatangan'),
  jabatan: requiredText('Jabatan penandatangan'),
  dasar_kewenangan_legalitas: requiredText('Dasar kewenangan/legalitas')
}).strict();

export const PksPartySchema = z.object({
  nama_instansi_lembaga: requiredText('Nama instansi/lembaga'),
  jenis_lembaga: z.enum(JENIS_LEMBAGA, {
    required_error: 'Jenis lembaga wajib dipilih.',
    invalid_type_error: 'Jenis lembaga tidak valid.'
  }),
  alamat_lengkap_instansi: requiredText('Alamat lengkap instansi'),
  kode_pos: requiredText('Kode pos'),
  penandatangan_list: z.array(PksSignatorySchema, {
    required_error: 'Daftar penandatangan wajib diisi.'
  }).min(1, 'Setiap pihak harus memiliki minimal satu penandatangan.')
}).strict();

export const PksCorrespondenceSchema = z.object({
  unit_pengelola_up: requiredText('Unit pengelola'),
  alamat_surat: requiredText('Alamat surat-menyurat'),
  nama_pic: requiredText('Nama PIC'),
  nomor_telepon_hp: requiredText('Nomor telepon/HP'),
  email_resmi: z.string({
    required_error: 'Email resmi wajib diisi.',
    invalid_type_error: 'Email resmi harus berupa teks.'
  }).trim().email('Email resmi tidak valid.')
}).strict();

export const PksPaymentTermSchema = z.preprocess(
  value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const item = value as Record<string, unknown>;
    const legacyTotal = item.total_nominal_termin
      ?? (Number(item.nominal_per_peserta || 0) * Number(item.jumlah_peserta || 0));
    const {
      komponen_biaya: _komponenBiaya,
      nominal_per_peserta: _nominalPerPeserta,
      jumlah_peserta: _jumlahPeserta,
      total_nominal_termin: _totalNominalTermin,
      ...rest
    } = item;
    return {
      ...rest,
      total_pembayaran: item.total_pembayaran ?? legacyTotal
    };
  },
  z.object({
    termin_ke: requiredText('Termin pembayaran'),
    total_pembayaran: positiveNumber('Total pembayaran'),
    batas_akhir_pembayaran: dateFromForm('Batas akhir pembayaran')
  }).strict()
);

const universalPksShape = {
  posisi_sbm_itb: z.enum(POSISI_SBM_ITB).default('PIHAK_KEDUA'),
  nomor_pks_pihak_1: requiredText('Nomor PKS pihak 1'),
  nomor_pks_pihak_2: requiredText('Nomor PKS pihak 2'),
  judul_perjanjian_tambahan: requiredText('Judul perjanjian tambahan'),
  tanggal_penandatanganan: dateFromForm('Tanggal penandatanganan'),
  tempat_penandatanganan: requiredText('Tempat penandatanganan'),
  pihak_1: PksPartySchema,
  pihak_2: PksPartySchema,
  korespondensi_pihak_1: PksCorrespondenceSchema,
  korespondensi_pihak_2: PksCorrespondenceSchema,
  jangka_waktu_nilai: positiveNumber('Nilai jangka waktu'),
  jangka_waktu_satuan: z.enum(JANGKA_WAKTU_SATUAN, {
    required_error: 'Satuan jangka waktu wajib dipilih.',
    invalid_type_error: 'Satuan jangka waktu tidak valid.'
  }),
  tanggal_mulai_berlaku: dateFromForm('Tanggal mulai berlaku'),
  tanggal_berakhir: dateFromForm('Tanggal berakhir'),
  tenggat_notifikasi_perpanjangan: nonNegativeInteger('Tenggat notifikasi perpanjangan'),
  forum_penyelesaian_perselisihan: requiredText('Forum penyelesaian perselisihan')
    .default('Kantor Kepaniteraan Pengadilan Negeri Bandung Kelas 1A Khusus'),
  deskripsi_profil_pihak_1: requiredText('Deskripsi profil pihak 1'),
  deskripsi_profil_pihak_2: requiredText('Deskripsi profil pihak 2'),
  maksud_perjanjian: requiredText('Maksud perjanjian'),
  tujuan_perjanjian: requiredText('Tujuan perjanjian'),
  ruang_lingkup: stringArray('Ruang lingkup kerja sama', 1),
  hak_kewajiban_pihak_1: stringArray('Hak dan kewajiban pihak 1', 1),
  hak_kewajiban_pihak_2: stringArray('Hak dan kewajiban pihak 2', 1),
  nama_dokumen_turunan: requiredText('Nama dokumen turunan'),
  batas_waktu_lapor_force_majeure: nonNegativeInteger('Batas waktu laporan force majeure'),
  batas_waktu_perbaikan_wanprestasi: nonNegativeInteger('Batas waktu perbaikan wanprestasi'),
  batas_waktu_musyawarah: nonNegativeInteger('Batas waktu musyawarah'),
  pilihan_domisili_hukum: requiredText('Pilihan domisili hukum'),
  skema_pembayaran: z.enum(SKEMA_PEMBAYARAN, {
    required_error: 'Skema pembayaran wajib dipilih.',
    invalid_type_error: 'Skema pembayaran tidak valid.'
  }),
  skema_pembayaran_termin: z.array(PksPaymentTermSchema).default([]),
  nominal_lumpsum: optionalNonNegativeNumber('Nominal lumpsum'),
  tanggal_pembayaran_lumpsum: optionalDateFromForm('Tanggal pembayaran lumpsum'),
  deskripsi_skema_pembayaran: z.preprocess(
    value => value === null || value === undefined ? undefined : String(value).trim(),
    z.string().optional()
  )
};

export const UniversalPksSchema = z.object(universalPksShape).strict();

export const PksBankAccountSchema = z.object({
  nama_bank: requiredText('Nama bank'),
  kantor_cabang: requiredText('Kantor cabang'),
  alamat: requiredText('Alamat rekening'),
  nomor_virtual_account: requiredText('Nomor virtual account'),
  nama_rekening_va: requiredText('Nama rekening virtual account')
}).strict();

const PksOtherEducationCostSchema = z.object({
  nama_komponen: requiredText('Nama komponen biaya lain'),
  volume: positiveNumber('Volume'),
  satuan: requiredText('Satuan'),
  harga: positiveNumber('Harga'),
  total: positiveNumber('Total')
}).strict();

const pksEducationShape = {
  kategori_pks: z.literal('PKS_PENDIDIKAN'),
  strata_program: z.enum(STRATA_PROGRAM, {
    required_error: 'Strata wajib dipilih.',
    invalid_type_error: 'Strata tidak valid.'
  }),
  nama_program_studi: requiredText('Nama program studi'),
  semester_program: z.enum(SEMESTER_PROGRAM, {
    required_error: 'Semester wajib dipilih.',
    invalid_type_error: 'Semester tidak valid.'
  }),
  tahun_akademik_penerimaan: requiredText('Tahun akademik penerimaan'),
  lokasi_perkuliahan: z.enum(LOKASI_PERKULIAHAN, {
    required_error: 'Lokasi perkuliahan wajib dipilih.',
    invalid_type_error: 'Lokasi perkuliahan tidak valid.'
  }),
  durasi_studi_maksimum_tahun: positiveInteger('Durasi studi maksimum dalam tahun'),
  lama_perpanjangan_semester: optionalNonNegativeNumber('Lama perpanjangan dalam semester'),
  lama_perpanjangan_semester_terbilang: z.string().optional().default(''),
  lama_perpanjangan_bulan: optionalNonNegativeNumber('Lama perpanjangan dalam bulan'),
  lama_perpanjangan_bulan_terbilang: z.string().optional().default(''),
  persyaratan_minimum_peserta: requiredText('Persyaratan minimum peserta'),
  jumlah_peserta_didik_penerima_beasiswa: positiveInteger('Jumlah peserta didik penerima beasiswa'),
  biaya_bpp_per_peserta: positiveNumber('Biaya BPP per peserta'),
  bpp_semester_panjang: optionalNonNegativeNumber('BPP Semester Panjang'),
  bpp_semester_panjang_terbilang: z.string().optional().default(''),
  bpp_semester_pendek: optionalNonNegativeNumber('BPP Semester Pendek'),
  bpp_semester_pendek_terbilang: z.string().optional().default(''),
  bpp_ulang_semester_panjang: optionalNonNegativeNumber('BPP Ulang Semester Panjang'),
  bpp_ulang_semester_panjang_terbilang: z.string().optional().default(''),
  bpp_ulang_semester_pendek: optionalNonNegativeNumber('BPP Ulang Semester Pendek'),
  bpp_ulang_semester_pendek_terbilang: z.string().optional().default(''),
  bpp_tugas_akhir: optionalNonNegativeNumber('BPP Tugas Akhir'),
  bpp_tugas_akhir_terbilang: z.string().optional().default(''),
  komponen_biaya_lain_pendidikan: z.array(PksOtherEducationCostSchema).default([]),
  total_biaya_pendidikan: positiveNumber('Total biaya pendidikan'),
  total_komponen_biaya_lain_pendidikan: nonNegativeNumber('Total komponen biaya lain'),
  nilai_kontrak: positiveNumber('Nilai kontrak'),
  rekening_penerima_pembayaran: PksBankAccountSchema
};

const pksIndustryShape = {
  kategori_pks: z.literal('PKS_MITRA_INDUSTRI'),
  profil_singkat_mitra_industri: requiredText('Profil singkat mitra industri'),
  skema_pendanaan_industri: z.enum(SKEMA_PENDANAAN_INDUSTRI, {
    required_error: 'Skema pendanaan industri wajib dipilih.',
    invalid_type_error: 'Skema pendanaan industri tidak valid.'
  }),
  is_knowledge_partner: booleanFromForm(false),
  is_pengembangan_kurikulum: booleanFromForm(false),
  is_rekrutmen_magang: booleanFromForm(false),
  is_aacsb_esg_support: booleanFromForm(false),
  is_executive_education: booleanFromForm(false),
  ruang_lingkup_kustom: stringArray('Ruang lingkup kustom'),
  daftar_tugas_mitra: stringArray('Daftar tugas mitra'),
  is_non_hubungan_kerja_clause: booleanFromForm(true),
  is_confidentiality_strict: booleanFromForm(false)
};

const pksCampusShape = {
  kategori_pks: z.literal('PKS_MITRA_KAMPUS'),
  nama_fakultas_unit_mitra: requiredText('Nama fakultas/unit mitra'),
  sk_pendirian_pengangkatan_pimpinan_mitra: requiredText('SK pendirian/pengangkatan pimpinan mitra'),
  program_studi_terlibat_pihak_1: stringArray('Program studi pihak 1', 1),
  program_studi_terlibat_pihak_2: stringArray('Program studi pihak 2', 1),
  fokus_pendidikan: listOrText('Fokus pendidikan'),
  fokus_penelitian: listOrText('Fokus penelitian'),
  fokus_pengabdian_masyarakat: listOrText('Fokus pengabdian masyarakat'),
  fokus_publikasi: listOrText('Fokus publikasi'),
  ketentuan_tim_pelaksana: requiredText('Ketentuan tim pelaksana')
};

const pksGovernmentShape = {
  kategori_pks: z.literal('PKS_MITRA_PEMERINTAH'),
  sk_pengangkatan_kepala_daerah_pejabat: requiredText('SK pengangkatan kepala daerah/pejabat'),
  dasar_hukum_daerah: stringArray('Dasar hukum daerah', 1),
  perangkat_daerah_pelaksana_mitra: requiredText('Perangkat daerah pelaksana mitra'),
  nama_program_inovasi_daerah: requiredText('Nama program/inovasi daerah'),
  fokus_kegiatan_pemerintah: z.array(z.enum(FOKUS_KEGIATAN_PEMERINTAH), {
    required_error: 'Fokus kegiatan pemerintah wajib diisi.'
  }).min(1, 'Minimal satu fokus kegiatan pemerintah harus dipilih.'),
  is_membutuhkan_implementation_agreement: booleanFromForm(true),
  skema_kepemilikan_hki: z.enum(SKEMA_KEPEMILIKAN_HKI, {
    required_error: 'Skema kepemilikan HKI wajib dipilih.',
    invalid_type_error: 'Skema kepemilikan HKI tidak valid.'
  }),
  frekuensi_evaluasi: z.enum(FREKUENSI_EVALUASI, {
    required_error: 'Frekuensi evaluasi wajib dipilih.',
    invalid_type_error: 'Frekuensi evaluasi tidak valid.'
  })
};

const addIssue = (ctx: z.RefinementCtx, path: (string | number)[], message: string) => {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
};

function validateUniversalRules(payload: PksPayload, ctx: z.RefinementCtx) {
  if (payload.tanggal_berakhir < payload.tanggal_mulai_berlaku) {
    addIssue(ctx, ['tanggal_berakhir'], 'Tanggal berakhir tidak boleh sebelum tanggal mulai berlaku.');
  }
}

function validatePaymentRules(payload: PksPayload, ctx: z.RefinementCtx) {
  if (payload.skema_pembayaran === 'TERMIN') {
    if (payload.skema_pembayaran_termin.length === 0) {
      addIssue(ctx, ['skema_pembayaran_termin'], 'Minimal satu termin pembayaran harus diisi.');
    }
    return;
  }

  if (payload.skema_pembayaran === 'LUMPSUM') {
    if (payload.nominal_lumpsum === undefined || payload.nominal_lumpsum <= 0) {
      addIssue(ctx, ['nominal_lumpsum'], 'Nominal lumpsum wajib lebih besar dari 0.');
    }
    if (!payload.tanggal_pembayaran_lumpsum) {
      addIssue(ctx, ['tanggal_pembayaran_lumpsum'], 'Tanggal pembayaran lumpsum wajib diisi.');
    }
    return;
  }

  if (!payload.deskripsi_skema_pembayaran) {
    addIssue(ctx, ['deskripsi_skema_pembayaran'], 'Deskripsi skema pembayaran wajib diisi.');
  }
}

function validateEducationRules(payload: PksEducation, ctx: z.RefinementCtx) {
  const programStudiValid = payload.strata_program === 'Magister'
    ? ['Master of Business Administration', 'Master of Science in Management']
    : ['Doctor of Science in Management'];
  if (!programStudiValid.includes(payload.nama_program_studi)) {
    addIssue(ctx, ['nama_program_studi'], 'Nama program studi tidak sesuai dengan Strata yang dipilih.');
  }

  const totalOtherCost = payload.komponen_biaya_lain_pendidikan.reduce(
    (total, component, index) => {
      const expectedRowTotal = component.volume * component.harga;
      if (Math.abs(component.total - expectedRowTotal) > 0.01) {
        addIssue(
          ctx,
          ['komponen_biaya_lain_pendidikan', index, 'total'],
          `Total komponen biaya lain baris ${index + 1} harus ${expectedRowTotal}.`
        );
      }
      return total + component.total;
    },
    0
  );
  const expectedEducationTotal = payload.biaya_bpp_per_peserta
    * payload.jumlah_peserta_didik_penerima_beasiswa;
  const expectedContractValue = expectedEducationTotal + totalOtherCost;
  if (Math.abs(payload.total_biaya_pendidikan - expectedEducationTotal) > 0.01) {
    addIssue(
      ctx,
      ['total_biaya_pendidikan'],
      `Total biaya pendidikan harus ${expectedEducationTotal} berdasarkan BPP per peserta dikalikan jumlah mahasiswa.`
    );
  }
  if (Math.abs((payload.total_komponen_biaya_lain_pendidikan ?? 0) - totalOtherCost) > 0.01) {
    addIssue(
      ctx,
      ['total_komponen_biaya_lain_pendidikan'],
      `Total komponen biaya lain harus ${totalOtherCost} berdasarkan penjumlahan seluruh total komponen.`
    );
  }
  if (Math.abs(payload.nilai_kontrak - expectedContractValue) > 0.01) {
    addIssue(
      ctx,
      ['nilai_kontrak'],
      `Nilai kontrak harus ${expectedContractValue} berdasarkan total biaya pendidikan ditambah total komponen biaya lain.`
    );
  }

  if (payload.skema_pembayaran === 'TERMIN') {
    const totalTermin = payload.skema_pembayaran_termin.reduce(
      (total, term) => total + term.total_pembayaran,
      0
    );

    if (totalTermin !== payload.nilai_kontrak) {
      addIssue(
        ctx,
        ['skema_pembayaran_termin'],
        'Jumlah seluruh termin harus sama dengan Nilai kontrak.'
      );
    }
    return;
  }

  if (payload.skema_pembayaran === 'LUMPSUM'
    && Math.abs((payload.nominal_lumpsum ?? 0) - payload.nilai_kontrak) > 0.01) {
    addIssue(
      ctx,
      ['nominal_lumpsum'],
      'Nominal lumpsum harus sama dengan Nilai kontrak.'
    );
  }
}

function validateIndustryRules(payload: PksIndustry, ctx: z.RefinementCtx) {
  const hasStandardScope = [
    payload.is_knowledge_partner,
    payload.is_pengembangan_kurikulum,
    payload.is_rekrutmen_magang,
    payload.is_aacsb_esg_support,
    payload.is_executive_education
  ].some(Boolean);

  if (!hasStandardScope && payload.ruang_lingkup_kustom.length === 0) {
    addIssue(
      ctx,
      ['ruang_lingkup_kustom'],
      'Minimal satu ruang lingkup kerja sama harus dipilih atau ditambahkan.'
    );
  }
}

const pksOptions = [
  z.object({ ...universalPksShape, ...pksEducationShape }).strict(),
  z.object({ ...universalPksShape, ...pksIndustryShape }).strict(),
  z.object({ ...universalPksShape, ...pksCampusShape }).strict(),
  z.object({ ...universalPksShape, ...pksGovernmentShape }).strict()
] as const;

export const PksSchema = z.discriminatedUnion('kategori_pks', pksOptions);
export type PksPayload = z.infer<typeof PksSchema>;
export type PksEducation = Extract<PksPayload, { kategori_pks: 'PKS_PENDIDIKAN' }>;
export type PksIndustry = Extract<PksPayload, { kategori_pks: 'PKS_MITRA_INDUSTRI' }>;
export type PksCampus = Extract<PksPayload, { kategori_pks: 'PKS_MITRA_KAMPUS' }>;
export type PksGovernment = Extract<PksPayload, { kategori_pks: 'PKS_MITRA_PEMERINTAH' }>;

// Apply cross-field checks after the discriminated union has narrowed the form.
export const PksFormSchema = PksSchema.superRefine((payload, ctx) => {
  validateUniversalRules(payload, ctx);
  validatePaymentRules(payload, ctx);
  if (payload.kategori_pks === 'PKS_PENDIDIKAN') validateEducationRules(payload, ctx);
  if (payload.kategori_pks === 'PKS_MITRA_INDUSTRI') validateIndustryRules(payload, ctx);
});

export const PksValidationSchema = PksFormSchema;
export type ValidatedPksPayload = z.infer<typeof PksFormSchema>;

export const parsePks = (input: unknown): ValidatedPksPayload => PksFormSchema.parse(input);
export const safeParsePks = (input: unknown) => PksFormSchema.safeParse(input);
