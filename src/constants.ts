
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Ultra Cerdas)', description: 'Model tercanggih untuk naskah sangat kompleks' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Sangat Cepat & Cerdas)', description: 'Keseimbangan sempurna kecepatan dan kecerdasan' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Model ringan generasi terbaru' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Model cepat dan handal' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Model hemat daya dan cepat' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash (Stabil)', description: 'Model stabil versi terbaru' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite (Stabil)', description: 'Model ringan versi terbaru' },
  { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT', description: 'Model open-source performa tinggi' },
  { id: 'gemma-4-26b-a4b-it', name: 'Gemma 4 26B A4B IT', description: 'Model open-source efisien' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)', description: 'Model eksperimental Pro' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', description: 'Model eksperimental Flash' },
];

export const DEFAULT_MODEL = 'gemini-3-flash-preview';

export const KHUTBAH_TEMPLATES: Record<string, Array<{ arabic: string; latin: string; translation: string }>> = {
  MUKADIMAH_1: [
    {
      arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ. اللَّهُمَّ نَحْمَدُكَ حَمْدًا كَمَا عَلَّمْتَنَا أَنْ نَحْمَدَكَ، وَنَشْكُرُكَ شُكْرًا كَمَا عَلَّمْتَنَا أَنْ نَشْكُرَكَ. أَنْتَ الْمُقَدِّمُ وَأَنْتَ الْمُؤَخِّرُ، بِيَدِكَ الْخَيْرُ، إِنَّكَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.',
      latin: 'Alhamdulillahi rabbil \'aalamiin. Allahumma nahmaduka hamdan kamaa \'allamtanaa an nahmadak, wa nasykuruka syukran kamaa \'allamtanaa an nasykurak. Antal muqaddimu wa antal muakhkhiru, biyadikal khairu, innaka \'alaa kulli syai-in qadiir.',
      translation: 'Segala puji bagi Allah Tuhan semesta alam. Ya Allah, kami memuji-Mu dengan pujian sebagaimana Engkau ajarkan kepada kami untuk memuji-Mu, dan kami bersyukur kepada-Mu dengan syukur sebagaimana Engkau ajarkan kepada kami. Engkaulah Yang Maha Mendahulukan dan Yang Maha Mengakhirkan, di Tangan-Mulah segala kebaikan, sungguh Engkau Maha Kuasa atas segala sesuatu.'
    },
    {
      arabic: 'أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ الَّذِي لَا نَبِيَّ بَعْدَهُ.',
      latin: 'Asyhadu an laa ilaaha illallah wahdahu laa syariikalah, wa asyhadu anna muhammadan \'abduhu wa rasuuluhulladzi laa nabiyya ba\'dah.',
      translation: 'Aku bersaksi bahwa tiada tuhan selain Allah Yang Maha Esa, tiada sekutu bagi-Nya. Dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya, yang tidak ada nabi setelahnya.'
    },
    {
      arabic: 'اللَّهُمَّ فَصَلِّ عَلَى الرَّسُولِ الْأَمِينِ، نَبِيِّنَا وَسَيِّدِنَا مُحَمَّدٍ، وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ، وَذُرِّيَّتِهِ وَأُمَّتِهِ إِلَى يَوْمِ الدِّينِ.',
      latin: 'Allahumma fashalli \'alar rasuulil amiin, nabiyyinaa wa sayyidinaa muhammadin, wa \'alaa aalihi wa shahbihi ajma\'iin, wa dzurriyyatihi wa ummatihi ilaa yaumid diin.',
      translation: 'Ya Allah, limpahkanlah selawat kepada Rasul yang terpercaya, nabi dan junjungan kami Muhammad, beserta keluarga dan seluruh sahabatnya, serta keturunan dan umatnya hingga hari kiamat.'
    },
    {
      arabic: 'أَمَّا بَعْدُ. فَيَا عِبَادَ اللَّهِ، أَحْبَابَ اللَّهِ وَأَحْبَابَ رَسُولِهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، أُوصِي نَفْسِي وَإِيَّاكُمْ بِتَقْوَى اللَّهِ فَقَدْ فَازَ الْمُتَّقُونَ.',
      latin: 'Amma ba\'du. Fayaa \'ibaadallah, ahbaaballahi wa ahbaaba rasuulihi shallallahu \'alaihi wa sallam, uushii nafsii wa iyyaakum bitaqwallahi faqad faazal muttaquun.',
      translation: 'Adapun setelah itu. Wahai hamba-hamba Allah, para kekasih Allah dan kekasih Rasul-Nya SAW, aku berwasiat kepada diriku sendiri dan kepada kalian semua untuk bertakwa kepada Allah, karena sungguh telah beruntung orang-orang yang bertakwa.'
    },
    {
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُونَ.',
      latin: 'Yaa ayyuhalladzina aamanuttaqullaha haqqa tuqaatihi wa laa tamuutunna illaa wa antum muslimuun.',
      translation: 'Hai orang-orang yang beriman, bertakwalah kepada Allah sebenar-benar takwa kepada-Nya; dan janganlah sekali-kali kamu mati melainkan dalam keadaan beragama Islam.'
    }
  ],
  MUKADIMAH_SUNNAH_1: [
    {
      arabic: 'إِنَّ الْحَمْدَ لِلَّهِ، نَحْمَدُهُ وَنَسْتَعِينُهُ وَنَسْتَغْفِرُهُ، وَنَعُوذُ بِاللَّهِ مِنْ شُرُورِ أَنْفُسِنَا وَمِنْ سَيِّئَاتِ أَعْمَالِنَا، مَنْ يَهْدِهِ اللَّهُ فَلَا مُضِلَّ لَهُ، وَمَنْ يُضْلِلْ فَلَا هَادِيَ لَهُ.',
      latin: 'Innal hamdalillahi, nahmaduhu wa nasta\'inuhu wa nastaghfiruhu, wa na\'udzubillahi min syuruuri anfusinaa wa min sayyi\'aati a\'maalinaa, man yahdihillahu falaa mudhilla lahu, wa man yudhlil falaa haadiya lahu.',
      translation: 'Sesungguhnya segala puji bagi Allah, kami memuji-Nya, memohon pertolongan-Nya, dan memohon ampunan-Nya. Kami berlindung kepada Allah dari kejahatan diri kami dan keburukan amal perbuatan kami. Barangsiapa yang diberi petunjuk oleh Allah, maka tidak ada yang dapat menyesatkannya, dan barangsiapa yang disesatkan-Nya, maka tidak ada yang dapat memberinya petunjuk.'
    },
    {
      arabic: 'وَأَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.',
      latin: 'Wa asyhadu an laa ilaaha illallah wahdahu laa syariikalah, wa asyhadu anna muhammadan \'abduhu wa rasuuluh.',
      translation: 'Dan aku bersaksi bahwa tiada tuhan yang berhak disembah selain Allah semata, tiada sekutu bagi-Nya. Dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya.'
    },
    {
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُونَ.',
      latin: 'Yaa ayyuhalladzina aamanuttaqullaha haqqa tuqaatihi wa laa tamuutunna illaa wa antum muslimuun.',
      translation: 'Hai orang-orang yang beriman, bertakwalah kepada Allah sebenar-benar takwa kepada-Nya; dan janganlah sekali-kali kamu mati melainkan dalam keadaan beragama Islam.'
    },
    {
      arabic: 'يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُمْ مِنْ نَفْسٍ وَاحِدَةٍ وَخَلَقَ مِنْهَا زَوْجَهَا وَبَثَّ مِنْهُمَا رِجَالًا كَثِيرًا وَنِسَاءً وَاتَّقُوا اللَّهَ الَّذِي تَسَاءَلُونَ بِهِ وَالْأَرْحَامَ إِنَّ اللَّهَ كَانَ عَلَيْكُمْ رَقِيبًا.',
      latin: 'Yaa ayyuhan naasuttaquu rabbakumulladzii khalaqakum min nafsin waahidatin wa khalaqa minhaa zaujahaa wa batstsa minhumaa rijaalan katsiiran wa nisaa-an, wattaqullahalladzii tasaa-aluuna bihi wal arhaam, innallaha kaana \'alaikum raqiibaa.',
      translation: 'Hai sekalian manusia, bertakwalah kepada Tuhan-mu yang telah menciptakan kamu dari seorang diri, dan dari padanya Allah menciptakan isterinya; dan dari pada keduanya Allah memperkembang biakkan laki-laki dan perempuan yang banyak. Dan bertakwalah kepada Allah yang dengan (mempergunakan) nama-Nya kamu saling meminta satu sama lain, dan (peliharalah) hubungan silaturrahim. Sesungguhnya Allah selalu menjaga dan mengawasi kamu.'
    },
    {
      arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَقُولُوا قَوْلًا سَدِيدًا يُصْلِحْ لَكُمْ أَعْمَالَكُمْ وَيَغْفِرْ لَكُمْ ذُنُوبَكُمْ وَمَنْ يُطِعِ اللَّهَ وَرَسُولَهُ فَقَدْ فَازَ فَوْزًا عَظِيمًا.',
      latin: 'Yaa ayyuhalladzina aamanuttaqullaha wa quuluu qaulan sadiidaa. Yushlih lakum a\'maalakum wa yaghfir lakum dzunuubakum, wa man yuthi\'illaha wa rasuulahu faqad faaza fauzan \'azhiimaa.',
      translation: 'Hai orang-orang yang beriman, bertakwalah kamu kepada Allah dan katakanlah perkataan yang benar, niscaya Allah memperbaiki bagimu amal-amalmu dan mengampuni bagimu dosa-dosamu. Dan barangsiapa mentaati Allah dan Rasul-Nya, maka sesungguhnya ia telah mendapat kemenangan yang besar.'
    },
    {
      arabic: 'أَمَّا بَعْدُ: فَإِنَّ أَصْدَقَ الْحَدِيثِ كِتَابُ اللَّهِ، وَخَيْرَ الْهَدْيِ هَدْيُ مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ، وَشَرَّ الْأُمُورِ مُحْدَثَاتُهَا، وَكُلَّ مُحْدَثَةٍ بِدْعَةٌ، وَكُلَّ بِدْعَةٍ ضَلَالَةٌ، وَكُلَّ ضَلَالَةٍ فِي النَّارِ.',
      latin: 'Amma ba\'du: Fa inna ashdaqal hadiitsi kitaabullah, wa khairal hadyi hadyu muhammadin shallallahu \'alaihi wa sallam, wa syarral umuuri muhdatsaatuhaa, wa kulla muhdatsatin bid\'ah, wa kulla bid\'atin dhalaalah, wa kulla dhalaalatin fin naar.',
      translation: 'Adapun setelah itu: Maka sesungguhnya sebenar-benar perkataan adalah Kitabullah (Al-Quran), dan sebaik-baik petunjuk adalah petunjuk Muhammad SAW. Dan seburuk-buruk perkara adalah perkara yang diada-adakan (dalam agama), dan setiap yang diada-adakan adalah bid\'ah, dan setiap bid\'ah adalah kesesatan, dan setiap kesesatan tempatnya di neraka.'
    }
  ],
  PENUTUP_1: [
    {
      arabic: 'بَارَكَ اللَّهُ لِي وَلَكُمْ فِي الْقُرْآنِ الْعَظِيمِ، وَنَفَعَنِي وَإِيَّاكُمْ بِمَا فِيهِ مِنَ الْآيَاتِ وَالذِّكْرِ الْحَكِيمِ.',
      latin: 'Baarakallahu lii wa lakum fil qur-aanil \'azhiim, wa nafa\'anii wa iyyaakum bimaa fiihi minal aayaati wa dzikril hakiim.',
      translation: 'Semoga Allah memberkahi aku dan kalian dalam Al-Qur\'an yang agung, dan memberikan manfaat kepadaku dan kalian dengan ayat-ayat dan peringatan yang penuh hikmah di dalamnya.'
    },
    {
      arabic: 'وَتَقَبَّلَ مِنِّي وَمِنْكُمْ تِلَاوَتَهُ إِنَّهُ هُوَ السَّمِيعُ الْعَلِيمُ.',
      latin: 'Wa taqabbala minnii wa minkum tilaawatahu innahu huwas samii\'ul \'aliim.',
      translation: 'Dan semoga Allah menerima dari sangkaku dan dari kalian bacaannya, sesungguhnya Dia Maha Mendengar lagi Maha Mengetahui.'
    },
    {
      arabic: 'أَقُولُ قَوْلِي هَذَا وَأَسْتَغْفِرُ اللَّهَ لِي وَلَكُمْ، فَاسْتَغْفِرُوهُ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ.',
      latin: 'Aquulu qawlii haadzaa wa astaghfirullaha lii wa lakum, fastaghfiruuhu innahu huwal ghafuurur rahiim.',
      translation: 'Aku ucapkan perkataanku ini dan memohon ampun kepada Allah untukku dan untuk kalian, maka mohon ampunlah kepada-Nya, sungguh Dia Maha Pengampun lagi Maha Penyayang.'
    },
    {
      arabic: 'اُدْعُوا اللَّهَ يَسْتَجِبْ لَنَا وَلَكُمْ جَمِيعًا.',
      latin: 'Ud\'ullaha yastajib lanaa wa lakum jamii\'an.',
      translation: 'Berdoalah kalian kepada Allah, niscaya Dia akan mengabulkan doa untuk kami dan untuk kalian semua.'
    }
  ],
  MUKADIMAH_2: [
    {
      arabic: 'الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا كَمَا أَمَرَ. أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.',
      latin: 'Alhamdulillahi hamdan katsiiran kamaa amar. Asyhadu an laa ilaaha illallah wahdahu laa syariikalah, wa asyhadu anna muhammadan \'abduhu wa rasuuluh.',
      translation: 'Segala puji bagi Allah dengan pujian yang banyak sebagaimana yang diperintahkan. Aku bersaksi tiada tuhan selain Allah yang Maha Esa, tiada sekutu bagi-Nya. Dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya.'
    },
    {
      arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَأَصْحَابِهِ أَجْمَعِينَ.',
      latin: 'Allahumma sholli wa sallim \'ala sayyidina muhammadin wa \'ala aalihi wa ash-haabihi ajma\'in.',
      translation: 'Ya Allah, limpahkanlah selawat dan salam kepada junjungan kami Nabi Muhammad, beserta keluarga dan seluruh sahabatnya.'
    },
    {
      arabic: 'أَمَّا بَعْدُ. فَيَا عِبَادَ اللَّهِ، اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُونَ.',
      latin: 'Amma ba\'du. Fayaa \'ibaadallah, ittaqullaha haqqa tuqaatihi wa laa tamuutunna illaa wa antum muslimuun.',
      translation: 'Adapun setelah itu. Wahai hamba-hamba Allah, bertakwalah kepada Allah dengan sebenar-benar takwa, dan janganlah sekali-kali kalian mati melainkan dalam keadaan beragama Islam.'
    },
    {
      arabic: 'إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا.',
      latin: 'Innallaha wa malaa\'ikatahu yushalluuna \'alan nabiyy. Yaa ayyuhalladzina aamanu shallu \'alaihi wa sallimu tasliima.',
      translation: 'Sesungguhnya Allah dan malaikat-malaikat-Nya bersalawat untuk Nabi. Hai orang-orang yang beriman, bersalawatlah kalian untuk Nabi dan ucapkanlah salam penghormatan kepadanya.'
    },
    {
      arabic: 'اللَّهُمَّ اغْفِرْ لِلْمُسْلِمِينَ وَالْمُسْلِمَاتِ، وَالْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ، الْأَحْيَاءِ مِنْهُمْ وَالْأَمْوَاتِ، إِنَّكَ سَمِيعٌ قَرِيبٌ مُجِيبُ الدَّعَوَاتِ.',
      latin: 'Allahummaghfir lil muslimiina wal muslimaat, wal mukminiina wal mukminaat, al-ahyaa\'i minhum wal amwaat. Innaka samii\'un qariibun mujiibud da\'waat.',
      translation: 'Ya Allah, ampunilah dosa kaum muslimin dan muslimat, mukminin dan mukminat, baik yang masih hidup maupun yang telah wafat. Sesungguhnya Engkau Maha Mendengar, Maha Dekat, dan Maha Mengabulkan doa.'
    },
    {
      arabic: 'اللَّهُمَّ اشْفِ مَرْضَانَا، وَارْحَمْ مَوْتَانَا، وَاقْضِ دُيُونَنَا، وَفَرِّجْ هُمُومَنَا.',
      latin: 'Allahummasyfi mardhaanaa, warham mawtaanaa, waqdhi duyuunanaa, wafarrij humuumanaa.',
      translation: 'Ya Allah, sembuhkanlah orang-orang sakit di antara kami, rahmatilah orang-orang yang telah wafat di antara kami, lunasilah utang-utang kami, dan berikanlah jalan keluar atas segala kegelisahan kami.'
    },
    {
      arabic: 'اللَّهُمَّ لَا تَدَعْ لَنَا فِي مَقَامِنَا هَذَا ذَنْبًا إِلَّا غَفَرْتَهُ، وَلَا هَمَّا إِلَّا فَرَّجْتَهُ، وَلَا دَيْنًا إِلَّا قَضَيْتَهُ، وَلَا مَرِيضًا إِلَّا شَفَيْتَهُ.',
      latin: 'Allahumma laa tada\' lanaa fii maqaaminaa haadzaa dzanban illaa ghafartahu, wa laa hamman illaa farrajtahu, wa laa dainan illaa qadhaitahu, wa laa mariidhan illaa syafaytahu.',
      translation: 'Ya Allah, janganlah Engkau tinggalkan bagi kami di tempat ini satu dosa pun melainkan Engkau ampuni, dan tidak ada satupun kegelisahan melainkan Engkau berikan jalan keluar, dan tidak ada satupun utang melainkan Engkau lunasi, dan tidak ada satupun yang sakit melainkan Engkau sembuhkan.'
    },
    {
      arabic: 'اللَّهُمَّ آتِ نُفُوسَنَا تَقْوَاهَا، وَزَكِّهَا أَنْتَ خَيْرُ مَنْ زَكَّاهَا، أَنْتَ وَلِيُّهَا وَمَوْلَاهَا.',
      latin: 'Allahumma aati nufuusanaa taqwaahaa, wa zakkihaa anta khairu man zakkaahaa, anta waliyyuhaa wa maulaahaa.',
      translation: 'Ya Allah, karuniakanlah ketakwaan pada jiwa kami, dan sucikanlah ia karena Engkau adalah sebaik-baik Dzat yang menyucikannya, Engkaulah pelindung dan pemeliharanya.'
    }
  ],
  PENUTUP_2: [
    {
      arabic: 'اللَّهُمَّ أَعِزَّ الْإِسْلَامَ وَالْمُسْلِمِينَ، وَانْصُرْ إِخْوَانَنَا الْمُسْتَضْعَفِينَ فِي فِلِسْطِينَ وَفِي كُلِّ مَكَانٍ.',
      latin: 'Allahumma a\'izzal islama wal muslimin, wanshur ikhwaananal mustadhafiina fi filisthiina wa fi kulli makaan.',
      translation: 'Ya Allah, muliakanlah Islam dan kaum muslimin, dan tolonglah saudara-saudara kami yang tertindas di Palestina dan di setiap tempat.'
    },
    {
      arabic: 'اللَّهُمَّ أَصْلِحْ وُلَاةَ أُمُورِنَا، وَاجْعَلْ بَلَدَنَا هَذَا آمِنًا مُطْمَئِنًّا وَسَائِرَ بِلَادِ الْمُسْلِمِينَ.',
      latin: 'Allahumma ashlih wulaata umuurinaa, waj\'al baladanaa haadzaa aaminan muthma\'innan, wa sa\'ira bilaadil muslimiin.',
      translation: 'Ya Allah, perbaikilah para pemimpin kami, dan jadikanlah negeri kami ini negeri yang aman dan tenteram, serta seluruh negeri kaum muslimin.'
    },
    {
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.',
      latin: 'Rabbanaa aatinaa fid dunyaa hasanah, wa fil aakhirati hasanah, wa qinaa \'adzaaban naar.',
      translation: 'Ya Tuhan kami, berikanlah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka.'
    },
    {
      arabic: 'وَصَلَّى اللَّهُ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ، وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ.',
      latin: 'Wa shallallahu \'alaa sayyidinaa muhammadin wa \'alaa aalihi wa shahbihi ajma\'in, walhamdulillahi rabbil \'aalamiin.',
      translation: 'Dan semoga selawat serta salam senantiasa tercurah kepada junjungan kami Nabi Muhammad, beserta keluarga dan seluruh sahabatnya, dan segala puji bagi Allah Tuhan semesta alam.'
    },
    {
      arabic: 'عِبَادَ اللَّهِ، إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَى، وَيَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ وَالْبَغْيِ، يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُونَ.',
      latin: '\'Ibaadallah.. Innallaha ya\'muru bil \'adli wal ihsaan, wa iitaa-i dzil qurbaa, wa yanhaa \'anil fahsyaa-i wal munkari wal baghyi, ya\'izhukum la\'allakum tadzakkaruun.',
      translation: 'Wahai hamba-hamba Allah.. Sesungguhnya Allah menyuruh kalian berlaku adil dan berbuat kebajikan, memberi bantuan kepada kerabat, dan Dia melarang perbuatan keji, kemungkaran, dan permusuhan. Dia memberi pengajaran kepada kalian agar kalian dapat mengambil pelajaran.'
    },
    {
      arabic: 'فَاذْكُرُوا اللَّهَ الْعَظِيمَ يَذْكُرْكُمْ، وَاشْكُرُوهُ عَلَى نِعَمِهِ يَزِدْكُمْ، وَلَذِكْرُ اللَّهِ أَكْبَرُ. وَأَقِيمُوا الصَّلَاةَ.',
      latin: 'Fadzkurullahal \'azhiima yadzkurkum, wasykuruuhu \'ala ni\'amihi yazidkum, waladzikrullahi akbar. Wa aqiimush-shalaah.',
      translation: 'Maka ingatlah Allah Yang Maha Agung, niscaya Dia akan mengingat kalian. Bersyukurlah atas nikmat-nikmat-Nya, niscaya Dia akan menambahnya untuk kalian. Dan sungguh, mengingat Allah adalah ibadah yang paling besar. Dan dirikanlah salat.'
    }
  ],
  MUKADIMAH_SUNNAH_2: [
    {
      arabic: 'الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا كَمَا أَمَرَ. أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.',
      latin: 'Alhamdulillahi hamdan katsiiran kamaa amar. Asyhadu an laa ilaaha illallah wahdahu laa syariikalah, wa asyhadu anna muhammadan \'abduhu wa rasuuluh.',
      translation: 'Segala puji bagi Allah dengan pujian yang banyak sebagaimana yang diperintahkan. Aku bersaksi tiada tuhan selain Allah yang Maha Esa, tiada sekutu bagi-Nya. Dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya.'
    },
    {
      arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَأَصْحَابِهِ أَجْمَعِينَ.',
      latin: 'Allahumma sholli wa sallim \'ala sayyidina muhammadin wa \'ala aalihi wa ash-haabihi ajma\'in.',
      translation: 'Ya Allah, limpahkanlah selawat dan salam kepada junjungan kami Nabi Muhammad, beserta keluarga dan seluruh sahabatnya.'
    },
    {
      arabic: 'أَمَّا بَعْدُ. فَيَا عِبَادَ اللَّهِ، اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ وَلَا تَمُوتُنَّ إِلَّا وَأَنْتُمْ مُسْلِمُونَ.',
      latin: 'Amma ba\'du. Fayaa \'ibaadallah, ittaqullaha haqqa tuqaatihi wa laa tamuutunna illaa wa antum muslimuun.',
      translation: 'Adapun setelah itu. Wahai hamba-hamba Allah, bertakwalah kepada Allah dengan sebenar-benar takwa, dan janganlah sekali-kali kalian mati melainkan dalam keadaan beragama Islam.'
    },
    {
      arabic: 'إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا.',
      latin: 'Innallaha wa malaa\'ikatahu yushalluuna \'alan nabiyy. Yaa ayyuhalladzina aamanu shallu \'alaihi wa sallimu tasliima.',
      translation: 'Sesungguhnya Allah dan malaikat-malaikat-Nya bersalawat untuk Nabi. Hai orang-orang yang beriman, bersalawatlah kalian untuk Nabi dan ucapkanlah salam penghormatan kepadanya.'
    },
    {
      arabic: 'اللَّهُمَّ اغْفِرْ لِلْمُسْلِمِينَ وَالْمُسْلِمَاتِ، وَالْمُؤْمِنِينَ وَالْمُؤْمِنَاتِ، الْأَحْيَاءِ مِنْهُمْ وَالْأَمْوَاتِ، إِنَّكَ سَمِيعٌ قَرِيبٌ مُجِيبُ الدَّعَوَاتِ.',
      latin: 'Allahummaghfir lil muslimiina wal muslimaat, wal mukminiina wal mukminaat, al-ahyaa\'i minhum wal amwaat. Innaka samii\'un qariibun mujiibud da\'waat.',
      translation: 'Ya Allah, ampunilah dosa kaum muslimin dan muslimat, mukminin dan mukminat, baik yang masih hidup maupun yang telah wafat. Sesungguhnya Engkau Maha Mendengar, Maha Dekat, dan Maha Mengabulkan doa.'
    },
    {
      arabic: 'اللَّهُمَّ اشْفِ مَرْضَانَا، وَارْحَمْ مَوْتَانَا، وَاقْضِ دُيُونَنَا، وَفَرِّجْ هُمُومَنَا.',
      latin: 'Allahummasyfi mardhaanaa, warham mawtaanaa, waqdhi duyuunanaa, wafarrij humuumanaa.',
      translation: 'Ya Allah, sembuhkanlah orang-orang sakit di antara kami, rahmatilah orang-orang yang telah wafat di antara kami, lunasilah utang-utang kami, dan berikanlah jalan keluar atas segala kegelisahan kami.'
    },
    {
      arabic: 'اللَّهُمَّ لَا تَدَعْ لَنَا فِي مَقَامِنَا هَذَا ذَنْبًا إِلَّا غَفَرْتَهُ، وَلَا هَمَّا إِلَّا فَرَّجْتَهُ، وَلَا دَيْنًا إِلَّا قَضَيْتَهُ، وَلَا مَرِيضًا إِلَّا شَفَيْتَهُ.',
      latin: 'Allahumma laa tada\' lanaa fii maqaaminaa haadzaa dzanban illaa ghafartahu, wa laa hamman illaa farrajtahu, wa laa dainan illaa qadhaitahu, wa laa mariidhan illaa syafaytahu.',
      translation: 'Ya Allah, janganlah Engkau tinggalkan bagi kami di tempat ini satu dosa pun melainkan Engkau ampuni, dan tidak ada satupun kegelisahan melainkan Engkau berikan jalan keluar, dan tidak ada satupun utang melainkan Engkau lunasi, dan tidak ada satupun yang sakit melainkan Engkau sembuhkan.'
    },
    {
      arabic: 'اللَّهُمَّ آتِ نُفُوسَنَا تَقْوَاهَا، وَزَكِّهَا أَنْتَ خَيْرُ مَنْ زَكَّاهَا، أَنْتَ وَلِيُّهَا وَمَوْلَاهَا.',
      latin: 'Allahumma aati nufuusanaa taqwaahaa, wa zakkihaa anta khairu man zakkaahaa, anta waliyyuhaa wa maulaahaa.',
      translation: 'Ya Allah, karuniakanlah ketakwaan pada jiwa kami, dan sucikanlah ia karena Engkau adalah sebaik-baik Dzat yang menyucikannya, Engkaulah pelindung dan pemeliharanya.'
    }
  ],
  PENUTUP_SUNNAH_2: [
    {
      arabic: 'اللَّهُمَّ أَعِزَّ الْإِسْلَامَ وَالْمُسْلِمِينَ، وَانْصُرْ إِخْوَانَنَا الْمُسْتَضْعَفِينَ فِي فِلِسْطِينَ وَفِي كُلِّ مَكَانٍ.',
      latin: 'Allahumma a\'izzal islama wal muslimin, wanshur ikhwaananal mustadhafiina fi filisthiina wa fi kulli makaan.',
      translation: 'Ya Allah, muliakanlah Islam dan kaum muslimin, dan tolonglah saudara-saudara kami yang tertindas di Palestina dan di setiap tempat.'
    },
    {
      arabic: 'اللَّهُمَّ أَصْلِحْ وُلَاةَ أُمُورِنَا، وَاجْعَلْ بَلَدَنَا هَذَا آمِنًا مُطْمَئِنًّا وَسَائِرَ بِلَادِ الْمُسْلِمِينَ.',
      latin: 'Allahumma ashlih wulaata umuurinaa, waj\'al baladanaa haadzaa aaminan muthma\'innan, wa sa\'ira bilaadil muslimiin.',
      translation: 'Ya Allah, perbaikilah para pemimpin kami, dan jadikanlah negeri kami ini negeri yang aman dan tenteram, serta seluruh negeri kaum muslimin.'
    },
    {
      arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ.',
      latin: 'Rabbanaa aatinaa fid dunyaa hasanah, wa fil aakhirati hasanah, wa qinaa \'adzaaban naar.',
      translation: 'Ya Tuhan kami, berikanlah kami kebaikan di dunia dan kebaikan di akhirat, dan lindungilah kami dari azab neraka.'
    },
    {
      arabic: 'وَصَلَّى اللَّهُ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ أَجْمَعِينَ، وَالْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ.',
      latin: 'Wa shallallahu \'alaa sayyidinaa muhammadin wa \'alaa aalihi wa shahbihi ajma\'in, walhamdulillahi rabbil \'aalamiin.',
      translation: 'Dan semoga selawat serta salam senantiasa tercurah kepada junjungan kami Nabi Muhammad, beserta keluarga dan seluruh sahabatnya, dan segala puji bagi Allah Tuhan semesta alam.'
    },
    {
      arabic: 'عِبَادَ اللَّهِ، إِنَّ اللَّهَ يَأْمُرُ بِالْعَدْلِ وَالْإِحْسَانِ وَإِيتَاءِ ذِي الْقُرْبَى، وَيَنْهَى عَنِ الْفَحْشَاءِ وَالْمُنْكَرِ وَالْبَغْيِ، يَعِظُكُمْ لَعَلَّكُمْ تَذَكَّرُونَ.',
      latin: '\'Ibaadallah.. Innallaha ya\'muru bil \'adli wal ihsaan, wa iitaa-i dzil qurbaa, wa yanhaa \'anil fahsyaa-i wal munkari wal baghyi, ya\'izhukum la\'allakum tadzakkaruun.',
      translation: 'Wahai hamba-hamba Allah.. Sesungguhnya Allah menyuruh kalian berlaku adil dan berbuat kebajikan, memberi bantuan kepada kerabat, dan Dia melarang perbuatan keji, kemungkaran, dan permusuhan. Dia memberi pengajaran kepada kalian agar kalian dapat mengambil pelajaran.'
    },
    {
      arabic: 'فَاذْكُرُوا اللَّهَ الْعَظِيمَ يَذْكُرْكُمْ، وَاشْكُرُوهُ عَلَى نِعَمِهِ يَزِدْكُمْ، وَلَذِكْرُ اللَّهِ أَكْبَرُ. وَأَقِيمُوا الصَّلَاةَ.',
      latin: 'Fadzkurullahal \'azhiima yadzkurkum, wasykuruuhu \'ala ni\'amihi yazidkum, waladzikrullahi akbar. Wa aqiimush-shalaah.',
      translation: 'Maka ingatlah Allah Yang Maha Agung, niscaya Dia akan mengingat kalian. Bersyukurlah atas nikmat-nikmat-Nya, niscaya Dia akan menambahnya untuk kalian. Dan sungguh, mengingat Allah adalah ibadah yang paling besar. Dan dirikanlah salat.'
    }
  ]
};

// Remove the old KHUTBAH_TEMPLATES object as it's now in src/data/khotbahTemplates.ts
