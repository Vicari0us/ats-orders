// ============================================================
// ATS Orders - Order Tracking System
// Firebase + Google Auth + Firestore
// ============================================================

// ---- Firebase Config ----
// TODO: Replace with your Firebase project config from console.firebase.google.com
const firebaseConfig = {
  apiKey: "AIzaSyCi3ijJj0s1WL8sIctr0LD8kDog1DZwkIo",
  authDomain: "ats-orders.firebaseapp.com",
  projectId: "ats-orders",
  storageBucket: "ats-orders.firebasestorage.app",
  messagingSenderId: "681879534831",
  appId: "1:681879534831:web:c6e0aea8036b156096ef1a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ---- App State ----
const SUPPLIERS = ['Muscle Mecca', 'HD Labs', 'Elev8'];
const COURIER_FEES = { 'Muscle Mecca': 150, 'HD Labs': 120, 'Elev8': 100 };
function getCourierFee(supplier) { return COURIER_FEES[supplier || currentSupplier] || 150; }
const COURIER_FEE = 150; // legacy reference, use getCourierFee() for supplier-specific
let currentSupplier = SUPPLIERS[0];
let currentWeek = null;
let editingOrderId = null;
let parsedOrders = [];
let currentUser = null;
let ordersCache = {};
let dashboardActive = false;

// ---- Price List (sell = standard retail, pref = preferential, cost = cost price) ----

const PRICE_LISTS = {
  'Muscle Mecca': [
    { name: 'iPharma Retatrutide Pen', keywords: ['ipharma reta', 'reta pen', 'reta pens', '30mg pens', '30mg pen'], sell: 2600, pref: 2160, cost: 1720 },
    { name: 'iPharma Tirzepatide Pen', keywords: ['tirzep pen ipharma', 'ipharma tirzep', 'tirzepatide pen ipharma'], sell: 2400, pref: 1990, cost: 1550 },
    { name: 'iPharma L-Carnitine 50ml', keywords: ['ipharma l-carn', 'l-carnitine'], sell: 450, pref: 380, cost: 310 },
    { name: 'Vmed Test Enanthate', keywords: ['vmed test e'], sell: 470, pref: 415, cost: 360 },
    { name: 'Vmed NPP 100', keywords: ['vmed npp'], sell: 480, pref: 420, cost: 360 },
    { name: 'Vmed Nolvadex (Tamoxifen)', keywords: ['tamoxifen vmed', 'vmed nolva', 'vmed tamox'], sell: 270, pref: 225, cost: 180 },
    { name: 'UPA Test Enanthate', keywords: ['upa test e'], sell: 440, pref: 383, cost: 325 },
    { name: 'Glucophage 1000mg', keywords: ['glucophage'], sell: 320, pref: 300, cost: 280 },
    { name: 'Tesar 80mg (Telmisartan)', keywords: ['tesar'], sell: 350, pref: 290, cost: 280 },
    { name: 'NOVA Test Cypionate', keywords: ['nova test c', 'test cypionate'], sell: 420, pref: 355, cost: 290 },
    { name: 'NOVA Tren Acetate', keywords: ['tren acetate', 'tren ace'], sell: 550, pref: 500, cost: 450 },
    { name: 'NOVA Nolvadex', keywords: ['nova nolva', 'nolvadex'], sell: 350, pref: 310, cost: 270 },
    { name: 'NOVA Arimidex', keywords: ['arimidex', 'arimadex'], sell: 380, pref: 355, cost: 330 },
    { name: 'NOVA Cialis Daily', keywords: ['cialis daily'], sell: 250, pref: 198, cost: 145 },
    { name: 'Keifei Test E 250', keywords: ['keifei test e'], sell: 600, pref: 550, cost: 500 },
    { name: 'MyLife Tirzepatide Pen', keywords: ['mylife tirzep', 'mylife tirz'], sell: 2250, pref: 1900, cost: 1550 },
  ],
  'HD Labs': [
    // TABLETS
    { name: 'Anaps50 (Oxymetholone)', keywords: ['anaps', 'oxymetholone'], sell: 300, pref: 255, cost: 210 },
    { name: 'Anavar 10', keywords: ['anavar 10', 'oxandrolone 10'], sell: 300, pref: 255, cost: 210 },
    { name: 'Anavar 20', keywords: ['anavar 20', 'oxandrolone 20', 'bp anavar 20'], sell: 350, pref: 280, cost: 210 },
    { name: 'Anavar 50', keywords: ['anavar 50', 'oxandrolone 50'], sell: 500, pref: 450, cost: 400 },
    { name: 'Arimadex (Anastrozole)', keywords: ['arimadex', 'anastrozole'], sell: 250, pref: 210, cost: 170 },
    { name: 'Cialis 5mg', keywords: ['cialis 5', 'cialis5', 'tadalafil 5'], sell: 150, pref: 105, cost: 60 },
    { name: 'Cialis 20mg', keywords: ['cialis 20', 'cialis20', 'tadalafil 20'], sell: 190, pref: 145, cost: 100 },
    { name: 'Clenbuterol Tabs', keywords: ['clen tab', 'clenbuterol tab', 'clen oral'], sell: 180, pref: 135, cost: 90 },
    { name: 'Clomid', keywords: ['clomid', 'clomiphene'], sell: 250, pref: 210, cost: 170 },
    { name: 'DHEA 25', keywords: ['dhea'], sell: 250, pref: 200, cost: 150 },
    { name: 'Dianabol 10', keywords: ['dianabol 10', 'dbol 10', 'dbol10'], sell: 150, pref: 110, cost: 70 },
    { name: 'Dianabol 50', keywords: ['dianabol 50', 'dbol 50', 'dbol50'], sell: 250, pref: 195, cost: 140 },
    { name: 'Famara (Letrozole)', keywords: ['famara', 'letrozole'], sell: 250, pref: 210, cost: 170 },
    { name: 'Halotest', keywords: ['halotest', 'fluoxymesterone', 'halotestin'], sell: 680, pref: 630, cost: 580 },
    { name: 'HeliosT3 Tabs', keywords: ['heliost3', 'helios t3'], sell: 200, pref: 155, cost: 110 },
    { name: 'Ketotifen', keywords: ['ketotifen'], sell: 220, pref: 175, cost: 130 },
    { name: 'Methyl-1-Test', keywords: ['methyl-1-test', 'methyl 1 test', 'm1t'], sell: 180, pref: 135, cost: 90 },
    { name: 'Oraltren', keywords: ['oraltren', 'methyltrienolone', 'oral tren'], sell: 280, pref: 225, cost: 170 },
    { name: 'Oral BPC', keywords: ['oral bpc', 'bpc tab', 'bpc oral'], sell: 550, pref: 485, cost: 420 },
    { name: 'Primo 25 Tabs', keywords: ['primo 25', 'primo25', 'methenolone acetate'], sell: 540, pref: 465, cost: 390 },
    { name: 'Proviron', keywords: ['proviron', 'mesterolone'], sell: 290, pref: 250, cost: 210 },
    { name: 'Superdrol', keywords: ['superdrol'], sell: 280, pref: 225, cost: 170 },
    { name: 'T3', keywords: ['t3', 'liothyronine'], sell: 190, pref: 135, cost: 80 },
    { name: 'Yohimbine Tabs', keywords: ['yohimbine tab', 'yohimbine oral'], sell: 220, pref: 190, cost: 160 },
    { name: 'Tamox (Tamoxifen)', keywords: ['tamox', 'tamoxifen', 'nolvadex'], sell: 190, pref: 135, cost: 80 },
    { name: 'Turanabol 10', keywords: ['turanabol', 'tbol', 'turinabol'], sell: 280, pref: 210, cost: 140 },
    { name: 'Winstrol 10', keywords: ['winstrol 10', 'winny 10', 'stanozolol 10'], sell: 200, pref: 140, cost: 80 },
    { name: 'Winstrol 50', keywords: ['winstrol 50', 'winny 50', 'stanozolol 50'], sell: 320, pref: 235, cost: 150 },
    // INJECTABLES
    { name: 'Aquaject 100 (Test Susp)', keywords: ['aquaject', 'test suspension', 'test susp'], sell: 260, pref: 205, cost: 150 },
    { name: 'Clenbuterol Injectable', keywords: ['clen inject', 'clenbuterol inject', 'clen inj'], sell: 260, pref: 215, cost: 170 },
    { name: 'Depoject 200 (Test Cyp)', keywords: ['depoject', 'test cyp', 'test cypionate'], sell: 300, pref: 240, cost: 180 },
    { name: 'Duraject 100 (NPP)', keywords: ['duraject', 'npp', 'nandrolone phenyl'], sell: 320, pref: 260, cost: 200 },
    { name: 'Equiject 200 (Boldenone)', keywords: ['equiject', 'boldenone', 'eq 200', 'equipoise'], sell: 380, pref: 330, cost: 280 },
    { name: 'Finaject (Tren Hex)', keywords: ['finaject', 'tren hex', 'trenbolone hex'], sell: 540, pref: 485, cost: 430 },
    { name: 'Helios Injectable', keywords: ['helios inj', 'helios inject', 'clen yohimbe'], sell: 300, pref: 240, cost: 180 },
    { name: 'Mastaject 100', keywords: ['mastaject 100', 'mast 100', 'masteron 100', 'drostanolone 100'], sell: 400, pref: 350, cost: 300 },
    { name: 'Mastaject 200', keywords: ['mastaject 200', 'mast 200', 'masteron 200', 'drostanolone 200'], sell: 500, pref: 445, cost: 390 },
    { name: 'Nandroject 300 (Deca)', keywords: ['nandroject', 'deca 300', 'nandrolone deca', 'deca', 'deka', 'decca'], sell: 420, pref: 365, cost: 310 },
    { name: 'Nebidoject 250 (Test U)', keywords: ['nebidoject', 'test undecanoate', 'test u', 'nebido'], sell: 320, pref: 260, cost: 200 },
    { name: 'Primoject 100', keywords: ['primoject 100', 'primo 100', 'primobolan 100'], sell: 590, pref: 530, cost: 470 },
    { name: 'Primoject 200', keywords: ['primoject 200', 'primo 200', 'primobolan 200'], sell: 810, pref: 770, cost: 730 },
    { name: 'Propioject 100 (Test Prop)', keywords: ['propioject', 'test prop', 'test propionate'], sell: 280, pref: 225, cost: 170 },
    { name: 'Stanoject 50 (Winstrol Inj)', keywords: ['stanoject', 'winstrol inj', 'winny inj', 'stanozolol inj'], sell: 280, pref: 215, cost: 150 },
    { name: 'Sustaject (Sustanon)', keywords: ['sustaject', 'sustanon', 'sust'], sell: 380, pref: 300, cost: 220 },
    { name: 'Testaject (Test E)', keywords: ['testaject', 'test e', 'test enanthate'], sell: 390, pref: 295, cost: 200 },
    { name: 'Trenaject 100 (Tren Ace)', keywords: ['trenaject 100', 'tren ace', 'tren acetate', 'trenbolone acetate'], sell: 480, pref: 405, cost: 330 },
    { name: 'Trenaject 200 (Tren E)', keywords: ['trenaject 200', 'tren e', 'tren enanthate', 'trenbolone enanthate'], sell: 590, pref: 510, cost: 430 },
    { name: 'Trestolone/MENT', keywords: ['trestolone', 'ment'], sell: 950, pref: 885, cost: 820 },
    { name: 'Trinaject (Tren Blend)', keywords: ['trinaject', 'tren blend', 'tri tren'], sell: 580, pref: 505, cost: 430 },
    // SUPER BLACK SERIES
    { name: 'SuperBulk 600', keywords: ['superbulk', 'super bulk'], sell: 610, pref: 525, cost: 440 },
    { name: 'SuperCutMix 300', keywords: ['supercutmix', 'super cut', 'cutmix'], sell: 610, pref: 525, cost: 440 },
    { name: 'SuperSize 500', keywords: ['supersize', 'super size'], sell: 610, pref: 525, cost: 440 },
    { name: 'SuperTest 500', keywords: ['supertest', 'super test'], sell: 450, pref: 365, cost: 280 },
    // AMPS
    { name: 'Sustanon Amp', keywords: ['sustanon amp', 'sust amp'], sell: 35, pref: 28, cost: 20 },
    // GH & PEPTIDES
    { name: 'CJC-1295 with DAC', keywords: ['cjc-1295', 'cjc 1295', 'cjc'], sell: 400, pref: 340, cost: 280 },
    { name: 'HGH Fragment 176-191', keywords: ['hgh frag', 'hgh fragment', 'fragment 176'], sell: 330, pref: 270, cost: 210 },
    { name: 'GHRP-6', keywords: ['ghrp-6', 'ghrp 6', 'ghrp6'], sell: 290, pref: 235, cost: 180 },
    { name: 'HCG (Pregnyl) 5000iu', keywords: ['hcg', 'pregnyl'], sell: 300, pref: 250, cost: 200 },
    { name: 'HGH 10iu (10 vials)', keywords: ['hgh 10iu', 'hgh rdna', 'growth hormone'], sell: 2200, pref: 2100, cost: 2000 },
    { name: 'IGF-1 Lr3 (10 vials)', keywords: ['igf-1', 'igf 1', 'igf1'], sell: 2200, pref: 2100, cost: 2000 },
    { name: 'PT-141 (Lovers Peptide)', keywords: ['pt-141', 'pt 141', 'pt141', 'lover', 'bremelanotide'], sell: 350, pref: 315, cost: 280 },
    { name: 'Melanotan II', keywords: ['melanotan', 'mt2', 'mt 2', 'mt-2'], sell: 280, pref: 240, cost: 200 },
    { name: 'TB500', keywords: ['tb500', 'tb 500', 'thymosin beta'], sell: 380, pref: 330, cost: 280 },
    { name: 'Lantus Insulin Pen', keywords: ['lantus', 'slow insulin', 'long acting insulin'], sell: 300, pref: 265, cost: 230 },
    { name: 'Humalog Insulin Pen', keywords: ['humalog', 'fast insulin', 'short acting insulin'], sell: 270, pref: 245, cost: 220 },
    { name: 'BPC-157 Vial', keywords: ['bpc-157', 'bpc 157', 'bpc157'], sell: 350, pref: 300, cost: 250 },
    { name: '5Amino-1Mq', keywords: ['5amino', '5-amino', '5amino-1mq', '5amino 1mq'], sell: 500, pref: 450, cost: 400 },
    { name: 'Mots-C', keywords: ['mots-c', 'mots c', 'motsc'], sell: 400, pref: 340, cost: 280 },
    // SARMS
    { name: 'Andarine S4', keywords: ['andarine', 's4', 'andarine s4'], sell: 350, pref: 295, cost: 240 },
    { name: 'GW-501516 (Cardarine)', keywords: ['gw-501516', 'gw 501516', 'cardarine'], sell: 280, pref: 225, cost: 170 },
    { name: 'LGD-4033 (Anabolicum)', keywords: ['lgd-4033', 'lgd 4033', 'lgd4033', 'anabolicum'], sell: 280, pref: 225, cost: 170 },
    { name: 'MK-677 (Nutrobal)', keywords: ['mk-677', 'mk 677', 'mk677', 'nutrobal'], sell: 350, pref: 295, cost: 240 },
    { name: 'Ostarine MK-2866', keywords: ['ostarine', 'mk-2866', 'mk 2866'], sell: 350, pref: 295, cost: 240 },
    { name: 'RAD-140 (Testolone)', keywords: ['rad-140', 'rad 140', 'rad140', 'testolone'], sell: 280, pref: 225, cost: 170 },
    { name: 'SR9009 (Stenabolic)', keywords: ['sr9009', 'sr 9009', 'stenabolic'], sell: 380, pref: 320, cost: 260 },
    // OTHER
    { name: 'DNP', keywords: ['dnp', 'dinitrophenol'], sell: 280, pref: 225, cost: 170 },
    { name: 'SibutraMax', keywords: ['sibutramax', 'sibutramine'], sell: 360, pref: 260, cost: 160 },
    { name: 'Metformin 1000', keywords: ['metformin', 'glucophage'], sell: 350, pref: 270, cost: 190 },
    { name: 'Simply Shredded', keywords: ['simply shredded'], sell: 400, pref: 350, cost: 300 },
    { name: 'Tight & Tone', keywords: ['tight & tone', 'tight and tone', 'eca stack'], sell: 350, pref: 300, cost: 250 },
    // SUPPLEMENTS
    { name: 'Amino Muscle (BCAA)', keywords: ['amino muscle', 'bcaa', 'eaa'], sell: 300, pref: 250, cost: 200 },
    { name: 'Creatine', keywords: ['creatine'], sell: 280, pref: 240, cost: 200 },
    { name: 'Vitamin D3', keywords: ['d3', 'vitamin d3', 'vitamin d'], sell: 180, pref: 135, cost: 90 },
    { name: 'Slin Tabs (GDA)', keywords: ['slin tab', 'slin tabs', 'gda'], sell: 440, pref: 335, cost: 230 },
    { name: 'Venom Pre Workout', keywords: ['venom', 'pre workout', 'pre-workout'], sell: 350, pref: 305, cost: 260 },
    { name: 'ZMA', keywords: ['zma'], sell: 220, pref: 165, cost: 110 },
    { name: 'Tudca', keywords: ['tudca'], sell: 350, pref: 325, cost: 300 },
    // WEIGHTLOSS & BEAUTY - VIALS
    { name: 'Semaglutide Vial 10mg', keywords: ['semaglutide vial', 'sema vial'], sell: 1200, pref: 900, cost: 600 },
    { name: 'CagriSema', keywords: ['cagrisema', 'cagri sema'], sell: 2350, pref: 2025, cost: 1700 },
    { name: 'Tirzepatide Vial 30mg', keywords: ['tirzepatide vial', 'tirz vial', 'tirzep vial'], sell: 1900, pref: 1500, cost: 1100 },
    { name: 'Retatrutide Vial 32mg', keywords: ['retatrutide vial', 'reta vial'], sell: 1950, pref: 1525, cost: 1100 },
    { name: 'GHK-CU (Copper Peptide)', keywords: ['ghk-cu', 'ghk cu', 'copper peptide'], sell: 750, pref: 650, cost: 550 },
    // WEIGHTLOSS & BEAUTY - PENS
    { name: 'Semaglutide Pen 10mg', keywords: ['semaglutide pen', 'sema pen'], sell: 2100, pref: 1750, cost: 1400 },
    { name: 'Tirzepatide Pen 30mg', keywords: ['tirzepatide pen', 'tirz pen', 'tirzep pen'], sell: 3100, pref: 2700, cost: 2300 },
    { name: 'Retatrutide Pen 32mg', keywords: ['retatrutide pen', 'reta pen'], sell: 3800, pref: 3500, cost: 3200 },
    { name: 'TirSema Pen 44mg', keywords: ['tirsema', 'tir sema', 'tirsema pen'], sell: 2200, pref: 1900, cost: 1600 },
  ],
  'Elev8': [
    { name: 'Semaglutide 5mg', keywords: ['semaglutide', 'sema'], sell: 700, pref: 550, cost: 400 },
    { name: 'Tirzepatide 5mg', keywords: ['tirzepatide 5', 'tirz 5', 'tirzep 5'], sell: 750, pref: 575, cost: 400 },
    { name: 'Tirzepatide 30mg', keywords: ['tirzepatide 30', 'tirz 30', 'tirzep 30'], sell: 1800, pref: 1425, cost: 1050 },
    { name: 'Retatrutide 10mg', keywords: ['retatrutide 10', 'reta 10'], sell: 1150, pref: 900, cost: 650 },
    { name: 'Retatrutide 20mg', keywords: ['retatrutide 20', 'reta 20'], sell: 1800, pref: 1375, cost: 950 },
    { name: 'Retatrutide 30mg', keywords: ['retatrutide 30', 'reta 30'], sell: 2000, pref: 1700, cost: 1400 },
    { name: 'Reta PEN 20mg', keywords: ['reta pen 20'], sell: 2200, pref: 1800, cost: 1400 },
    { name: 'Reta PEN 60mg', keywords: ['reta pen 60'], sell: 4300, pref: 3650, cost: 3000 },
    { name: 'MOTS-C 40mg', keywords: ['mots-c', 'mots c', 'motsc'], sell: 1400, pref: 1175, cost: 950 },
    { name: 'GLOW 70mg (TB500/BPC/GHK-CU)', keywords: ['glow', 'tb500 bpc ghk'], sell: 1100, pref: 875, cost: 650 },
    { name: 'NAD 500mg', keywords: ['nad'], sell: 1000, pref: 800, cost: 600 },
    { name: 'Wolverine Stack 20mg', keywords: ['wolverine', 'wolverine stack'], sell: 1000, pref: 875, cost: 750 },
    { name: 'BPC-157 5mg', keywords: ['bpc-157', 'bpc 157', 'bpc157'], sell: 350, pref: 280, cost: 210 },
    { name: 'TB500 5mg', keywords: ['tb500', 'tb 500'], sell: 380, pref: 315, cost: 250 },
    { name: 'GHK-CU 100mg', keywords: ['ghk-cu', 'ghk cu', 'copper peptide'], sell: 750, pref: 615, cost: 480 },
    { name: 'GH 100iu Kit', keywords: ['gh 100', 'growth hormone', 'hgh'], sell: 2250, pref: 1975, cost: 1700 },
    { name: 'SLU-PP-332 5mg', keywords: ['slu-pp-332', 'slu pp 332', 'slupp332'], sell: 800, pref: 700, cost: 600 },
    { name: '5-Amino-1MQ 5mg', keywords: ['5-amino', '5amino', '5-amino-1mq', '5amino-1mq'], sell: 450, pref: 365, cost: 280 },
    { name: 'SS31 10mg', keywords: ['ss31', 'ss 31'], sell: 850, pref: 735, cost: 620 },
    { name: 'PEG MGF 2mg', keywords: ['peg mgf', 'pegmgf'], sell: 750, pref: 575, cost: 400 },
    { name: 'AOD-9604 5mg', keywords: ['aod-9604', 'aod 9604', 'aod9604'], sell: 750, pref: 600, cost: 450 },
    { name: 'BAM-15 Tabs (30 tabs)', keywords: ['bam-15', 'bam 15', 'bam15'], sell: 1250, pref: 1050, cost: 850 },
  ]
};

// ---- Client pricing rules ----

const CLIENT_RULES = {
  'Muscle Mecca': {
    preferential: ['tiaan kruger', 'matthew de beer'],
    profitAdjust: { 'leo kruger': 0.7 },
    priceOverrides: {
      'warren van niekerk': [
        { keywords: ['reta pen', 'reta pens', 'ipharma reta', '30mg pen', '30mg pens'], sell: 2200 }
      ]
    }
  },
  'HD Labs': {
    preferential: [],
    profitAdjust: { 'leo kruger': 0.7, 'leo': 0.7 },
    priceOverrides: {}
  }
};

function getClientRule(clientName, supplier) {
  const rules = CLIENT_RULES[supplier || currentSupplier];
  if (!rules || !clientName) return { tier: 'standard', profitMult: 1, overrides: [] };

  const name = clientName.toLowerCase().trim();
  const isPref = rules.preferential.some(p => name === p);
  const profitMult = rules.profitAdjust[name] || 1;
  const overrides = (rules.priceOverrides && rules.priceOverrides[name]) || [];

  return { tier: isPref ? 'preferential' : 'standard', profitMult, overrides };
}

function getOverridePrice(itemLine, overrides) {
  if (!overrides || overrides.length === 0) return null;
  const product = itemLine.replace(/^\d+\s*[x×]\s*/i, '').trim().toLowerCase();
  for (const ov of overrides) {
    for (const kw of ov.keywords) {
      if (product.includes(kw) || kw.split(' ').every(w => product.includes(w))) {
        return ov.sell;
      }
    }
  }
  return null;
}

// ---- Price lookup ----

function lookupItemPrice(itemLine, supplier) {
  const priceList = PRICE_LISTS[supplier];
  if (!priceList) return null;

  const product = itemLine.replace(/^\d+\s*[x×]\s*/i, '').trim().toLowerCase();
  if (!product || /^all\s/i.test(product)) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const entry of priceList) {
    for (const kw of entry.keywords) {
      if (product.includes(kw) || kw.split(' ').every(w => product.includes(w))) {
        const score = kw.length;
        if (score > bestScore) { bestScore = score; bestMatch = entry; }
      }
    }
  }
  return bestMatch;
}

