import { KHUTBAH_TEMPLATES } from '../constants';

export const cleanUpInstructionText = (text: string) => {
  if (!text) return text;
  
  let cleanedText = text.replace(/\(tanpa tanda kutip, tanpa tambahan kata pengantar apapun, tanpa format markdown\)/gi, '');
  cleanedText = cleanedText.replace(/\(Ini adalah placeholder yang akan diganti otomatis oleh sistem\)/gi, '');
  cleanedText = cleanedText.replace(/Ini adalah placeholder yang akan diganti otomatis oleh sistem\.?/gi, '');
  cleanedText = cleanedText.replace(/JANGAN TULIS MUKADIMAH APAPUN\.?/gi, '');
  cleanedText = cleanedText.replace(/HANYA tulis TEPAT teks ini di baris paling awal:?/gi, '');
  cleanedText = cleanedText.replace(/HANYA tulis TEPAT teks ini:?/gi, '');
  return cleanedText;
};

export const getFormattedTemplate = (key: string, includeTranslation: boolean = false, includeLatin: boolean = false, isMarkdown: boolean = true) => {
  const parts = KHUTBAH_TEMPLATES[key as keyof typeof KHUTBAH_TEMPLATES];
  if (!parts) return '';
  
  let result = '';

  const MACRO_UI = (text: string) => `\n<div class="print:hidden text-[10px] text-slate-300 uppercase tracking-widest flex items-center justify-center gap-3 mb-6 mt-10 opacity-60 select-none">\n  <span class="w-8 h-px bg-slate-300/30"></span>\n  <span class="sr-only">Navigasi: </span>✧ ${text} ✧\n  <span class="w-8 h-px bg-slate-300/30"></span>\n</div>\n\n`;

  if (isMarkdown) {
    if (key === 'MUKADIMAH_1' || key === 'MUKADIMAH_SUNNAH_1') {
      result += MACRO_UI('MUKADIMAH KHOTBAH PERTAMA');
    } else if (key === 'PENUTUP_1') {
      result += MACRO_UI('PENUTUP KHOTBAH PERTAMA');
    } else if (key === 'MUKADIMAH_2' || key === 'MUKADIMAH_SUNNAH_2') {
      result += MACRO_UI('DUDUK DI ANTARA DUA KHOTBAH');
    }
  }

  const getMicroType = (k: string, index: number) => {
    switch (k) {
      case 'MUKADIMAH_1':
        return ['hamdalah', 'syahadat', 'shalawat', 'wasiat-taqwa', 'dalil-taqwa'][index] || `struktur-${index}`;
      case 'MUKADIMAH_SUNNAH_1':
        return ['innalhamdalillah', 'syahadat', 'wasiat-taqwa-1', 'wasiat-taqwa-2', 'wasiat-taqwa-3', 'amma-badu'][index] || `struktur-${index}`;
      case 'PENUTUP_1':
        return ['barakallah', 'taqabbalallah', 'astaghfirullah', 'udullah'][index] || `struktur-${index}`;
      case 'MUKADIMAH_2':
      case 'MUKADIMAH_SUNNAH_2':
        return ['hamdalah-syahadat', 'shalawat', 'wasiat-taqwa-singkat', 'ayat-shalawat', 'doa-ampunan', 'doa-kesehatan-utang', 'doa-sapu-jagat-diri', 'doa-ketakwaan'][index] || `struktur-${index}`;
      case 'PENUTUP_2':
      case 'PENUTUP_SUNNAH_2':
        return ['doa-islam-palestina', 'doa-pemimpin-negara', 'doa-dunia-akhirat', 'shalawat-penutup', 'ibadallah', 'dzikir-penutup'][index] || `struktur-${index}`;
      default:
        return `ruktur-${k.toLowerCase()}-${index}`;
    }
  };

  parts.forEach((t, i) => {
    if (isMarkdown) {
      if ((key === 'MUKADIMAH_2' || key === 'MUKADIMAH_SUNNAH_2') && i === 4) {
        result += MACRO_UI('RUKUN DOA KHOTBAH KEDUA');
      }

      const microType = getMicroType(key, i);
      result += `\n<div data-type="${microType}" class="hidden structure-marker"></div>\n`;
      result += `\n\`\`\`arabic\n${t.arabic}\n\`\`\`\n`;
      if (includeLatin) result += `*${t.latin}*\n\n`;
      if (includeTranslation) result += `> Artinya: ${t.translation}\n\n`;
    } else {
      result += `${t.arabic}\n`;
      if (includeLatin) result += `${t.latin}\n`;
      if (includeTranslation) result += `Artinya: ${t.translation}\n`;
      result += `\n`;
    }
  });
  
  return result;
};

