// ==============    // ==============
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
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

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
let paymentsCache = {};
let dashboardActive = false;
let quoteItems = [];
let quoteTier = 'standard';
let priceOverrides = {};

// ---- Price List (sell = standard retail, pref = preferential, cost = cost price) ----

const PRICE_LISTS = {
  'Muscle Mecca': [
    // IPHARMA
    { name: 'iPharma Test Cyp', keywords: ['test cyp', 'iph test cyp', 'test cyp iph', 'ipharma test cyp'], sell: 420, pref: 210, cost: 0 },
    { name: 'iPharma Test Enanthate', keywords: ['iph test e', 'test e iph', 'ipharma test e', 'test enanthate', 'iph test enanthate', 'test enanthate iph'], sell: 420, pref: 210, cost: 0 },
    { name: 'iPharma Test Prop', keywords: ['test prop', 'iph test prop', 'test prop iph', 'ipharma test prop'], sell: 350, pref: 175, cost: 0 },
    { name: 'iPharma Test Combo', keywords: ['test combo', 'iph test combo', 'test combo iph', 'ipharma test combo'], sell: 570, pref: 285, cost: 0 },
    { name: 'iPharma Deca 300', keywords: ['deca 300', 'iph deca 300', 'deca 300 iph', 'ipharma deca 300'], sell: 620, pref: 310, cost: 0 },
    { name: 'iPharma Deca 100 (NPP)', keywords: ['deca 100', 'iph deca 100', 'deca 100 iph', 'ipharma deca 100', 'iph deca 100 (npp)'], sell: 420, pref: 210, cost: 0 },
    { name: 'iPharma Equipoise', keywords: ['iph eq', 'eq iph', 'equipoise', 'ipharma eq', 'iph equipoise', 'equipoise iph'], sell: 650, pref: 325, cost: 0 },
    { name: 'iPharma Mastron Prop', keywords: ['mastron prop', 'iph mast prop', 'mast prop iph', 'iph mastron prop', 'mastron prop iph', 'ipharma mast prop'], sell: 680, pref: 340, cost: 0 },
    { name: 'iPharma Mastron Enathate', keywords: ['iph mast e', 'mast e iph', 'ipharma mast e', 'mastron enathate', 'iph mastron enathate', 'mastron enathate iph'], sell: 850, pref: 425, cost: 0 },
    { name: 'iPharma Trenbolone Acetate', keywords: ['iph tren ace', 'tren ace iph', 'ipharma tren ace', 'trenbolone acetate', 'iph trenbolone acetate', 'trenbolone acetate iph'], sell: 700, pref: 350, cost: 0 },
    { name: 'iPharma Trenbolone Enanthate', keywords: ['iph tren e', 'tren e iph', 'ipharma tren e', 'trenbolone enanthate', 'iph trenbolone enanthate', 'trenbolone enanthate iph'], sell: 850, pref: 425, cost: 0 },
    { name: 'iPharma Primabolan', keywords: ['iph primo', 'primo iph', 'primabolan', 'ipharma primo', 'iph primabolan', 'primabolan iph'], sell: 1200, pref: 600, cost: 0 },
    { name: 'iPharma Libido', keywords: ['libido', 'iph libido', 'libido iph', 'ipharma libido'], sell: 520, pref: 260, cost: 0 },
    { name: 'iPharma Test Suspention', keywords: ['iph test susp', 'test susp iph', 'test sus tion', 'iph test sus tion', 'test sus tion iph', 'ipharma test susp'], sell: 520, pref: 260, cost: 0 },
    { name: 'iPharma winstrol', keywords: ['winstrol', 'iph winny', 'winny iph', 'iph winstrol', 'winstrol iph', 'ipharma winny'], sell: 280, pref: 140, cost: 0 },
    { name: 'iPharma Sustanon 250 1ml amps x5', keywords: ['iph sust', 'sust iph', 'ipharma sust', 'sustanon 250 amps x5', 'iph sustanon 250 amps x5', 'sustanon 250 amps x5 iph'], sell: 460, pref: 230, cost: 0 },
    { name: 'iPharma Super test', keywords: ['super test', 'iph super test', 'super test iph', 'ipharma super test'], sell: 550, pref: 500, cost: 450 },
    { name: 'iPharma Super Cut', keywords: ['super cut', 'iph super cut', 'super cut iph', 'ipharma super cut'], sell: 800, pref: 675, cost: 550 },
    { name: 'iPharma Super Bulk', keywords: ['super bulk', 'iph super bulk', 'super bulk iph', 'ipharma super bulk'], sell: 800, pref: 675, cost: 550 },
    { name: 'iPharma Super Size', keywords: ['super size', 'iph super size', 'super size iph', 'ipharma super size'], sell: 800, pref: 675, cost: 550 },
    { name: 'iPharma Dianabal', keywords: ['iph dbol', 'dbol iph', 'dianabal', 'iph dianabal', 'dianabal iph', 'ipharma dbol'], sell: 180, pref: 143, cost: 105 },
    { name: 'iPharma Winstrol', keywords: ['winstrol', 'iph winny', 'winny iph', 'iph winstrol', 'winstrol iph', 'ipharma winny'], sell: 240, pref: 175, cost: 110 },
    { name: 'iPharma Anapolone', keywords: ['iph anap', 'anap iph', 'anapolone', 'ipharma anap', 'iph anapolone', 'anapolone iph'], sell: 450, pref: 330, cost: 210 },
    { name: 'iPharma Anavar 5', keywords: ['iph var', 'var iph', 'anavar 5', 'ipharma var', 'iph anavar 5', 'anavar 5 iph'], sell: 380, pref: 270, cost: 160 },
    { name: 'iPharma Anavar 20', keywords: ['iph var', 'var iph', 'anavar 20', 'ipharma var', 'iph anavar 20', 'anavar 20 iph'], sell: 500, pref: 410, cost: 320 },
    { name: 'iPharma Superdrol', keywords: ['iph sdrol', 'sdrol iph', 'superdrol', 'iph superdrol', 'superdrol iph', 'ipharma sdrol'], sell: 340, pref: 280, cost: 220 },
    { name: 'iPharma Turinabol', keywords: ['iph tbol', 'tbol iph', 'turinabol', 'ipharma tbol', 'iph turinabol', 'turinabol iph'], sell: 300, pref: 265, cost: 230 },
    { name: 'iPharma Methyl test (M1T)', keywords: ['methyl test', 'iph methyl test', 'methyl test iph', 'ipharma methyl test', 'iph methyl test (m1t)'], sell: 380, pref: 265, cost: 150 },
    { name: 'iPharma Oral Tren', keywords: ['oral tren', 'iph oral tren', 'oral tren iph', 'ipharma oral tren'], sell: 380, pref: 295, cost: 210 },
    { name: 'iPharma Oral Prima', keywords: ['oral prima', 'iph oral prima', 'oral prima iph', 'ipharma oral prima'], sell: 740, pref: 610, cost: 480 },
    { name: 'iPharma Female Stack', keywords: ['female stack', 'iph female stack', 'female stack iph', 'ipharma female stack'], sell: 500, pref: 380, cost: 260 },
    { name: 'iPharma Drostinex', keywords: ['drostinex', 'iph drostinex', 'drostinex iph', 'ipharma drostinex'], sell: 420, pref: 335, cost: 250 },
    { name: 'iPharma Nolvadex', keywords: ['nolvadex', 'iph nolva', 'nolva iph', 'iph nolvadex', 'nolvadex iph', 'ipharma nolva'], sell: 270, pref: 208, cost: 145 },
    { name: 'iPharma Proviron', keywords: ['proviron', 'iph proviron', 'proviron iph', 'ipharma proviron'], sell: 380, pref: 295, cost: 210 },
    { name: 'iPharma Clomid', keywords: ['clomid', 'iph clomid', 'clomid iph', 'ipharma clomid'], sell: 300, pref: 280, cost: 260 },
    { name: 'iPharma EnClomiphene', keywords: ['enclomiphene', 'iph enclomiphene', 'enclomiphene iph', 'ipharma enclomiphene'], sell: 540, pref: 465, cost: 390 },
    { name: 'iPharma Arimadex', keywords: ['iph adex', 'adex iph', 'arimadex', 'iph arimadex', 'arimadex iph', 'ipharma adex'], sell: 340, pref: 295, cost: 250 },
    { name: 'iPharma CYX3', keywords: ['iph cyx3', 'cyx3 iph', 'ipharma cyx3'], sell: 300, pref: 220, cost: 140 },
    { name: 'iPharma Clenbutrol', keywords: ['iph clen', 'clen iph', 'clenbutrol', 'ipharma clen', 'iph clenbutrol', 'clenbutrol iph'], sell: 220, pref: 180, cost: 140 },
    { name: 'iPharma Zaditen', keywords: ['zaditen', 'iph zaditen', 'zaditen iph', 'ipharma zaditen'], sell: 330, pref: 235, cost: 140 },
    { name: 'iPharma Carigsema', keywords: ['carigsema', 'iph carigsema', 'carigsema iph', 'ipharma carigsema'], sell: 1350, pref: 1200, cost: 1050 },
    { name: 'iPharma Yohimbine', keywords: ['yohimbine', 'iph yohimbine', 'yohimbine iph', 'ipharma yohimbine'], sell: 320, pref: 255, cost: 190 },
    { name: 'iPharma Sibutramine', keywords: ['sibutramine', 'iph sibutramine', 'sibutramine iph', 'ipharma sibutramine'], sell: 600, pref: 450, cost: 300 },
    { name: 'iPharma T3', keywords: ['iph t3', 't3 iph', 'ipharma t3'], sell: 230, pref: 185, cost: 140 },
    { name: 'iPharma T4', keywords: ['iph t4', 't4 iph', 'ipharma t4'], sell: 230, pref: 185, cost: 140 },
    { name: 'iPharma DHEA', keywords: ['iph dhea', 'dhea iph', 'ipharma dhea'], sell: 230, pref: 185, cost: 140 },
    { name: 'iPharma Accutane', keywords: ['accutane', 'iph accutane', 'accutane iph', 'ipharma accutane'], sell: 310, pref: 250, cost: 190 },
    { name: 'iPharma Aromasin', keywords: ['aromasin', 'iph aromasin', 'aromasin iph', 'ipharma aromasin'], sell: 540, pref: 420, cost: 300 },
    { name: 'iPharma Femara (Letrozol)', keywords: ['femara', 'iph femara', 'femara iph', 'ipharma femara', 'iph femara (letrozol)'], sell: 370, pref: 275, cost: 180 },
    { name: 'iPharma Dutasteride', keywords: ['dutasteride', 'iph dutasteride', 'dutasteride iph', 'ipharma dutasteride'], sell: 370, pref: 260, cost: 150 },
    { name: 'iPharma Finpecia', keywords: ['finpecia', 'iph finpecia', 'finpecia iph', 'ipharma finpecia'], sell: 270, pref: 210, cost: 150 },
    { name: 'iPharma DMAA 1,3 (Limitless)', keywords: ['dmaa 1,3', 'iph dmaa 1,3', 'dmaa 1,3 iph', 'ipharma dmaa 1,3', 'iph dmaa 1,3 (limitless)'], sell: 270, pref: 195, cost: 120 },
    { name: 'iPharma Telmisar', keywords: ['iph telmisar', 'ipharma telmisar', 'iph tesar'], sell: 300, pref: 250, cost: 200 },
    { name: 'iPharma Raloxifene', keywords: ['raloxifene', 'iph raloxifene', 'raloxifene iph', 'ipharma raloxifene'], sell: 270, pref: 210, cost: 150 },
    { name: 'iPharma SLU-PP 332', keywords: ['slu pp 332', 'iph slu-pp 332', 'iph slu pp 332', 'slu pp 332 iph', 'ipharma slu pp 332'], sell: 480, pref: 430, cost: 380 },
    { name: 'iPharma Dianabal (Extra Strenght)', keywords: ['iph dbol', 'dbol iph', 'dianabal', 'iph dianabal', 'dianabal iph', 'ipharma dbol'], sell: 380, pref: 315, cost: 250 },
    { name: 'iPharma Winstrol (Extra Strenght)', keywords: ['winstrol', 'iph winny', 'winny iph', 'iph winstrol', 'winstrol iph', 'ipharma winny'], sell: 380, pref: 325, cost: 270 },
    { name: 'iPharma Anavar(Extra Strenght)', keywords: ['anavar', 'iph var', 'var iph', 'iph anavar', 'anavar iph', 'ipharma var'], sell: 800, pref: 650, cost: 500 },
    { name: 'iPharma Osterine', keywords: ['osterine', 'iph osterine', 'osterine iph', 'ipharma osterine'], sell: 430, pref: 353, cost: 275 },
    { name: 'iPharma Anabolicum', keywords: ['anabolicum', 'iph anabolicum', 'anabolicum iph', 'ipharma anabolicum'], sell: 430, pref: 353, cost: 275 },
    { name: 'iPharma Testelone', keywords: ['testelone', 'iph testelone', 'testelone iph', 'ipharma testelone'], sell: 480, pref: 378, cost: 275 },
    { name: 'iPharma Nutrobal', keywords: ['nutrobal', 'iph nutrobal', 'nutrobal iph', 'ipharma nutrobal'], sell: 480, pref: 378, cost: 275 },
    { name: 'iPharma Cardarine', keywords: ['cardarine', 'iph cardarine', 'cardarine iph', 'ipharma cardarine'], sell: 480, pref: 378, cost: 275 },
    { name: 'iPharma Stenabolic', keywords: ['stenabolic', 'iph stenabolic', 'stenabolic iph', 'ipharma stenabolic'], sell: 480, pref: 378, cost: 275 },
    { name: 'iPharma Andarine', keywords: ['andarine', 'iph andarine', 'andarine iph', 'ipharma andarine'], sell: 480, pref: 378, cost: 275 },
    { name: 'iPharma YK-11', keywords: ['yk 11', 'iph yk-11', 'iph yk 11', 'yk 11 iph', 'ipharma yk 11'], sell: 620, pref: 515, cost: 410 },
    { name: 'iPharma iPharmatropin Pre Filled Pen', keywords: ['ipharmatropin', 'iph ipharmatropin', 'ipharmatropin iph', 'ipharma ipharmatropin', 'iph ipharmatropin pre filled pen'], sell: 2350, pref: 2150, cost: 1950 },
    { name: 'iPharma HCG', keywords: ['iph hcg', 'hcg iph', 'ipharma hcg'], sell: 400, pref: 340, cost: 280 },
    { name: 'iPharma Melanotan 2', keywords: ['iph mt2', 'mt2 iph', 'ipharma mt2', 'melanotan 2', 'iph melanotan 2', 'melanotan 2 iph'], sell: 400, pref: 325, cost: 250 },
    { name: 'iPharma FRAG', keywords: ['iph frag', 'frag iph', 'ipharma frag'], sell: 400, pref: 330, cost: 260 },
    { name: 'iPharma GHRP-6', keywords: ['ghrp 6', 'iph ghrp-6', 'iph ghrp 6', 'ghrp 6 iph', 'ipharma ghrp 6'], sell: 400, pref: 325, cost: 250 },
    { name: 'iPharma Lovers Peptide', keywords: ['lovers peptide', 'iph lovers peptide', 'lovers peptide iph', 'ipharma lovers peptide'], sell: 480, pref: 410, cost: 340 },
    { name: 'iPharma BPC 157', keywords: ['bpc 157', 'iph bpc 157', 'bpc 157 iph', 'ipharma bpc 157'], sell: 410, pref: 338, cost: 265 },
    { name: 'iPharma BPC 157 (ORAL)', keywords: ['bpc 157', 'iph bpc 157', 'bpc 157 iph', 'ipharma bpc 157', 'iph bpc 157 (oral)'], sell: 530, pref: 453, cost: 375 },
    { name: 'iPharma izempic Vial', keywords: ['izempic', 'iph izempic', 'izempic iph', 'ipharma izempic', 'iph izempic vial'], sell: 1100, pref: 900, cost: 700 },
    { name: 'iPharma iZempic - Pre filled Pen', keywords: ['izempic', 'iph izempic', 'izempic iph', 'ipharma izempic', 'iph izempic - pre filled pen'], sell: 1600, pref: 1300, cost: 1000 },
    { name: 'iPharma Tirzepitide Vial', keywords: ['iph tirzep', 'tirzep iph', 'tirzepitide', 'ipharma tirzep', 'iph tirzepitide', 'tirzepitide iph'], sell: 1850, pref: 1500, cost: 1150 },
    { name: 'iPharma Tirzepitide - Pre filled pen', keywords: ['iph tirzep', 'tirzep iph', 'tirzepitide', 'ipharma tirzep', 'iph tirzepitide', 'tirzepitide iph'], sell: 2400, pref: 1975, cost: 1550 },
    { name: 'iPharma Retatrutide - Pre filled pen', keywords: ['iph reta', 'reta iph', 'retatrutide', 'ipharma reta', 'iph retatrutide', 'retatrutide iph'], sell: 2600, pref: 2160, cost: 1720 },
    { name: 'iPharma IGF-1 LR3', keywords: ['igf 1 lr3', 'iph igf-1 lr3', 'iph igf 1 lr3', 'igf 1 lr3 iph', 'ipharma igf 1 lr3'], sell: 430, pref: 360, cost: 290 },
    { name: 'iPharma TB500', keywords: ['tb500', 'iph tb500', 'tb500 iph', 'ipharma tb500'], sell: 410, pref: 345, cost: 280 },
    { name: 'iPharma BPC + TB500 Combo', keywords: ['bpc + tb500 combo', 'iph bpc + tb500 combo', 'bpc + tb500 combo iph', 'ipharma bpc + tb500 combo'], sell: 750, pref: 620, cost: 490 },
    { name: 'iPharma CJC with DAC', keywords: ['cjc with dac', 'iph cjc with dac', 'cjc with dac iph', 'ipharma cjc with dac'], sell: 410, pref: 355, cost: 300 },
    { name: 'iPharma Tirzepsema', keywords: ['tirzepsema', 'iph tirzepsema', 'tirzepsema iph', 'ipharma tirzepsema'], sell: 2400, pref: 2050, cost: 1700 },
    { name: 'iPharma NAD+', keywords: ['iph nad+', 'nad+ iph', 'ipharma nad+'], sell: 1200, pref: 1050, cost: 900 },
    { name: 'iPharma GHK-CU', keywords: ['ghk cu', 'iph ghk-cu', 'iph ghk cu', 'ghk cu iph', 'ipharma ghk cu'], sell: 600, pref: 525, cost: 450 },
    { name: 'iPharma Viagra', keywords: ['viagra', 'iph viagra', 'viagra iph', 'ipharma viagra'], sell: 350, pref: 240, cost: 130 },
    { name: 'iPharma Cialis', keywords: ['cialis', 'iph cialis', 'cialis iph', 'ipharma cialis'], sell: 350, pref: 245, cost: 140 },
    { name: 'iPharma Cialis Daily', keywords: ['cialis daily', 'iph cialis daily', 'cialis daily iph', 'ipharma cialis daily'], sell: 320, pref: 220, cost: 120 },
    { name: 'iPharma Ciagra (CockBomb) 10mg cialis 50mg viagra', keywords: ['ciagra cialis viagra', 'iph ciagra cialis viagra', 'ciagra cialis viagra iph', 'ipharma ciagra cialis viagra', 'iph ciagra 10mg cialis 50mg viagra', 'iph ciagra (cockbomb) 10 cialis 50mg viagra'], sell: 350, pref: 240, cost: 130 },
    { name: 'iPharma Helios inject 20ml', keywords: ['helios', 'iph helios', 'helios iph', 'ipharma helios', 'iph helios inject 20ml'], sell: 370, pref: 185, cost: 0 },
    { name: 'iPharma Yohimbine inject', keywords: ['yohimbine', 'iph yohimbine', 'yohimbine iph', 'ipharma yohimbine', 'iph yohimbine inject'], sell: 320, pref: 160, cost: 0 },
    { name: 'iPharma Clenbutrol inject 20ml', keywords: ['iph clen', 'clen iph', 'clenbutrol', 'ipharma clen', 'iph clenbutrol', 'clenbutrol iph'], sell: 380, pref: 190, cost: 0 },
    { name: 'iPharma L-Carnitine 50ml', keywords: ['iph l-carn', 'l-carn iph', 'l carnitine', 'ipharma l-carn', 'iph l carnitine', 'l carnitine iph'], sell: 450, pref: 380, cost: 310 },
    { name: 'iPharma ECA STACK', keywords: ['eca stack', 'iph eca stack', 'eca stack iph', 'ipharma eca stack'], sell: 350, pref: 175, cost: 0 },
    { name: 'iPharma ECYA BURN', keywords: ['ecya burn', 'iph ecya burn', 'ecya burn iph', 'ipharma ecya burn'], sell: 350, pref: 175, cost: 0 },
    { name: 'iPharma TUDCA (Cycle Repair)', keywords: ['tudca', 'iph tudca', 'tudca iph', 'ipharma tudca', 'iph tudca (cycle repair)'], sell: 420, pref: 370, cost: 320 },
    { name: 'iPharma Melatonin', keywords: ['melatonin', 'iph melatonin', 'melatonin iph', 'ipharma melatonin'], sell: 380, pref: 190, cost: 0 },
    { name: 'iPharma Metformine', keywords: ['metformine', 'iph metformine', 'metformine iph', 'ipharma metformine'], sell: 550, pref: 275, cost: 0 },
    { name: 'iPharma Bikini Fat Burner', keywords: ['bikini fat burner', 'iph bikini fat burner', 'bikini fat burner iph', 'ipharma bikini fat burner'], sell: 500, pref: 250, cost: 0 },
    { name: 'iPharma STARK pre workout', keywords: ['stark pre workout', 'iph stark pre workout', 'stark pre workout iph', 'ipharma stark pre workout'], sell: 500, pref: 250, cost: 0 },
    { name: 'iPharma WaterDrop', keywords: ['waterdrop', 'iph waterdrop', 'waterdrop iph', 'ipharma waterdrop'], sell: 350, pref: 175, cost: 0 },
    { name: 'iPharma Sleeping aid (Natural Blend)', keywords: ['sleeping aid', 'iph sleeping aid', 'sleeping aid iph', 'ipharma sleeping aid', 'iph sleeping aid (natural blend)'], sell: 350, pref: 175, cost: 0 },
    { name: 'iPharma Adrenal Cleanse', keywords: ['adrenal cleanse', 'iph adrenal cleanse', 'adrenal cleanse iph', 'ipharma adrenal cleanse'], sell: 350, pref: 295, cost: 240 },
    // VMED
    { name: 'Vmed Growth Hormone Inj (100iu)', keywords: ['growth hormone inj', 'vmed growth hormone inj', 'growth hormone inj vmed', 'vmed growth hormone inj (100)', 'vmed growth hormone inj (100iu)'], sell: 4150, pref: 3775, cost: 3400 },
    { name: 'Vmed IGF-1 LR3', keywords: ['igf 1 lr3', 'vmed igf-1 lr3', 'vmed igf 1 lr3', 'igf 1 lr3 vmed'], sell: 650, pref: 560, cost: 470 },
    { name: 'Vmed Hexarelin', keywords: ['hexarelin', 'vmed hexarelin', 'hexarelin vmed'], sell: 600, pref: 510, cost: 420 },
    { name: 'Vmed GHRP-6', keywords: ['ghrp 6', 'vmed ghrp-6', 'vmed ghrp 6', 'ghrp 6 vmed'], sell: 430, pref: 355, cost: 280 },
    { name: 'Vmed HGH Frag', keywords: ['hgh frag', 'vmed hgh frag', 'hgh frag vmed'], sell: 620, pref: 530, cost: 440 },
    { name: 'Vmed HGH Nasal Spray', keywords: ['vmed hgh', 'hgh vmed', 'vmed hgh nasal spray'], sell: 800, pref: 640, cost: 480 },
    { name: 'Vmed MGF', keywords: ['vmed mgf', 'mgf vmed'], sell: 970, pref: 855, cost: 740 },
    { name: 'Vmed Melanotan II', keywords: ['vmed mt2', 'mt2 vmed', 'melanotan ii', 'vmed melanotan ii', 'melanotan ii vmed'], sell: 620, pref: 540, cost: 460 },
    { name: 'Vmed Melanotan II Nasal Spray', keywords: ['vmed mt2', 'mt2 vmed', 'melanotan ii', 'vmed melanotan ii', 'melanotan ii vmed', 'vmed melanotan ii nasal spray'], sell: 730, pref: 630, cost: 530 },
    { name: 'Vmed TB500', keywords: ['tb500', 'vmed tb500', 'tb500 vmed'], sell: 820, pref: 635, cost: 450 },
    { name: 'Vmed TB/BPC Combo Nasal 5mg', keywords: ['tb/bpc combo nasal', 'vmed tb/bpc combo nasal', 'tb/bpc combo nasal vmed', 'vmed tb/bpc combo nasal 5', 'vmed tb/bpc combo nasal 5mg'], sell: 860, pref: 735, cost: 610 },
    { name: 'Vmed TB/BPC Combo Nasal 10mg', keywords: ['tb/bpc combo nasal', 'vmed tb/bpc combo nasal', 'tb/bpc combo nasal vmed', 'vmed tb/bpc combo nasal 10', 'vmed tb/bpc combo nasal 10mg'], sell: 1300, pref: 1175, cost: 1050 },
    { name: 'Vmed BPC 157', keywords: ['bpc 157', 'vmed bpc 157', 'bpc 157 vmed'], sell: 650, pref: 565, cost: 480 },
    { name: 'Vmed GHK-cu', keywords: ['ghk cu', 'vmed ghk-cu', 'vmed ghk cu', 'ghk cu vmed'], sell: 500, pref: 445, cost: 390 },
    { name: 'Vmed Retatrutide 30mg', keywords: ['vmed reta', 'reta vmed', 'retatrutide', 'vmed retatrutide', 'retatrutide vmed', 'vmed retatrutide 30'], sell: 2400, pref: 2000, cost: 1600 },
    { name: 'Vmed Retatrutide 10mg', keywords: ['vmed reta', 'reta vmed', 'retatrutide', 'vmed retatrutide', 'retatrutide vmed', 'vmed retatrutide 10'], sell: 1000, pref: 800, cost: 600 },
    { name: 'Vmed Mots-C 20mg', keywords: ['mots c', 'vmed mots c', 'mots c vmed', 'vmed mots-c 20', 'vmed mots-c 20mg'], sell: 900, pref: 785, cost: 670 },
    { name: 'Vmed Mots-C 60mg', keywords: ['mots c', 'vmed mots c', 'mots c vmed', 'vmed mots-c 60', 'vmed mots-c 60mg'], sell: 1500, pref: 1325, cost: 1150 },
    { name: 'Vmed CJC+Ipamorelin', keywords: ['cjc+ipamorelin', 'vmed cjc+ipamorelin', 'cjc+ipamorelin vmed'], sell: 730, pref: 630, cost: 530 },
    { name: 'Vmed Tesamorelin 10mg', keywords: ['tesamorelin', 'vmed tesamorelin', 'tesamorelin vmed', 'vmed tesamorelin 10', 'vmed tesamorelin 10mg'], sell: 850, pref: 715, cost: 580 },
    { name: 'Vmed Tesamorelin 30mg', keywords: ['tesamorelin', 'vmed tesamorelin', 'tesamorelin vmed', 'vmed tesamorelin 30', 'vmed tesamorelin 30mg'], sell: 1700, pref: 1450, cost: 1200 },
    { name: 'Vmed Test Enanthate', keywords: ['vmed test e', 'test e vmed', 'test enanthate', 'vmed test enanthate', 'test enanthate vmed'], sell: 470, pref: 415, cost: 360 },
    { name: 'Vmed Test Enanthate Premium', keywords: ['vmed test e', 'test e vmed', 'test enanthate premium', 'vmed test enanthate premium', 'test enanthate premium vmed'], sell: 550, pref: 475, cost: 400 },
    { name: 'Vmed Test Cypionate', keywords: ['vmed test cyp', 'test cyp vmed', 'test cypionate', 'vmed test cypionate', 'test cypionate vmed'], sell: 470, pref: 415, cost: 360 },
    { name: 'Vmed Test Cypionate Premium', keywords: ['test cypionate premium', 'vmed test cypionate premium', 'test cypionate premium vmed'], sell: 550, pref: 475, cost: 400 },
    { name: 'Vmed Test Propionate', keywords: ['vmed test prop', 'test prop vmed', 'test propionate', 'vmed test propionate', 'test propionate vmed'], sell: 390, pref: 345, cost: 300 },
    { name: 'Vmed Equipoise', keywords: ['vmed eq', 'eq vmed', 'equipoise', 'vmed equipoise', 'equipoise vmed'], sell: 480, pref: 440, cost: 400 },
    { name: 'Vmed Sustanon', keywords: ['sustanon', 'vmed sust', 'sust vmed', 'vmed sustanon', 'sustanon vmed'], sell: 500, pref: 440, cost: 380 },
    { name: 'Vmed Libido', keywords: ['libido', 'vmed libido', 'libido vmed'], sell: 560, pref: 525, cost: 490 },
    { name: 'Vmed Masteron Propionate', keywords: ['vmed mast prop', 'mast prop vmed', 'masteron propionate', 'vmed masteron propionate', 'masteron propionate vmed'], sell: 680, pref: 575, cost: 470 },
    { name: 'Vmed Masteron Enanthate', keywords: ['vmed mast e', 'mast e vmed', 'masteron enanthate', 'vmed masteron enanthate', 'masteron enanthate vmed'], sell: 880, pref: 795, cost: 710 },
    { name: 'Vmed Tren Ace', keywords: ['tren ace', 'vmed tren ace', 'tren ace vmed'], sell: 730, pref: 605, cost: 480 },
    { name: 'Vmed Tren E', keywords: ['tren e', 'vmed tren e', 'tren e vmed'], sell: 900, pref: 790, cost: 680 },
    { name: 'Vmed Deca 300', keywords: ['deca 300', 'vmed deca 300', 'deca 300 vmed'], sell: 720, pref: 610, cost: 500 },
    { name: 'Vmed NPP', keywords: ['vmed npp', 'npp vmed'], sell: 480, pref: 420, cost: 360 },
    { name: 'Vmed Primobolan', keywords: ['vmed primo', 'primo vmed', 'primobolan', 'vmed primobolan', 'primobolan vmed'], sell: 920, pref: 835, cost: 750 },
    { name: 'Vmed Pregnal (HCG)', keywords: ['pregnal', 'vmed pregnal', 'pregnal vmed', 'vmed pregnal (hcg)'], sell: 480, pref: 420, cost: 360 },
    { name: 'Vmed Dianabol 10mg', keywords: ['dianabol', 'vmed dbol', 'dbol vmed', 'vmed dianabol', 'dianabol vmed', 'vmed dianabol 10'], sell: 350, pref: 290, cost: 230 },
    { name: 'Vmed Dianabol 50mg', keywords: ['dianabol', 'vmed dbol', 'dbol vmed', 'vmed dianabol', 'dianabol vmed', 'vmed dianabol 50'], sell: 550, pref: 440, cost: 330 },
    { name: 'Vmed Oxy (Anapolan)', keywords: ['vmed oxy', 'oxy vmed', 'vmed oxy (anapolan)'], sell: 520, pref: 440, cost: 360 },
    { name: 'Vmed Stan (Winstrol) 10mg', keywords: ['vmed stan', 'stan vmed', 'vmed winny', 'winny vmed', 'vmed stan 10mg', 'vmed stan (winstrol) 10'], sell: 520, pref: 385, cost: 250 },
    { name: 'Vmed Stan (Winstrol) 50mg', keywords: ['vmed stan', 'stan vmed', 'vmed winny', 'winny vmed', 'vmed stan 50mg', 'vmed stan (winstrol) 50'], sell: 700, pref: 635, cost: 570 },
    { name: 'Vmed Oxan (Anavar) 10mg', keywords: ['vmed var', 'var vmed', 'vmed oxan', 'oxan vmed', 'vmed oxan 10mg', 'vmed oxan (anavar) 10'], sell: 480, pref: 405, cost: 330 },
    { name: 'Vmed Oxan (Anavar) 50mg', keywords: ['vmed var', 'var vmed', 'vmed oxan', 'oxan vmed', 'vmed oxan 50mg', 'vmed oxan (anavar) 50'], sell: 900, pref: 755, cost: 610 },
    { name: 'Vmed Cialis Daily', keywords: ['cialis daily', 'vmed cialis daily', 'cialis daily vmed'], sell: 350, pref: 255, cost: 160 },
    { name: 'Vmed Cialis', keywords: ['cialis', 'vmed cialis', 'cialis vmed'], sell: 350, pref: 275, cost: 200 },
    { name: 'Vmed Proviron', keywords: ['proviron', 'vmed proviron', 'proviron vmed'], sell: 450, pref: 400, cost: 350 },
    { name: 'Vmed Clen HCl - 50Tabs', keywords: ['vmed clen 50', 'clen vmed 50', 'clenbuterol vmed 50', 'vmed clen hcl 50', 'vmed clen'], sell: 250, pref: 185, cost: 120 },
    { name: 'Vmed Clen HCl - 100Tabs', keywords: ['vmed clen 100', 'clen vmed 100', 'clenbuterol vmed 100', 'vmed clen hcl 100'], sell: 400, pref: 320, cost: 240 },
    { name: 'Vmed Sibutra HCl', keywords: ['sibutra hcl', 'vmed sibutra hcl', 'sibutra hcl vmed'], sell: 480, pref: 430, cost: 380 },
    { name: 'Vmed Nolvadex', keywords: ['nolvadex', 'vmed nolva', 'nolva vmed', 'vmed nolvadex', 'nolvadex vmed'], sell: 270, pref: 225, cost: 180 },
    { name: 'Vmed Arimadex', keywords: ['arimadex', 'vmed adex', 'adex vmed', 'vmed arimadex', 'arimadex vmed'], sell: 400, pref: 350, cost: 300 },
    { name: 'Vmed Clomid', keywords: ['clomid', 'vmed clomid', 'clomid vmed'], sell: 340, pref: 310, cost: 280 },
    { name: 'Vmed Femara (Letrozol)', keywords: ['femara', 'vmed femara', 'femara vmed', 'vmed femara (letrozol)'], sell: 420, pref: 350, cost: 280 },
    { name: 'Vmed Epistaine', keywords: ['epistaine', 'vmed epistaine', 'epistaine vmed'], sell: 590, pref: 525, cost: 460 },
    { name: 'Vmed Supadrol', keywords: ['supadrol', 'vmed sdrol', 'sdrol vmed', 'vmed supadrol', 'supadrol vmed'], sell: 430, pref: 350, cost: 270 },
    { name: 'Vmed Ligandrol', keywords: ['ligandrol', 'vmed ligandrol', 'ligandrol vmed'], sell: 420, pref: 335, cost: 250 },
    { name: 'Vmed Nutrobal', keywords: ['nutrobal', 'vmed nutrobal', 'nutrobal vmed'], sell: 720, pref: 600, cost: 480 },
    { name: 'Vmed Testolone', keywords: ['testolone', 'vmed testolone', 'testolone vmed'], sell: 800, pref: 695, cost: 590 },
    { name: 'Vmed Cardarine', keywords: ['cardarine', 'vmed cardarine', 'cardarine vmed'], sell: 600, pref: 525, cost: 450 },
    { name: 'Vmed Osterine', keywords: ['osterine', 'vmed osterine', 'osterine vmed'], sell: 550, pref: 435, cost: 320 },
    // UPA
    { name: 'UPA Test Cyp', keywords: ['test cyp', 'upa test cyp', 'test cyp upa'], sell: 420, pref: 360, cost: 300 },
    { name: 'UPA Test Enanthate', keywords: ['upa test e', 'test e upa', 'test enanthate', 'upa test enanthate', 'test enanthate upa'], sell: 440, pref: 383, cost: 325 },
    { name: 'UPA Test Prop', keywords: ['test prop', 'upa test prop', 'test prop upa'], sell: 380, pref: 340, cost: 300 },
    { name: 'UPA Sustanon', keywords: ['upa sust', 'sust upa', 'sustanon', 'upa sustanon', 'sustanon upa'], sell: 500, pref: 415, cost: 330 },
    { name: 'UPA Ulti Test', keywords: ['ulti test', 'upa ulti test', 'ulti test upa'], sell: 550, pref: 485, cost: 420 },
    { name: 'UPA Deca', keywords: ['upa deca', 'deca upa'], sell: 620, pref: 545, cost: 470 },
    { name: 'UPA NPP', keywords: ['upa npp', 'npp upa'], sell: 420, pref: 380, cost: 340 },
    { name: 'UPA Equipoise', keywords: ['upa eq', 'eq upa', 'equipoise', 'upa equipoise', 'equipoise upa'], sell: 670, pref: 570, cost: 470 },
    { name: 'UPA Masteron Propionate', keywords: ['upa mast prop', 'mast prop upa', 'masteron propionate', 'upa masteron propionate', 'masteron propionate upa'], sell: 800, pref: 660, cost: 520 },
    { name: 'UPA Masteron Enanthate', keywords: ['upa mast e', 'mast e upa', 'masteron enanthate', 'upa masteron enanthate', 'masteron enanthate upa'], sell: 1050, pref: 960, cost: 870 },
    { name: 'UPA Trenbolone Acetate', keywords: ['upa tren ace', 'tren ace upa', 'trenbolone acetate', 'upa trenbolone acetate', 'trenbolone acetate upa'], sell: 770, pref: 650, cost: 530 },
    { name: 'UPA Trenbolone Enanthate', keywords: ['upa tren e', 'tren e upa', 'trenbolone enanthate', 'upa trenbolone enanthate', 'trenbolone enanthate upa'], sell: 900, pref: 820, cost: 740 },
    { name: 'UPA Primobolan', keywords: ['upa primo', 'primo upa', 'primobolan', 'upa primobolan', 'primobolan upa'], sell: 1650, pref: 1565, cost: 1480 },
    { name: 'UPA Libido', keywords: ['libido', 'upa libido', 'libido upa'], sell: 500, pref: 430, cost: 360 },
    { name: 'UPA Dianabal', keywords: ['upa dbol', 'dbol upa', 'dianabal', 'upa dianabal', 'dianabal upa'], sell: 220, pref: 180, cost: 140 },
    { name: 'UPA Winstrol 15mg', keywords: ['winstrol', 'upa winny', 'winny upa', 'upa winstrol', 'winstrol upa', 'upa winstrol 15'], sell: 250, pref: 200, cost: 150 },
    { name: 'UPA Anavar 15mg', keywords: ['anavar', 'upa var', 'var upa', 'upa anavar', 'anavar upa', 'upa anavar 15'], sell: 500, pref: 425, cost: 350 },
    { name: 'UPA Turinabol', keywords: ['upa tbol', 'tbol upa', 'turinabol', 'upa turinabol', 'turinabol upa'], sell: 320, pref: 280, cost: 240 },
    { name: 'UPA Anapolin', keywords: ['upa anap', 'anap upa', 'anapolin', 'upa anapolin', 'anapolin upa'], sell: 470, pref: 415, cost: 360 },
    { name: 'UPA Superdrol', keywords: ['upa sdrol', 'sdrol upa', 'superdrol', 'upa superdrol', 'superdrol upa'], sell: 350, pref: 310, cost: 270 },
    { name: 'UPA Dianabol', keywords: ['upa dbol', 'dbol upa', 'dianabol', 'upa dianabol', 'dianabol upa'], sell: 320, pref: 280, cost: 240 },
    { name: 'UPA Winstrol 50mg', keywords: ['winstrol', 'upa winny', 'winny upa', 'upa winstrol', 'winstrol upa', 'upa winstrol 50'], sell: 340, pref: 290, cost: 240 },
    { name: 'UPA Anavar 50mg', keywords: ['anavar', 'upa var', 'var upa', 'upa anavar', 'anavar upa', 'upa anavar 50'], sell: 730, pref: 635, cost: 540 },
    { name: 'UPA Proviron', keywords: ['proviron', 'upa proviron', 'proviron upa'], sell: 520, pref: 460, cost: 400 },
    { name: 'UPA Clomid', keywords: ['clomid', 'upa clomid', 'clomid upa'], sell: 319, pref: 295, cost: 270 },
    { name: 'UPA Tamoxyfen/Nolvadex', keywords: ['upa nolva', 'nolva upa', 'tamoxyfen/nolvadex', 'upa tamoxyfen/nolvadex', 'tamoxyfen/nolvadex upa'], sell: 320, pref: 270, cost: 220 },
    { name: 'UPA Lentrozole', keywords: ['lentrozole', 'upa lentrozole', 'lentrozole upa'], sell: 500, pref: 455, cost: 410 },
    { name: 'UPA Arimadex', keywords: ['upa adex', 'adex upa', 'arimadex', 'upa arimadex', 'arimadex upa'], sell: 480, pref: 445, cost: 410 },
    { name: 'UPA T3', keywords: ['upa t3', 't3 upa'], sell: 250, pref: 195, cost: 140 },
    { name: 'UPA Clenbuterol', keywords: ['upa clen', 'clen upa', 'clenbuterol', 'upa clenbuterol', 'clenbuterol upa'], sell: 220, pref: 190, cost: 160 },
    { name: 'UPA Subutramine', keywords: ['subutramine', 'upa subutramine', 'subutramine upa'], sell: 420, pref: 335, cost: 250 },
    { name: 'UPA Yohimbine', keywords: ['yohimbine', 'upa yohimbine', 'yohimbine upa'], sell: 320, pref: 285, cost: 250 },
    { name: 'UPA Clenbuterol HCl', keywords: ['upa clen', 'clen upa', 'clenbuterol hcl', 'upa clenbuterol hcl', 'clenbuterol hcl upa'], sell: 440, pref: 380, cost: 320 },
    { name: 'UPA Yohimbine HCl', keywords: ['yohimbine hcl', 'upa yohimbine hcl', 'yohimbine hcl upa'], sell: 400, pref: 360, cost: 320 },
    { name: 'UPA Helios (Clen/Yohimbine)', keywords: ['helios', 'upa helios', 'helios upa', 'upa helios (clen/yohimbine)'], sell: 400, pref: 370, cost: 340 },
    { name: 'UPA L-Carnitine Inject', keywords: ['upa l-carn', 'l-carn upa', 'l carnitine', 'upa l carnitine', 'l carnitine upa', 'upa l-carnitine inject'], sell: 420, pref: 370, cost: 320 },
    { name: 'UPA Cialis', keywords: ['cialis', 'upa cialis', 'cialis upa'], sell: 340, pref: 270, cost: 200 },
    { name: 'UPA Viagra', keywords: ['viagra', 'upa viagra', 'viagra upa'], sell: 340, pref: 270, cost: 200 },
    { name: 'UPA Cardarine', keywords: ['cardarine', 'upa cardarine', 'cardarine upa'], sell: 550, pref: 455, cost: 360 },
    { name: 'UPA Anadrine', keywords: ['anadrine', 'upa anadrine', 'anadrine upa'], sell: 530, pref: 445, cost: 360 },
    { name: 'UPA Anabolicum', keywords: ['anabolicum', 'upa anabolicum', 'anabolicum upa'], sell: 550, pref: 480, cost: 410 },
    { name: 'UPA Nutrabol (MK-677)', keywords: ['nutrabol', 'upa nutrabol', 'nutrabol upa', 'upa nutrabol (mk-677)'], sell: 650, pref: 550, cost: 450 },
    { name: 'UPA Stenabolic', keywords: ['stenabolic', 'upa stenabolic', 'stenabolic upa'], sell: 580, pref: 520, cost: 460 },
    { name: 'UPA Osterine', keywords: ['osterine', 'upa osterine', 'osterine upa'], sell: 550, pref: 460, cost: 370 },
    { name: 'UPA Testolone', keywords: ['testolone', 'upa testolone', 'testolone upa'], sell: 540, pref: 475, cost: 410 },
    { name: 'UPA Epistaine', keywords: ['epistaine', 'upa epistaine', 'epistaine upa'], sell: 500, pref: 435, cost: 370 },
    { name: 'UPA Growth Hormone 100iu', keywords: ['growth hormone', 'upa growth hormone', 'growth hormone upa', 'upa growth hormone 100', 'upa growth hormone 100iu'], sell: 2500, pref: 2250, cost: 2000 },
    { name: 'UPA Growth Hormone 150iu', keywords: ['growth hormone', 'upa growth hormone', 'growth hormone upa', 'upa growth hormone 150', 'upa growth hormone 150iu'], sell: 3100, pref: 2830, cost: 2560 },
    { name: 'UPA Growth Hormone 200iu', keywords: ['growth hormone', 'upa growth hormone', 'growth hormone upa', 'upa growth hormone 200', 'upa growth hormone 200iu'], sell: 3750, pref: 3250, cost: 2750 },
    { name: 'UPA GHRP-6', keywords: ['ghrp 6', 'upa ghrp-6', 'upa ghrp 6', 'ghrp 6 upa'], sell: 410, pref: 340, cost: 270 },
    { name: 'UPA TB500', keywords: ['tb500', 'upa tb500', 'tb500 upa'], sell: 410, pref: 340, cost: 270 },
    { name: 'UPA Melanotan', keywords: ['upa mt2', 'mt2 upa', 'melanotan', 'upa melanotan', 'melanotan upa'], sell: 360, pref: 315, cost: 270 },
    { name: 'UPA HGH Frag', keywords: ['hgh frag', 'upa hgh frag', 'hgh frag upa'], sell: 360, pref: 315, cost: 270 },
    { name: 'UPA Pregnyl/HCG', keywords: ['pregnyl/hcg', 'upa pregnyl/hcg', 'pregnyl/hcg upa'], sell: 410, pref: 340, cost: 270 },
    { name: 'UPA HMG', keywords: ['upa hmg', 'hmg upa'], sell: 410, pref: 345, cost: 280 },
    { name: 'UPA BPC 157', keywords: ['bpc 157', 'upa bpc 157', 'bpc 157 upa'], sell: 410, pref: 345, cost: 280 },
    { name: 'UPA PT 141', keywords: ['pt 141', 'upa pt 141', 'pt 141 upa'], sell: 410, pref: 345, cost: 280 },
    { name: 'UPA IGF-1 LR3', keywords: ['igf 1 lr3', 'upa igf-1 lr3', 'upa igf 1 lr3', 'igf 1 lr3 upa'], sell: 390, pref: 335, cost: 280 },
    { name: 'UPA PEG MGF', keywords: ['peg mgf', 'upa peg mgf', 'peg mgf upa'], sell: 550, pref: 475, cost: 400 },
    { name: 'UPA TB500 & BPC', keywords: ['tb500 & bpc', 'upa tb500 & bpc', 'tb500 & bpc upa'], sell: 750, pref: 630, cost: 510 },
    { name: 'UPA Iopamorellin', keywords: ['iopamorellin', 'upa iopamorellin', 'iopamorellin upa'], sell: 450, pref: 365, cost: 280 },
    { name: 'UPA Tessamorelin', keywords: ['tessamorelin', 'upa tessamorelin', 'tessamorelin upa'], sell: 470, pref: 395, cost: 320 },
    { name: 'UPA Kisspeptin', keywords: ['kisspeptin', 'upa kisspeptin', 'kisspeptin upa'], sell: 530, pref: 425, cost: 320 },
    { name: 'UPA CJC 1295', keywords: ['cjc 1295', 'upa cjc 1295', 'cjc 1295 upa'], sell: 450, pref: 375, cost: 300 },
    { name: 'UPA Melanotan Nasal Spray (Double Dose)', keywords: ['upa mt2', 'mt2 upa', 'melanotan', 'upa melanotan', 'melanotan upa', 'upa melanotan nasal spray'], sell: 750, pref: 660, cost: 570 },
    { name: 'UPA Melanotan Nasal Spray (Single Dose)', keywords: ['upa mt2', 'mt2 upa', 'melanotan', 'upa melanotan', 'melanotan upa', 'upa melanotan nasal spray'], sell: 570, pref: 495, cost: 420 },
    { name: 'UPA Uzempic 2.5mg', keywords: ['uzempic 2.', 'upa uzempic 2.', 'uzempic 2. upa', 'upa uzempic 2.5', 'upa uzempic 2.5mg'], sell: 650, pref: 525, cost: 400 },
    { name: 'UPA Uzempic 5mg', keywords: ['uzempic', 'upa uzempic', 'uzempic upa', 'upa uzempic 5', 'upa uzempic 5mg'], sell: 1200, pref: 905, cost: 610 },
    { name: 'UPA Tirzepitide 30mg', keywords: ['upa tirzep', 'tirzep upa', 'tirzepitide', 'upa tirzepitide', 'tirzepitide upa', 'upa tirzepitide 30'], sell: 2000, pref: 1640, cost: 1280 },
    { name: 'UPA Retatrutide 30mg', keywords: ['upa reta', 'reta upa', 'retatrutide', 'upa retatrutide', 'retatrutide upa', 'upa retatrutide 30'], sell: 2250, pref: 1865, cost: 1480 },
    { name: 'UPA Semaglutide (Uzempic)', keywords: ['upa sema', 'sema upa', 'semaglutide', 'upa semaglutide', 'semaglutide upa', 'upa semaglutide (uzempic)'], sell: 1500, pref: 1290, cost: 1080 },
    { name: 'UPA Tirzepitide 30mg', keywords: ['upa tirzep', 'tirzep upa', 'tirzepitide', 'upa tirzepitide', 'tirzepitide upa', 'upa tirzepitide 30'], sell: 2400, pref: 1990, cost: 1580 },
    { name: 'UPA Retatrutide 30mg', keywords: ['upa reta', 'reta upa', 'retatrutide', 'upa retatrutide', 'retatrutide upa', 'upa retatrutide 30'], sell: 2800, pref: 2300, cost: 1800 },
    // NOVA
    { name: 'NOVA Test Suspension', keywords: ['test sus sion', 'nova test sus sion', 'test sus sion nova', 'nova test suspension'], sell: 420, pref: 380, cost: 340 },
    { name: 'NOVA Winstrol Inject', keywords: ['winstrol', 'nova winny', 'winny nova', 'nova winstrol', 'winstrol nova', 'nova winstrol inject'], sell: 420, pref: 385, cost: 350 },
    { name: 'NOVA Testosterone Acetate', keywords: ['testosterone acetate', 'nova testosterone acetate', 'testosterone acetate nova'], sell: 360, pref: 320, cost: 280 },
    { name: 'NOVA Sustanon', keywords: ['sustanon', 'nova sust', 'sust nova', 'nova sustanon', 'sustanon nova'], sell: 460, pref: 395, cost: 330 },
    { name: 'NOVA Testosterone Propionate', keywords: ['nova test prop', 'test prop nova', 'testosterone propionate', 'nova testosterone propionate', 'testosterone propionate nova'], sell: 380, pref: 330, cost: 280 },
    { name: 'NOVA Testosterone Cypionate', keywords: ['nova test cyp', 'test cyp nova', 'testosterone cypionate', 'nova testosterone cypionate', 'testosterone cypionate nova'], sell: 420, pref: 355, cost: 290 },
    { name: 'NOVA Testosterone Enanthate', keywords: ['nova test e', 'test e nova', 'testosterone enanthate', 'nova testosterone enanthate', 'testosterone enanthate nova'], sell: 420, pref: 365, cost: 310 },
    { name: 'NOVA Libido', keywords: ['libido', 'nova libido', 'libido nova'], sell: 420, pref: 380, cost: 340 },
    { name: 'NOVA Masteron Propionate', keywords: ['nova mast prop', 'mast prop nova', 'masteron propionate', 'nova masteron propionate', 'masteron propionate nova'], sell: 650, pref: 575, cost: 500 },
    { name: 'NOVA Masteron Enanthate', keywords: ['nova mast e', 'mast e nova', 'masteron enanthate', 'nova masteron enanthate', 'masteron enanthate nova'], sell: 670, pref: 635, cost: 600 },
    { name: 'NOVA Equipoise', keywords: ['nova eq', 'eq nova', 'equipoise', 'nova equipoise', 'equipoise nova'], sell: 660, pref: 560, cost: 460 },
    { name: 'NOVA NPP', keywords: ['nova npp', 'npp nova'], sell: 410, pref: 375, cost: 340 },
    { name: 'NOVA Deca 300', keywords: ['deca 300', 'nova deca 300', 'deca 300 nova'], sell: 540, pref: 505, cost: 470 },
    { name: 'NOVA Primabolan', keywords: ['nova primo', 'primo nova', 'primabolan', 'nova primabolan', 'primabolan nova'], sell: 800, pref: 725, cost: 650 },
    { name: 'NOVA Trenbolone Acetate', keywords: ['nova tren ace', 'tren ace nova', 'trenbolone acetate', 'nova trenbolone acetate', 'trenbolone acetate nova'], sell: 550, pref: 500, cost: 450 },
    { name: 'NOVA Trenbolone Enanthate', keywords: ['nova tren e', 'tren e nova', 'trenbolone enanthate', 'nova trenbolone enanthate', 'trenbolone enanthate nova'], sell: 680, pref: 640, cost: 600 },
    { name: 'NOVA Tren Hex', keywords: ['tren hex', 'nova tren hex', 'tren hex nova'], sell: 640, pref: 590, cost: 540 },
    { name: 'NOVA DHB 100mg', keywords: ['nova dhb', 'dhb nova', 'nova dhb 100', 'nova dhb 100mg'], sell: 450, pref: 415, cost: 380 },
    { name: 'NOVA B-Complex', keywords: ['b complex', 'nova b-complex', 'nova b complex', 'b complex nova'], sell: 140, pref: 120, cost: 100 },
    { name: 'NOVA B12 Injection', keywords: ['b12 ion', 'nova b12 ion', 'b12 ion nova', 'nova b12 injection'], sell: 160, pref: 135, cost: 110 },
    { name: 'NOVA L-Carnitine Inject', keywords: ['nova l-carn', 'l-carn nova', 'l carnitine', 'nova l carnitine', 'l carnitine nova', 'nova l-carnitine inject'], sell: 420, pref: 360, cost: 300 },
    { name: 'NOVA Yohimbine inject', keywords: ['yohimbine', 'nova yohimbine', 'yohimbine nova', 'nova yohimbine inject'], sell: 330, pref: 305, cost: 280 },
    { name: 'NOVA Clenbuterol Inject', keywords: ['nova clen', 'clen nova', 'clenbuterol', 'nova clenbuterol', 'clenbuterol nova', 'nova clenbuterol inject'], sell: 360, pref: 315, cost: 270 },
    { name: 'NOVA Helious Inject', keywords: ['helious', 'nova helious', 'helious nova', 'nova helious inject'], sell: 360, pref: 315, cost: 270 },
    { name: 'NOVA Gains 600', keywords: ['gains 600', 'nova gains 600', 'gains 600 nova'], sell: 750, pref: 675, cost: 600 },
    { name: 'NOVA Ripped 300', keywords: ['ripped 300', 'nova ripped 300', 'ripped 300 nova'], sell: 750, pref: 660, cost: 570 },
    { name: 'NOVA Size 500', keywords: ['size 500', 'nova size 500', 'size 500 nova'], sell: 750, pref: 685, cost: 620 },
    { name: 'NOVA Test Combo 500', keywords: ['test combo 500', 'nova test combo 500', 'test combo 500 nova'], sell: 600, pref: 510, cost: 420 },
    { name: 'NOVA Super Test 450', keywords: ['super test 450', 'nova super test 450', 'super test 450 nova'], sell: 600, pref: 490, cost: 380 },
    { name: 'NOVA Dianabol 10mg', keywords: ['dianabol', 'nova dbol', 'dbol nova', 'nova dianabol', 'dianabol nova', 'nova dianabol 10'], sell: 180, pref: 160, cost: 140 },
    { name: 'NOVA Dianabol 50mg', keywords: ['dianabol', 'nova dbol', 'dbol nova', 'nova dianabol', 'dianabol nova', 'nova dianabol 50'], sell: 420, pref: 390, cost: 360 },
    { name: 'NOVA Anapolin 25mg', keywords: ['anapolin', 'nova anap', 'anap nova', 'nova anapolin', 'anapolin nova', 'nova anapolin 25'], sell: 330, pref: 300, cost: 270 },
    { name: 'NOVA Anapolin 50mg', keywords: ['anapolin', 'nova anap', 'anap nova', 'nova anapolin', 'anapolin nova', 'nova anapolin 50'], sell: 400, pref: 360, cost: 320 },
    { name: 'NOVA Turanabol', keywords: ['nova tbol', 'tbol nova', 'turanabol', 'nova turanabol', 'turanabol nova'], sell: 270, pref: 245, cost: 220 },
    { name: 'NOVA Winstrol 10mg', keywords: ['winstrol', 'nova winny', 'winny nova', 'nova winstrol', 'winstrol nova', 'nova winstrol 10'], sell: 230, pref: 190, cost: 150 },
    { name: 'NOVA Winstrol 50mg', keywords: ['winstrol', 'nova winny', 'winny nova', 'nova winstrol', 'winstrol nova', 'nova winstrol 50'], sell: 450, pref: 410, cost: 370 },
    { name: 'NOVA Anavar 10mg', keywords: ['anavar', 'nova var', 'var nova', 'nova anavar', 'anavar nova', 'nova anavar 10'], sell: 420, pref: 380, cost: 340 },
    { name: 'NOVA Lady Var', keywords: ['lady var', 'nova lady var', 'lady var nova'], sell: 280, pref: 240, cost: 200 },
    { name: 'NOVA DHB 10mg', keywords: ['nova dhb', 'dhb nova', 'nova dhb 10', 'nova dhb 10mg'], sell: 380, pref: 350, cost: 320 },
    { name: 'NOVA Anavar 50mg', keywords: ['anavar', 'nova var', 'var nova', 'nova anavar', 'anavar nova', 'nova anavar 50'], sell: 680, pref: 645, cost: 610 },
    { name: 'NOVA Clenbuterol 40mcg', keywords: ['nova clen', 'clen nova', 'clenbuterol', 'nova clenbuterol', 'clenbuterol nova', 'nova clenbuterol 40'], sell: 420, pref: 360, cost: 300 },
    { name: 'NOVA Clenbuterol 40mcg', keywords: ['nova clen', 'clen nova', 'clenbuterol', 'nova clenbuterol', 'clenbuterol nova', 'nova clenbuterol 40'], sell: 230, pref: 195, cost: 160 },
    { name: 'NOVA Sibutraslim', keywords: ['sibutraslim', 'nova sibutraslim', 'sibutraslim nova'], sell: 370, pref: 335, cost: 300 },
    { name: 'NOVA Clen Lean (Clen + Tesofensine)', keywords: ['clen lean', 'nova clen lean', 'clen lean nova', 'nova clen lean (clen + tesofensine)'], sell: 300, pref: 260, cost: 220 },
    { name: 'NOVA T3', keywords: ['nova t3', 't3 nova'], sell: 220, pref: 180, cost: 140 },
    { name: 'NOVA CYT3', keywords: ['nova cyt3', 'cyt3 nova'], sell: 220, pref: 185, cost: 150 },
    { name: 'NOVA HeloTest', keywords: ['helotest', 'nova helotest', 'helotest nova'], sell: 740, pref: 680, cost: 620 },
    { name: 'NOVA Primobolan', keywords: ['nova primo', 'primo nova', 'primobolan', 'nova primobolan', 'primobolan nova'], sell: 750, pref: 650, cost: 550 },
    { name: 'NOVA Proviron 25mg', keywords: ['proviron', 'nova proviron', 'proviron nova', 'nova proviron 25', 'nova proviron 25mg'], sell: 370, pref: 320, cost: 270 },
    { name: 'NOVA Proviron 50mg', keywords: ['proviron', 'nova proviron', 'proviron nova', 'nova proviron 50', 'nova proviron 50mg'], sell: 450, pref: 400, cost: 350 },
    { name: 'NOVA Clomid', keywords: ['clomid', 'nova clomid', 'clomid nova'], sell: 350, pref: 320, cost: 290 },
    { name: 'NOVA EnClomiphene', keywords: ['enclomiphene', 'nova enclomiphene', 'enclomiphene nova'], sell: 480, pref: 450, cost: 420 },
    { name: 'NOVA Nolvadex', keywords: ['nolvadex', 'nova nolva', 'nolva nova', 'nova nolvadex', 'nolvadex nova'], sell: 350, pref: 310, cost: 270 },
    { name: 'NOVA Moxi Med PCT Combo', keywords: ['moxi med pct combo', 'nova moxi med pct combo', 'moxi med pct combo nova'], sell: 380, pref: 355, cost: 330 },
    { name: 'NOVA Aromasin', keywords: ['aromasin', 'nova aromasin', 'aromasin nova'], sell: 360, pref: 335, cost: 310 },
    { name: 'NOVA Arimadex', keywords: ['arimadex', 'nova adex', 'adex nova', 'nova arimadex', 'arimadex nova'], sell: 380, pref: 355, cost: 330 },
    { name: 'NOVA Femara (Letrozol)', keywords: ['femara', 'nova femara', 'femara nova', 'nova femara (letrozol)'], sell: 380, pref: 340, cost: 300 },
    { name: 'NOVA Yohimbine', keywords: ['yohimbine', 'nova yohimbine', 'yohimbine nova'], sell: 280, pref: 250, cost: 220 },
    { name: 'NOVA Limitless Modafinil', keywords: ['limitless modafinil', 'nova limitless modafinil', 'limitless modafinil nova'], sell: 340, pref: 310, cost: 280 },
    { name: 'NOVA Cialis Daily', keywords: ['cialis daily', 'nova cialis daily', 'cialis daily nova'], sell: 250, pref: 198, cost: 145 },
    { name: 'NOVA Cialis', keywords: ['cialis', 'nova cialis', 'cialis nova'], sell: 280, pref: 230, cost: 180 },
    { name: 'NOVA Viagra', keywords: ['viagra', 'nova viagra', 'viagra nova'], sell: 280, pref: 230, cost: 180 },
    { name: 'NOVA Sex Bombs', keywords: ['sex bombs', 'nova sex bombs', 'sex bombs nova'], sell: 320, pref: 255, cost: 190 },
    { name: 'NOVA Red Libido', keywords: ['red libido', 'nova red libido', 'red libido nova'], sell: 320, pref: 270, cost: 220 },
    { name: 'NOVA Pink Libido', keywords: ['pink libido', 'nova pink libido', 'pink libido nova'], sell: 320, pref: 270, cost: 220 },
    { name: 'NOVA Cardarine', keywords: ['cardarine', 'nova cardarine', 'cardarine nova'], sell: 440, pref: 395, cost: 350 },
    { name: 'NOVA Osterine', keywords: ['osterine', 'nova osterine', 'osterine nova'], sell: 440, pref: 395, cost: 350 },
    { name: 'NOVA Anabolicum', keywords: ['anabolicum', 'nova anabolicum', 'anabolicum nova'], sell: 500, pref: 450, cost: 400 },
    { name: 'NOVA Nutrobol', keywords: ['nutrobol', 'nova nutrobol', 'nutrobol nova'], sell: 500, pref: 450, cost: 400 },
    { name: 'NOVA Testolone - RAD140', keywords: ['testolone rad140', 'nova testolone rad140', 'testolone rad140 nova', 'nova testolone - rad140'], sell: 500, pref: 450, cost: 400 },
    { name: 'NOVA TLB 150 - RAD150', keywords: ['tlb 150 rad150', 'nova tlb 150 rad150', 'tlb 150 rad150 nova', 'nova tlb 150 - rad150'], sell: 500, pref: 450, cost: 400 },
    { name: 'NOVA Andarine S4', keywords: ['andarine s4', 'nova andarine s4', 'andarine s4 nova'], sell: 500, pref: 420, cost: 340 },
    { name: 'NOVA Stenabolic', keywords: ['stenabolic', 'nova stenabolic', 'stenabolic nova'], sell: 500, pref: 430, cost: 360 },
    { name: 'NOVA Myostine - YK11', keywords: ['myostine yk11', 'nova myostine yk11', 'myostine yk11 nova', 'nova myostine - yk11'], sell: 500, pref: 425, cost: 350 },
    { name: 'NOVA OTR-C', keywords: ['otr c', 'nova otr-c', 'nova otr c', 'otr c nova'], sell: 500, pref: 390, cost: 280 },
    { name: 'NOVA Accardrine - AC262', keywords: ['accardrine ac262', 'nova accardrine ac262', 'accardrine ac262 nova', 'nova accardrine - ac262'], sell: 500, pref: 430, cost: 360 },
    { name: 'NOVA Cardilean', keywords: ['cardilean', 'nova cardilean', 'cardilean nova'], sell: 400, pref: 360, cost: 320 },
    { name: 'NOVA Cardosterine', keywords: ['cardosterine', 'nova cardosterine', 'cardosterine nova'], sell: 420, pref: 380, cost: 340 },
    { name: 'NOVA Testolean', keywords: ['testolean', 'nova testolean', 'testolean nova'], sell: 350, pref: 300, cost: 250 },
    { name: 'NOVA Nova Cuts - Fat Loss', keywords: ['nova cuts fat loss', 'nova nova cuts fat loss', 'nova cuts fat loss nova', 'nova nova cuts - fat loss'], sell: 440, pref: 390, cost: 340 },
    { name: 'NOVA Nova Slim - Appetite Suppressant', keywords: ['nova slim appetite suppressant', 'nova nova slim appetite suppressant', 'nova slim appetite suppressant nova', 'nova nova slim - appetite suppressant'], sell: 550, pref: 498, cost: 445 },
    { name: 'NOVA Telmisar - Tesar', keywords: ['tesar', 'telmisar', 'nova tesar', 'nova telmisar'], sell: 350, pref: 300, cost: 250 },
    { name: 'NOVA Limitless SLU-PP', keywords: ['limitless slu pp', 'nova limitless slu-pp', 'nova limitless slu pp', 'limitless slu pp nova'], sell: 480, pref: 440, cost: 400 },
    { name: 'NOVA Limitless Methylene Blue', keywords: ['limitless methylene blue', 'nova limitless methylene blue', 'limitless methylene blue nova'], sell: 350, pref: 270, cost: 190 },
    { name: 'NOVA Selank Nasal Spray', keywords: ['selank', 'nova selank', 'selank nova', 'nova selank nasal spray'], sell: 650, pref: 565, cost: 480 },
    { name: 'NOVA Semax Nasal Spray', keywords: ['semax', 'nova semax', 'semax nova', 'nova semax nasal spray'], sell: 650, pref: 565, cost: 480 },
    { name: 'NOVA IGF-1 LR3', keywords: ['igf 1 lr3', 'nova igf-1 lr3', 'nova igf 1 lr3', 'igf 1 lr3 nova'], sell: 300, pref: 250, cost: 200 },
    { name: 'NOVA IGF-1 DES3', keywords: ['igf 1 des3', 'nova igf-1 des3', 'nova igf 1 des3', 'igf 1 des3 nova'], sell: 300, pref: 265, cost: 230 },
    { name: 'NOVA GHRP-6', keywords: ['ghrp 6', 'nova ghrp-6', 'nova ghrp 6', 'ghrp 6 nova'], sell: 330, pref: 295, cost: 260 },
    { name: 'NOVA CJC with DAC', keywords: ['cjc with dac', 'nova cjc with dac', 'cjc with dac nova'], sell: 330, pref: 295, cost: 260 },
    { name: 'NOVA HGH Frag', keywords: ['hgh frag', 'nova hgh frag', 'hgh frag nova'], sell: 330, pref: 300, cost: 270 },
    { name: 'NOVA MGF', keywords: ['nova mgf', 'mgf nova'], sell: 330, pref: 285, cost: 240 },
    { name: 'NOVA Melanotan 2', keywords: ['nova mt2', 'mt2 nova', 'melanotan 2', 'nova melanotan 2', 'melanotan 2 nova'], sell: 350, pref: 310, cost: 270 },
    { name: 'NOVA HCG/Pregnyl', keywords: ['hcg/pregnyl', 'nova hcg/pregnyl', 'hcg/pregnyl nova'], sell: 410, pref: 350, cost: 290 },
    { name: 'NOVA TB500', keywords: ['tb500', 'nova tb500', 'tb500 nova'], sell: 420, pref: 355, cost: 290 },
    { name: 'NOVA BPC 157', keywords: ['bpc 157', 'nova bpc 157', 'bpc 157 nova'], sell: 420, pref: 355, cost: 290 },
    { name: 'NOVA Ipamorelin', keywords: ['ipamorelin', 'nova ipamorelin', 'ipamorelin nova'], sell: 420, pref: 355, cost: 290 },
    { name: 'NOVA GHRP-2', keywords: ['ghrp 2', 'nova ghrp-2', 'nova ghrp 2', 'ghrp 2 nova'], sell: 300, pref: 265, cost: 230 },
    { name: 'NOVA Regulated MGF', keywords: ['regulated mgf', 'nova regulated mgf', 'regulated mgf nova'], sell: 330, pref: 300, cost: 270 },
    { name: 'NOVA Sermorelin', keywords: ['sermorelin', 'nova sermorelin', 'sermorelin nova'], sell: 400, pref: 345, cost: 290 },
    { name: 'NOVA Tesamorelin', keywords: ['tesamorelin', 'nova tesamorelin', 'tesamorelin nova'], sell: 400, pref: 350, cost: 300 },
    { name: 'NOVA Epitalon', keywords: ['epitalon', 'nova epitalon', 'epitalon nova'], sell: 390, pref: 345, cost: 300 },
    { name: 'NOVA Mots-C', keywords: ['mots c', 'nova mots-c', 'nova mots c', 'mots c nova'], sell: 480, pref: 430, cost: 380 },
    { name: 'NOVA HMG', keywords: ['nova hmg', 'hmg nova'], sell: 400, pref: 355, cost: 310 },
    { name: 'NOVA Oxytocin', keywords: ['oxytocin', 'nova oxytocin', 'oxytocin nova'], sell: 400, pref: 340, cost: 280 },
    { name: 'NOVA Lovers Peptide (PT141)', keywords: ['lovers peptide', 'nova lovers peptide', 'lovers peptide nova', 'nova lovers peptide (pt141)'], sell: 380, pref: 325, cost: 270 },
    { name: 'NOVA Hexarelin', keywords: ['hexarelin', 'nova hexarelin', 'hexarelin nova'], sell: 450, pref: 395, cost: 340 },
    { name: 'NOVA AOD 9064', keywords: ['aod 9064', 'nova aod 9064', 'aod 9064 nova'], sell: 450, pref: 395, cost: 340 },
    { name: 'NOVA Weightloss', keywords: ['weightloss', 'nova weightloss', 'weightloss nova'], sell: 480, pref: 425, cost: 370 },
    { name: 'NOVA SS-31', keywords: ['ss 31', 'nova ss-31', 'nova ss 31', 'ss 31 nova'], sell: 590, pref: 505, cost: 420 },
    { name: 'NOVA Matrix', keywords: ['matrix', 'nova matrix', 'matrix nova'], sell: 590, pref: 510, cost: 430 },
    { name: 'NOVA GHK-cu', keywords: ['ghk cu', 'nova ghk-cu', 'nova ghk cu', 'ghk cu nova'], sell: 480, pref: 400, cost: 320 },
    { name: 'NOVA Anti-Aging', keywords: ['anti aging', 'nova anti-aging', 'nova anti aging', 'anti aging nova'], sell: 520, pref: 485, cost: 450 },
    { name: 'NOVA KPV', keywords: ['nova kpv', 'kpv nova'], sell: 480, pref: 410, cost: 340 },
    { name: 'NOVA Kisspeptin', keywords: ['kisspeptin', 'nova kisspeptin', 'kisspeptin nova'], sell: 540, pref: 480, cost: 420 },
    { name: 'NOVA 5-Amino-1-MQ', keywords: ['5 amino 1 mq', 'nova 5-amino-1-mq', 'nova 5 amino 1 mq', '5 amino 1 mq nova'], sell: 600, pref: 530, cost: 460 },
    { name: 'NOVA Shredded', keywords: ['shredded', 'nova shredded', 'shredded nova'], sell: 680, pref: 615, cost: 550 },
    { name: 'NOVA Wolverine', keywords: ['wolverine', 'nova wolverine', 'wolverine nova'], sell: 750, pref: 635, cost: 520 },
    { name: 'NOVA Predator', keywords: ['predator', 'nova predator', 'predator nova'], sell: 600, pref: 540, cost: 480 },
    { name: 'NOVA Thymosin Alpha 1', keywords: ['thymosin alpha 1', 'nova thymosin alpha 1', 'thymosin alpha 1 nova'], sell: 600, pref: 530, cost: 460 },
    { name: 'NOVA Night Surge', keywords: ['night surge', 'nova night surge', 'night surge nova'], sell: 550, pref: 515, cost: 480 },
    { name: 'NOVA Glow', keywords: ['nova glow', 'glow nova'], sell: 850, pref: 695, cost: 540 },
    { name: 'NOVA Diablo', keywords: ['diablo', 'nova diablo', 'diablo nova'], sell: 750, pref: 645, cost: 540 },
    { name: 'NOVA KLOW', keywords: ['nova klow', 'klow nova'], sell: 1450, pref: 1300, cost: 1150 },
    { name: 'NOVA FST-334', keywords: ['fst 334', 'nova fst-334', 'nova fst 334', 'fst 334 nova'], sell: 1700, pref: 1550, cost: 1400 },
    { name: 'NOVA IGF-1 LR3 Kit', keywords: ['igf 1 lr3', 'nova igf 1 lr3', 'igf 1 lr3 nova', 'nova igf-1 lr3 kit'], sell: 1500, pref: 1425, cost: 1350 },
    { name: 'NOVA Epitalon Kit', keywords: ['epitalon', 'nova epitalon', 'epitalon nova', 'nova epitalon kit'], sell: 1700, pref: 1525, cost: 1350 },
    { name: 'NOVA Mots-C Kit', keywords: ['mots c', 'nova mots c', 'mots c nova', 'nova mots-c kit'], sell: 3200, pref: 2600, cost: 2000 },
    { name: 'NOVA Novatropin Kit (100iu)', keywords: ['novatropin', 'nova novatropin', 'novatropin nova', 'nova novatropin kit', 'nova novatropin kit (100)', 'nova novatropin kit (100iu)'], sell: 2500, pref: 2125, cost: 1750 },
    { name: 'NOVA Novatropin Kit (160iu)', keywords: ['novatropin', 'nova novatropin', 'novatropin nova', 'nova novatropin kit', 'nova novatropin kit (160)', 'nova novatropin kit (160iu)'], sell: 3500, pref: 3150, cost: 2800 },
    // PHARMATECH
    { name: 'Pharmatech Test Propionate', keywords: ['ptech test prop', 'test prop ptech', 'test propionate', 'pharmatech test prop', 'ptech test propionate', 'test propionate ptech'], sell: 350, pref: 300, cost: 250 },
    { name: 'Pharmatech Test Enanthate', keywords: ['ptech test e', 'test e ptech', 'test enanthate', 'pharmatech test e', 'ptech test enanthate', 'test enanthate ptech'], sell: 420, pref: 345, cost: 270 },
    { name: 'Pharmatech Test Cypionate', keywords: ['ptech test cyp', 'test cyp ptech', 'test cypionate', 'pharmatech test cyp', 'ptech test cypionate', 'test cypionate ptech'], sell: 420, pref: 345, cost: 270 },
    { name: 'Pharmatech Sustanon', keywords: ['sustanon', 'ptech sust', 'sust ptech', 'ptech sustanon', 'sustanon ptech', 'pharmatech sust'], sell: 420, pref: 365, cost: 310 },
    { name: 'Pharmatech Nebido', keywords: ['nebido', 'ptech nebido', 'nebido ptech', 'pharmatech nebido'], sell: 450, pref: 380, cost: 310 },
    { name: 'Pharmatech Test Mix', keywords: ['test mix', 'ptech test mix', 'test mix ptech', 'pharmatech test mix'], sell: 500, pref: 420, cost: 340 },
    { name: 'Pharmatech Tren Ace', keywords: ['tren ace', 'ptech tren ace', 'tren ace ptech', 'pharmatech tren ace'], sell: 540, pref: 445, cost: 350 },
    { name: 'Pharmatech Tren E', keywords: ['tren e', 'ptech tren e', 'tren e ptech', 'pharmatech tren e'], sell: 650, pref: 560, cost: 470 },
    { name: 'Pharmatech Deca 300', keywords: ['deca 300', 'ptech deca 300', 'deca 300 ptech', 'pharmatech deca 300'], sell: 550, pref: 465, cost: 380 },
    { name: 'Pharmatech Deca NPP', keywords: ['deca npp', 'ptech deca npp', 'deca npp ptech', 'pharmatech deca npp'], sell: 430, pref: 380, cost: 330 },
    { name: 'Pharmatech Equipoise', keywords: ['ptech eq', 'eq ptech', 'equipoise', 'pharmatech eq', 'ptech equipoise', 'equipoise ptech'], sell: 550, pref: 490, cost: 430 },
    { name: 'Pharmatech Masteron Propionate', keywords: ['ptech mast prop', 'mast prop ptech', 'masteron propionate', 'pharmatech mast prop', 'ptech masteron propionate', 'masteron propionate ptech'], sell: 600, pref: 490, cost: 380 },
    { name: 'Pharmatech Masteron Enanthate', keywords: ['ptech mast e', 'mast e ptech', 'pharmatech mast e', 'masteron enanthate', 'ptech masteron enanthate', 'masteron enanthate ptech'], sell: 750, pref: 615, cost: 480 },
    { name: 'Pharmatech Primobolan', keywords: ['primobolan', 'ptech primo', 'primo ptech', 'ptech primobolan', 'primobolan ptech', 'pharmatech primo'], sell: 850, pref: 765, cost: 680 },
    { name: 'Pharmatech Clomid', keywords: ['clomid', 'ptech clomid', 'clomid ptech', 'pharmatech clomid'], sell: 300, pref: 260, cost: 220 },
    { name: 'Pharmatech Winstrol 10mg', keywords: ['winstrol', 'ptech winny', 'winny ptech', 'ptech winstrol', 'winstrol ptech', 'pharmatech winny'], sell: 240, pref: 205, cost: 170 },
    { name: 'Pharmatech Winstrol 50mg', keywords: ['winstrol', 'ptech winny', 'winny ptech', 'ptech winstrol', 'winstrol ptech', 'pharmatech winny'], sell: 400, pref: 360, cost: 320 },
    { name: 'Pharmatech Anapolin', keywords: ['anapolin', 'ptech anap', 'anap ptech', 'ptech anapolin', 'anapolin ptech', 'pharmatech anap'], sell: 390, pref: 350, cost: 310 },
    { name: 'Pharmatech Dianabol 50mg', keywords: ['dianabol', 'ptech dbol', 'dbol ptech', 'ptech dianabol', 'dianabol ptech', 'pharmatech dbol'], sell: 390, pref: 350, cost: 310 },
    { name: 'Pharmatech Anavar 50mg', keywords: ['anavar', 'ptech var', 'var ptech', 'ptech anavar', 'anavar ptech', 'pharmatech var'], sell: 800, pref: 760, cost: 720 },
    { name: 'Pharmatech Yohimbine Tabs', keywords: ['yohimbine tabs', 'ptech yohimbine tabs', 'yohimbine tabs ptech', 'pharmatech yohimbine tabs'], sell: 260, pref: 230, cost: 200 },
    { name: 'Pharmatech Cialis 20mg', keywords: ['cialis', 'ptech cialis', 'cialis ptech', 'ptech cialis 20', 'ptech cialis 20mg', 'pharmatech cialis'], sell: 310, pref: 270, cost: 230 },
    { name: 'Pharmatech Anavar 20mg', keywords: ['anavar', 'ptech var', 'var ptech', 'ptech anavar', 'anavar ptech', 'pharmatech var'], sell: 450, pref: 415, cost: 380 },
    { name: 'Pharmatech Clenbuterol', keywords: ['ptech clen', 'clen ptech', 'clenbuterol', 'pharmatech clen', 'ptech clenbuterol', 'clenbuterol ptech'], sell: 220, pref: 195, cost: 170 },
    { name: 'Pharmatech Proviron', keywords: ['proviron', 'ptech proviron', 'proviron ptech', 'pharmatech proviron'], sell: 330, pref: 280, cost: 230 },
    { name: 'Pharmatech Nolvadex', keywords: ['nolvadex', 'ptech nolva', 'nolva ptech', 'ptech nolvadex', 'nolvadex ptech', 'pharmatech nolva'], sell: 310, pref: 270, cost: 230 },
    { name: 'Pharmatech Supadrol', keywords: ['supadrol', 'ptech sdrol', 'sdrol ptech', 'ptech supadrol', 'supadrol ptech', 'pharmatech sdrol'], sell: 340, pref: 295, cost: 250 },
    { name: 'Pharmatech Dianabol 10mg', keywords: ['dianabol', 'ptech dbol', 'dbol ptech', 'ptech dianabol', 'dianabol ptech', 'pharmatech dbol'], sell: 190, pref: 160, cost: 130 },
    { name: 'Pharmatech T4', keywords: ['ptech t4', 't4 ptech', 'pharmatech t4'], sell: 240, pref: 225, cost: 210 },
    { name: 'Pharmatech Zaditen', keywords: ['zaditen', 'ptech zaditen', 'zaditen ptech', 'pharmatech zaditen'], sell: 240, pref: 225, cost: 210 },
    { name: 'Pharmatech T3', keywords: ['ptech t3', 't3 ptech', 'pharmatech t3'], sell: 240, pref: 205, cost: 170 },
    { name: 'Pharmatech Turinabol', keywords: ['turinabol', 'ptech tbol', 'tbol ptech', 'ptech turinabol', 'turinabol ptech', 'pharmatech tbol'], sell: 320, pref: 285, cost: 250 },
    { name: 'Pharmatech Cialis 5mg', keywords: ['cialis', 'ptech cialis', 'cialis ptech', 'ptech cialis 5', 'ptech cialis 5mg', 'pharmatech cialis'], sell: 200, pref: 170, cost: 140 },
    { name: 'Pharmatech Growth Hormone Kit (100iu)', keywords: ['growth hormone', 'ptech growth hormone', 'growth hormone ptech', 'ptech growth hormone kit', 'pharmatech growth hormone', 'ptech growth hormone kit (100)'], sell: 2700, pref: 2450, cost: 2200 },
    { name: 'Pharmatech HGH Frag', keywords: ['hgh frag', 'ptech hgh frag', 'hgh frag ptech', 'pharmatech hgh frag'], sell: 500, pref: 445, cost: 390 },
    { name: 'Pharmatech IGF-1', keywords: ['igf 1', 'ptech igf-1', 'ptech igf 1', 'igf 1 ptech', 'pharmatech igf 1'], sell: 410, pref: 360, cost: 310 },
    { name: 'Pharmatech Melanotan II', keywords: ['ptech mt2', 'mt2 ptech', 'melanotan ii', 'pharmatech mt2', 'ptech melanotan ii', 'melanotan ii ptech'], sell: 410, pref: 355, cost: 300 },
    { name: 'Pharmatech CJC', keywords: ['ptech cjc', 'cjc ptech', 'pharmatech cjc'], sell: 410, pref: 355, cost: 300 },
    { name: 'Pharmatech GHRP-6', keywords: ['ghrp 6', 'ptech ghrp-6', 'ptech ghrp 6', 'ghrp 6 ptech', 'pharmatech ghrp 6'], sell: 410, pref: 355, cost: 300 },
    { name: 'Pharmatech TB500', keywords: ['tb500', 'ptech tb500', 'tb500 ptech', 'pharmatech tb500'], sell: 420, pref: 375, cost: 330 },
    { name: 'Pharmatech BPC-157', keywords: ['bpc 157', 'ptech bpc-157', 'ptech bpc 157', 'bpc 157 ptech', 'pharmatech bpc 157'], sell: 420, pref: 375, cost: 330 },
    { name: 'Pharmatech Lovers Peptide (PT141)', keywords: ['lovers peptide', 'ptech lovers peptide', 'lovers peptide ptech', 'pharmatech lovers peptide', 'ptech lovers peptide (pt141)'], sell: 410, pref: 370, cost: 330 },
    // KEIFEI
    { name: 'Keifei Test Suspension 50', keywords: ['test sus sion 50', 'kei test sus sion 50', 'keifei test sus sion 50', 'test sus sion 50 keifei', 'keifei test suspension 50'], sell: 700, pref: 650, cost: 600 },
    { name: 'Keifei Test Mix 325', keywords: ['test mix 325', 'kei test mix 325', 'keifei test mix 325', 'test mix 325 keifei'], sell: 620, pref: 575, cost: 530 },
    { name: 'Keifei Sustanon 250', keywords: ['kei sust', 'keifei sust', 'sust keifei', 'sustanon 250', 'kei sustanon 250', 'keifei sustanon 250'], sell: 600, pref: 550, cost: 500 },
    { name: 'Keifei Test C 250', keywords: ['test c 250', 'kei test c 250', 'keifei test c 250', 'test c 250 keifei'], sell: 600, pref: 550, cost: 500 },
    { name: 'Keifei Test E 250', keywords: ['keifei test e', 'kei test e', 'keifei test e 250'], sell: 600, pref: 550, cost: 500 },
    { name: 'Keifei Test Prop 100', keywords: ['test prop 100', 'kei test prop 100', 'keifei test prop 100', 'test prop 100 keifei'], sell: 420, pref: 385, cost: 350 },
    { name: 'Keifei Masteron P 100 (Fast)', keywords: ['masteron p 100', 'kei masteron p 100', 'keifei masteron p 100', 'masteron p 100 keifei', 'keifei masteron p 100 (fast)'], sell: 850, pref: 795, cost: 740 },
    { name: 'Keifei Masteron E 200 (Slow)', keywords: ['masteron e 200', 'kei masteron e 200', 'keifei masteron e 200', 'masteron e 200 keifei', 'keifei masteron e 200 (slow)'], sell: 1450, pref: 1350, cost: 1250 },
    { name: 'Keifei Equipoise 250', keywords: ['kei eq', 'keifei eq', 'eq keifei', 'equipoise 250', 'kei equipoise 250', 'keifei equipoise 250'], sell: 750, pref: 700, cost: 650 },
    { name: 'Keifei Winstrol Inj 50', keywords: ['kei winny', 'keifei winny', 'winny keifei', 'winstrol inj 50', 'kei winstrol inj 50', 'keifei winstrol inj 50'], sell: 680, pref: 635, cost: 590 },
    { name: 'Keifei Deca 100 (Fast) NPP', keywords: ['deca 100 npp', 'kei deca 100 npp', 'keifei deca 100 npp', 'deca 100 npp keifei', 'keifei deca 100 (fast) npp'], sell: 650, pref: 590, cost: 530 },
    { name: 'Keifei Deca 250 (Slow)', keywords: ['deca 250', 'kei deca 250', 'keifei deca 250', 'deca 250 keifei', 'keifei deca 250 (slow)'], sell: 850, pref: 795, cost: 740 },
    { name: 'Keifei Deca Blend 300 (mix)', keywords: ['deca blend 300', 'kei deca blend 300', 'keifei deca blend 300', 'deca blend 300 keifei', 'keifei deca blend 300 (mix)'], sell: 920, pref: 860, cost: 800 },
    { name: 'Keifei Primobolin 100', keywords: ['primobolin 100', 'kei primobolin 100', 'keifei primobolin 100', 'primobolin 100 keifei'], sell: 1400, pref: 1325, cost: 1250 },
    { name: 'Keifei Tren A 100 (Fast)', keywords: ['tren a 100', 'kei tren a 100', 'keifei tren a 100', 'tren a 100 keifei', 'keifei tren a 100 (fast)'], sell: 850, pref: 795, cost: 740 },
    { name: 'Keifei Tren E 100 (Slow)', keywords: ['kei tren e', 'tren e 100', 'keifei tren e', 'tren e keifei', 'kei tren e 100', 'keifei tren e 100'], sell: 850, pref: 795, cost: 740 },
    { name: 'Keifei Tren Hex 100 (Very Slow)', keywords: ['kei tren hex', 'tren hex 100', 'keifei tren hex', 'tren hex keifei', 'kei tren hex 100', 'keifei tren hex 100'], sell: 1300, pref: 1200, cost: 1100 },
    { name: 'Keifei Tren Blend 200 (mix)', keywords: ['tren blend 200', 'kei tren blend 200', 'keifei tren blend 200', 'tren blend 200 keifei', 'keifei tren blend 200 (mix)'], sell: 1450, pref: 1350, cost: 1250 },
    { name: 'Keifei Ment 100', keywords: ['ment 100', 'kei ment 100', 'keifei ment 100', 'ment 100 keifei'], sell: 1600, pref: 1490, cost: 1380 },
    { name: 'Keifei Growth Hormone Pen - Keifeitropin 36iu', keywords: ['growth hormone keifeitropin', 'kei growth hormone keifeitropin', 'keifei growth hormone keifeitropin', 'growth hormone keifeitropin keifei', 'keifei growth hormone pen - keifeitropin 36', 'keifei growth hormone pen - keifeitropin 36iu'], sell: 1650, pref: 1525, cost: 1400 },
    { name: 'Keifei Growth Hormone - Keifeitropin', keywords: ['growth hormone keifeitropin', 'kei growth hormone keifeitropin', 'keifei growth hormone keifeitropin', 'growth hormone keifeitropin keifei', 'keifei growth hormone - keifeitropin'], sell: 3200, pref: 3000, cost: 2800 },
    { name: 'Keifei HCG (Progona 5000)', keywords: ['kei hcg', 'keifei hcg', 'hcg keifei', 'keifei hcg (progona 5000)'], sell: 1150, pref: 1050, cost: 950 },
    { name: 'Keifei Ozempic Pen', keywords: ['ozempic', 'kei ozempic', 'keifei ozempic', 'ozempic keifei', 'keifei ozempic pen'], sell: 1450, pref: 1350, cost: 1250 },
    { name: 'Keifei Tirzepatide 10mg - Mounjaro', keywords: ['kei tirzep', 'keifei tirzep', 'tirzep keifei', 'tirzepatide mounjaro', 'kei tirzepatide mounjaro', 'keifei tirzepatide mounjaro'], sell: 2100, pref: 1950, cost: 1800 },
    { name: 'Keifei MGF', keywords: ['kei mgf', 'keifei mgf', 'mgf keifei'], sell: 1150, pref: 1050, cost: 950 },
    { name: 'Keifei IGF1LR3', keywords: ['igf1lr3', 'kei igf1lr3', 'keifei igf1lr3', 'igf1lr3 keifei'], sell: 1150, pref: 1050, cost: 950 },
    { name: 'Keifei GHRP6 (Water not included!)', keywords: ['ghrp6', 'kei ghrp6', 'keifei ghrp6', 'ghrp6 keifei', 'keifei ghrp6 (water not included!)'], sell: 1950, pref: 1825, cost: 1700 },
    { name: 'Keifei CJC (Water not included!)', keywords: ['kei cjc', 'keifei cjc', 'cjc keifei', 'keifei cjc (water not included!)'], sell: 3100, pref: 2920, cost: 2740 },
    { name: 'Keifei MT2 - Melanotan 2', keywords: ['kei mt2', 'keifei mt2', 'mt2 keifei', 'mt2 melanotan 2', 'kei mt2 melanotan 2', 'keifei mt2 melanotan 2'], sell: 480, pref: 440, cost: 400 },
    { name: 'Keifei Lover\'s Peptide - PT 141', keywords: ['lover\'s peptide pt 141', 'kei lover\'s peptide pt 141', 'keifei lover\'s peptide pt 141', 'lover\'s peptide pt 141 keifei', 'keifei lover\'s peptide - pt 141'], sell: 660, pref: 620, cost: 580 },
    { name: 'Keifei BPC-157', keywords: ['bpc 157', 'kei bpc 157', 'keifei bpc-157', 'keifei bpc 157', 'bpc 157 keifei'], sell: 1500, pref: 1410, cost: 1320 },
    { name: 'Keifei HGH Fragment', keywords: ['hgh fragment', 'kei hgh fragment', 'keifei hgh fragment', 'hgh fragment keifei'], sell: 980, pref: 915, cost: 850 },
    { name: 'Keifei TB 500', keywords: ['tb 500', 'kei tb 500', 'keifei tb 500', 'tb 500 keifei'], sell: 2300, pref: 2160, cost: 2020 },
    { name: 'Keifei Dianabol', keywords: ['kei dbol', 'dianabol', 'keifei dbol', 'dbol keifei', 'kei dianabol', 'keifei dianabol'], sell: 340, pref: 310, cost: 280 },
    { name: 'Keifei Anapolon', keywords: ['anapolon', 'kei anapolon', 'keifei anapolon', 'anapolon keifei'], sell: 720, pref: 665, cost: 610 },
    { name: 'Keifei Turanabol', keywords: ['kei tbol', 'turanabol', 'keifei tbol', 'tbol keifei', 'kei turanabol', 'keifei turanabol'], sell: 940, pref: 880, cost: 820 },
    { name: 'Keifei Winstrol', keywords: ['winstrol', 'kei winny', 'kei winstrol', 'keifei winny', 'winny keifei', 'keifei winstrol'], sell: 400, pref: 360, cost: 320 },
    { name: 'Keifei Anavar', keywords: ['anavar', 'kei var', 'kei anavar', 'keifei var', 'var keifei', 'keifei anavar'], sell: 960, pref: 860, cost: 780 },
    { name: 'Keifei Clenbuterol', keywords: ['kei clen', 'keifei clen', 'clen keifei', 'clenbuterol', 'kei clenbuterol', 'keifei clenbuterol'], sell: 340, pref: 310, cost: 280 },
    { name: 'Keifei T3', keywords: ['kei t3', 'keifei t3', 't3 keifei'], sell: 340, pref: 310, cost: 280 },
    { name: 'Keifei Halotestin', keywords: ['halotestin', 'kei halotestin', 'keifei halotestin', 'halotestin keifei'], sell: 1300, pref: 1210, cost: 1120 },
    { name: 'Keifei M 1 Tesbol', keywords: ['m 1 tesbol', 'kei m 1 tesbol', 'keifei m 1 tesbol', 'm 1 tesbol keifei'], sell: 540, pref: 500, cost: 460 },
    { name: 'Keifei Cialis Daily (New!)', keywords: ['cialis daily', 'kei cialis daily', 'keifei cialis daily', 'cialis daily keifei', 'keifei cialis daily (new!)'], sell: 400, pref: 360, cost: 320 },
    { name: 'Keifei Proviron', keywords: ['proviron', 'kei proviron', 'keifei proviron', 'proviron keifei'], sell: 1100, pref: 1000, cost: 900 },
    { name: 'Keifei Clomid', keywords: ['clomid', 'kei clomid', 'keifei clomid', 'clomid keifei'], sell: 840, pref: 780, cost: 720 },
    { name: 'Keifei Tamoxofine (Nolvadex)', keywords: ['kei nolva', 'tamoxofine', 'keifei nolva', 'nolva keifei', 'kei tamoxofine', 'keifei tamoxofine'], sell: 450, pref: 420, cost: 390 },
    { name: 'Keifei Aromasin (Exemestic)', keywords: ['aromasin', 'kei aromasin', 'keifei aromasin', 'aromasin keifei', 'keifei aromasin (exemestic)'], sell: 600, pref: 550, cost: 500 },
    { name: 'Keifei Arimidex', keywords: ['kei adex', 'arimidex', 'keifei adex', 'adex keifei', 'kei arimidex', 'keifei arimidex'], sell: 720, pref: 670, cost: 620 },
    { name: 'Keifei Femara', keywords: ['femara', 'kei femara', 'keifei femara', 'femara keifei'], sell: 550, pref: 500, cost: 450 },
    { name: 'Keifei Cardarine - Endurobol', keywords: ['cardarine endurobol', 'kei cardarine endurobol', 'keifei cardarine endurobol', 'cardarine endurobol keifei', 'keifei cardarine - endurobol'], sell: 450, pref: 415, cost: 380 },
    { name: 'Keifei Ostarine - Ostarinbol', keywords: ['ostarine ostarinbol', 'kei ostarine ostarinbol', 'keifei ostarine ostarinbol', 'ostarine ostarinbol keifei', 'keifei ostarine - ostarinbol'], sell: 420, pref: 385, cost: 350 },
    { name: 'Keifei Nutrobal - Oratropbol', keywords: ['nutrobal oratropbol', 'kei nutrobal oratropbol', 'keifei nutrobal oratropbol', 'nutrobal oratropbol keifei', 'keifei nutrobal - oratropbol'], sell: 620, pref: 570, cost: 520 },
    { name: 'Keifei Ligandrol/Anibolicum - Liganbol', keywords: ['ligandrol/anibolicum liganbol', 'kei ligandrol/anibolicum liganbol', 'keifei ligandrol/anibolicum liganbol', 'ligandrol/anibolicum liganbol keifei', 'keifei ligandrol/anibolicum - liganbol'], sell: 450, pref: 415, cost: 380 },
    { name: 'Keifei Testolone - Testolonebol', keywords: ['testolone testolonebol', 'kei testolone testolonebol', 'keifei testolone testolonebol', 'testolone testolonebol keifei', 'keifei testolone - testolonebol'], sell: 880, pref: 815, cost: 750 },
    // RESET
    { name: 'Reset Re:Pair (TB500)', keywords: ['re:pair', 'reset re:pair', 're:pair reset', 're:pair (tb500)', 'reset re:pair (tb500)'], sell: 410, pref: 350, cost: 290 },
    { name: 'Reset Re:Diate (Melanotan II)', keywords: ['re:diate', 'reset mt2', 'mt2 reset', 'reset re:diate', 're:diate reset', 're:diate (melanotan ii)'], sell: 380, pref: 335, cost: 290 },
    { name: 'Reset Re:Balance (HCG)', keywords: ['re:balance', 'reset re:balance', 're:balance reset', 're:balance (hcg)', 'reset re:balance (hcg)'], sell: 370, pref: 335, cost: 300 },
    { name: 'Reset Re:Cover (BPC 157)', keywords: ['re:cover', 'reset re:cover', 're:cover reset', 're:cover (bpc 157)', 'reset re:cover (bpc 157)'], sell: 410, pref: 350, cost: 290 },
    { name: 'Reset Re:Taliate (MOTS-C)', keywords: ['re:taliate', 'reset re:taliate', 're:taliate reset', 're:taliate (mots-c)', 'reset re:taliate (mots-c)'], sell: 500, pref: 440, cost: 380 },
    { name: 'Reset Re:Shape (Tesamorelin)', keywords: ['re:shape', 'reset re:shape', 're:shape reset', 're:shape (tesamorelin)', 'reset re:shape (tesamorelin)'], sell: 380, pref: 335, cost: 290 },
    { name: 'Reset Re:Glow (GHK-cu)', keywords: ['re:glow', 'reset re:glow', 're:glow reset', 're:glow (ghk-cu)', 'reset re:glow (ghk-cu)'], sell: 450, pref: 390, cost: 330 },
    { name: 'Reset Re:Build (BPC+TB500 Combo)', keywords: ['re:build', 'reset re:build', 're:build reset', 're:build (bpc+tb500 combo)', 'reset re:build (bpc+tb500 combo)'], sell: 750, pref: 635, cost: 520 },
    { name: 'Reset Re:Zempic', keywords: ['re:zempic', 'reset re:zempic', 're:zempic reset'], sell: 1400, pref: 1250, cost: 1100 },
    { name: 'Reset Re:Zepatide', keywords: ['re:zepatide', 'reset re:zepatide', 're:zepatide reset'], sell: 2000, pref: 1675, cost: 1350 },
    { name: 'Reset Re:Tatrutide', keywords: ['re:tatrutide', 'reset re:tatrutide', 're:tatrutide reset'], sell: 2250, pref: 1875, cost: 1500 },
    // PEPTIDE PEN
    { name: 'Peptide Pen Replacement Needles', keywords: ['replacement needles', 'pp replacement needles', 'replacement needles pp'], sell: 100, pref: 80, cost: 60 },
    { name: 'Peptide Pen Melano Glow', keywords: ['melano glow', 'pp melano glow', 'melano glow pp'], sell: 620, pref: 535, cost: 450 },
    { name: 'Peptide Pen Easy Sleep (DSIP)', keywords: ['easy sleep', 'pp easy sleep', 'easy sleep pp', 'pp easy sleep (dsip)'], sell: 650, pref: 585, cost: 520 },
    { name: 'Peptide Pen Lovers Peptide (PT141)', keywords: ['lovers peptide', 'pp lovers peptide', 'lovers peptide pp', 'pp lovers peptide (pt141)'], sell: 750, pref: 655, cost: 560 },
    { name: 'Peptide Pen BPC 157', keywords: ['bpc 157', 'pp bpc 157', 'bpc 157 pp'], sell: 750, pref: 675, cost: 600 },
    { name: 'Peptide Pen Glutathione', keywords: ['glutathione', 'pp glutathione', 'glutathione pp'], sell: 790, pref: 645, cost: 500 },
    { name: 'Peptide Pen Meno-Pause', keywords: ['meno pause', 'pp meno-pause', 'pp meno pause', 'meno pause pp'], sell: 900, pref: 825, cost: 750 },
    { name: 'Peptide Pen Fat Away', keywords: ['fat away', 'pp fat away', 'fat away pp'], sell: 950, pref: 875, cost: 800 },
    { name: 'Peptide Pen Skin Glow', keywords: ['skin glow', 'pp skin glow', 'skin glow pp'], sell: 850, pref: 785, cost: 720 },
    { name: 'Peptide Pen Immune Boost', keywords: ['immune boost', 'pp immune boost', 'immune boost pp'], sell: 680, pref: 615, cost: 550 },
    { name: 'Peptide Pen Lean Dreams', keywords: ['lean dreams', 'pp lean dreams', 'lean dreams pp'], sell: 900, pref: 800, cost: 700 },
    { name: 'Peptide Pen Testagen', keywords: ['testagen', 'pp testagen', 'testagen pp'], sell: 800, pref: 730, cost: 660 },
    { name: 'Peptide Pen Cartalax', keywords: ['cartalax', 'pp cartalax', 'cartalax pp'], sell: 800, pref: 730, cost: 660 },
    { name: 'Peptide Pen Vesugen', keywords: ['vesugen', 'pp vesugen', 'vesugen pp'], sell: 800, pref: 730, cost: 660 },
    { name: 'Peptide Pen SLU-PP 332', keywords: ['slu pp 332', 'pp slu-pp 332', 'pp slu pp 332', 'slu pp 332 pp'], sell: 760, pref: 670, cost: 580 },
    { name: 'Peptide Pen 5-Amino-1-MQ', keywords: ['5 amino 1 mq', 'pp 5-amino-1-mq', 'pp 5 amino 1 mq', '5 amino 1 mq pp'], sell: 820, pref: 710, cost: 600 },
    { name: 'Peptide Pen Cardiogen', keywords: ['cardiogen', 'pp cardiogen', 'cardiogen pp'], sell: 800, pref: 720, cost: 640 },
    { name: 'Peptide Pen Prostamax', keywords: ['prostamax', 'pp prostamax', 'prostamax pp'], sell: 800, pref: 720, cost: 640 },
    { name: 'Peptide Pen Thymogen', keywords: ['thymogen', 'pp thymogen', 'thymogen pp'], sell: 800, pref: 720, cost: 640 },
    { name: 'Peptide Pen NMN', keywords: ['pp nmn', 'nmn pp'], sell: 790, pref: 720, cost: 650 },
    { name: 'Peptide Pen NAD+', keywords: ['pp nad+', 'nad+ pp'], sell: 950, pref: 825, cost: 700 },
    { name: 'Peptide Pen Night Surge', keywords: ['night surge', 'pp night surge', 'night surge pp'], sell: 990, pref: 870, cost: 750 },
    { name: 'Peptide Pen Shredded', keywords: ['shredded', 'pp shredded', 'shredded pp'], sell: 1200, pref: 1050, cost: 900 },
    { name: 'Peptide Pen Limitless', keywords: ['limitless', 'pp limitless', 'limitless pp'], sell: 1050, pref: 935, cost: 820 },
    { name: 'Peptide Pen Lady GH', keywords: ['lady gh', 'pp lady gh', 'lady gh pp'], sell: 1050, pref: 950, cost: 850 },
    { name: 'Peptide Pen Wolverine', keywords: ['wolverine', 'pp wolverine', 'wolverine pp'], sell: 950, pref: 885, cost: 820 },
    { name: 'Peptide Pen Mito-Boost', keywords: ['mito boost', 'pp mito-boost', 'pp mito boost', 'mito boost pp'], sell: 2550, pref: 2050, cost: 1550 },
    { name: 'Peptide Pen Forever Young', keywords: ['forever young', 'pp forever young', 'forever young pp'], sell: 2700, pref: 2250, cost: 1800 },
    { name: 'Peptide Pen MyLife Semaglutide', keywords: ['pp sema', 'sema pp', 'mylife sema', 'mylife semaglutide', 'pp mylife semaglutide', 'mylife semaglutide pp'], sell: 1600, pref: 1400, cost: 1200 },
    { name: 'Peptide Pen MyLife Cagrisema', keywords: ['mylife cagrisema', 'pp mylife cagrisema', 'mylife cagrisema pp', 'mylife mylife cagrisema'], sell: 1750, pref: 1500, cost: 1250 },
    { name: 'Peptide Pen MyLife Tirzepatide', keywords: ['pp tirzep', 'tirzep pp', 'mylife tirzep', 'mylife tirzepatide', 'pp mylife tirzepatide', 'mylife tirzepatide pp'], sell: 2250, pref: 1900, cost: 1550 },
    { name: 'Peptide Pen MyLife Retatrutide Pen', keywords: ['pp reta', 'reta pp', 'mylife reta', 'mylife retatrutide', 'pp mylife retatrutide', 'mylife retatrutide pp'], sell: 2600, pref: 2175, cost: 1750 },
    { name: 'Peptide Pen MyLife NAD 2 Tride', keywords: ['mylife nad 2 tride', 'pp mylife nad 2 tride', 'mylife nad 2 tride pp', 'mylife mylife nad 2 tride'], sell: 2700, pref: 2525, cost: 2350 },
    { name: 'Peptide Pen MyLife Mots-C 2 Tride', keywords: ['mylife mots-c 2 tride', 'mylife mots c 2 tride', 'pp mylife mots-c 2 tride', 'pp mylife mots c 2 tride', 'mylife mots c 2 tride pp', 'mylife mylife mots c 2 tride'], sell: 3300, pref: 3050, cost: 2800 },
    { name: 'Peptide Pen Novatropin 90iu Pen', keywords: ['novatropin', 'pp novatropin', 'novatropin pp', 'pp novatropin 90 pen', 'pp novatropin 90iu pen'], sell: 2500, pref: 2300, cost: 2100 },
    // HEALTHY-U
    { name: 'Healthy-U ECA', keywords: ['eca', 'healthy-u eca', 'eca healthy-u'], sell: 410, pref: 340, cost: 270 },
    { name: 'Healthy-U ECYA', keywords: ['ecya', 'healthy-u ecya', 'ecya healthy-u'], sell: 410, pref: 340, cost: 270 },
    { name: 'Healthy-U Melatonin', keywords: ['melatonin', 'healthy-u melatonin', 'melatonin healthy-u'], sell: 380, pref: 345, cost: 310 },
    { name: 'Healthy-U Orlistat', keywords: ['orlistat', 'healthy-u orlistat', 'orlistat healthy-u'], sell: 380, pref: 350, cost: 320 },
    { name: 'Healthy-U SLU-PP 332', keywords: ['slu-pp 332', 'slu pp 332', 'healthy-u slu-pp 332', 'healthy-u slu pp 332', 'slu pp 332 healthy-u'], sell: 480, pref: 430, cost: 380 },
    { name: 'Healthy-U Max Cut', keywords: ['max cut', 'healthy-u max cut', 'max cut healthy-u'], sell: 750, pref: 665, cost: 580 },
    { name: 'Healthy-U Max Bulk', keywords: ['max bulk', 'healthy-u max bulk', 'max bulk healthy-u'], sell: 900, pref: 825, cost: 750 },
    { name: 'Healthy-U Max Size', keywords: ['max size', 'healthy-u max size', 'max size healthy-u'], sell: 900, pref: 825, cost: 750 },
    // PHARM
    { name: 'Pharm Concerta 18mg', keywords: ['concerta', 'concerta 18', 'concerta 18mg', 'pharm concerta', 'concerta pharm', 'pharm concerta 18'], sell: 1650, pref: 1550, cost: 1450 },
    { name: 'Pharm Concerta 27mg', keywords: ['concerta', 'concerta 27', 'concerta 27mg', 'pharm concerta', 'concerta pharm', 'pharm concerta 27'], sell: 1740, pref: 1620, cost: 1500 },
    { name: 'Pharm Concerta 36mg', keywords: ['concerta', 'concerta 36', 'concerta 36mg', 'pharm concerta', 'concerta pharm', 'pharm concerta 36'], sell: 1840, pref: 1720, cost: 1600 },
    { name: 'Pharm Concerta 54mg', keywords: ['concerta', 'concerta 54', 'concerta 54mg', 'pharm concerta', 'concerta pharm', 'pharm concerta 54'], sell: 1920, pref: 1820, cost: 1720 },
    { name: 'Pharm Ritalin Generic Pink', keywords: ['ritalin pink', 'ritalin generic', 'ritalin generic pink', 'pharm ritalin generic pink', 'ritalin generic pink pharm'], sell: 440, pref: 388, cost: 335 },
    { name: 'Pharm Ritalin Generic BioTech', keywords: ['ritalin biotech', 'ritalin generic bio', 'ritalin generic biotech', 'pharm ritalin generic biotech', 'ritalin generic biotech pharm'], sell: 440, pref: 388, cost: 335 },
    { name: 'Pharm Ritalin Generic HCL Douglas', keywords: ['ritalin hcl', 'ritalin douglas', 'ritalin generic hcl douglas', 'pharm ritalin generic hcl douglas', 'ritalin generic hcl douglas pharm'], sell: 480, pref: 430, cost: 380 },
    { name: 'Pharm Ritalin Original', keywords: ['ritalin 10', 'ritalin original', 'ritalin', 'pharm ritalin'], sell: 690, pref: 645, cost: 600 },
    { name: 'Pharm Ritalin Long Acting 10mg', keywords: ['ritalin la', 'ritalin long', 'ritalin long acting', 'ritalin long acting 10', 'ritalin long acting 10mg', 'pharm ritalin long acting'], sell: 740, pref: 680, cost: 620 },
    { name: 'Pharm Ritalin Long Acting 20mg', keywords: ['ritalin la', 'ritalin long', 'ritalin long acting', 'ritalin long acting 20', 'ritalin long acting 20mg', 'pharm ritalin long acting'], sell: 1300, pref: 1200, cost: 1100 },
    { name: 'Pharm Ritalin Long Acting 30mg', keywords: ['ritalin la', 'ritalin long', 'ritalin long acting', 'ritalin long acting 30', 'ritalin long acting 30mg', 'pharm ritalin long acting'], sell: 1750, pref: 1665, cost: 1580 },
    { name: 'Pharm Ritalin Long Acting 40mg', keywords: ['ritalin la', 'ritalin long', 'ritalin long acting', 'ritalin long acting 40', 'ritalin long acting 40mg', 'pharm ritalin long acting'], sell: 1800, pref: 1740, cost: 1680 },
    { name: 'Pharm Contramyl XR 18mg', keywords: ['contramyl', 'contramyl xr', 'contramyl xr 18', 'contramyl xr 18mg', 'pharm contramyl xr', 'contramyl xr pharm'], sell: 1000, pref: 950, cost: 900 },
    { name: 'Pharm Contramyl XR 27mg', keywords: ['contramyl', 'contramyl xr', 'contramyl xr 27', 'contramyl xr 27mg', 'pharm contramyl xr', 'contramyl xr pharm'], sell: 1070, pref: 995, cost: 920 },
    { name: 'Pharm Contramyl XR 36mg', keywords: ['contramyl', 'contramyl xr', 'contramyl xr 36', 'contramyl xr 36mg', 'pharm contramyl xr', 'contramyl xr pharm'], sell: 1240, pref: 1170, cost: 1100 },
    { name: 'Pharm Contramyl XR 54mg', keywords: ['contramyl', 'contramyl xr', 'contramyl xr 54', 'contramyl xr 54mg', 'pharm contramyl xr', 'contramyl xr pharm'], sell: 1300, pref: 1210, cost: 1120 },
    { name: 'Pharm Vyvanse 30mg', keywords: ['vyvanse', 'vyvanse 30', 'vyvanse 30mg', 'pharm vyvanse', 'vyvanse pharm', 'pharm vyvanse 30'], sell: 1800, pref: 1705, cost: 1610 },
    { name: 'Pharm Vyvanse 50mg', keywords: ['vyvanse', 'vyvanse 50', 'vyvanse 50mg', 'pharm vyvanse', 'vyvanse pharm', 'pharm vyvanse 50'], sell: 2100, pref: 1950, cost: 1800 },
    { name: 'Pharm Vyvanse 70mg', keywords: ['vyvanse', 'vyvanse 70', 'vyvanse 70mg', 'pharm vyvanse', 'vyvanse pharm', 'pharm vyvanse 70'], sell: 2100, pref: 2025, cost: 1950 },
    { name: 'Pharm Modafinil Cooper - Modcop', keywords: ['modafinil cooper modcop', 'modafinil cooper - modcop', 'pharm modafinil cooper modcop', 'modafinil cooper modcop pharm', 'pharm modafinil cooper - modcop'], sell: 730, pref: 675, cost: 620 },
    { name: 'Pharm Modafinil Shree', keywords: ['modafinil shree', 'pharm modafinil shree', 'modafinil shree pharm'], sell: 530, pref: 475, cost: 420 },
    { name: 'Pharm Allergex', keywords: ['allergex', 'pharm allergex', 'allergex pharm'], sell: 250, pref: 220, cost: 190 },
    { name: 'Pharm Alzam - Adco 0.5mg', keywords: ['alzam adco 0.', 'alzam - adco 0.5', 'alzam - adco 0.5mg', 'pharm alzam adco 0.', 'alzam adco 0. pharm', 'pharm alzam - adco 0.5'], sell: 240, pref: 220, cost: 200 },
    { name: 'Pharm Alzam - Adco 1mg', keywords: ['alzam adco', 'alzam - adco 1', 'pharm alzam adco', 'alzam adco pharm', 'alzam - adco 1mg', 'pharm alzam - adco 1'], sell: 270, pref: 250, cost: 230 },
    { name: 'Pharm Alzam - Adco 0.5mg', keywords: ['alzam adco 0.', 'alzam - adco 0.5', 'alzam - adco 0.5mg', 'pharm alzam adco 0.', 'alzam adco 0. pharm', 'pharm alzam - adco 0.5'], sell: 420, pref: 380, cost: 340 },
    { name: 'Pharm Alzam - Adco 1mg', keywords: ['alzam adco', 'alzam - adco 1', 'pharm alzam adco', 'alzam adco pharm', 'alzam - adco 1mg', 'pharm alzam - adco 1'], sell: 580, pref: 540, cost: 500 },
    { name: 'Pharm Aldactone', keywords: ['aldactone', 'pharm aldactone', 'aldactone pharm'], sell: 110, pref: 95, cost: 80 },
    { name: 'Pharm Alprazolam', keywords: ['alprazolam', 'pharm alprazolam', 'alprazolam pharm'], sell: 220, pref: 205, cost: 190 },
    { name: 'Pharm Anastrozole Accord/Stradexa', keywords: ['anastrozole accord/stradexa', 'pharm anastrozole accord/stradexa', 'anastrozole accord/stradexa pharm'], sell: 510, pref: 470, cost: 430 },
    { name: 'Pharm Arcoxia', keywords: ['arcoxia', 'pharm arcoxia', 'arcoxia pharm'], sell: 930, pref: 885, cost: 840 },
    { name: 'Pharm Augmentin BD', keywords: ['augmentin bd', 'pharm augmentin bd', 'augmentin bd pharm'], sell: 550, pref: 500, cost: 450 },
    { name: 'Pharm Amoxicillin - Indo', keywords: ['amoxicillin indo', 'amoxicillin - indo', 'pharm amoxicillin indo', 'amoxicillin indo pharm', 'pharm amoxicillin - indo'], sell: 870, pref: 820, cost: 770 },
    { name: 'Pharm Aspelone Syrup', keywords: ['aspelone syrup', 'pharm aspelone syrup', 'aspelone syrup pharm'], sell: 390, pref: 365, cost: 340 },
    { name: 'Pharm Ativan SL', keywords: ['ativan sl', 'pharm ativan sl', 'ativan sl pharm'], sell: 420, pref: 375, cost: 330 },
    { name: 'Pharm Azor', keywords: ['azor', 'pharm azor', 'azor pharm'], sell: 590, pref: 555, cost: 520 },
    { name: 'Pharm Betadexamine Syrup', keywords: ['betadexamine syrup', 'pharm betadexamine syrup', 'betadexamine syrup pharm'], sell: 580, pref: 540, cost: 500 },
    { name: 'Pharm Betapam (Pax Generic)', keywords: ['betapam', 'pharm betapam', 'betapam pharm', 'betapam (pax generic)', 'pharm betapam (pax generic)'], sell: 390, pref: 360, cost: 330 },
    { name: 'Pharm Brazepam', keywords: ['brazepam', 'pharm brazepam', 'brazepam pharm'], sell: 220, pref: 195, cost: 170 },
    { name: 'Pharm B12 Injection', keywords: ['b12 ion', 'pharm b12 ion', 'b12 ion pharm', 'b12 injection', 'pharm b12 injection'], sell: 220, pref: 195, cost: 170 },
    { name: 'Pharm Cataflam', keywords: ['cataflam', 'pharm cataflam', 'cataflam pharm'], sell: 350, pref: 290, cost: 230 },
    { name: 'Pharm Celebrex', keywords: ['celebrex', 'pharm celebrex', 'celebrex pharm'], sell: 260, pref: 240, cost: 220 },
    { name: 'Pharm Celestone Soluspan', keywords: ['celestone soluspan', 'pharm celestone soluspan', 'celestone soluspan pharm'], sell: 510, pref: 470, cost: 430 },
    { name: 'Pharm Cialis - Lilly', keywords: ['cialis lilly', 'cialis - lilly', 'pharm cialis lilly', 'cialis lilly pharm', 'pharm cialis - lilly'], sell: 2240, pref: 2120, cost: 2000 },
    { name: 'Pharm Cialis and Arginine - Fagron', keywords: ['cialis and arginine fagron', 'cialis and arginine - fagron', 'pharm cialis and arginine fagron', 'cialis and arginine fagron pharm', 'pharm cialis and arginine - fagron'], sell: 650, pref: 595, cost: 540 },
    { name: 'Pharm Cipralex', keywords: ['cipralex', 'pharm cipralex', 'cipralex pharm'], sell: 1300, pref: 1220, cost: 1140 },
    { name: 'Pharm DepoTest - Pfizer', keywords: ['depotest pfizer', 'depotest - pfizer', 'pharm depotest pfizer', 'depotest pfizer pharm', 'pharm depotest - pfizer'], sell: 980, pref: 915, cost: 850 },
    { name: 'Pharm Dopaquel', keywords: ['dopaquel', 'pharm dopaquel', 'dopaquel pharm'], sell: 1050, pref: 980, cost: 910 },
    { name: 'Pharm Dormicum', keywords: ['dormicum', 'pharm dormicum', 'dormicum pharm'], sell: 530, pref: 490, cost: 450 },
    { name: 'Pharm Dormonoct', keywords: ['dormonoct', 'pharm dormonoct', 'dormonoct pharm'], sell: 890, pref: 830, cost: 770 },
    { name: 'Pharm Dostinex', keywords: ['dostinex', 'pharm dostinex', 'dostinex pharm'], sell: 490, pref: 455, cost: 420 },
    { name: 'Pharm Duromine', keywords: ['duromine', 'pharm duromine', 'duromine pharm'], sell: 880, pref: 805, cost: 730 },
    { name: 'Pharm Ecotrin EC', keywords: ['ecotrin ec', 'pharm ecotrin ec', 'ecotrin ec pharm'], sell: 260, pref: 230, cost: 200 },
    { name: 'Pharm Eltroxin T4', keywords: ['eltroxin t4', 'pharm eltroxin t4', 'eltroxin t4 pharm'], sell: 200, pref: 175, cost: 150 },
    { name: 'Pharm EPO Eprex', keywords: ['epo eprex', 'pharm epo eprex', 'epo eprex pharm'], sell: 750, pref: 700, cost: 650 },
    { name: 'Pharm Essentiale Extreme', keywords: ['essentiale extreme', 'pharm essentiale extreme', 'essentiale extreme pharm'], sell: 390, pref: 365, cost: 340 },
    { name: 'Pharm Ezetrol', keywords: ['ezetrol', 'pharm ezetrol', 'ezetrol pharm'], sell: 580, pref: 550, cost: 520 },
    { name: 'Pharm Fertomid - Clomid', keywords: ['fertomid clomid', 'fertomid - clomid', 'pharm fertomid clomid', 'fertomid clomid pharm', 'pharm fertomid - clomid'], sell: 390, pref: 360, cost: 330 },
    { name: 'Pharm Finpecia', keywords: ['finpecia', 'pharm finpecia', 'finpecia pharm'], sell: 480, pref: 450, cost: 420 },
    { name: 'Pharm Gen Payne', keywords: ['gen payne', 'pharm gen payne', 'gen payne pharm'], sell: 230, pref: 215, cost: 200 },
    { name: 'Pharm Glucophage 500mg', keywords: ['glucophage', 'glucophage 500', 'pharm glucophage', 'glucophage pharm', 'glucophage 500mg', 'pharm glucophage 500'], sell: 240, pref: 220, cost: 200 },
    { name: 'Pharm Glucophage 1000mg', keywords: ['glucophage', 'glucophage 1000', 'pharm glucophage', 'glucophage pharm', 'glucophage 1000mg', 'pharm glucophage 1000'], sell: 320, pref: 300, cost: 280 },
    { name: 'Pharm HCG - Ovitrelle', keywords: ['hcg ovitrelle', 'hcg - ovitrelle', 'pharm hcg ovitrelle', 'hcg ovitrelle pharm', 'pharm hcg - ovitrelle'], sell: 1240, pref: 1120, cost: 1000 },
    { name: 'Pharm Halcion', keywords: ['halcion', 'pharm halcion', 'halcion pharm'], sell: 400, pref: 365, cost: 330 },
    { name: 'Pharm Illiadin Metered Nasal Spray', keywords: ['illiadin metered', 'pharm illiadin metered', 'illiadin metered pharm', 'illiadin metered nasal spray', 'pharm illiadin metered nasal spray'], sell: 240, pref: 210, cost: 180 },
    { name: 'Pharm Insulin Apidra Solostar Fast Acting', keywords: ['insulin apidra solostar fast acting', 'pharm insulin apidra solostar fast acting', 'insulin apidra solostar fast acting pharm'], sell: 400, pref: 340, cost: 280 },
    { name: 'Pharm Insulin Humalog Fast Acting', keywords: ['insulin humalog fast acting', 'pharm insulin humalog fast acting', 'insulin humalog fast acting pharm'], sell: 400, pref: 350, cost: 300 },
    { name: 'Pharm Insulin Lantus Long Acting', keywords: ['insulin lantus long acting', 'pharm insulin lantus long acting', 'insulin lantus long acting pharm'], sell: 600, pref: 540, cost: 480 },
    { name: 'Pharm Insulin Novorapid Fast Acting', keywords: ['insulin novorapid fast acting', 'pharm insulin novorapid fast acting', 'insulin novorapid fast acting pharm'], sell: 500, pref: 445, cost: 390 },
    { name: 'Pharm Ivedal', keywords: ['ivedal', 'pharm ivedal', 'ivedal pharm'], sell: 310, pref: 290, cost: 270 },
    { name: 'Pharm Ivermectin', keywords: ['ivermectin', 'pharm ivermectin', 'ivermectin pharm'], sell: 420, pref: 385, cost: 350 },
    { name: 'Pharm Kessar - Nolvadex', keywords: ['pharm nolva', 'nolva pharm', 'kessar nolvadex', 'kessar - nolvadex', 'pharm kessar nolvadex', 'kessar nolvadex pharm'], sell: 410, pref: 380, cost: 350 },
    { name: 'Pharm Lansoloc 15mg', keywords: ['lansoloc', 'lansoloc 15', 'lansoloc 15mg', 'pharm lansoloc', 'lansoloc pharm', 'pharm lansoloc 15'], sell: 260, pref: 235, cost: 210 },
    { name: 'Pharm Lansoloc 30mg', keywords: ['lansoloc', 'lansoloc 30', 'lansoloc 30mg', 'pharm lansoloc', 'lansoloc pharm', 'pharm lansoloc 30'], sell: 490, pref: 455, cost: 420 },
    { name: 'Pharm Lorien', keywords: ['lorien', 'pharm lorien', 'lorien pharm'], sell: 220, pref: 195, cost: 170 },
    { name: 'Pharm Minex', keywords: ['minex', 'pharm minex', 'minex pharm'], sell: 780, pref: 730, cost: 680 },
    { name: 'Pharm Minoxidil 5% - Regrow Hair', keywords: ['minoxidil 5% regrow hair', 'minoxidil 5% - regrow hair', 'pharm minoxidil 5% regrow hair', 'minoxidil 5% regrow hair pharm', 'pharm minoxidil 5% - regrow hair'], sell: 800, pref: 760, cost: 720 },
    { name: 'Pharm Minoxidil 10% - Regrow Hair', keywords: ['minoxidil 10% regrow hair', 'minoxidil 10% - regrow hair', 'pharm minoxidil 10% regrow hair', 'minoxidil 10% regrow hair pharm', 'pharm minoxidil 10% - regrow hair'], sell: 920, pref: 870, cost: 820 },
    { name: 'Pharm Morphine', keywords: ['morphine', 'pharm morphine', 'morphine pharm'], sell: 400, pref: 335, cost: 270 },
    { name: 'Pharm Neoloridin', keywords: ['neoloridin', 'pharm neoloridin', 'neoloridin pharm'], sell: 380, pref: 335, cost: 290 },
    { name: 'Pharm Neurobion B Complex', keywords: ['neurobion b complex', 'pharm neurobion b complex', 'neurobion b complex pharm'], sell: 420, pref: 380, cost: 340 },
    { name: 'Pharm Nexiam', keywords: ['nexiam', 'pharm nexiam', 'nexiam pharm'], sell: 1100, pref: 1005, cost: 910 },
    { name: 'Pharm Obesan', keywords: ['obesan', 'pharm obesan', 'obesan pharm'], sell: 480, pref: 430, cost: 380 },
    { name: 'Pharm Oretane/ Acnetane', keywords: ['oretane/ acnetane', 'pharm oretane/ acnetane', 'oretane/ acnetane pharm'], sell: 780, pref: 730, cost: 680 },
    { name: 'Pharm Oxynorm', keywords: ['oxynorm', 'pharm oxynorm', 'oxynorm pharm'], sell: 950, pref: 900, cost: 850 },
    { name: 'Pharm OxyContin', keywords: ['oxycontin', 'pharm oxycontin', 'oxycontin pharm'], sell: 2100, pref: 2000, cost: 1900 },
    { name: 'Pharm Ozempic Original', keywords: ['ozempic', 'pharm ozempic', 'ozempic original'], sell: 5300, pref: 4800, cost: 4300 },
    { name: 'Pharm PAX', keywords: ['pax', 'pharm pax', 'pax pharm'], sell: 120, pref: 110, cost: 100 },
    { name: 'Pharm Pethidine', keywords: ['pethidine', 'pharm pethidine', 'pethidine pharm'], sell: 300, pref: 285, cost: 270 },
    { name: 'Pharm Prednisone', keywords: ['prednisone', 'pharm prednisone', 'prednisone pharm'], sell: 610, pref: 580, cost: 550 },
    { name: 'Pharm Prelox Male Enhancement', keywords: ['prelox male enhancement', 'pharm prelox male enhancement', 'prelox male enhancement pharm'], sell: 1100, pref: 1020, cost: 940 },
    { name: 'Pharm Proviron - Bayer', keywords: ['proviron bayer', 'proviron - bayer', 'pharm proviron bayer', 'proviron bayer pharm', 'pharm proviron - bayer'], sell: 380, pref: 330, cost: 280 },
    { name: 'Pharm Purata', keywords: ['purata', 'pharm purata', 'purata pharm'], sell: 380, pref: 330, cost: 280 },
    { name: 'Pharm Relislim', keywords: ['relislim', 'pharm relislim', 'relislim pharm'], sell: 480, pref: 415, cost: 350 },
    { name: 'Pharm Retic - Adco', keywords: ['retic adco', 'retic - adco', 'pharm retic adco', 'retic adco pharm', 'pharm retic - adco'], sell: 180, pref: 160, cost: 140 },
    { name: 'Pharm Rivotril', keywords: ['rivotril', 'pharm rivotril', 'rivotril pharm'], sell: 1150, pref: 1070, cost: 990 },
    { name: 'Pharm Saxenda', keywords: ['saxenda', 'pharm saxenda', 'saxenda pharm'], sell: 2600, pref: 2050, cost: 1500 },
    { name: 'Pharm Serdep', keywords: ['serdep', 'pharm serdep', 'serdep pharm'], sell: 320, pref: 280, cost: 240 },
    { name: 'Pharm Still Nox', keywords: ['still nox', 'pharm still nox', 'still nox pharm'], sell: 420, pref: 380, cost: 340 },
    { name: 'Pharm Still Nox MR', keywords: ['still nox mr', 'pharm still nox mr', 'still nox mr pharm'], sell: 420, pref: 385, cost: 350 },
    { name: 'Pharm Stillpane', keywords: ['stillpane', 'pharm stillpane', 'stillpane pharm'], sell: 320, pref: 270, cost: 220 },
    { name: 'Pharm Synaleve', keywords: ['synaleve', 'pharm synaleve', 'synaleve pharm'], sell: 470, pref: 390, cost: 310 },
    { name: 'Pharm Telmisartan / Tessan', keywords: ['telmisartan / tessan', 'pharm telmisartan / tessan', 'telmisartan / tessan pharm'], sell: 400, pref: 370, cost: 340 },
    { name: 'Pharm Tetroxin T3', keywords: ['tetroxin t3', 'pharm tetroxin t3', 'tetroxin t3 pharm'], sell: 650, pref: 610, cost: 570 },
    { name: 'Pharm Testoviron - Beyer/OBS', keywords: ['testoviron beyer/obs', 'testoviron - beyer/obs', 'pharm testoviron beyer/obs', 'testoviron beyer/obs pharm', 'pharm testoviron - beyer/obs'], sell: 770, pref: 725, cost: 680 },
    { name: 'Pharm Tetralysal', keywords: ['tetralysal', 'pharm tetralysal', 'tetralysal pharm'], sell: 820, pref: 775, cost: 730 },
    { name: 'Pharm Tirzepatide (Not Mixed)', keywords: ['tirzepatide', 'pharm tirzep', 'tirzep pharm', 'pharm tirzepatide', 'tirzepatide pharm', 'tirzepatide (not mixed)'], sell: 2350, pref: 2175, cost: 2000 },
    { name: 'Pharm Tramacet', keywords: ['tramacet', 'pharm tramacet', 'tramacet pharm'], sell: 640, pref: 580, cost: 520 },
    { name: 'Pharm Tramadol', keywords: ['tramadol', 'pharm tramadol', 'tramadol pharm'], sell: 530, pref: 485, cost: 440 },
    { name: 'Pharm Tramazac Inject', keywords: ['tramazac', 'pharm tramazac', 'tramazac pharm', 'tramazac inject', 'pharm tramazac inject'], sell: 330, pref: 295, cost: 260 },
    { name: 'Pharm Tranqipam', keywords: ['tranqipam', 'pharm tranqipam', 'tranqipam pharm'], sell: 1250, pref: 1125, cost: 1000 },
    { name: 'Pharm Trepiline', keywords: ['trepiline', 'pharm trepiline', 'trepiline pharm'], sell: 430, pref: 395, cost: 360 },
    { name: 'Pharm Trustan', keywords: ['trustan', 'pharm trustan', 'trustan pharm'], sell: 880, pref: 840, cost: 800 },
    { name: 'Pharm Urbanol 5mg', keywords: ['urbanol', 'urbanol 5', 'urbanol 5mg', 'pharm urbanol', 'urbanol pharm', 'pharm urbanol 5'], sell: 680, pref: 635, cost: 590 },
    { name: 'Pharm Urbanol 10mg', keywords: ['urbanol', 'urbanol 10', 'urbanol 10mg', 'pharm urbanol', 'urbanol pharm', 'pharm urbanol 10'], sell: 890, pref: 845, cost: 800 },
    { name: 'Pharm Urizone', keywords: ['urizone', 'pharm urizone', 'urizone pharm'], sell: 540, pref: 490, cost: 440 },
    { name: 'Pharm Valium 5mg', keywords: ['valium', 'valium 5', 'valium 5mg', 'pharm valium', 'valium pharm', 'pharm valium 5'], sell: 1070, pref: 995, cost: 920 },
    { name: 'Pharm Valium 10mg', keywords: ['valium', 'valium 10', 'valium 10mg', 'pharm valium', 'valium pharm', 'pharm valium 10'], sell: 1460, pref: 1390, cost: 1320 },
    { name: 'Pharm Viagra - Pfizer', keywords: ['viagra pfizer', 'viagra - pfizer', 'pharm viagra pfizer', 'viagra pfizer pharm', 'pharm viagra - pfizer'], sell: 320, pref: 280, cost: 240 },
    { name: 'Pharm Victoza Liraglutide', keywords: ['victoza liraglutide', 'pharm victoza liraglutide', 'victoza liraglutide pharm'], sell: 1700, pref: 1625, cost: 1550 },
    { name: 'Pharm Voltaren Inject', keywords: ['voltaren', 'pharm voltaren', 'voltaren pharm', 'voltaren inject', 'pharm voltaren inject'], sell: 320, pref: 270, cost: 220 },
    { name: 'Pharm Wellbutrin XL150', keywords: ['wellbutrin xl150', 'pharm wellbutrin xl150', 'wellbutrin xl150 pharm'], sell: 1020, pref: 970, cost: 920 },
    { name: 'Pharm Wellbutrin XL300', keywords: ['wellbutrin xl300', 'pharm wellbutrin xl300', 'wellbutrin xl300 pharm'], sell: 1100, pref: 1050, cost: 1000 },
    { name: 'Pharm Xanax Bars', keywords: ['xanax bars', 'pharm xanax bars', 'xanax bars pharm'], sell: 320, pref: 270, cost: 220 },
    { name: 'Pharm Xanor 0.5mg', keywords: ['xanor 0.', 'xanor 0.5', 'xanor 0.5mg', 'pharm xanor 0.', 'xanor 0. pharm', 'pharm xanor 0.5'], sell: 380, pref: 335, cost: 290 },
    { name: 'Pharm Xanor 1mg', keywords: ['xanor', 'xanor 1', 'xanor 1mg', 'pharm xanor', 'xanor pharm', 'pharm xanor 1'], sell: 420, pref: 390, cost: 360 },
    { name: 'Pharm Xanor Slow Release', keywords: ['xanor slow release', 'pharm xanor slow release', 'xanor slow release pharm'], sell: 1440, pref: 1370, cost: 1300 },
    { name: 'Pharm Xenical Orlistat', keywords: ['xenical orlistat', 'pharm xenical orlistat', 'xenical orlistat pharm'], sell: 1350, pref: 1275, cost: 1200 },
    { name: 'Pharm Xevolcin FCT', keywords: ['xevolcin fct', 'pharm xevolcin fct', 'xevolcin fct pharm'], sell: 320, pref: 270, cost: 220 },
    { name: 'Pharm Yaz Plus', keywords: ['yaz plus', 'pharm yaz plus', 'yaz plus pharm'], sell: 560, pref: 520, cost: 480 },
    { name: 'Pharm Yelate', keywords: ['yelate', 'pharm yelate', 'yelate pharm'], sell: 520, pref: 470, cost: 420 },
    { name: 'Pharm Zolnoxs', keywords: ['zolnoxs', 'pharm zolnoxs', 'zolnoxs pharm'], sell: 300, pref: 270, cost: 240 },
    { name: 'Pharm Zoloft', keywords: ['zoloft', 'pharm zoloft', 'zoloft pharm'], sell: 1100, pref: 1040, cost: 980 },
    { name: 'Pharm Zolpidem - Adco', keywords: ['zolpidem adco', 'zolpidem - adco', 'pharm zolpidem adco', 'zolpidem adco pharm', 'pharm zolpidem - adco'], sell: 360, pref: 330, cost: 300 },
    { name: 'Pharm Zopimed - Adco', keywords: ['zopimed adco', 'zopimed - adco', 'pharm zopimed adco', 'zopimed adco pharm', 'pharm zopimed - adco'], sell: 280, pref: 240, cost: 200 },
    { name: 'Pharm Zopivane', keywords: ['zopivane', 'pharm zopivane', 'zopivane pharm'], sell: 290, pref: 245, cost: 200 },
    { name: 'Pharm Zopiclone', keywords: ['zopiclone', 'pharm zopiclone', 'zopiclone pharm'], sell: 290, pref: 245, cost: 200 },
    { name: 'Pharm Zytomil', keywords: ['zytomil', 'pharm zytomil', 'zytomil pharm'], sell: 340, pref: 295, cost: 250 },
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
    preferential: ['tiaan kruger', 'matthew de beer', 'nicole billson'],
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
  let bestIdx = -1;

  for (let i = 0; i < priceList.length; i++) {
    const entry = priceList[i];
    for (const kw of entry.keywords) {
      if (product.includes(kw) || kw.split(' ').every(w => product.includes(w))) {
        const score = kw.length;
        if (score > bestScore) { bestScore = score; bestMatch = entry; bestIdx = i; }
      }
    }
  }
  if (!bestMatch) return null;

  // Apply price overrides if any
  const overrides = (priceOverrides[supplier] || {})[bestIdx];
  if (overrides) {
    return {
      ...bestMatch,
      sell: overrides.sell !== undefined ? overrides.sell : bestMatch.sell,
      pref: overrides.pref !== undefined ? overrides.pref : bestMatch.pref,
      cost: overrides.cost !== undefined ? overrides.cost : bestMatch.cost
    };
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
  const data = { orders };
  if (paymentsCache[supplier]) data.payments = paymentsCache[supplier];
  db.collection('users').doc(currentUser.uid)
    .collection('suppliers').doc(key)
    .set(data)
    .catch(err => console.error('Firestore write error:', err));
}

async function loadOrders(supplier) {
  if (!currentUser) return;
  const key = supplierKey(supplier);
  const snap = await db.collection('users').doc(currentUser.uid)
    .collection('suppliers').doc(key).get();
  const data = snap.exists ? snap.data() : {};
  ordersCache[supplier] = data.orders || [];
  paymentsCache[supplier] = data.payments || {};
}

// ---- Supplier Payment Functions ----

function getSupplierPayment(supplier, weekEnd) {
  return (paymentsCache[supplier] || {})[weekEnd] || null;
}

function saveSupplierPayment(supplier, weekEnd, amount, date, notes) {
  if (!paymentsCache[supplier]) paymentsCache[supplier] = {};
  paymentsCache[supplier][weekEnd] = { amount, date, notes: notes || '' };
  if (!currentUser) return;
  const key = supplierKey(supplier);
  const data = { orders: ordersCache[supplier] || [], payments: paymentsCache[supplier] };
  db.collection('users').doc(currentUser.uid)
    .collection('suppliers').doc(key)
    .set(data)
    .catch(err => console.error('Firestore write error:', err));
}

function recordSupplierPayment() {
  if (!currentWeek) return;
  const input = document.getElementById('spbPaymentInput');
  const amount = parseFloat(input.value);
  if (isNaN(amount) || amount < 0) { alert('Enter a valid payment amount.'); return; }
  const today = new Date().toISOString().split('T')[0];
  saveSupplierPayment(currentSupplier, currentWeek, amount, today, '');
  input.value = '';
  renderSummary();
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

let loadingTimeout = null;
function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
  clearTimeout(loadingTimeout);
  loadingTimeout = setTimeout(() => hideLoading(), 10000);
}

function hideLoading() {
  clearTimeout(loadingTimeout);
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
  const orderWeeks = getAvailableWeeks(currentSupplier);

  // Include currentWeek even if it has no orders yet (started via + button)
  const weeks = [...orderWeeks];
  if (currentWeek !== null && !weeks.includes(currentWeek)) {
    weeks.push(currentWeek);
    weeks.sort();
  }

  if (weeks.length === 0) {
    // No weeks at all — just show the + button to start a new week
    container.innerHTML = `<button class="week-nav week-add" onclick="startNewWeek()" title="Start new week"><i class="fas fa-plus"></i></button>`;
    currentWeek = null;
    return;
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
  html += `<button class="week-nav week-add" onclick="startNewWeek()" title="Start new week"><i class="fas fa-plus"></i></button>`;

  container.innerHTML = html;
}

function startNewWeek() {
  const weeks = getAvailableWeeks(currentSupplier);
  let nextWeekEnd;
  if (weeks.length > 0) {
    // Next Sunday after the latest week
    const latest = new Date(weeks[weeks.length - 1] + 'T00:00:00');
    latest.setDate(latest.getDate() + 7);
    nextWeekEnd = latest.toISOString().split('T')[0];
  } else {
    // No weeks yet — use the coming Sunday
    nextWeekEnd = getWeekEnding(new Date().toISOString().split('T')[0]);
  }
  currentWeek = nextWeekEnd;
  renderWeekTabs();
  renderOrders();
  renderSummary();
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
    await Promise.all([loadOrders(supplier), loadPriceOverrides(supplier)]);
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

  // Missing prices alert
  const missingPrices = orders.filter(o =>
    o.orderStatus !== 'Cancelled' &&
    (!(parseFloat(o.totalCost) > 0) || !(parseFloat(o.totalCostPrice) > 0))
  );
  const alertEl = document.getElementById('missingPricesAlert');
  if (missingPrices.length > 0) {
    const names = missingPrices.map(o => o.clientName || o.orderNumber || 'Unknown').join(', ');
    document.getElementById('missingPricesText').textContent =
      missingPrices.length + ' order' + (missingPrices.length > 1 ? 's' : '') +
      ' missing prices: ' + names;
    alertEl.style.display = 'block';
    alertEl.onclick = function() {
      const firstId = missingPrices[0].id;
      if (firstId) openEditOrder(firstId);
    };
  } else {
    alertEl.style.display = 'none';
  }

  // Supplier payment bar
  const bar = document.getElementById('supplierPaymentBar');
  if (currentWeek) {
    bar.style.display = 'flex';
    const payment = getSupplierPayment(currentSupplier, currentWeek);
    const paid = payment ? parseFloat(payment.amount) || 0 : 0;
    const balance = totalCost - paid;

    document.getElementById('spbWeekCost').textContent = formatRand(totalCost);

    const paidEl = document.getElementById('spbPaid');
    paidEl.textContent = formatRand(paid);
    paidEl.className = 'spb-value spb-paid' + (paid >= totalCost && totalCost > 0 ? ' paid-full' : paid > 0 ? ' paid-partial' : '');

    const balEl = document.getElementById('spbBalance');
    balEl.textContent = formatRand(balance);
    balEl.className = 'spb-value spb-balance' + (balance <= 0 ? ' balance-zero' : paid > 0 ? ' balance-partial' : ' balance-unpaid');
  } else {
    bar.style.display = 'none';
  }
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
  let sumRetail = 0, sumCost = 0, sumProfit = 0;

  for (const line of lines) {
    const qtyMatch = line.match(/^(\d+)\s*[x×]\s*/i);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 0;
    const match = lookupItemPrice(line, currentSupplier);

    if (match && qty) {
      const override = getOverridePrice(line, rule.overrides);
      const unit = override !== null ? override : (tier === 'preferential' ? match.pref : match.sell);
      const lineRetail = qty * unit;
      const lineCost = qty * match.cost;
      const lineProfit = lineRetail - lineCost;
      sumRetail += lineRetail; sumCost += lineCost; sumProfit += lineProfit;
      const isOverride = override !== null;
      html += `<div class="item-line"><span>${esc(line)}${isOverride ? ' <span class="badge badge-special">SPECIAL</span>' : ''}</span><span class="item-prices"><span class="item-price">${formatRand(lineRetail)}</span><span class="item-cost">${formatRand(lineCost)}</span><span class="item-profit">${formatRand(lineProfit)}</span></span></div>`;
    } else if (/^ALL\s/i.test(line)) {
      html += `<div class="item-line"><span class="item-note">${esc(line)}</span></div>`;
    } else {
      html += `<div class="item-line"><span>${esc(line)}</span><span class="item-prices"><span class="item-price">-</span><span class="item-cost">-</span><span class="item-profit">-</span></span></div>`;
    }
  }

  const cf = getCourierFee(currentSupplier);
  sumRetail += cf; sumCost += cf;
  html += `<div class="item-line courier-line"><span>Courier</span><span class="item-prices"><span class="item-price">${formatRand(cf)}</span><span class="item-cost">${formatRand(cf)}</span><span class="item-profit">-</span></span></div>`;
  html += `<div class="item-line item-totals"><span>Total</span><span class="item-prices"><span class="item-price">${formatRand(sumRetail)}</span><span class="item-cost">${formatRand(sumCost)}</span><span class="item-profit">${formatRand(sumProfit)}</span></span></div>`;
  return html;
}

// ---- Order CRUD ----

function openNewOrder() {
  editingOrderId = null;
  document.getElementById('modalTitle').textContent = 'New Order - ' + currentSupplier;
  document.getElementById('orderForm').reset();

  // Pre-fill date: use Monday of the selected week if it's a future/empty week, otherwise today
  let defaultDate = new Date().toISOString().split('T')[0];
  if (currentWeek) {
    const weekEnd = new Date(currentWeek + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // If the selected week ends after today, use today (clamped within that week)
    // Otherwise use today's date as usual
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6); // Monday of the week
    if (today >= weekStart && today <= weekEnd) {
      defaultDate = today.toISOString().split('T')[0];
    } else if (today < weekStart) {
      defaultDate = weekStart.toISOString().split('T')[0];
    }
  }
  document.getElementById('orderDate').value = defaultDate;

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

  // Fallback: if no WhatsApp headers found, treat as plain-text order(s)
  if (messages.length === 0) {
    const blocks = text.split(/\n\s*\n\s*\n/).map(b => b.trim()).filter(b => b);
    const candidates = blocks.length > 1 ? blocks : [text];
    const rawOrders = [];
    const today = new Date().toISOString().slice(0, 10);
    candidates.forEach(block => {
      const parsed = parseOrderMessage(block);
      if (parsed) {
        parsed.orderDate = today;
        parsed.msgIndex = 0;
        const pricing = calcOrderPricing(parsed.items, parsed.clientName, currentSupplier);
        parsed.retail = pricing.retail;
        parsed.cost = pricing.cost;
        parsed.profit = pricing.profit;
        parsed.tier = pricing.tier;
        parsed.profitMult = pricing.profitMult;
        rawOrders.push(parsed);
      }
    });
    if (rawOrders.length === 0) {
      document.getElementById('parseStatus').textContent = 'Could not detect any orders. Include item lines like "2 x Product Name" with a client name.';
      return;
    }
    const existingOrders = getOrders(currentSupplier);
    rawOrders.forEach(o => {
      const dbDup = existingOrders.some(ex =>
        ex.clientName.toLowerCase() === o.clientName.toLowerCase() &&
        ex.items.replace(/\s+/g, ' ').toLowerCase() === o.items.replace(/\s+/g, ' ').toLowerCase()
      );
      o.isDuplicate = dbDup;
      o.dupReason = dbDup ? 'Already in system' : '';
    });
    parsedOrders = rawOrders;
    renderParsedOrders();
    document.getElementById('parseStatus').textContent =
      `Found ${rawOrders.length} order(s) from plain text (${rawOrders.filter(o => o.isDuplicate).length} possible duplicates).`;
    return;
  }

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

  // One-time HD Labs order reseed
  async function seedHDLabsOrdersV2() {
    if (localStorage.getItem('hdlabs_seed_v2')) return;
    const supplier = 'HD Labs';
    await loadOrders(supplier);

    const seedOrders = [
      { orderDate: '2026-04-28', clientName: 'Leo Kruger', clientPhone: '0826527825',
        items: '3 x BP Anavar 20mg\n3 x Testaject',
        deliveryAddress: '1233 Caley Lane Queenswood' },
      { orderDate: '2026-04-28', clientName: 'Donovan', clientPhone: '',
        items: '2 x Testaject 250\n1 x Tamoxifen\n2 x Turanibol',
        deliveryAddress: '' },
      { orderDate: '2026-04-29', clientName: 'Leo Kruger', clientPhone: '0826527825',
        items: '2 x Testaject\n2 x Mastaject 200',
        deliveryAddress: '1233 Caley Lane Queenswood' },
      { orderDate: '2026-05-04', clientName: 'Kate Bester', clientPhone: '+27 72 811 5310',
        items: '1 x Anavar 20mg',
        deliveryAddress: '1332 the clubhouse street Maraisburg 1709' },
      { orderDate: '2026-05-05', clientName: 'Tiaan Kruger', clientPhone: '+27 71 678 8083',
        items: '1 x Mastaject 200\n2 x Equiject',
        deliveryAddress: '5 Wesp rd Sunward Park Boksburg 1459' },
      { orderDate: '2026-05-07', clientName: 'Leo Kruger', clientPhone: '0826527825',
        items: '1 x Reta Vial\n1 x Superbulk\n1 x Depoject\n1 x Decca 300',
        deliveryAddress: '1233 Caley Lane Queenswood' }
    ];

    const builtOrders = seedOrders.map((o, i) => {
      const pricing = calcOrderPricing(o.items, o.clientName, supplier);
      const lines = o.items.split('\n').map(l => l.trim()).filter(Boolean);
      let qty = 0;
      lines.forEach(line => { const m = line.match(/^(\d+)\s*[x×]\s*/i); if (m) qty += parseInt(m[1]); });
      return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,7) + i,
        orderNumber: 'HL-' + String(i + 1).padStart(4, '0'),
        orderDate: o.orderDate, clientName: o.clientName, clientPhone: o.clientPhone,
        items: o.items, quantity: String(qty),
        totalCost: pricing.retail.toFixed(2), totalCostPrice: pricing.cost.toFixed(2),
        profit: pricing.profit.toFixed(2), courierFee: '120.00',
        paymentStatus: 'Unpaid', orderStatus: 'New', trackingNumber: '',
        deliveryAddress: o.deliveryAddress, deliveryDate: '', notes: '',
        priceTier: pricing.tier, profitMult: String(pricing.profitMult)
      };
    });

    ordersCache[supplier] = builtOrders;
    saveOrders(supplier, builtOrders);
    localStorage.setItem('hdlabs_seed_v2', '1');
    console.log('HD Labs orders reseeded:', builtOrders.length, 'orders');
  }

  // Auth state listener - gates the entire app
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      hideLoginScreen();
      showUserInfo(user);
      showLoading();

      try {
        await seedInitialData();
        await seedHDLabsOrdersV2();
        await Promise.all([loadOrders(currentSupplier), loadPriceOverrides(currentSupplier)]);
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
      paymentsCache = {};
      showLoginScreen();
      document.getElementById('ordersBody').innerHTML = '';
    }
  });
});