function calcOrderPricing(itemsText, clientName, supplier) {
  if (!itemsText) return { retail: 0, cost: 0, profit: 0 };
  const sup = supplier || currentSupplier;
  const courierFee = getCourierFee(sup);
  const rule = getClientRule(clientName, sup);
  const lines = itemsText.split('\n').map(l => l.trim()).filter(Boolean);
  let retail = 0;
  let cost = 0;

  for (const line of lines) {
    const qtyMatch = line.match(/^(\d+)\s*[x×]\s*/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;
    const match = lookupItemPrice(line, sup);
    if (match && qty) {
      const override = getOverridePrice(line, rule.overrides);
      const unitSell = override !== null ? override : (rule.tier === 'preferential' ? match.pref : match.sell);
      retail += qty * unitSell;
      cost += qty * match.cost;
    }
  }

  retail += courierFee;
  cost += courierFee;
  let profit = retail - cost;
  profit = Math.round(profit * rule.profitMult);

  return { retail, cost, profit, tier: rule.tier, profitMult: rule.profitMult };
}

// ---- Data Layer (Firestore-backed with in-memory cache) ----

function supplierKey(supplier) {
  return supplier.replace(/\s+/g, '_').toLowerCase();
}

function getOrders(supplier) {
  return ordersCache[supplier] || [];
}

function saveOrders(supplier, orders) {
  ordersCache[supplier] = orders;
  if (!currentUser) return;
  const key = supplierKey(supplier);
  db.collection('users').doc(currentUser.uid)
    .collection('suppliers').doc(key)
    .set({ orders })
    .catch(err => console.error('Firestore write error:', err));
}

async function loadOrders(supplier) {
  if (!currentUser) return;
  const key = supplierKey(supplier);
  const snap = await db.collection('users').doc(currentUser.uid)
    .collection('suppliers').doc(key).get();
  ordersCache[supplier] = snap.exists ? snap.data().orders : [];
}

// ---- Auth Functions ----

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => {
    console.error('Sign-in error:', err);
    alert('Sign-in failed: ' + err.message);
  });
}