export const processTemplateMarkers = (text: string, includeTranslation: boolean = false, includeLatin: boolean = false) => {
  if (!text) return text;
  
  let cleanedText = cleanUpInstructionText(text);

  return cleanedText
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*MUKADIMAH[_\s]*1\s*\\?\]/gi, getFormattedTemplate('MUKADIMAH_1', includeTranslation, includeLatin, true))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*MUKADIMAH[_\s]*SUNNAH[_\s]*1\s*\\?\]/gi, getFormattedTemplate('MUKADIMAH_SUNNAH_1', includeTranslation, includeLatin, true))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*PENUTUP[_\s]*1\s*\\?\]/gi, getFormattedTemplate('PENUTUP_1', includeTranslation, includeLatin, true))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*MUKADIMAH[_\s]*2\s*\\?\]/gi, getFormattedTemplate('MUKADIMAH_2', includeTranslation, includeLatin, true))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*MUKADIMAH[_\s]*SUNNAH[_\s]*2\s*\\?\]/gi, getFormattedTemplate('MUKADIMAH_SUNNAH_2', includeTranslation, includeLatin, true))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*PENUTUP[_\s]*2\s*\\?\]/gi, getFormattedTemplate('PENUTUP_2', includeTranslation, includeLatin, true))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*PENUTUP[_\s]*SUNNAH[_\s]*2\s*\\?\]/gi, getFormattedTemplate('PENUTUP_SUNNAH_2', includeTranslation, includeLatin, true))
    // Catch-all for malformed templates (more specific to avoid accidental matches)
    .replace(/\[\s*template\s*mukadimah\s*1\s*\]/gi, getFormattedTemplate('MUKADIMAH_1', includeTranslation, includeLatin, true))
    .replace(/\[\s*template\s*mukadimah\s*sunnah\s*1\s*\]/gi, getFormattedTemplate('MUKADIMAH_SUNNAH_1', includeTranslation, includeLatin, true))
    .replace(/\[\s*template\s*penutup\s*1\s*\]/gi, getFormattedTemplate('PENUTUP_1', includeTranslation, includeLatin, true))
    .replace(/\[\s*template\s*mukadimah\s*2\s*\]/gi, getFormattedTemplate('MUKADIMAH_2', includeTranslation, includeLatin, true))
    .replace(/\[\s*template\s*mukadimah\s*sunnah\s*2\s*\]/gi, getFormattedTemplate('MUKADIMAH_SUNNAH_2', includeTranslation, includeLatin, true))
    .replace(/\[\s*template\s*penutup\s*2\s*\]/gi, getFormattedTemplate('PENUTUP_2', includeTranslation, includeLatin, true))
    .replace(/\[\s*template\s*penutup\s*sunnah\s*2\s*\]/gi, getFormattedTemplate('PENUTUP_SUNNAH_2', includeTranslation, includeLatin, true));
};

export const processTemplateMarkersForText = (text: string, includeTranslation: boolean = false, includeLatin: boolean = false) => {
  if (!text) return text;
  
  let cleanedText = cleanUpInstructionText(text);

  return cleanedText
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*MUKADIMAH[_\s]*1\s*\\?\]/gi, getFormattedTemplate('MUKADIMAH_1', includeTranslation, includeLatin, false))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*MUKADIMAH[_\s]*SUNNAH[_\s]*1\s*\\?\]/gi, getFormattedTemplate('MUKADIMAH_SUNNAH_1', includeTranslation, includeLatin, false))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*PENUTUP[_\s]*1\s*\\?\]/gi, getFormattedTemplate('PENUTUP_1', includeTranslation, includeLatin, false))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*MUKADIMAH[_\s]*2\s*\\?\]/gi, getFormattedTemplate('MUKADIMAH_2', includeTranslation, includeLatin, false))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*MUKADIMAH[_\s]*SUNNAH[_\s]*2\s*\\?\]/gi, getFormattedTemplate('MUKADIMAH_SUNNAH_2', includeTranslation, includeLatin, false))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*PENUTUP[_\s]*2\s*\\?\]/gi, getFormattedTemplate('PENUTUP_2', includeTranslation, includeLatin, false))
    .replace(/(?:(?:\d+\.\s*)?(?:\*\*[^*]+\*\*\s*:?\s*)?(?:[a-zA-Z\s]*:\s*)?)?\\?\[\s*TEMPLATE[_\s]*PENUTUP[_\s]*SUNNAH[_\s]*2\s*\\?\]/gi, getFormattedTemplate('PENUTUP_SUNNAH_2', includeTranslation, includeLatin, false))
    // Catch-all for malformed templates (more specific to avoid accidental matches)
    .replace(/\[\s*template\s*mukadimah\s*1\s*\]/gi, getFormattedTemplate('MUKADIMAH_1', includeTranslation, includeLatin, false))
    .replace(/\[\s*template\s*mukadimah\s*sunnah\s*1\s*\]/gi, getFormattedTemplate('MUKADIMAH_SUNNAH_1', includeTranslation, includeLatin, false))
    .replace(/\[\s*template\s*penutup\s*1\s*\]/gi, getFormattedTemplate('PENUTUP_1', includeTranslation, includeLatin, false))
    .replace(/\[\s*template\s*mukadimah\s*2\s*\]/gi, getFormattedTemplate('MUKADIMAH_2', includeTranslation, includeLatin, false))
    .replace(/\[\s*template\s*mukadimah\s*sunnah\s*2\s*\]/gi, getFormattedTemplate('MUKADIMAH_SUNNAH_2', includeTranslation, includeLatin, false))
    .replace(/\[\s*template\s*penutup\s*2\s*\]/gi, getFormattedTemplate('PENUTUP_2', includeTranslation, includeLatin, false))
    .replace(/\[\s*template\s*penutup\s*sunnah\s*2\s*\]/gi, getFormattedTemplate('PENUTUP_SUNNAH_2', includeTranslation, includeLatin, false));
};