// ============================================================
// Price List & Quote Builder
// ============================================================

function openPriceListModal() {
  document.getElementById('plSupplierName').textContent = currentSupplier;
  document.getElementById('priceListModal').classList.add('active');
  quoteTier = 'standard';
  document.getElementById('plTierStandard').classList.add('active');
  document.getElementById('plTierPref').classList.remove('active');
  document.getElementById('plSearchBox').value = '';
  renderPriceListTable();
  renderQuote();
}

function closePriceListModal() {
  document.getElementById('priceListModal').classList.remove('active');
}

function setPriceTier(tier) {
  quoteTier = tier;
  document.getElementById('plTierStandard').classList.toggle('active', tier === 'standard');
  document.getElementById('plTierPref').classList.toggle('active', tier === 'preferential');
  renderPriceListTable();
  renderQuote();
}

function getProductPrice(supplier, idx, field) {
  const overrides = (priceOverrides[supplier] || {})[idx];
  if (overrides && overrides[field] !== undefined) return overrides[field];
  const p = (PRICE_LISTS[supplier] || [])[idx];
  return p ? p[field] : 0;
}

function renderPriceListTable() {
  const products = PRICE_LISTS[currentSupplier] || [];
  const search = (document.getElementById('plSearchBox').value || '').toLowerCase().trim();
  const tbody = document.getElementById('plTableBody');
  let html = '';
  products.forEach((p, idx) => {
    if (search && !p.name.toLowerCase().includes(search) && !(p.keywords || []).some(k => k.includes(search))) return;
    const sell = getProductPrice(currentSupplier, idx, 'sell');
    const pref = getProductPrice(currentSupplier, idx, 'pref');
    const cost = getProductPrice(currentSupplier, idx, 'cost');
    const sellClass = quoteTier === 'standard' ? ' pl-price-active' : '';
    const prefClass = quoteTier === 'preferential' ? ' pl-price-active' : '';
    html += `<tr>
      <td><button class="pl-add-btn" onclick="addToQuote(${idx})" title="Add to quote">+</button></td>
      <td>${esc(p.name)}</td>
      <td class="pl-editable${sellClass}" onclick="editPrice(${idx},'sell',this)">${formatRand(sell)}</td>
      <td class="pl-editable${prefClass}" onclick="editPrice(${idx},'pref',this)">${formatRand(pref)}</td>
      <td class="pl-editable" onclick="editPrice(${idx},'cost',this)">${cost ? formatRand(cost) : '-'}</td>
    </tr>`;
  });
  if (!html) html = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#555;">No products found</td></tr>';
  tbody.innerHTML = html;
}