function signOutUser() {
  auth.signOut();
}

function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('userInfo').style.display = 'none';
}

function hideLoginScreen() {
  document.getElementById('loginScreen').classList.add('hidden');
}

function showUserInfo(user) {
  const userInfo = document.getElementById('userInfo');
  const avatar = document.getElementById('userAvatar');
  const email = document.getElementById('userEmail');
  avatar.src = user.photoURL || '';
  avatar.style.display = user.photoURL ? 'block' : 'none';
  email.textContent = user.email || '';
  userInfo.style.display = 'flex';
}

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// ---- Helper functions ----

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function generateOrderNumber() {
  const prefix = currentSupplier.split(' ').map(w => w[0]).join('').toUpperCase();
  const orders = getOrders(currentSupplier);
  let max = 0;
  orders.forEach(o => {
    const m = (o.orderNumber || '').match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1]));
  });
  return prefix + '-' + String(max + 1).padStart(4, '0');
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA');
}

function formatRand(val) {
  const n = parseFloat(val) || 0;
  return 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---- Week helpers ----

function getWeekEnding(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const offset = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

function getAvailableWeeks(supplier) {
  const orders = getOrders(supplier);
  const weekSet = new Set();
  orders.forEach(o => {
    if (o.orderDate) weekSet.add(getWeekEnding(o.orderDate));
  });
  return Array.from(weekSet).sort();
}

function renderWeekTabs() {
  const container = document.getElementById('weekTabs');
  const weeks = getAvailableWeeks(currentSupplier);

  if (weeks.length === 0) {
    container.innerHTML = '';
    currentWeek = null;
    return;
  }

  if (currentWeek !== null && !weeks.includes(currentWeek)) {
    currentWeek = weeks[weeks.length - 1];
  }

  const currentIdx = currentWeek ? weeks.indexOf(currentWeek) : -1;

  let html = '';
  html += `<button class="week-nav" ${currentIdx <= 0 || currentWeek === null ? 'disabled style="opacity:0.3;cursor:default;"' : ''} onclick="switchWeek('${currentIdx > 0 ? weeks[currentIdx - 1] : ''}')"><i class="fas fa-chevron-left"></i></button>`;
  html += `<button class="${currentWeek === null ? 'active' : ''}" onclick="switchWeek(null)"><i class="fas fa-layer-group" style="margin-right:5px;font-size:0.7rem;"></i>All Weeks</button>`;

  weeks.forEach(w => {
    const d = new Date(w + 'T00:00:00');
    const label = 'Week ending ' + d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    html += `<button class="${currentWeek === w ? 'active' : ''}" onclick="switchWeek('${w}')"><i class="fas fa-calendar-week" style="margin-right:5px;font-size:0.7rem;opacity:0.6;"></i>${label}</button>`;
  });

  html += `<button class="week-nav" ${currentIdx >= weeks.length - 1 || currentWeek === null ? 'disabled style="opacity:0.3;cursor:default;"' : ''} onclick="switchWeek('${currentIdx < weeks.length - 1 && currentIdx >= 0 ? weeks[currentIdx + 1] : ''}')"><i class="fas fa-chevron-right"></i></button>`;

  container.innerHTML = html;
}

function switchWeek(weekEnd) {
  currentWeek = weekEnd || null;
  renderWeekTabs();
  renderOrders();
  renderSummary();
}

// ---- Payment toggle ----

function togglePayment(orderId) {
  const orders = getOrders(currentSupplier);
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const cycle = ['Pending', 'Paid', 'Partial'];
  const idx = cycle.indexOf(order.paymentStatus || 'Pending');
  order.paymentStatus = cycle[(idx + 1) % cycle.length];

  saveOrders(currentSupplier, orders);
  renderOrders();
  renderSummary();
}

// ---- Supplier tabs ----

async function switchSupplier(supplier) {
  currentSupplier = supplier;
  document.querySelectorAll('.supplier-tabs button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.supplier === supplier);
  });
  currentWeek = null;

  showLoading();
  try {
    await loadOrders(supplier);
  } catch (err) {
    console.error('Error loading orders:', err);
  }
  hideLoading();

  const weeks = getAvailableWeeks(supplier);
  if (weeks.length > 0) currentWeek = weeks[weeks.length - 1];
  renderWeekTabs();
  renderOrders();
  renderSummary();
}

// ---- Summary cards ----

function renderSummary() {
  let orders = getOrders(currentSupplier);
  if (currentWeek) {
    orders = orders.filter(o => o.orderDate && getWeekEnding(o.orderDate) === currentWeek);
  }
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + (parseFloat(o.totalCost) || 0), 0);
  const totalCost = orders.reduce((s, o) => s + (parseFloat(o.totalCostPrice) || 0), 0);
  const totalProfit = orders.reduce((s, o) => s + (parseFloat(o.profit) || 0), 0);
  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.orderStatus)).length;

  const collected = orders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + (parseFloat(o.totalCost) || 0), 0);
  const outstanding = orders.filter(o => o.paymentStatus !== 'Paid').reduce((s, o) => s + (parseFloat(o.totalCost) || 0), 0);
  const collectedPct = totalRevenue > 0 ? Math.round((collected / totalRevenue) * 100) : 0;

  document.getElementById('totalOrders').textContent = totalOrders;
  document.getElementById('totalRevenue').textContent = formatRand(totalRevenue);
  document.getElementById('totalCostPrice').textContent = formatRand(totalCost);
  document.getElementById('totalProfit').textContent = formatRand(totalProfit);
  document.getElementById('totalCollected').textContent = formatRand(collected);
  document.getElementById('collectedPct').textContent = collectedPct + '% collected';
  document.getElementById('totalOutstanding').textContent = formatRand(outstanding);
  document.getElementById('activeOrders').textContent = activeOrders;
}

