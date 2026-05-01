import{G as H}from"./index-CnHNZy12.js";const J=async m=>{if(!m)throw new Error("Params turbo engine tidak ditemukan");const{apiKey:T,model:E,tema:N,jenis:l,durasi:r,bahasaDoa:P,gayaDoa:d,targetDoaKhusus:p,useSunnahTemplate:k,basePrompt:K,onStreamContent:s,onProgressUpdate:i}=m;if(!T)throw new Error("API Key tidak ditemukan untuk Mode Turbo");if(r==null)throw new Error("Durasi tidak valid untuk Mode Turbo");const S=new H({apiKey:T}),A=k?"[TEMPLATE_MUKADIMAH_SUNNAH_1]":"[TEMPLATE_MUKADIMAH_1]",D="[TEMPLATE_PENUTUP_1]",G=k?"[TEMPLATE_MUKADIMAH_SUNNAH_2]":"[TEMPLATE_MUKADIMAH_2]",I=k?"[TEMPLATE_PENUTUP_SUNNAH_2]":"[TEMPLATE_PENUTUP_2]",L=l==="Khotbah Jumat"||l.includes("Idul"),U=r*150,n=Math.max(3,Math.ceil(U/350));i("Mode Turbo: Menulis Isi Naskah Utama...",20);const R=`
    ${K.split("STRUKTUR OUTPUT YANG WAJIB DIIKUTI")[0]}

    TUGAS UTAMA (MODE TURBO - ULTRA VOLUME):
    Tulislah KESELURUHAN ISI NASKAH secara mendalam, kohesif, dan tanpa terputus. Target Khusus Naskah Durasi Panjang.
    Tema: "${N}"
    Jenis: "${l}"
    Target Panjang Mutlak: ${U} hingga ${r*200} kata.
    
    PENGINGAT ILMU RETORIKA & NEUROSAINS (SANGAT KRUSIAL UNTUK NASKAH PANJANG):
    1. Manajemen Beban Kognitif: Jangan tumpuk dalil berturut-turut. Beri 'jeda napas' (Sacred Pause) setelah kalimat berat.
    2. Pola Penulisan Public Speaking: Gunakan kalimat pendek yang meninju (Precision Strike), lalu diselingi kalimat panjang bergelombang untuk membangun emosi.
    3. Loop Penyadaran: Setiap 3 bagian, sisipkan cerita nyata, studi kasus, atau pertanyaan retoris agar jamaah tidak tertidur.
    4. Anaphora & Repetisi: Gunakan teknik repetisi kata/frasa di awal kalimat untuk membangun ritme layaknya orasi tingkat tinggi.

    METODE CHAIN OF THOUGHT FORCED LOOP (WAJIB DIIKUTI):
    Untuk mencapai target panjang yang luar biasa ini tanpa terpotong, Anda WAJIB membagi tulisan menjadi TEPAT ${n} BAGIAN yang sambung-menyambung. 

    MANAJEMEN ALUR PANJANG (MASTERCLASS 5 FASE DENGAN ADAPTASI KUSTOMISASI):
    Gunakan "Fondasi Psikologi 5 Fase" sebagai ruh arah tulisan: (Fase 1: Hook Keresahan -> Fase 2: Validasi Realita -> Fase 3: Pembuktian/Argumen Inti -> Fase 4: Storytelling/Pendinginan Kognitif -> Fase 5: Pencerahan/Solusi).
    SANGAT PENTING: Anda WAJIB meleburkan / menundukkan kelima fase tersebut ke dalam pengaturan User di PROMPT UTAMA:
    - Jika User meminta Struktur "Tanya-Jawab", giring kelima fase ini dengan gaya dialog!
    - Jika Kepadatan Dalil "Tanpa Dalil" atau "Sangat Sedikit", jangan paksa bedah dalil di Fase 3, ganti dengan filosofi.
    - Jadikan 5 Fase ini sebagai "Rel Emosi", bukan merusak pilihan kustomisasi User.

    FORMAT YANG WAJIB DIGUNAKAN:
    <otak_internal>Memikirkan kerangka ${n} bagian yang menerapkan 5 Fase Emosi Masterclass namun selaras mutlak dengan Struktur kustomisasi user...</otak_internal>

    <bagian id="1">
    <otak_internal>Memikirkan narasi (Fase Hook/Keresahan) sesuai struktur pilihan user...</otak_internal>
    [Isi paragraf-paragraf panjang untuk bagian 1...]
    </bagian>

    <bagian id="2">
    <otak_internal>Memikirkan kelanjutan narasi (menuju Validasi/Pembuktian)...</otak_internal>
    [Isi paragraf-paragraf panjang untuk bagian 2...]
    </bagian>

    ... (TERUS LANJUTKAN SAMPAI BAGIAN KE-${n}) ...

    <bagian id="${n}">
    <otak_internal>Menulis Echo Ending (pantulan pesan dari bagian 1) dan klimaks emosional...</otak_internal>
    [Isi paragraf-paragraf panjang untuk klimaks bagian ${n}...]
    </bagian>

    ATURAN SANGAT KERAS: 
    - ANDA TIDAK BOLEH MENYIMPULKAN ATAU MENGAKHIRI NASKAH SEBELUM MENCAPAI <bagian id="${n}">.
    - DILARANG KERAS MENGUNGKAPKAN TAG [SELESAI_100%] JIKA DURASI/JUMLAH BAGIAN BELUM TERCAPAI PENUH PADA BAGIAN KE-${n}.
    - JIKA ANDA BENAR-BENAR TELAH SELESAI MENULIS SELURUH ${n} BAGIAN, BARU ANDA WAJIB MENGAKHIRI TEKS DENGAN TAG: [SELESAI_100%]

    INSTRUKSI MUTLAK (JANGAN DILANGGAR):
    1. JANGAN PERNAH MENULIS MUKADIMAH (Salam, Hamdalah, Syahadat). Sistem sudah menyediakannya.
    2. JANGAN PERNAH MENULIS DOA PENUTUP NASKAH. Berhenti tepat setelah materi pembahasan selesai.
    3. Jika ini Khotbah Jumat, tulislah isi "Khotbah Pertama" saja.
    4. Perkaya dengan dalil (Al-Quran & Hadits) dalam block \`\`\`arabic beserta terjemahannya (apapun pengaturan user, dalil WAJIB ada terjemahannya).
    5. JANGAN menulis teks [BATAS_KHOTBAH_KEDUA].
  `,_=S.chats.create({model:E,config:{temperature:.8,maxOutputTokens:8192}});let u="",a="",b=0,M=!1,t=0,h=R;for(;!M&&t<20;){t++,t>1&&i(`Mode Turbo: Meneruskan penulisan halaman ke-${t}...`,20+t*10);const e=await _.sendMessageStream({message:h});for await(const c of e){const g=c.text||"";if(u+=g,b++,a=u.replace(/<otak_internal>[\s\S]*?(<\/otak_internal>|$)/gi,"").replace(/<bagian[^>]*>/gi,"").replace(/<\/bagian>/gi,"").replace(/\[SELESAI_100%\]/gi,""),b%8===0){const o=`${A}

${a.trim()}`;s(o)}}u.includes("[SELESAI_100%]")?M=!0:h="Teks Anda terpotong karena batas panjang karakter. SILAKAN LANJUTKAN TEPAT DARI KATA TERAKHIR YANG TERPOTONG. JANGAN mengulang kalimat sebelumnya. Lanjutkan sampai tercapai bagian ke-"+n+" dan akhiri teks dengan [SELESAI_100%]"}a=u.replace(/<otak_internal>[\s\S]*?(<\/otak_internal>|$)/gi,"").replace(/<bagian[^>]*>/gi,"").replace(/<\/bagian>/gi,"").replace(/\[SELESAI_100%\]/gi,"");const $=`${A}

${a.trim()}`;if(s($),L){i("Mode Turbo: Merangkai Doa Tematik...",70),d==="Doa Khusus (Kustom target doa)"&&p.trim()?`${p}`:`${N}`;const e=`
      Anda adalah seorang Ulama kharismatik.
      Berdasarkan naskah utama bagian akhir berikut:
      """
      ... ${a.length>4e3?a.substring(a.length-4e3):a}
      """

      TUGAS: Tuliskan DOA PENUTUP tematik yang sangat menyentuh hati.
      Gunakan bahasa ${P} dan gaya ${d}.
      Sertakan Asmaul Husna yang relevan.
      Target: 2-3 paragraf khusyuk.
      PENTING: Teks Arab WAJIB dibungkus \`\`\`arabic.
    `,g=(await S.models.generateContent({model:E,contents:e,config:{temperature:.8}})).text||"Ya Allah, ampuni kami.",o=`${A}

${a.trim()}

${D}

---

${G}

${g.trim()}

${I}`;return s(o),i("Selesai!",100),o}else{const e=`${A}

${a.trim()}

${I}`;return s(e),i("Selesai!",100),e}};export{J as runTurboEngine};
