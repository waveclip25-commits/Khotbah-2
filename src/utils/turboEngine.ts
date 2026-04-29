import { GoogleGenAI } from '@google/genai';

export interface TurboParams {
  apiKey: string;
  model: string;
  tema: string;
  jenis: string;
  durasi: number;
  bahasaDoa: string;
  gayaDoa: string;
  targetDoaKhusus: string;
  useSunnahTemplate: boolean;
  basePrompt: string; // Persona & Aturan Baku dari App.tsx
  onStreamContent: (formattedText: string) => void;
  onProgressUpdate: (msg: string, percent: number) => void;
}

export const runTurboEngine = async (params: TurboParams): Promise<string> => {
  if (!params) throw new Error("Params turbo engine tidak ditemukan");
  const { 
    apiKey, model, tema, jenis, durasi, bahasaDoa, gayaDoa, 
    targetDoaKhusus, useSunnahTemplate, basePrompt, 
    onStreamContent, onProgressUpdate 
  } = params;

  if (!apiKey) throw new Error("API Key tidak ditemukan untuk Mode Turbo");
  if (durasi === undefined || durasi === null) throw new Error("Durasi tidak valid untuk Mode Turbo");

  const ai = new GoogleGenAI({ apiKey });

  // Siapkan Template Marker
  const mukadimah1Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_1]' : '[TEMPLATE_MUKADIMAH_1]';
  const penutup1Marker = '[TEMPLATE_PENUTUP_1]';
  const mukadimah2Marker = useSunnahTemplate ? '[TEMPLATE_MUKADIMAH_SUNNAH_2]' : '[TEMPLATE_MUKADIMAH_2]';
  const penutup2Marker = useSunnahTemplate ? '[TEMPLATE_PENUTUP_SUNNAH_2]' : '[TEMPLATE_PENUTUP_2]';

  const isKhotbah = jenis === 'Khotbah Jumat' || jenis.includes('Idul');

  // Hitung jumlah bagian yang dibutuhkan untuk memaksa panjang (sekitar 350 kata per bagian)
  const targetWords = durasi * 150;
  const wajibBagian = Math.max(3, Math.ceil(targetWords / 350));

  // ==========================================
  // FASE 1: MESIN UTAMA (MENCETAK ISI "DAGING" SAJA)
  // ==========================================
  onProgressUpdate('Mode Turbo: Menulis Isi Naskah Utama...', 20);

  const promptDaging = `
    ${basePrompt.split('STRUKTUR OUTPUT YANG WAJIB DIIKUTI')[0]}

    TUGAS UTAMA (MODE TURBO - ULTRA VOLUME):
    Tulislah KESELURUHAN ISI NASKAH secara mendalam, kohesif, dan tanpa terputus. Target Khusus Naskah Durasi Panjang.
    Tema: "${tema}"
    Jenis: "${jenis}"
    Target Panjang Mutlak: ${targetWords} hingga ${durasi * 200} kata.
    
    PENGINGAT ILMU RETORIKA & NEUROSAINS (SANGAT KRUSIAL UNTUK NASKAH PANJANG):
    1. Manajemen Beban Kognitif: Jangan tumpuk dalil berturut-turut. Beri 'jeda napas' (Sacred Pause) setelah kalimat berat.
    2. Pola Penulisan Public Speaking: Gunakan kalimat pendek yang meninju (Precision Strike), lalu diselingi kalimat panjang bergelombang untuk membangun emosi.
    3. Loop Penyadaran: Setiap 3 bagian, sisipkan cerita nyata, studi kasus, atau pertanyaan retoris agar jamaah tidak tertidur.
    4. Anaphora & Repetisi: Gunakan teknik repetisi kata/frasa di awal kalimat untuk membangun ritme layaknya orasi tingkat tinggi.

    METODE CHAIN OF THOUGHT FORCED LOOP (WAJIB DIIKUTI):
    Untuk mencapai target panjang yang luar biasa ini tanpa terpotong, Anda WAJIB membagi tulisan menjadi TEPAT ${wajibBagian} BAGIAN yang sambung-menyambung. 

    MANAJEMEN ALUR PANJANG (MASTERCLASS 5 FASE DENGAN ADAPTASI KUSTOMISASI):
    Gunakan "Fondasi Psikologi 5 Fase" sebagai ruh arah tulisan: (Fase 1: Hook Keresahan -> Fase 2: Validasi Realita -> Fase 3: Pembuktian/Argumen Inti -> Fase 4: Storytelling/Pendinginan Kognitif -> Fase 5: Pencerahan/Solusi).
    SANGAT PENTING: Anda WAJIB meleburkan / menundukkan kelima fase tersebut ke dalam pengaturan User di PROMPT UTAMA:
    - Jika User meminta Struktur "Tanya-Jawab", giring kelima fase ini dengan gaya dialog!
    - Jika Kepadatan Dalil "Tanpa Dalil" atau "Sangat Sedikit", jangan paksa bedah dalil di Fase 3, ganti dengan filosofi.
    - Jadikan 5 Fase ini sebagai "Rel Emosi", bukan merusak pilihan kustomisasi User.

    FORMAT YANG WAJIB DIGUNAKAN:
    <otak_internal>Memikirkan kerangka ${wajibBagian} bagian yang menerapkan 5 Fase Emosi Masterclass namun selaras mutlak dengan Struktur kustomisasi user...</otak_internal>

    <bagian id="1">
    <otak_internal>Memikirkan narasi (Fase Hook/Keresahan) sesuai struktur pilihan user...</otak_internal>
    [Isi paragraf-paragraf panjang untuk bagian 1...]
    </bagian>

    <bagian id="2">
    <otak_internal>Memikirkan kelanjutan narasi (menuju Validasi/Pembuktian)...</otak_internal>
    [Isi paragraf-paragraf panjang untuk bagian 2...]
    </bagian>

    ... (TERUS LANJUTKAN SAMPAI BAGIAN KE-${wajibBagian}) ...

    <bagian id="${wajibBagian}">
    <otak_internal>Menulis Echo Ending (pantulan pesan dari bagian 1) dan klimaks emosional...</otak_internal>
    [Isi paragraf-paragraf panjang untuk klimaks bagian ${wajibBagian}...]
    </bagian>

    ATURAN SANGAT KERAS: 
    - ANDA TIDAK BOLEH MENYIMPULKAN ATAU MENGAKHIRI NASKAH SEBELUM MENCAPAI <bagian id="${wajibBagian}">.
    - DILARANG KERAS MENGUNGKAPKAN TAG [SELESAI_100%] JIKA DURASI/JUMLAH BAGIAN BELUM TERCAPAI PENUH PADA BAGIAN KE-${wajibBagian}.
    - JIKA ANDA BENAR-BENAR TELAH SELESAI MENULIS SELURUH ${wajibBagian} BAGIAN, BARU ANDA WAJIB MENGAKHIRI TEKS DENGAN TAG: [SELESAI_100%]

    INSTRUKSI MUTLAK (JANGAN DILANGGAR):
    1. JANGAN PERNAH MENULIS MUKADIMAH (Salam, Hamdalah, Syahadat). Sistem sudah menyediakannya.
    2. JANGAN PERNAH MENULIS DOA PENUTUP NASKAH. Berhenti tepat setelah materi pembahasan selesai.
    3. Jika ini Khotbah Jumat, tulislah isi "Khotbah Pertama" saja.
    4. Perkaya dengan dalil (Al-Quran & Hadits) dalam block \`\`\`arabic beserta terjemahannya (apapun pengaturan user, dalil WAJIB ada terjemahannya).
    5. JANGAN menulis teks [BATAS_KHOTBAH_KEDUA].
  `;

  const chatSession = ai.chats.create({
    model: model,
    config: {
      temperature: 0.8,
      maxOutputTokens: 8192
    }
  });

  let rawIsiDaging = "";
  let isiDagingFiltered = "";
  let chunkCount = 0;
  let isDone = false;
  let loopCount = 0;
  let currentMessage = promptDaging;

  while (!isDone && loopCount < 20) {
    loopCount++;
    if (loopCount > 1) {
      onProgressUpdate(`Mode Turbo: Meneruskan penulisan halaman ke-${loopCount}...`, 20 + (loopCount * 10));
    }

    const streamDaging = await chatSession.sendMessageStream({ message: currentMessage });

    for await (const chunk of streamDaging) {
      const text = chunk.text || "";
      rawIsiDaging += text;
      chunkCount++;

      // Trik Filter Gaib (Masking): Hilangkan tag otak_internal secara regex sebelum dirender ke layar
      isiDagingFiltered = rawIsiDaging
        .replace(/<otak_internal>[\s\S]*?(<\/otak_internal>|$)/gi, '')
        .replace(/<bagian[^>]*>/gi, '')
        .replace(/<\/bagian>/gi, '')
        .replace(/\[SELESAI_100%\]/gi, '');

      // Render ke layar secara realtime HANYA dengan template Khotbah 1
      if (chunkCount % 8 === 0) {
        const liveText = `${mukadimah1Marker}\n\n${isiDagingFiltered.trim()}`;
        onStreamContent(liveText);
      }
    }

    if (rawIsiDaging.includes('[SELESAI_100%]')) {
      isDone = true;
    } else {
      // LLM ran out of output tokens before finishing. Ask it to continue seamlessly.
      currentMessage = "Teks Anda terpotong karena batas panjang karakter. SILAKAN LANJUTKAN TEPAT DARI KATA TERAKHIR YANG TERPOTONG. JANGAN mengulang kalimat sebelumnya. Lanjutkan sampai tercapai bagian ke-" + wajibBagian + " dan akhiri teks dengan [SELESAI_100%]";
    }
  }

  // Bersihkan sekali lagi dengan pasti
  isiDagingFiltered = rawIsiDaging
    .replace(/<otak_internal>[\s\S]*?(<\/otak_internal>|$)/gi, '')
    .replace(/<bagian[^>]*>/gi, '')
    .replace(/<\/bagian>/gi, '')
    .replace(/\[SELESAI_100%\]/gi, '');

  // Selesai nulis daging
  const currentText = `${mukadimah1Marker}\n\n${isiDagingFiltered.trim()}`;
  onStreamContent(currentText);

  if (isKhotbah) {
    // ==========================================
    // FASE 2: MESIN KECIL (MENCETAK DOA TEMATIK)
    // ==========================================
    onProgressUpdate('Mode Turbo: Merangkai Doa Tematik...', 70);

    const doaKhususInstruction = gayaDoa === 'Doa Khusus (Kustom target doa)' && targetDoaKhusus.trim()
      ? `Fokus doa secara khusus pada: ${targetDoaKhusus}.`
      : `Jadikan doa ini relevan dengan tema "${tema}".`;

    const promptDoa = `
      Anda adalah seorang Ulama kharismatik.
      Berdasarkan naskah utama bagian akhir berikut:
      """
      ... ${isiDagingFiltered.length > 4000 ? isiDagingFiltered.substring(isiDagingFiltered.length - 4000) : isiDagingFiltered}
      """

      TUGAS: Tuliskan DOA PENUTUP tematik yang sangat menyentuh hati.
      Gunakan bahasa ${bahasaDoa} dan gaya ${gayaDoa}.
      Sertakan Asmaul Husna yang relevan.
      Target: 2-3 paragraf khusyuk.
      PENTING: Teks Arab WAJIB dibungkus \`\`\`arabic.
    `;

    const responseDoa = await ai.models.generateContent({
      model: model,
      contents: promptDoa,
      config: { temperature: 0.8 }
    });

    const teksDoa = responseDoa.text || "Ya Allah, ampuni kami.";

    const finalDisplay = `${mukadimah1Marker}\n\n${isiDagingFiltered.trim()}\n\n${penutup1Marker}\n\n---\n\n${mukadimah2Marker}\n\n${teksDoa.trim()}\n\n${penutup2Marker}`;
    onStreamContent(finalDisplay);
    onProgressUpdate('Selesai!', 100);
    return finalDisplay;
  } else {
    // Non-Khotbah: Single Mukadimah and Penutup
    const finalDisplay = `${mukadimah1Marker}\n\n${isiDagingFiltered.trim()}\n\n${penutup2Marker}`;
    onStreamContent(finalDisplay);
    onProgressUpdate('Selesai!', 100);
    return finalDisplay;
  }
};