function filterPriceList() {
  renderPriceListTable();
}

function addToQuote(idx) {
  const products = PRICE_LISTS[currentSupplier] || [];
  const product = products[idx];
  if (!product) return;
  const existing = quoteItems.find(q => q.idx === idx);
  if (existing) {
    existing.qty++;
  } else {
    quoteItems.push({ idx, name: product.name, qty: 1 });
  }
  renderQuote();
}

function removeFromQuote(i) {
  quoteItems.splice(i, 1);
  renderQuote();
}

function updateQuoteQty(i, qty) {
  const n = parseInt(qty) || 0;
  if (n <= 0) {
    quoteItems.splice(i, 1);
  } else {
    quoteItems[i].qty = n;
  }
  renderQuote();
}

function renderQuote() {
  const itemsEl = document.getElementById('plQuoteItems');
  const summaryEl = document.getElementById('plQuoteSummary');
  const products = PRICE_LISTS[currentSupplier] || [];

  if (quoteItems.length === 0) {
    itemsEl.innerHTML = '<div class="pl-quote-empty">Click + to add products to your quote</div>';
    summaryEl.innerHTML = '';
    return;
  }

  let html = '';
  let subtotal = 0;
  quoteItems.forEach((item, i) => {
    const sell = getProductPrice(currentSupplier, item.idx, 'sell');
    const pref = getProductPrice(currentSupplier, item.idx, 'pref');
    const price = quoteTier === 'preferential' ? (pref || sell) : sell;
    const lineTotal = price * item.qty;
    subtotal += lineTotal;
    html += `<div class="pl-quote-item">
      <span class="pl-quote-item-name" title="${esc(item.name)}">${esc(item.name)}</span>
      <input type="number" class="pl-quote-item-qty" value="${item.qty}" min="1" onchange="updateQuoteQty(${i}, this.value)">
      <span class="pl-quote-item-price">${formatRand(lineTotal)}</span>
      <button class="pl-quote-item-remove" onclick="removeFromQuote(${i})" title="Remove">&times;</button>
    </div>`;
  });
  itemsEl.innerHTML = html;

  const courier = getCourierFee(currentSupplier);
  const total = subtotal + courier;
  summaryEl.innerHTML = `
    <div>Courier: ${formatRand(courier)}</div>
    <div class="pl-quote-total">TOTAL: ${formatRand(total)}</div>
  `;
}