// ---- Order table ----

function renderOrders() {
  let orders = getOrders(currentSupplier);
  if (currentWeek) {
    orders = orders.filter(o => o.orderDate && getWeekEnding(o.orderDate) === currentWeek);
  }
  const search = document.getElementById('searchBox').value.toLowerCase();
  const tbody = document.getElementById('ordersBody');

  let filtered = orders.filter(o => {
    return o.clientName.toLowerCase().includes(search) ||
           o.items.toLowerCase().includes(search) ||
           (o.orderNumber || '').toLowerCase().includes(search) ||
           (o.clientPhone || '').includes(search) ||
           (o.trackingNumber || '').toLowerCase().includes(search);
  });

  filtered.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="11">
        <div class="empty-state">
          <p style="font-size:2.5rem; margin-bottom:8px;"><i class="fas fa-inbox" style="opacity:0.3;"></i></p>
          <p><strong>No orders found</strong></p>
          <p>Click "New Order" or "Import WhatsApp Chat" to add orders for ${currentSupplier}.</p>
        </div>
      </td></tr>`;
    return;
  }

  const paymentIcons = { Pending: 'fa-clock', Paid: 'fa-circle-check', Partial: 'fa-circle-half-stroke' };
  const statusIcons = { New: 'fa-sparkles', Sent: 'fa-paper-plane', Dispatched: 'fa-truck', Delivered: 'fa-circle-check', Cancelled: 'fa-ban' };

  tbody.innerHTML = filtered.map(order => {
    const profit = parseFloat(order.profit) || 0;
    const tierBadge = order.priceTier === 'preferential' ? ' <span class="badge badge-pref">PREF</span>' : '';
    const profitNote = parseFloat(order.profitMult) < 1 ? ' <span class="badge badge-pref">70%</span>' : '';
    const payIcon = paymentIcons[order.paymentStatus] || paymentIcons.Pending;
    const statIcon = statusIcons[order.orderStatus] || statusIcons.New;
    return `
    <tr>
      <td><strong style="color:#475569;">${order.orderNumber || '-'}</strong></td>
      <td>${formatDate(order.orderDate)}</td>
      <td>
        <div class="client-info">
          <div class="client-name">${esc(order.clientName)}${tierBadge}${profitNote}</div>
          ${order.clientPhone ? '<div class="client-phone"><i class="fas fa-phone" style="font-size:0.65rem;margin-right:3px;"></i>' + esc(order.clientPhone) + '</div>' : ''}
        </div>
      </td>
      <td class="items-cell">${renderItemPrices(order)}</td>
      <td><strong>${formatRand(order.totalCost)}</strong></td>
      <td>${formatRand(order.totalCostPrice)}</td>
      <td class="profit-cell ${profit > 0 ? 'profit-positive' : ''}">${formatRand(profit)}</td>
      <td><span class="badge badge-${(order.paymentStatus || 'pending').toLowerCase()} badge-clickable" onclick="togglePayment('${order.id}')" title="Click to cycle: Pending / Paid / Partial"><i class="fas ${payIcon}"></i> ${order.paymentStatus || 'Pending'}</span></td>
      <td><span class="badge badge-${(order.orderStatus || 'new').toLowerCase()}"><i class="fas ${statIcon}"></i> ${order.orderStatus || 'New'}</span></td>
      <td>${order.trackingNumber ? '<span class="tracking-num"><i class="fas fa-barcode" style="font-size:0.7rem;margin-right:3px;"></i>' + esc(order.trackingNumber) + '</span>' : '<span style="color:#cbd5e1;">—</span>'}</td>
      <td class="td-actions">
        <button class="btn btn-secondary btn-sm" onclick="openEditOrder('${order.id}')"><i class="fas fa-pen"></i> Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function renderItemPrices(order) {
  const lines = (order.items || '').split('\n').map(l => l.trim()).filter(Boolean);
  const tier = order.priceTier || 'standard';
  const rule = getClientRule(order.clientName, currentSupplier);
  let html = '';

  for (const line of lines) {
    const qtyMatch = line.match(/^(\d+)\s*[x×]\s*/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;
    const match = lookupItemPrice(line, currentSupplier);

    if (match && qty) {
      const override = getOverridePrice(line, rule.overrides);
      const unit = override !== null ? override : (tier === 'preferential' ? match.pref : match.sell);
      const lineTotal = qty * unit;
      const isOverride = override !== null;
      html += `<div class="item-line"><span>${esc(line)}${isOverride ? ' <span class="badge badge-special">SPECIAL</span>' : ''}</span><span class="item-price">${formatRand(lineTotal)}</span></div>`;
    } else if (/^ALL\s/i.test(line)) {
      html += `<div class="item-line"><span class="item-note">${esc(line)}</span></div>`;
    } else {
      html += `<div class="item-line"><span>${esc(line)}</span><span class="item-price">-</span></div>`;
    }
  }

  html += `<div class="item-line courier-line"><span>Courier</span><span class="item-price">${formatRand(getCourierFee(currentSupplier))}</span></div>`;
  return html;
}

// ---- Order CRUD ----

function openNewOrder() {
  editingOrderId = null;
  document.getElementById('modalTitle').textContent = 'New Order - ' + currentSupplier;
  document.getElementById('orderForm').reset();
  document.getElementById('orderDate').value = new Date().toISOString().split('T')[0];
  document.getElementById('orderNumber').value = generateOrderNumber();
  document.getElementById('courierFee').value = getCourierFee(currentSupplier).toFixed(2);
  document.getElementById('priceBreakdown').innerHTML = '';
  document.getElementById('orderModal').classList.add('active');
}

function openEditOrder(id) {
  const order = getOrders(currentSupplier).find(o => o.id === id);
  if (!order) return;

  editingOrderId = id;
  document.getElementById('modalTitle').textContent = 'Edit Order - ' + currentSupplier;

  const fields = ['orderNumber', 'orderDate', 'clientName', 'clientPhone', 'items',
    'quantity', 'totalCost', 'totalCostPrice', 'profit', 'courierFee',
    'paymentStatus', 'orderStatus', 'trackingNumber', 'deliveryAddress', 'deliveryDate', 'notes'];
  fields.forEach(f => {
    const el = document.getElementById(f);
    if (el) el.value = order[f] || '';
  });

  document.getElementById('priceBreakdown').innerHTML = '';
  document.getElementById('orderModal').classList.add('active');
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.remove('active');
  editingOrderId = null;
}

function saveOrder() {
  const fields = ['orderNumber', 'orderDate', 'clientName', 'clientPhone', 'items',
    'quantity', 'totalCost', 'totalCostPrice', 'profit', 'courierFee',
    'paymentStatus', 'orderStatus', 'trackingNumber', 'deliveryAddress', 'deliveryDate', 'notes'];

  const order = { id: editingOrderId || generateId() };
  fields.forEach(f => {
    const el = document.getElementById(f);
    order[f] = el ? el.value.trim() : '';
  });

  const rule = getClientRule(order.clientName);
  order.priceTier = rule.tier;
  order.profitMult = String(rule.profitMult);

  if (!order.clientName || !order.items || !order.orderDate) {
    alert('Please fill in at least: Client Name, Items, and Order Date.');
    return;
  }

  const orders = getOrders(currentSupplier);
  if (editingOrderId) {
    const idx = orders.findIndex(o => o.id === editingOrderId);
    if (idx !== -1) orders[idx] = order;
  } else {
    orders.push(order);
  }

  saveOrders(currentSupplier, orders);
  closeOrderModal();
  renderWeekTabs();
  renderOrders();
  renderSummary();
}

function deleteOrder(id) {
  if (!confirm('Delete this order?')) return;
  const orders = getOrders(currentSupplier).filter(o => o.id !== id);
  saveOrders(currentSupplier, orders);
  renderWeekTabs();
  renderOrders();
  renderSummary();
}

// ---- Auto-price from items ----

function autoPrice() {
  const itemsText = document.getElementById('items').value;
  const clientName = document.getElementById('clientName').value.trim();

  if (!itemsText.trim()) { alert('Enter items first, then click Auto-price.'); return; }

  const rule = getClientRule(clientName);
  const lines = itemsText.split('\n').map(l => l.trim()).filter(Boolean);
  let totalRetail = 0;
  let totalCost = 0;
  let totalQty = 0;
  let unmatched = [];

  let breakdownHtml = '<table style="width:100%; font-size:0.8rem; border-collapse:collapse;">';
  breakdownHtml += '<tr style="border-bottom:1px solid #ddd;"><th style="text-align:left;padding:4px;">Item</th><th style="text-align:right;padding:4px;">Retail</th><th style="text-align:right;padding:4px;">Cost</th><th style="text-align:right;padding:4px;">Profit</th></tr>';

  if (rule.tier === 'preferential') {
    breakdownHtml = `<div style="margin-bottom:6px;"><span class="badge badge-pref">PREFERENTIAL RATE</span> for ${esc(clientName)}</div>` + breakdownHtml;
  }
  if (rule.profitMult < 1) {
    breakdownHtml = `<div style="margin-bottom:6px;"><span class="badge badge-pref">${Math.round(rule.profitMult * 100)}% PROFIT</span> for ${esc(clientName)}</div>` + breakdownHtml;
  }

  for (const line of lines) {
    const qtyMatch = line.match(/^(\d+)\s*[x×]\s*/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;
    const match = lookupItemPrice(line, currentSupplier);

    if (match && qty) {
      const override = getOverridePrice(line, rule.overrides);
      const unitSell = override !== null ? override : (rule.tier === 'preferential' ? match.pref : match.sell);
      const lineRetail = qty * unitSell;
      const lineCost = qty * match.cost;
      const lineProfit = lineRetail - lineCost;
      totalRetail += lineRetail;
      totalCost += lineCost;
      totalQty += qty;
      const specialTag = override !== null ? ' <span class="badge badge-special">SPECIAL</span>' : '';
      breakdownHtml += `<tr><td style="padding:4px;">${qty} x ${esc(match.name)}${specialTag}</td><td style="text-align:right;padding:4px;">${formatRand(lineRetail)}</td><td style="text-align:right;padding:4px;">${formatRand(lineCost)}</td><td style="text-align:right;padding:4px;color:#27ae60;">${formatRand(lineProfit)}</td></tr>`;
    } else if (!/^all\s/i.test(line) && qty) {
      unmatched.push(line.replace(/^\d+\s*[x×]\s*/i, '').trim());
      totalQty += qty;
      breakdownHtml += `<tr style="color:#e67e22;"><td style="padding:4px;">${esc(line)}</td><td colspan="3" style="text-align:right;padding:4px;"><em>not found</em></td></tr>`;
    }
  }

  const courierFee = getCourierFee(currentSupplier);
  breakdownHtml += `<tr><td style="padding:4px;">Courier Fee</td><td style="text-align:right;padding:4px;">${formatRand(courierFee)}</td><td style="text-align:right;padding:4px;">${formatRand(courierFee)}</td><td style="text-align:right;padding:4px;">R0.00</td></tr>`;
  totalRetail += courierFee;
  totalCost += courierFee;

  let totalProfit = totalRetail - totalCost;

  if (rule.profitMult < 1) {
    const fullProfit = totalProfit;
    totalProfit = Math.round(totalProfit * rule.profitMult);
    breakdownHtml += `<tr style="border-top:1px solid #ddd;"><td colspan="3" style="padding:4px; color:#888;">Full profit: ${formatRand(fullProfit)} x ${Math.round(rule.profitMult * 100)}%</td><td style="text-align:right;padding:4px;color:#e67e22;font-weight:600;">${formatRand(totalProfit)}</td></tr>`;
  }

  breakdownHtml += `<tr style="border-top:2px solid #333; font-weight:700;"><td style="padding:4px;">TOTAL</td><td style="text-align:right;padding:4px;">${formatRand(totalRetail)}</td><td style="text-align:right;padding:4px;">${formatRand(totalCost)}</td><td style="text-align:right;padding:4px;color:#27ae60;">${formatRand(totalProfit)}</td></tr>`;
  breakdownHtml += '</table>';

  document.getElementById('totalCost').value = totalRetail.toFixed(2);
  document.getElementById('totalCostPrice').value = totalCost.toFixed(2);
  document.getElementById('profit').value = totalProfit.toFixed(2);
  document.getElementById('courierFee').value = courierFee.toFixed(2);
  if (totalQty > 0) document.getElementById('quantity').value = totalQty;

  document.getElementById('priceBreakdown').innerHTML = breakdownHtml;

  if (unmatched.length > 0) {
    alert('Could not find prices for: ' + unmatched.join(', ') + '\n\nYou can update the totals manually.');
  }
}

// ---- WhatsApp Parser ----

function openImportModal() {
  document.getElementById('chatInput').value = '';
  document.getElementById('parsedOrdersContainer').innerHTML = '';
  document.getElementById('parseStatus').textContent = '';
  document.getElementById('importModal').classList.add('active');
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('active');
  parsedOrders = [];
}

function parseWhatsAppChat() {
  const text = document.getElementById('chatInput').value.trim();
  if (!text) { alert('Please paste the WhatsApp chat first.'); return; }

  const msgRegex = /\[(\d{2}:\d{2}), (\d{2}\/\d{2}\/\d{4})\] ([^:]+): /g;
  let match;
  const indices = [];

  while ((match = msgRegex.exec(text)) !== null) {
    indices.push({ start: match.index, time: match[1], date: match[2], sender: match[3].trim(), contentStart: match.index + match[0].length });
  }

  const messages = indices.map((idx, i) => {
    const end = i < indices.length - 1 ? indices[i + 1].start : text.length;
    return { time: idx.time, date: idx.date, sender: idx.sender, content: text.slice(idx.contentStart, end).trim() };
  });

  if (messages.length === 0) { document.getElementById('parseStatus').textContent = 'Could not find any WhatsApp messages. Check the format.'; return; }

  const senderCounts = {};
  const itemRegex = /^\d+\s*[x×]\s*.+/im;
  messages.forEach(m => { if (itemRegex.test(m.content)) senderCounts[m.sender] = (senderCounts[m.sender] || 0) + 1; });
  const orderSender = Object.entries(senderCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!orderSender) { document.getElementById('parseStatus').textContent = 'No order messages detected in the chat.'; return; }

  const trackingEntries = [];
  messages.forEach((m, i) => {
    if (m.sender !== orderSender) {
      const trackMatch = m.content.match(/\b(RE\d{6,})\b/);
      if (trackMatch) trackingEntries.push({ tracking: trackMatch[1], msgIndex: i, content: m.content });
    }
  });

  const rawOrders = [];
  messages.forEach((m, i) => {
    if (m.sender !== orderSender) return;
    const parsed = parseOrderMessage(m.content);
    if (parsed) {
      const dp = m.date.split('/');
      parsed.orderDate = dp[2] + '-' + dp[1] + '-' + dp[0];
      parsed.msgIndex = i;
      const pricing = calcOrderPricing(parsed.items, parsed.clientName, currentSupplier);
      parsed.retail = pricing.retail;
      parsed.cost = pricing.cost;
      parsed.profit = pricing.profit;
      parsed.tier = pricing.tier;
      parsed.profitMult = pricing.profitMult;
      rawOrders.push(parsed);
    }
  });

  trackingEntries.forEach(te => {
    let bestOrder = null;
    for (let i = rawOrders.length - 1; i >= 0; i--) {
      if (rawOrders[i].msgIndex < te.msgIndex) {
        const content = te.content.toLowerCase();
        const clientMatch = rawOrders[i].clientName && content.includes(rawOrders[i].clientName.toLowerCase());
        const itemMatch = rawOrders[i].items.split('\n').some(item => {
          const cleaned = item.replace(/^\d+\s*[x×]\s*/i, '').trim().toLowerCase();
          return cleaned.length > 3 && content.includes(cleaned);
        });
        if (clientMatch || itemMatch) { bestOrder = rawOrders[i]; break; }
      }
    }
    if (!bestOrder) {
      for (let i = rawOrders.length - 1; i >= 0; i--) {
        if (rawOrders[i].msgIndex < te.msgIndex && !rawOrders[i].tracking) { bestOrder = rawOrders[i]; break; }
      }
    }
    if (bestOrder) bestOrder.tracking = te.tracking;
  });

  const existingOrders = getOrders(currentSupplier);
  rawOrders.forEach(o => {
    const dbDup = existingOrders.some(ex =>
      ex.clientName.toLowerCase() === o.clientName.toLowerCase() &&
      ex.items.replace(/\s+/g, ' ').toLowerCase() === o.items.replace(/\s+/g, ' ').toLowerCase()
    );
    const chatDup = rawOrders.some(other =>
      other !== o && other.clientName.toLowerCase() === o.clientName.toLowerCase() &&
      other.items.replace(/\s+/g, ' ').toLowerCase() === o.items.replace(/\s+/g, ' ').toLowerCase() &&
      other.msgIndex < o.msgIndex
    );
    o.isDuplicate = dbDup || chatDup;
    o.dupReason = dbDup ? 'Already in system' : chatDup ? 'Resent in chat' : '';
  });

  parsedOrders = rawOrders;
  renderParsedOrders();
  document.getElementById('parseStatus').textContent =
    `Found ${rawOrders.length} orders from "${orderSender}" (${rawOrders.filter(o => o.isDuplicate).length} possible duplicates).`;
}

function parseOrderMessage(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const itemRegex = /^(\d+)\s*[x×]\s*(.+)/i;
  const noisePatterns = [
    /^(can i|and this|and tracking|sorry|when did|thanks|hey bro|morning bro|is there|i don't see)/i,
    /^(alternative contact|carrier calls only)/i,
    /^RE\d{5,}/
  ];

  const items = [];
  const otherLines = [];
  for (const line of lines) {
    if (itemRegex.test(line)) items.push(line);
    else if (/^ALL\s+/i.test(line)) items.push(line);
    else if (!noisePatterns.some(p => p.test(line))) otherLines.push(line);
  }
  if (items.length === 0) return null;

  let clientName = '', phone = '', nameIndex = -1, phoneIndex = -1;
  for (let i = 0; i < otherLines.length; i++) {
    const cleaned = otherLines[i].replace(/[\s\-()]/g, '');
    if (/^\+?\d{9,15}$/.test(cleaned)) { phone = otherLines[i]; phoneIndex = i; break; }
  }

  const addressWords = /\b(street|straat|road|avenue|drive|lane|park|estate|unit|plot|way|farm)\b/i;
  for (let i = 0; i < otherLines.length; i++) {
    if (i === phoneIndex) continue;
    const line = otherLines[i];
    if (/^\d{4,5}$/.test(line)) continue;
    if (/^\d+\s/.test(line) && addressWords.test(line)) continue;
    if (/[a-zA-Z]/.test(line) && line.length <= 40 && !addressWords.test(line)) { clientName = line; nameIndex = i; break; }
  }
  if (!clientName) return null;

  const addressLines = otherLines.filter((_, i) => i !== phoneIndex && i !== nameIndex);
  const totalQty = items.reduce((sum, item) => { const m = item.match(/^(\d+)/); return sum + (m ? parseInt(m[1]) : 0); }, 0);

  return { items: items.join('\n'), clientName, phone, address: addressLines.join(', '), totalQty, tracking: '' };
}

function renderParsedOrders() {
  const container = document.getElementById('parsedOrdersContainer');
  if (parsedOrders.length === 0) { container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No orders detected.</p>'; return; }

  let html = `<div class="parsed-orders"><h3>Parsed Orders for ${currentSupplier}</h3>
    <table class="parsed-table"><thead><tr>
      <th><input type="checkbox" id="selectAllParsed" checked onchange="toggleAllParsed(this.checked)"></th>
      <th>Date</th><th>Client</th><th>Phone</th><th>Items</th><th>Qty</th>
      <th>Retail</th><th>Cost</th><th>Profit</th><th>Tracking</th><th>Note</th>
    </tr></thead><tbody>`;

  parsedOrders.forEach((o, i) => {
    const rowClass = o.isDuplicate ? 'duplicate-row' : '';
    const tierTag = o.tier === 'preferential' ? ' <span class="badge badge-pref">PREF</span>' : '';
    const multTag = o.profitMult < 1 ? ` <span class="badge badge-pref">${Math.round(o.profitMult*100)}%</span>` : '';
    html += `<tr class="${rowClass}">
      <td><input type="checkbox" class="parsed-cb" data-index="${i}" ${o.isDuplicate ? '' : 'checked'}></td>
      <td>${formatDate(o.orderDate)}</td>
      <td><strong>${esc(o.clientName)}</strong>${tierTag}${multTag}</td>
      <td>${esc(o.phone)}</td>
      <td class="parsed-items">${esc(o.items)}</td>
      <td>${o.totalQty}</td>
      <td><strong>${formatRand(o.retail)}</strong></td>
      <td>${formatRand(o.cost)}</td>
      <td class="profit-cell profit-positive">${formatRand(o.profit)}</td>
      <td>${o.tracking ? '<span class="tracking-num">' + esc(o.tracking) + '</span>' : '-'}</td>
      <td>${o.isDuplicate ? '<span class="duplicate-tag">' + esc(o.dupReason) + '</span>' : ''}</td>
    </tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function toggleAllParsed(checked) { document.querySelectorAll('.parsed-cb').forEach(cb => cb.checked = checked); }

function importSelectedOrders() {
  const checkboxes = document.querySelectorAll('.parsed-cb:checked');
  if (checkboxes.length === 0) { alert('No orders selected for import.'); return; }

  const orders = getOrders(currentSupplier);
  let imported = 0;

  checkboxes.forEach(cb => {
    const idx = parseInt(cb.dataset.index);
    const po = parsedOrders[idx];
    if (!po) return;

    const prefix = currentSupplier.split(' ').map(w => w[0]).join('').toUpperCase();
    let maxNum = 0;
    orders.forEach(o => { const m = (o.orderNumber || '').match(/(\d+)$/); if (m) maxNum = Math.max(maxNum, parseInt(m[1])); });

    orders.push({
      id: generateId(),
      orderNumber: prefix + '-' + String(maxNum + 1).padStart(4, '0'),
      orderDate: po.orderDate, clientName: po.clientName, clientPhone: po.phone,
      items: po.items, quantity: String(po.totalQty),
      totalCost: po.retail.toFixed(2), totalCostPrice: po.cost.toFixed(2),
      profit: po.profit.toFixed(2), courierFee: getCourierFee(currentSupplier).toFixed(2),
      priceTier: po.tier || 'standard', profitMult: String(po.profitMult || 1),
      paymentStatus: 'Pending', orderStatus: po.tracking ? 'Dispatched' : 'Sent',
      trackingNumber: po.tracking || '', deliveryAddress: po.address,
      deliveryDate: '', notes: ''
    });
    imported++;
  });

  saveOrders(currentSupplier, orders);
  closeImportModal();
  renderWeekTabs();
  renderOrders();
  renderSummary();
  alert(`Imported ${imported} orders into ${currentSupplier}.`);
}

// ---- Dashboard ----

const SUPPLIER_COLORS = { 'Muscle Mecca': '#e94560', 'HD Labs': '#60a5fa', 'Elev8': '#34d399' };

async function openDashboard() {
  if (dashboardActive) return;
  dashboardActive = true;
  document.getElementById('navOrders').classList.remove('active');
  document.getElementById('navDashboard').classList.add('active');

  showLoading();
  try {
    await Promise.all(SUPPLIERS.map(s => loadOrders(s)));
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
  hideLoading();

  document.getElementById('supplierTabs').style.display = 'none';
  document.getElementById('weekTabs').style.display = 'none';
  document.getElementById('ordersCards').style.display = 'none';
  document.getElementById('ordersActions').style.display = 'none';
  document.getElementById('ordersContent').style.display = 'none';

  const analytics = computeAnalytics();
  renderDashboard(analytics);
  document.getElementById('dashboardView').style.display = 'block';
}

function closeDashboard() {
  if (!dashboardActive) return;
  dashboardActive = false;
  document.getElementById('navDashboard').classList.remove('active');
  document.getElementById('navOrders').classList.add('active');

  document.getElementById('dashboardView').style.display = 'none';
  document.getElementById('supplierTabs').style.display = 'flex';
  document.getElementById('weekTabs').style.display = 'flex';
  document.getElementById('ordersCards').style.display = '';
  document.getElementById('ordersActions').style.display = '';
  document.getElementById('ordersContent').style.display = '';

  renderWeekTabs();
  renderOrders();
  renderSummary();
}

function computeAnalytics() {
  const allOrders = [];
  const bySupplier = {};

  for (const sup of SUPPLIERS) {
    const orders = getOrders(sup);
    bySupplier[sup] = orders;
    orders.forEach(o => allOrders.push({ ...o, _supplier: sup }));
  }

  // Overview totals
  const totalOrders = allOrders.length;
  const totalRevenue = allOrders.reduce((s, o) => s + (parseFloat(o.totalCost) || 0), 0);
  const totalCost = allOrders.reduce((s, o) => s + (parseFloat(o.totalCostPrice) || 0), 0);
  const totalProfit = allOrders.reduce((s, o) => s + (parseFloat(o.profit) || 0), 0);
  const collected = allOrders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + (parseFloat(o.totalCost) || 0), 0);
  const outstanding = totalRevenue - collected;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Per-supplier breakdown
  const supplierStats = SUPPLIERS.map(sup => {
    const orders = bySupplier[sup];
    const rev = orders.reduce((s, o) => s + (parseFloat(o.totalCost) || 0), 0);
    const cost = orders.reduce((s, o) => s + (parseFloat(o.totalCostPrice) || 0), 0);
    const profit = orders.reduce((s, o) => s + (parseFloat(o.profit) || 0), 0);
    const col = orders.filter(o => o.paymentStatus === 'Paid').reduce((s, o) => s + (parseFloat(o.totalCost) || 0), 0);
    return {
      name: sup, count: orders.length, revenue: rev, cost, profit,
      margin: rev > 0 ? (profit / rev) * 100 : 0,
      collected: rev > 0 ? (col / rev) * 100 : 0,
      avgOrder: orders.length > 0 ? rev / orders.length : 0
    };
  });

  // Weekly breakdown
  const weekMap = {};
  allOrders.forEach(o => {
    if (!o.orderDate) return;
    const we = getWeekEnding(o.orderDate);
    if (!weekMap[we]) weekMap[we] = { week: we, total: { count: 0, revenue: 0, cost: 0, profit: 0 } };
    const entry = weekMap[we];
    if (!entry[o._supplier]) entry[o._supplier] = { count: 0, revenue: 0, cost: 0, profit: 0 };
    const rev = parseFloat(o.totalCost) || 0;
    const cost = parseFloat(o.totalCostPrice) || 0;
    const profit = parseFloat(o.profit) || 0;
    entry[o._supplier].count++;
    entry[o._supplier].revenue += rev;
    entry[o._supplier].cost += cost;
    entry[o._supplier].profit += profit;
    entry.total.count++;
    entry.total.revenue += rev;
    entry.total.cost += cost;
    entry.total.profit += profit;
  });
  const weeklyBreakdown = Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week));

  // Monthly breakdown
  const monthMap = {};
  allOrders.forEach(o => {
    if (!o.orderDate) return;
    const month = o.orderDate.slice(0, 7);
    if (!monthMap[month]) monthMap[month] = { month, total: { count: 0, revenue: 0, cost: 0, profit: 0 } };
    const entry = monthMap[month];
    if (!entry[o._supplier]) entry[o._supplier] = { count: 0, revenue: 0, cost: 0, profit: 0 };
    const rev = parseFloat(o.totalCost) || 0;
    const cost = parseFloat(o.totalCostPrice) || 0;
    const profit = parseFloat(o.profit) || 0;
    entry[o._supplier].count++;
    entry[o._supplier].revenue += rev;
    entry[o._supplier].cost += cost;
    entry[o._supplier].profit += profit;
    entry.total.count++;
    entry.total.revenue += rev;
    entry.total.cost += cost;
    entry.total.profit += profit;
  });
  const monthlyBreakdown = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

  // Top products by qty sold
  const productQty = {};
  const productProfit = {};
  allOrders.forEach(o => {
    const lines = (o.items || '').split('\n').map(l => l.trim()).filter(Boolean);
    const sup = o._supplier;
    for (const line of lines) {
      const qm = line.match(/^(\d+)\s*[x×]\s*/i);
      const qty = qm ? parseInt(qm[1]) : 0;
      if (!qty) continue;
      const match = lookupItemPrice(line, sup);
      const name = match ? match.name : line.replace(/^\d+\s*[x×]\s*/i, '').trim();
      if (!name || /^all\s/i.test(name)) continue;
      productQty[name] = (productQty[name] || 0) + qty;
      if (match) {
        const rule = getClientRule(o.clientName, sup);
        const override = getOverridePrice(line, rule.overrides);
        const unitSell = override !== null ? override : (rule.tier === 'preferential' ? match.pref : match.sell);
        const unitProfit = unitSell - match.cost;
        productProfit[name] = (productProfit[name] || 0) + (qty * unitProfit);
      }
    }
  });
  const topProductsByQty = Object.entries(productQty).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topProductsByProfit = Object.entries(productProfit).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Top clients
  const clientRevenue = {};
  const clientCount = {};
  allOrders.forEach(o => {
    const name = o.clientName || 'Unknown';
    clientRevenue[name] = (clientRevenue[name] || 0) + (parseFloat(o.totalCost) || 0);
    clientCount[name] = (clientCount[name] || 0) + 1;
  });
  const topClientsByRevenue = Object.entries(clientRevenue).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topClientsByOrders = Object.entries(clientCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Quick stats
  const biggestOrder = allOrders.reduce((best, o) => {
    const val = parseFloat(o.totalCost) || 0;
    return val > best.val ? { val, client: o.clientName, supplier: o._supplier } : best;
  }, { val: 0, client: '-', supplier: '-' });

  const totalItems = allOrders.reduce((s, o) => {
    return s + (o.items || '').split('\n').reduce((qs, line) => {
      const m = line.match(/^(\d+)\s*[x×]/i);
      return qs + (m ? parseInt(m[1]) : 0);
    }, 0);
  }, 0);
  const avgItemsPerOrder = totalOrders > 0 ? (totalItems / totalOrders).toFixed(1) : 0;

  const collectionRate = totalRevenue > 0 ? ((collected / totalRevenue) * 100).toFixed(1) : 0;

  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  allOrders.forEach(o => { if (o.orderDate) dayCount[new Date(o.orderDate).getDay()]++; });
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const busiestDayIdx = dayCount.indexOf(Math.max(...dayCount));
  const busiestDay = dayNames[busiestDayIdx];

  return {
    totalOrders, totalRevenue, totalCost, totalProfit, collected, outstanding,
    avgOrderValue, profitMargin, supplierStats, weeklyBreakdown, monthlyBreakdown,
    topProductsByQty, topProductsByProfit, topClientsByRevenue, topClientsByOrders,
    biggestOrder, avgItemsPerOrder, collectionRate, busiestDay, busiestDayOrders: dayCount[busiestDayIdx]
  };
}

function renderDashboard(a) {
  const container = document.getElementById('dashboardView');
  let html = '';

  // Header
  html += `<div class="dashboard-header">
    <h2><i class="fas fa-chart-pie"></i> Analytics Dashboard</h2>
  </div>`;

  // Overview cards
  html += `<div class="analytics-cards">
    ${dashCard('fa-clipboard-list', 'Total Orders', a.totalOrders, 'card-orders')}
    ${dashCard('fa-coins', 'Total Revenue', formatRand(a.totalRevenue), 'card-revenue')}
    ${dashCard('fa-file-invoice-dollar', 'Total Cost', formatRand(a.totalCost), 'card-cost')}
    ${dashCard('fa-chart-line', 'Total Profit', formatRand(a.totalProfit), 'card-profit')}
    ${dashCard('fa-hand-holding-dollar', 'Collected', formatRand(a.collected), 'card-collected')}
    ${dashCard('fa-clock', 'Outstanding', formatRand(a.outstanding), 'card-outstanding')}
    ${dashCard('fa-receipt', 'Avg Order Value', formatRand(a.avgOrderValue), 'card-revenue')}
    ${dashCard('fa-percent', 'Profit Margin', a.profitMargin.toFixed(1) + '%', 'card-profit')}
  </div>`;

  // Supplier breakdown
  html += `<div class="analytics-section">
    <h3><i class="fas fa-building"></i> Supplier Breakdown</h3>
    <div class="analytics-table-wrap"><table class="analytics-table"><thead><tr>
      <th>Supplier</th><th class="num">Orders</th><th class="num">Revenue</th>
      <th class="num">Cost</th><th class="num">Profit</th><th class="num">Margin</th>
      <th class="num">Collected %</th><th class="num">Avg Order</th>
    </tr></thead><tbody>`;
  for (const s of a.supplierStats) {
    html += `<tr><td><strong style="color:${SUPPLIER_COLORS[s.name]}">${s.name}</strong></td>
      <td class="num">${s.count}</td><td class="num revenue-val">${formatRand(s.revenue)}</td>
      <td class="num">${formatRand(s.cost)}</td><td class="num profit-val">${formatRand(s.profit)}</td>
      <td class="num">${s.margin.toFixed(1)}%</td><td class="num">${s.collected.toFixed(0)}%</td>
      <td class="num">${formatRand(s.avgOrder)}</td></tr>`;
  }
  html += `<tr class="row-total"><td><strong>TOTAL</strong></td>
    <td class="num">${a.totalOrders}</td><td class="num">${formatRand(a.totalRevenue)}</td>
    <td class="num">${formatRand(a.totalCost)}</td><td class="num">${formatRand(a.totalProfit)}</td>
    <td class="num">${a.profitMargin.toFixed(1)}%</td><td class="num">${a.totalRevenue > 0 ? ((a.collected/a.totalRevenue)*100).toFixed(0) : 0}%</td>
    <td class="num">${formatRand(a.avgOrderValue)}</td></tr>`;
  html += `</tbody></table></div>`;

  // Supplier share bar
  html += `<div style="margin-top:14px;">
    <div class="supplier-share">`;
  for (const s of a.supplierStats) {
    const pct = a.totalRevenue > 0 ? (s.revenue / a.totalRevenue) * 100 : 0;
    html += `<div class="share-segment" style="width:${pct}%;background:${SUPPLIER_COLORS[s.name]};"></div>`;
  }
  html += `</div><div class="share-legend">`;
  for (const s of a.supplierStats) {
    const pct = a.totalRevenue > 0 ? ((s.revenue / a.totalRevenue) * 100).toFixed(1) : '0.0';
    html += `<span><span class="share-dot" style="background:${SUPPLIER_COLORS[s.name]}"></span>${s.name}: ${pct}%</span>`;
  }
  html += `</div></div></div>`;

  // Monthly breakdown
  if (a.monthlyBreakdown.length > 0) {
    html += `<div class="analytics-section"><h3><i class="fas fa-calendar-alt"></i> Monthly Breakdown</h3>
      <div class="analytics-table-wrap"><table class="analytics-table"><thead><tr>
        <th>Month</th>`;
    for (const sup of SUPPLIERS) html += `<th class="num" style="color:${SUPPLIER_COLORS[sup]}">${sup}</th>`;
    html += `<th class="num">Total Revenue</th><th class="num">Total Profit</th><th class="num">Orders</th>
      </tr></thead><tbody>`;
    for (const m of a.monthlyBreakdown) {
      html += `<tr><td><strong>${m.month}</strong></td>`;
      for (const sup of SUPPLIERS) {
        const d = m[sup] || { revenue: 0 };
        html += `<td class="num">${formatRand(d.revenue)}</td>`;
      }
      html += `<td class="num revenue-val">${formatRand(m.total.revenue)}</td>
        <td class="num profit-val">${formatRand(m.total.profit)}</td>
        <td class="num">${m.total.count}</td></tr>`;
    }
    html += `</tbody></table></div></div>`;
  }

  // Weekly breakdown
  if (a.weeklyBreakdown.length > 0) {
    html += `<div class="analytics-section"><h3><i class="fas fa-calendar-week"></i> Weekly Breakdown</h3>
      <div class="analytics-table-wrap"><table class="analytics-table"><thead><tr>
        <th>Week Ending</th>`;
    for (const sup of SUPPLIERS) html += `<th class="num" style="color:${SUPPLIER_COLORS[sup]}">${sup}</th>`;
    html += `<th class="num">Total Revenue</th><th class="num">Total Profit</th><th class="num">Orders</th><th class="num">WoW Growth</th>
      </tr></thead><tbody>`;
    for (let i = 0; i < a.weeklyBreakdown.length; i++) {
      const w = a.weeklyBreakdown[i];
      const d = new Date(w.week + 'T00:00:00');
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const prevRev = i > 0 ? a.weeklyBreakdown[i - 1].total.revenue : 0;
      const growth = prevRev > 0 ? ((w.total.revenue - prevRev) / prevRev * 100).toFixed(1) : '-';
      const growthClass = growth !== '-' ? (parseFloat(growth) >= 0 ? 'growth-pos' : 'growth-neg') : '';
      const growthDisplay = growth !== '-' ? (parseFloat(growth) >= 0 ? '+' : '') + growth + '%' : '-';

      html += `<tr><td><strong>${label}</strong></td>`;
      for (const sup of SUPPLIERS) {
        const sd = w[sup] || { revenue: 0 };
        html += `<td class="num">${formatRand(sd.revenue)}</td>`;
      }
      html += `<td class="num revenue-val">${formatRand(w.total.revenue)}</td>
        <td class="num profit-val">${formatRand(w.total.profit)}</td>
        <td class="num">${w.total.count}</td>
        <td class="num ${growthClass}">${growthDisplay}</td></tr>`;
    }
    html += `</tbody></table></div></div>`;
  }

  // Top products + clients
  html += `<div class="analytics-section"><h3><i class="fas fa-trophy"></i> Top Products</h3>
    <div class="stat-pair">
      ${rankCard('fa-fire', 'Most Sold (by quantity)', a.topProductsByQty, v => v + ' sold')}
      ${rankCard('fa-sack-dollar', 'Most Profitable', a.topProductsByProfit, v => formatRand(v))}
    </div></div>`;

  html += `<div class="analytics-section"><h3><i class="fas fa-users"></i> Top Clients</h3>
    <div class="stat-pair">
      ${rankCard('fa-coins', 'By Revenue', a.topClientsByRevenue, v => formatRand(v))}
      ${rankCard('fa-clipboard-list', 'By Order Count', a.topClientsByOrders, v => v + ' orders')}
    </div></div>`;

  // Quick stats
  html += `<div class="analytics-section"><h3><i class="fas fa-bolt"></i> Quick Stats</h3>
    <div class="quick-stats">
      ${quickStat('fa-crown', 'Biggest Single Order', formatRand(a.biggestOrder.val), a.biggestOrder.client)}
      ${quickStat('fa-boxes-stacked', 'Avg Items per Order', a.avgItemsPerOrder)}
      ${quickStat('fa-hand-holding-dollar', 'Collection Rate', a.collectionRate + '%')}
      ${quickStat('fa-calendar-day', 'Busiest Day', a.busiestDay, a.busiestDayOrders + ' orders')}
      ${quickStat('fa-box-open', 'Total Items Sold', allItemsCount(a))}
      ${quickStat('fa-users', 'Unique Clients', uniqueClients())}
    </div></div>`;

  container.innerHTML = html;
}

function dashCard(icon, label, value, themeClass) {
  return `<div class="summary-card ${themeClass}">
    <div class="card-icon"><i class="fas ${icon}"></i></div>
    <div class="card-content">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </div>
  </div>`;
}

function rankCard(icon, title, items, formatVal) {
  const maxVal = items.length > 0 ? items[0][1] : 1;
  let listHtml = '';
  items.forEach(([name, val], i) => {
    const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
    listHtml += `<li>
      <span class="rank-num">${i + 1}</span>
      <div class="rank-bar-wrap">
        <div class="rank-name">${esc(name)}</div>
        <div class="rank-bar"><div class="rank-bar-fill" style="width:${pct}%"></div></div>
      </div>
      <span class="rank-val">${formatVal(val)}</span>
    </li>`;
  });
  if (items.length === 0) listHtml = '<li style="color:#4a5568;">No data</li>';
  return `<div class="insight-card"><h4><i class="fas ${icon}"></i> ${title}</h4><ul class="rank-list">${listHtml}</ul></div>`;
}

function quickStat(icon, label, value, sub) {
  return `<div class="quick-stat">
    <div class="qs-icon"><i class="fas ${icon}"></i></div>
    <div>
      <div class="qs-label">${label}</div>
      <div class="qs-value">${value}</div>
      ${sub ? '<div style="font-size:0.72rem;color:#4a5568;margin-top:2px;">' + esc(String(sub)) + '</div>' : ''}
    </div>
  </div>`;
}

function allItemsCount(a) {
  let total = 0;
  for (const sup of SUPPLIERS) {
    getOrders(sup).forEach(o => {
      (o.items || '').split('\n').forEach(line => {
        const m = line.match(/^(\d+)\s*[x×]/i);
        if (m) total += parseInt(m[1]);
      });
    });
  }
  return total;
}

function uniqueClients() {
  const names = new Set();
  for (const sup of SUPPLIERS) {
    getOrders(sup).forEach(o => { if (o.clientName) names.add(o.clientName.toLowerCase().trim()); });
  }
  return names.size;
}

// ---- CSV Export ----

function exportCSV() {
  const orders = getOrders(currentSupplier);
  if (orders.length === 0) { alert('No orders to export for ' + currentSupplier); return; }

  const headers = [
    'Order #', 'Date', 'Client', 'Phone', 'Items', 'Qty', 'Price Tier',
    'Retail Total', 'Cost Total', 'Courier', 'Profit',
    'Payment Status', 'Order Status', 'Tracking #',
    'Delivery Address', 'Delivery Date', 'Notes'
  ];

  const rows = orders.map(o => [
    o.orderNumber, o.orderDate, o.clientName, o.clientPhone || '', o.items, o.quantity,
    o.priceTier || 'standard', o.totalCost, o.totalCostPrice || '', o.courierFee || COURIER_FEE,
    o.profit || '', o.paymentStatus, o.orderStatus, o.trackingNumber || '',
    o.deliveryAddress, o.deliveryDate, o.notes
  ]);

  let csv = '\uFEFF';
  csv += headers.join(',') + '\n';
  rows.forEach(row => { csv += row.map(cell => '"' + String(cell || '').replace(/"/g, '""') + '"').join(',') + '\n'; });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = currentSupplier.replace(/\s+/g, '_') + '_Orders_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Seed initial data (one-time, to Firestore) ----

function makeOrder(num, date, client, phone, items, qty, retail, cost, profit, tier, profitMult, status, tracking, address, notes, supplier) {
  return {
    id: generateId(), orderNumber: num, orderDate: date,
    clientName: client, clientPhone: phone, items: items,
    quantity: String(qty), totalCost: retail.toFixed(2),
    totalCostPrice: cost.toFixed(2), profit: profit.toFixed(2),
    courierFee: getCourierFee(supplier || 'Muscle Mecca').toFixed(2), priceTier: tier, profitMult: String(profitMult),
    paymentStatus: 'Pending', orderStatus: status,
    trackingNumber: tracking, deliveryAddress: address,
    deliveryDate: '', notes: notes
  };
}

async function seedInitialData() {
  if (!currentUser) return;

  // Check if Muscle Mecca data already exists in Firestore
  const key = supplierKey('Muscle Mecca');
  const snap = await db.collection('users').doc(currentUser.uid)
    .collection('suppliers').doc(key).get();

  if (!snap.exists) {
  const orders = [
    makeOrder('MM-0001', '2026-05-04', 'Arnav', '+27 78 581 8788',
      '2 x iPharma Reta Pens', 2, 5350, 3590, 1760, 'standard', 1,
      'Sent', '', '87 South Avenue, Atholl, 2196', ''),
    makeOrder('MM-0002', '2026-05-04', 'Matthew de Beer', '27834066290',
      '1 x Vmed Test E\n1 x Vmed NPP 100\n1 x Tamoxifen Vmed', 3, 1210, 1050, 160, 'preferential', 1,
      'Sent', '', '1001 John Vorster Drive, Southdowns Estate, Unit 16 Lofts North, Irene Farm, 0048', ''),
    makeOrder('MM-0003', '2026-05-04', 'Natalie Zeelie', '0716870319',
      '1 x iPharma Reta Pen', 1, 2750, 1870, 880, 'standard', 1,
      'Dispatched', 'RE1204102', '56 4th Street, Wynberg, Sandton Johannesburg, 2090', ''),
    makeOrder('MM-0004', '2026-05-04', 'Hester Zeelie', '0763307227',
      '1 x iPharma Reta Pen', 1, 2750, 1870, 880, 'standard', 1,
      'Sent', '', '11 Karob avenue, Doringkruin, Klerksdorp, 2576', ''),
    makeOrder('MM-0005', '2026-05-04', 'Lurraine', '+27 82 778 1530',
      '1 x iPharma Reta Pens', 1, 2750, 1870, 880, 'standard', 1,
      'Sent', '', 'Exxaro Resources, 263B West street, Die Hoewes, Centurion, 0157', ''),
    makeOrder('MM-0006', '2026-05-05', 'Warren van Niekerk', '+27 82 574 2493',
      '3 x iPharma Reta Pens\n1 x UPA Test E\n1 x Glucophage 1000\n1 x Tesar 80mg', 6, 7860, 6195, 1665, 'standard', 1,
      'Sent', '', '129 Harris road Sebenza edenvale', 'Glucophage and Telmisartan was out of stock - supplier collecting'),
    makeOrder('MM-0007', '2026-05-05', 'Leo Kruger', '0826527825',
      '3 x Reta Pens iPharma\n1 x Tirzep Pen iPharma', 4, 10350, 6860, 2443, 'standard', 0.7,
      'Dispatched', 'RE1204082', '1233 Caley Lane Queenswood', ''),
    makeOrder('MM-0008', '2026-05-05', 'Jonty', '+27 71 795 1709',
      '1 x Reta Pen iPharma', 1, 2750, 1870, 880, 'standard', 1,
      'Dispatched', 'RE1204075', '199 Bryanston drive, Bryanston place office park, Company name is GCC', ''),
    makeOrder('MM-0009', '2026-05-05', 'Armand Nel', '+27 71 354 2616',
      '1 x iPharma L-Carnitine', 1, 600, 460, 140, 'standard', 1,
      'Dispatched', 'RE1204084', '350 Brooks straat, Menlo Park, Pretoria', ''),
    makeOrder('MM-0010', '2026-05-05', 'Arno', '+27 79 863 7280',
      '2 x test cypionate\n1 x tren acetate\n1 x Nolvadex\n1 x Arimidex\n1 x cialis daily\nALL NOVA LABS', 6, 2520, 1925, 595, 'standard', 1,
      'Dispatched', 'RE1204120', 'Plot 35C, Garsfontein Road, Tierpoort', ''),
    makeOrder('MM-0011', '2026-05-05', 'Kiara Dempers', '+27 79 528 8000',
      '1 x Keifei Test E', 1, 750, 650, 100, 'standard', 1,
      'Sent', '', '60 Hibiscus Way, Bergsig, Cape Town, 7550', 'Alt contact: +27 76 919 8679 (carrier calls only)'),
    makeOrder('MM-0012', '2026-05-06', 'Sunet', '0825629685',
      '1 x Reta Pen iPharma', 1, 2750, 1870, 880, 'standard', 1,
      'Sent', '', '25 Van Tonder road, Edenglen', ''),
    makeOrder('MM-0013', '2026-05-06', 'Juan Kitshoff', '+27 84 644 2320',
      '1 x Vmed Test E\n1 x Vmed NPP 100', 2, 1100, 870, 230, 'standard', 1,
      'Sent', '', '574 Petronella street, Garsfontein, Pretoria', ''),
    makeOrder('MM-0014', '2026-05-07', 'Arno', '+27 79 863 7280',
      '1 x MyLife Tirzep Pen\n1 x NOVA Test C', 2, 2820, 1990, 830, 'standard', 1,
      'Sent', '', 'Plot 35C, Garsfontein Road, Tierpoort', ''),
  ];

  // Save Muscle Mecca to Firestore and cache
  ordersCache['Muscle Mecca'] = orders;
  await db.collection('users').doc(currentUser.uid)
    .collection('suppliers').doc(key)
    .set({ orders });
  } // end Muscle Mecca seed

}

// ---- Init (Auth-gated) ----

document.addEventListener('DOMContentLoaded', () => {
  // Set up supplier tabs (UI only, data loads after auth)
  const tabsContainer = document.getElementById('supplierTabs');
  SUPPLIERS.forEach(supplier => {
    const btn = document.createElement('button');
    btn.textContent = supplier;
    btn.dataset.supplier = supplier;
    btn.addEventListener('click', () => switchSupplier(supplier));
    if (supplier === currentSupplier) btn.classList.add('active');
    tabsContainer.appendChild(btn);
  });

  document.getElementById('searchBox').addEventListener('input', renderOrders);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) { overlay.classList.remove('active'); editingOrderId = null; parsedOrders = []; }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active')); editingOrderId = null; }
  });

  // Auth state listener - gates the entire app
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      hideLoginScreen();
      showUserInfo(user);
      showLoading();

      try {
        await seedInitialData();
        await loadOrders(currentSupplier);
      } catch (err) {
        console.error('Error loading data:', err);
      }

      hideLoading();

      const weeks = getAvailableWeeks(currentSupplier);
      if (weeks.length > 0) currentWeek = weeks[weeks.length - 1];
      renderWeekTabs();
      renderOrders();
      renderSummary();
    } else {
      currentUser = null;
      ordersCache = {};
      showLoginScreen();
      document.getElementById('ordersBody').innerHTML = '';
    }
  });
});