function clearQuote() {
  quoteItems = [];
  renderQuote();
}

function copyQuoteToClipboard() {
  if (quoteItems.length === 0) return;
  const products = PRICE_LISTS[currentSupplier] || [];
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-ZA');
  const tierLabel = quoteTier === 'preferential' ? 'Preferential' : 'Standard';
  let lines = [];
  lines.push(`ATS Quote - ${currentSupplier}`);
  lines.push(`Date: ${dateStr}`);
  lines.push(`Pricing: ${tierLabel}`);
  lines.push('');

  let subtotal = 0;
  quoteItems.forEach(item => {
    const p = products[item.idx];
    const sell = getProductPrice(currentSupplier, item.idx, 'sell');
    const pref = getProductPrice(currentSupplier, item.idx, 'pref');
    const price = quoteTier === 'preferential' ? (pref || sell) : sell;
    const lineTotal = price * item.qty;
    subtotal += lineTotal;
    lines.push(`${item.qty} x ${p.name}  ${formatRand(lineTotal)}`);
  });

  const courier = getCourierFee(currentSupplier);
  const total = subtotal + courier;
  lines.push(`Courier  ${formatRand(courier)}`);
  lines.push('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  lines.push(`TOTAL  ${formatRand(total)}`);

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.pl-quote-actions .btn-primary');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  });
}

// ---- Price editing & persistence ----

function editPrice(idx, field, td) {
  if (td.querySelector('input')) return;
  const current = getProductPrice(currentSupplier, idx, field);
  const orig = td.innerHTML;
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'pl-price-input';
  input.value = current || '';
  input.min = '0';
  input.step = '0.01';
  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  input.select();

  function commit() {
    const val = parseFloat(input.value) || 0;
    savePriceOverride(currentSupplier, idx, field, val);
    renderPriceListTable();
    renderQuote();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { td.innerHTML = orig; }
  });
}

function savePriceOverride(supplier, idx, field, value) {
  if (!priceOverrides[supplier]) priceOverrides[supplier] = {};
  if (!priceOverrides[supplier][idx]) priceOverrides[supplier][idx] = {};
  priceOverrides[supplier][idx][field] = value;
  savePriceOverrides(supplier);
}

function savePriceOverrides(supplier) {
  if (!currentUser) return;
  const key = supplierKey(supplier) + '_prices';
  db.collection('users').doc(currentUser.uid)
    .collection('priceOverrides').doc(key)
    .set(priceOverrides[supplier] || {})
    .catch(err => console.error('Price override save error:', err));
}

async function loadPriceOverrides(supplier) {
  if (!currentUser) return;
  const key = supplierKey(supplier) + '_prices';
  try {
    const snap = await db.collection('users').doc(currentUser.uid)
      .collection('priceOverrides').doc(key).get();
    if (snap.exists) {
      const data = snap.data();
      priceOverrides[supplier] = {};
      Object.keys(data).forEach(k => {
        priceOverrides[supplier][k] = data[k];
      });
    }
  } catch (err) {
    console.error('Price override load error:', err);
  }
}
