/**
 * =========================================================
 * PRESCRIPTION & PRINT MODAL CONTROLLER
 * Multi-Language (English, Gujarati, Hindi) A5 Letterpad Print
 * with Intelligent Dietary Translation & In-Place Food Item Editing
 * =========================================================
 */

import { fmtDate, getLocalDB, saveLocalDB, getAuthSession, todayISO, showToast } from './api.js';

// Comprehensive Multi-Language Dietary Clinical Dictionary
export const DIETARY_TRANSLATIONS = {
  DB: {
    disease: { EN: 'Diabetes Mellitus', GU: 'ડાયાબિટીસ (મધુપ્રમેહ)', HI: 'मधुमेह (डायबिटीज)' },
    eat: {
      EN: 'Green leafy vegetables, Whole grains, Pulses, Fresh salads, Bitter gourd, Cucumbers, Oats, Water',
      GU: 'લીલા પાંદડાવાળા શાકભાજી, આખા અનાજ, કઠોળ, તાજું કચુંબર (સલાડ), કારેલા, કાકડી, ઓટ્સ, પૂરતું પાણી',
      HI: 'हरी पत्तेदार सब्जियां, साबुत अनाज, दालें, ताजा सलाद, करेला, खीरा, ओट्स, पर्याप्त पानी',
    },
    avoid: {
      EN: 'Direct sugar, Sweets, Jaggery, Potatoes, Mangoes, Bananas, Bakery items, Soft drinks',
      GU: 'સીધી ખાંડ, મીઠાઈ, ગોળ, બટેટા, કેરી, કેળા, બેકરી ઉત્પાદનો, કોલ્ડ ડ્રિંક્સ',
      HI: 'सीधी चीनी, मिठाई, गुड़, आलू, आम, केला, बेकरी उत्पाद, कोल्ड ड्रिंक्स',
    },
  },
  SUGAR: {
    disease: { EN: 'High Blood Sugar / Diabetes', GU: 'ડાયાબિટીસ (સુગર)', HI: 'हाई ब्लड शुगर (डायबिटीज)' },
    eat: {
      EN: 'Green leafy vegetables, Whole grains, Pulses, Salads, Bitter gourd, Cucumbers, Oats',
      GU: 'લીલા શાકભાજી, કઠોળ, ઓટ્સ, કચુંબર, કારેલા, કાકડી',
      HI: 'हरी सब्जियां, दालें, ओट्स, सलाद, करेला, खीरा',
    },
    avoid: {
      EN: 'Direct sugar, Sweets, Jaggery, Potatoes, Bakery items, Cold drinks',
      GU: 'ખાંડ, મીઠાઈ, ગોળ, બટેટા, બેકરી આઈટમ, કોલ્ડ ડ્રિંક્સ',
      HI: 'चीनी, मिठाई, गुड़, आलू, बेकरी उत्पाद, कोल्ड ड्रिंक्स',
    },
  },
  BP: {
    disease: { EN: 'Hypertension (High BP)', GU: 'હાઈ બ્લડ પ્રેશર (હાયપરટેન્શન)', HI: 'उच्च रक्तचाप (हाइपरटेंशन)' },
    eat: {
      EN: 'Fresh fruits, Green vegetables, Oats, Garlic, Coconut water, Low-sodium food',
      GU: 'તાજા ફળો, લીલા શાકભાજી, ઓટ્સ, લસણ, નાળિયેર પાણી, ઓછું મીઠું ધરાવતો ખોરાક',
      HI: 'ताजे फल, हरी सब्जियां, ओट्स, लहसुन, नारियल पानी, कम नमक वाला भोजन',
    },
    avoid: {
      EN: 'Extra salt, Pickles, Papad, Processed cheese, Salty snacks, Fried items, Canned food',
      GU: 'વધારાનું મીઠું, અથાણું, પાપડ, ચીઝ, નમકીન, તળેલા નાસ્તા, પ્રોસેસ્ડ ફૂડ',
      HI: 'अतिरिक्त नमक, अचार, पापड़, प्रोसेस्ड चीज, नमकीन, तला हुआ नाश्ता, पैक्ड फूड',
    },
  },
  ACID: {
    disease: { EN: 'Acidity / GERD / Gastritis', GU: 'એસિડિટી / પિત્ત / ગેસ', HI: 'एसिडिटी / गैस / जलन' },
    eat: {
      EN: 'Cold milk, Coconut water, Bananas, Boiled vegetables, Oatmeal, Light home-cooked meals',
      GU: 'ઠંડુ દૂધ, નાળિયેર પાણી, કેળા, બાફેલી શાકભાજી, ઓટ્સ, હળવો સાદો ખોરાક',
      HI: 'ठंडा दूध, नारियल पानी, केला, उबली सब्जियां, ओट्स, हल्का सादा भोजन',
    },
    avoid: {
      EN: 'Spicy curries, Oily/fried foods, Tea, Coffee, Citrus fruits, Late night heavy meals',
      GU: 'તીખો મસાલેદાર ખોરાક, તળેલું, ચા, કોફી, ખાટા ફળો, રાત્રે મોડેથી ભારે ભોજન',
      HI: 'मसालेदार खाना, तला-भुना, चाय, कॉफी, खट्टे फल, रात में देर से भारी भोजन',
    },
  },
  THYROID: {
    disease: { EN: 'Hypothyroidism / Thyroid Disorders', GU: 'થાઇરોઇડ (હાયપોથાઇરોઇડિઝમ)', HI: 'थायराइड विकार' },
    eat: {
      EN: 'Iodized salt, Whole grains, Nuts, Roasted pumpkin seeds, Fresh fruits, Boiled eggs',
      GU: 'આયોડિનવાળું મીઠું, આખા અનાજ, બદામ, અખરોટ, કોળાના બીજ, તાજા ફળો, બાફેલા ઈંડા (સફેદ ભાગ)',
      HI: 'आयोडीन युक्त नमक, साबुत अनाज, मेवे, कद्दू के बीज, ताजे फल, उबले अंडे (सफेद भाग)',
    },
    avoid: {
      EN: 'Raw cabbage, Cauliflower, Broccoli, Soy products, Gluten, Processed junk food',
      GU: 'કાચી કોબીજ, ફ્લાવર, બ્રોકોલી, સોયાબીન ઉત્પાદનો, મેંદો, જંક ફૂડ',
      HI: 'कच्ची पत्तागोभी, फूलगोभी, ब्रोकली, सोया उत्पाद, मैदा, जंक फूड',
    },
  },
  URIC: {
    disease: { EN: 'Hyperuricemia / Gout (High Uric Acid)', GU: 'યુરિક એસિડ / વા (ગાઉટ)', HI: 'यूरिक एसिड / गठिया' },
    eat: {
      EN: 'Cherries, Lemons, Fresh green vegetables, High fluid intake, Low-fat curd, 3-4L water',
      GU: 'ચેરી, લીંબુ, લીલા શાકભાજી, છાશ, દહીં, દિવસમાં ૩-૪ લીટર પાણી',
      HI: 'चेरी, नींबू, हरी सब्जियां, छाछ, दही, दिन में ३-४ लीटर भरपूर पानी',
    },
    avoid: {
      EN: 'Red meat, Seafood, Organ meats, Beer/alcohol, Sugary drinks, High-purine pulses',
      GU: 'નોન-વેજ, સી-ફૂડ, આલ્કોહોલ, સોડા, ખાંડવાળા પીણા, વધુ પ્યુરીનવાળા કઠોળ',
      HI: 'मांसाहार, समुद्री भोजन, शराब, कोल्ड ड्रिंक्स, अधिक प्यूरीन वाली दालें',
    },
  },
  CV: {
    disease: { EN: 'Cardiovascular / Heart Disease / Cholesterol', GU: 'હૃદય રોગ / કોલેસ્ટ્રોલ', HI: 'हृदय रोग / कोलेस्ट्रॉल' },
    eat: {
      EN: 'Oats, Flaxseeds, Almonds, Olive oil, Boiled vegetables, Garlic, Apples',
      GU: 'ઓટ્સ, અળસી, બદામ, બાફેલી શાકભાજી, લસણ, સફરજન, ફાઈબરવાળો ખોરાક',
      HI: 'ओट्स, अलसी, बादाम, उबली सब्जियां, लहसुन, सेब, फाइबर युक्त आहार',
    },
    avoid: {
      EN: 'Red meat, Butter, Ghee in excess, Fried snacks, Trans fats, Packaged/processed fast foods',
      GU: 'વધુ પડતું ઘી, માખણ, તળેલા ફરસાણ, ટ્રાન્સ ફેટ, ફાસ્ટ ફૂડ',
      HI: 'अधिक घी, मक्खन, तले हुए स्नैक्स, ट्रांस फैट, फास्ट फूड',
    },
  },
  LQ: {
    disease: { EN: 'Viral Fever / Weakness / Dehydration', GU: 'તાવ / નબળાઈ / ડીહાઇડ્રેશન', HI: 'बुखार / कमजोरी / डिहाइड्रेशन' },
    eat: {
      EN: 'Plenty of warm fluids, Coconut water, Dal water, Khichdi, Soup, Boiled water',
      GU: 'હુંફાળું પાણી, નાળિયેર પાણી, મગની દાળનું પાણી, ખીચડી, ગરમ સૂપ',
      HI: 'गुनगुना पानी, नारियल पानी, मूंग दाल का पानी, खिचड़ी, गर्म सूप',
    },
    avoid: {
      EN: 'Cold beverages, Oily food, Heavy spicy meals, Street food, Hard-to-digest items',
      GU: 'ઠંડા પીણા, તેલવાળું, તીખું ભોજન, બહારનો ખુલ્લો ખોરાક, પચવામાં ભારે વસ્તુઓ',
      HI: 'ठंडे पेय, तला-भुना, तीखा भोजन, बाहर का खाना, पचने में भारी चीजें',
    },
  },
  STONE: {
    disease: { EN: 'Renal / Kidney Stone', GU: 'કિડની સ્ટોન (પથરી)', HI: 'गुर्दे की पथरी (किडनी स्टोन)' },
    eat: {
      EN: 'Plenty of water (3-4 Liters/day), Lemon water, Coconut water, Barley water, Watermelon',
      GU: 'રોજ ૩-૪ લીટર પાણી, લીંબુ પાણી, નાળિયેર પાણી, જવનું પાણી, તરબૂચ',
      HI: 'प्रतिदिन ३-४ लीटर पानी, नींबू पानी, नारियल पानी, जौ का पानी, तरबूज',
    },
    avoid: {
      EN: 'Spinach, Tomatoes with seeds, Beetroot, Chocolate, Excess salt, Red meat, Aerated drinks',
      GU: 'પાલક, ટામેટાના બીજ, બીટ, ચોકલેટ, વધુ મીઠું, સોડા અને કોલ્ડ ડ્રિંક્સ',
      HI: 'पालक, टमाटर के बीज, चुकंदर, चॉकलेट, अधिक नमक, कोल्ड ड्रिंक्स',
    },
  },
  CONST: {
    disease: { EN: 'Constipation & Indigestion', GU: 'કબજિયાત અને અપચો', HI: 'कब्ज और अपच' },
    eat: {
      EN: 'High-fibre diet, Papaya, Figs, Prunes, Green vegetables, Warm milk with isabgol, Warm water',
      GU: 'રેસાયુક્ત ખોરાક, પપૈયું, અંજીર, લીલા શાકભાજી, ઈસબગોલ, સવારે હુંફાળું પાણી',
      HI: 'फाइबर युक्त आहार, पपीता, अंजीर, हरी सब्जियां, ईसबगोल, सुबह गुनगुना पानी',
    },
    avoid: {
      EN: 'Refined flour (maida), Bakery items, Fast food, Tea/coffee excess, Dry snacks',
      GU: 'મેંદો, બેકરી આઈટમ, ફાસ્ટ ફૂડ, વધુ પડતી ચા/કોફી, સૂકો નાસ્તો',
      HI: 'मैदा, बेकरी उत्पाद, फास्ट फूड, अधिक चाय/कॉफी, सूखा नाश्ता',
    },
  },
  FEV: {
    disease: { EN: 'Fever / Viral Illness', GU: 'તાવ / શરદી / ઇન્ફેક્શન', HI: 'बुखार / संक्रमण' },
    eat: {
      EN: 'Moong dal khichdi, Warm vegetable soup, Boiled water, Coconut water, Pomegranate juice',
      GU: 'મગની દાળની ખીચડી, ગરમ વેજિટેબલ સૂપ, ઉકાળેલું હુંફાળું પાણી, નાળિયેર પાણી, દાડમનો રસ',
      HI: 'मूंग दाल खिचड़ी, गर्म वेज सूप, उबला गुनगुना पानी, नारियल पानी, अनार का रस',
    },
    avoid: {
      EN: 'Cold drinks, Ice cream, Heavy oily food, Sour/fried items, Stale food',
      GU: 'ઠંડા પીણા, આઈસ્ક્રીમ, તેલવાળું ભારે ભોજન, ખાટી વસ્તુઓ, વાસી ખોરાક',
      HI: 'ठंडे पेय, आइसक्रीम, भारी तैलीय भोजन, खट्टी चीजें, बासी खाना',
    },
  },
  LIPID: {
    disease: { EN: 'High Cholesterol / Triglycerides', GU: 'હાઈ કોલેસ્ટ્રોલ / ટ્રાઇગ્લિસરાઇડ', HI: 'उच्च कोलेस्ट्रॉल / ट्राइग्लिसराइड्स' },
    eat: {
      EN: 'Oats, Barley, Apples, Garlic, Methi seeds water, Green vegetables, Walnuts',
      GU: 'ઓટ્સ, સફરજન, લસણ, મેથીનું પાણી, લીલા શાકભાજી, અખરોટ',
      HI: 'ओट्स, सेब, लहसुन, मेथी का पानी, हरी सब्जियां, अखरोट',
    },
    avoid: {
      EN: 'Butter, Ghee, Deep-fried snacks, Red meat, Cheese, Egg yolk, Bakery products',
      GU: 'માખણ, વધુ ઘી, તળેલા ફરસાણ, ચીઝ, ઈંડાની જરદી, બેકરી આઈટમ',
      HI: 'मक्खन, अधिक घी, तले हुए स्नैक्स, चीज, अंडे की जर्दी, बेकरी उत्पाद',
    },
  },
  LIVER: {
    disease: { EN: 'Liver Care / Fatty Liver / Jaundice', GU: 'લીવરની તકલીફ / કમળો / ફેટી લીવર', HI: 'लिवर रोग / पीलिया / फैटी लिवर' },
    eat: {
      EN: 'Boiled food, Papaya, Coconut water, Radish, Sugarcane juice, Light moong dal, Lemon water',
      GU: 'બાફેલો ખોરાક, પપૈયું, નાળિયેર પાણી, મૂળો, શેરડીનો રસ, મગની દાળ, લીંબુ પાણી',
      HI: 'उबला भोजन, पपीता, नारियल पानी, मूली, गन्ने का रस, मूंग दाल, नींबू पानी',
    },
    avoid: {
      EN: 'Oily and fried foods, Alcohol, Heavy spices, Ghee, Butter, Outside fast foods',
      GU: 'તેલવાળું અને તળેલું ભોજન, દારૂ / આલ્કોહોલ, તીખા મસાલા, ઘી, માખણ, બહારનો ખોરાક',
      HI: 'तैलीय और तला-भुना खाना, शराब, तेज मसाले, घी, मक्खन, बाहर का फास्ट फूड',
    },
  },
  WEIGHT: {
    disease: { EN: 'Weight Loss & Obesity Management', GU: 'વજન નિયંત્રણ / સ્થૂળતા નિવારણ', HI: 'वजन घटाने व मोटापा नियंत्रण' },
    eat: {
      EN: 'Fresh green salads, Sprouts, Oats, Warm water with lemon, Green tea, Cucumber, Low-calorie soups',
      GU: 'તાજું કચુંબર (સલાડ), ફણગાવેલા કઠોળ, ઓટ્સ, સવારે હુંફાળું લીંબુ પાણી, ગ્રીન ટી, કાકડી, વેજ સૂપ',
      HI: 'ताजा सलाद, अंकुरित अनाज, ओट्स, गुनगुना नींबू पानी, ग्रीन टी, खीरा, वेज सूप',
    },
    avoid: {
      EN: 'Sugar, Sweets, Potatoes, White rice excess, Fried snacks, Soft drinks, Fast food, Bakery items',
      GU: 'ખાંડ, મીઠાઈ, બટેટા, વધુ ભાત, તળેલા ફરસાણ, કોલ્ડ ડ્રિંક્સ, ફાસ્ટ ફૂડ, બેકરી પ્રોડક્ટ્સ',
      HI: 'चीनी, मिठाई, आलू, अधिक चावल, तले हुए स्नैक्स, कोल्ड ड्रिंक्स, फास्ट फूड, बेकरी आइटम',
    },
  },
};

// Exhaustive Dictionary for Individual Food and Dietary Items (100+ items in EN, GU, HI)
export const FOOD_TRANSLATIONS = {
  // Vegetables
  'green leafy vegetables': { GU: 'લીલા પાંદડાવાળા શાકભાજી', HI: 'हरी पत्तेदार सब्जियां' },
  'green vegetables': { GU: 'લીલા શાકભાજી', HI: 'हरी सब्जियां' },
  'leafy vegetables': { GU: 'પાંદડાવાળા શાકભાજી', HI: 'पत्तेदार सब्जियां' },
  'bitter gourd': { GU: 'કારેલા', HI: 'करेला' },
  'karela': { GU: 'કારેલા', HI: 'करेला' },
  'bottle gourd': { GU: 'દૂધી', HI: 'लौकी' },
  'lauki': { GU: 'દૂધી', HI: 'लौकी' },
  'dudhi': { GU: 'દૂધી', HI: 'लौકી' },
  'cucumber': { GU: 'કાકડી', HI: 'खीरा' },
  'cucumbers': { GU: 'કાકડી', HI: 'खीरा' },
  'spinach': { GU: 'પાલક', HI: 'पालक' },
  'palak': { GU: 'પાલક', HI: 'पालक' },
  'boiled vegetables': { GU: 'બાફેલી શાકભાજી', HI: 'उबली सब्जियां' },
  'raw vegetables': { GU: 'કાચા શાકભાજી', HI: 'कच्ची सब्जियां' },
  'fresh salads': { GU: 'તાજું કચુંબર (સલાડ)', HI: 'ताजा सलाद' },
  'fresh green salads': { GU: 'તાજું લીલું કચુંબર (સલાડ)', HI: 'ताजा हरा सलाद' },
  'salads': { GU: 'કચુંબર (સલાડ)', HI: 'सलाद' },
  'salad': { GU: 'કચુંબર', HI: 'सलाद' },
  'garlic': { GU: 'લસણ', HI: 'लहसुन' },
  'ginger': { GU: 'આદુ', HI: 'अदरक' },
  'fenugreek': { GU: 'મેથી', HI: 'मेथी' },
  'methi': { GU: 'મેથી', HI: 'मेथी' },
  'methi seeds': { GU: 'મેથીના દાણા', HI: 'मेथी दाना' },
  'methi seeds water': { GU: 'મેથીનું પાણી', HI: 'मेथी का पानी' },
  'potatoes': { GU: 'બટેટા', HI: 'आलू' },
  'potato': { GU: 'બટેટા', HI: 'आलू' },
  'aloo': { GU: 'બટેટા', HI: 'आलू' },
  'sweet potato': { GU: 'શક્કરીયા', HI: 'शकरकंद' },
  'tomatoes with seeds': { GU: 'ટામેટા (બીજવાળા)', HI: 'टमाटर (बीज वाले)' },
  'tomatoes': { GU: 'ટામેટા', HI: 'टमाटर' },
  'tomato': { GU: 'ટામેટા', HI: 'टमाटर' },
  'raw cabbage': { GU: 'કાચી કોબીજ', HI: 'कच्ची पत्तागोभी' },
  'cabbage': { GU: 'કોબીજ', HI: 'पत्तागोभी' },
  'cauliflower': { GU: 'ફ્લાવર', HI: 'फूलगोभी' },
  'broccoli': { GU: 'બ્રોકોલી', HI: 'ब्रोकली' },
  'brinjal': { GU: 'રીંગણ', HI: 'बैंगन' },
  'eggplant': { GU: 'રીંગણ', HI: 'बैंगन' },
  'baingan': { GU: 'રીંગણ', HI: 'बैंगन' },
  'beetroot': { GU: 'બીટ', HI: 'चुकंदर' },
  'radish': { GU: 'મૂળો', HI: 'मूली' },
  'mooli': { GU: 'મૂળો', HI: 'मूली' },
  'carrot': { GU: 'ગાજર', HI: 'गाजर' },
  'carrots': { GU: 'ગાજર', HI: 'गाजर' },
  'gajar': { GU: 'ગાજર', HI: 'गाजर' },
  'onion': { GU: 'ડુંગળી (કાંદા)', HI: 'प्याज' },
  'onions': { GU: 'ડુંગળી (કાંદા)', HI: 'प्याज' },
  'ladyfinger': { GU: 'ભીંડા', HI: 'भिंडी' },
  'bhindi': { GU: 'ભીંડા', HI: 'भिंडी' },
  'okra': { GU: 'ભીંડા', HI: 'भिंडी' },
  'green peas': { GU: 'લીલા વટાણા', HI: 'हरी मटर' },
  'peas': { GU: 'વટાણા', HI: 'मटर' },
  'matar': { GU: 'વટાણા', HI: 'मटर' },
  'capsicum': { GU: 'શિમલા મરચાં', HI: 'शिमला मिर्च' },
  'bell pepper': { GU: 'શિમલા મરચાં', HI: 'शिमला मिर्च' },
  'coriander': { GU: 'કોથમીર', HI: 'धनिया' },
  'cilantro': { GU: 'કોથમીર', HI: 'धनिया' },
  'mint': { GU: 'ફુદીનો', HI: 'पुदीना' },
  'pudina': { GU: 'ફુદીનો', HI: 'पुदीना' },
  'drumstick': { GU: 'સરગવો', HI: 'सहजन (ड्रमस्टिक)' },
  'saragvo': { GU: 'સરગવો', HI: 'सहजन' },
  'pumpkin': { GU: 'કોળું', HI: 'कद्दू' },
  'raw banana': { GU: 'કાચા કેળા', HI: 'कच्चा केला' },

  // Grains, Cereals & Pulses
  'whole grains': { GU: 'આખા અનાજ', HI: 'साबुत अनाज' },
  'oats': { GU: 'ઓટ્સ', HI: 'ઓટ્સ' },
  'oatmeal': { GU: 'ઓટ્સ', HI: 'ઓટ્સ' },
  'barley': { GU: 'જવ', HI: 'जौ' },
  'barley water': { GU: 'જવનું પાણી', HI: 'जौ का पानी' },
  'pulses': { GU: 'કઠોળ', HI: 'दालें' },
  'lentils': { GU: 'કઠોળ', HI: 'दालें' },
  'sprouted pulses': { GU: 'ફણગાવેલા કઠોળ', HI: 'अंकुरित अनाज' },
  'sprouts': { GU: 'ફણગાવેલા કઠોળ (સ્પ્રાઉટ્સ)', HI: 'अंकुरित अनाज' },
  'dal': { GU: 'દાળ', HI: 'दाल' },
  'moong dal': { GU: 'મગની દાળ', HI: 'मूंग दाल' },
  'light moong dal': { GU: 'હળવી મગની દાળ', HI: 'हल्की मूंग दाल' },
  'whole green moong': { GU: 'આખા મગ', HI: 'साबुत मूंग' },
  'moong dal khichdi': { GU: 'મગની દાળની ખીચડી', HI: 'मूंग दाल खिचड़ी' },
  'dal water': { GU: 'મગની દાળનું પાણી', HI: 'दाल का पानी' },
  'khichdi': { GU: 'ખીચડી', HI: 'खिचड़ी' },
  'rice': { GU: 'ભાત (ચોખા)', HI: 'चावल' },
  'white rice': { GU: 'સફેદ ચોખા', HI: 'सफेद चावल' },
  'white rice excess': { GU: 'વધુ પડતા સફેદ ચોખા / ભાત', HI: 'अधिक सफेद चावल' },
  'brown rice': { GU: 'બ્રાઉન રાઇસ', HI: 'ब्राउन राइस' },
  'roti': { GU: 'રોટલી', HI: 'रोटी' },
  'chapati': { GU: 'રોટલી', HI: 'चपाती' },
  'phulka': { GU: 'ફુલકા રોટલી', HI: 'फुल्का रोटी' },
  'bhakhri': { GU: 'ભાખરી', HI: 'भाखरी' },
  'thepla': { GU: 'થેપલા', HI: 'थेपला' },
  'refined flour': { GU: 'મેંદો', HI: 'मैदा' },
  'refined flour (maida)': { GU: 'મેંદો', HI: 'मैदा' },
  'maida': { GU: 'મેંદો', HI: 'मैदा' },
  'gluten': { GU: 'ગ્લુટેન / મેંદો', HI: 'ग्लूटेन / मैदा' },
  'wheat': { GU: 'ઘઉં', HI: 'गेहूं' },
  'bajra': { GU: 'બાજરો', HI: 'बाजरा' },
  'jowar': { GU: 'જુવાર', HI: 'ज्वार' },
  'ragi': { GU: 'રાગી / નાચણી', HI: 'रागी' },
  'chana dal': { GU: 'ચણાની દાળ', HI: 'चना दाल' },
  'chana': { GU: 'ચણા', HI: 'चना' },
  'chickpeas': { GU: 'કાબુલી ચણા', HI: 'काबुली चना' },
  'toor dal': { GU: 'તુવેર દાળ', HI: 'अरहर दाल' },
  'urad dal': { GU: 'અડદની દાળ', HI: 'उड़द दाल' },
  'masoor dal': { GU: 'મસૂર દાળ', HI: 'मसूर दाल' },
  'rajma': { GU: 'રાજમા', HI: 'राजमा' },
  'kidney beans': { GU: 'રાજમા', HI: 'राजमा' },
  'soybean': { GU: 'સોયાબીન', HI: 'सोयाबीन' },
  'daliya': { GU: 'દલિયા / ફાડા ઘઉં', HI: 'दलिया' },
  'poha': { GU: 'પૌંઆ', HI: 'पोहा' },
  'suji': { GU: 'સોજી / રવો', HI: 'सूजी' },
  'rava': { GU: 'રવો / સોજી', HI: 'रवा' },
  'sabudana': { GU: 'સાબુદાણા', HI: 'साबूदाना' },

  // Fruits
  'fresh fruits': { GU: 'તાજા ફળો', HI: 'ताजे फल' },
  'fruits': { GU: 'ફળો', HI: 'फल' },
  'apple': { GU: 'સફરજન', HI: 'सेब' },
  'apples': { GU: 'સફરજન', HI: 'सेब' },
  'papaya': { GU: 'પપૈયું', HI: 'पपीता' },
  'pomegranate': { GU: 'દાડમ', HI: 'अनार' },
  'pomegranate juice': { GU: 'દાડમનો રસ', HI: 'अनार का रस' },
  'watermelon': { GU: 'તરબૂચ', HI: 'तरबूज' },
  'muskmelon': { GU: 'ટેટી / શક્કરટેટી', HI: 'खरबूजा' },
  'cherries': { GU: 'ચેરી', HI: 'चेरी' },
  'figs': { GU: 'અંજીર', HI: 'अंजीर' },
  'anjeer': { GU: 'અંજીર', HI: 'अंजीर' },
  'prunes': { GU: 'સૂકા આલુબુખારા', HI: 'सूखे आलूबुखारा' },
  'mangoes': { GU: 'કેરી', HI: 'आम' },
  'mango': { GU: 'કેરી', HI: 'आम' },
  'bananas': { GU: 'કેળા', HI: 'केला' },
  'banana': { GU: 'કેળા', HI: 'केला' },
  'citrus fruits': { GU: 'ખાટા ફળો (મોસંબી/સંતરા)', HI: 'खट्टे फल' },
  'oranges': { GU: 'સંતરા', HI: 'संतरे' },
  'orange': { GU: 'સંતરા', HI: 'संतरा' },
  'mosambi': { GU: 'મોસંબી', HI: 'मौसंबी' },
  'sweet lime': { GU: 'મોસંબી', HI: 'मौसंबी' },
  'lemon': { GU: 'લીંબુ', HI: 'नींबू' },
  'lemons': { GU: 'લીંબુ', HI: 'नींबू' },
  'lemon water': { GU: 'લીંબુ પાણી', HI: 'नींबू पानी' },
  'warm water with lemon': { GU: 'સવારે હુંફાળું લીંબુ પાણી', HI: 'गुनगुना नींबू पानी' },
  'guava': { GU: 'જામફળ', HI: 'अमरूद' },
  'grapes': { GU: 'દ્રાક્ષ', HI: 'अंगूर' },
  'chikoo': { GU: 'ચીકુ', HI: 'चीकू' },
  'pineapple': { GU: 'અનાનસ', HI: 'अनानास' },
  'kiwi': { GU: 'કીવી', HI: 'कीवी' },
  'amla': { GU: 'આમળા', HI: 'आंवला' },
  'jamun': { GU: 'જાંબુ', HI: 'जामुन' },
  'sugarcane juice': { GU: 'શેરડીનો રસ', HI: 'गन्ने का रस' },

  // Nuts & Seeds
  'almonds': { GU: 'બદામ', HI: 'बादाम' },
  'walnuts': { GU: 'અખરોટ', HI: 'अखरोट' },
  'flaxseeds': { GU: 'અળસી', HI: 'अलसी' },
  'chia seeds': { GU: 'ચિયા સીડ્સ', HI: 'चिया बीज' },
  'nuts': { GU: 'સૂકો મેવો (ડ્રાયફ્રુટ્સ)', HI: 'मेवे' },
  'dry fruits': { GU: 'સૂકો મેવો', HI: 'ड्राई फ्रूट्स' },
  'pumpkin seeds': { GU: 'કોળાના બીજ', HI: 'कद्दू के बीज' },
  'roasted pumpkin seeds': { GU: 'શેકેલા કોળાના બીજ', HI: 'भुने कद्दू के बीज' },
  'sunflower seeds': { GU: 'સૂર્યમુખીના બીજ', HI: 'सूरजमुखी के बीज' },
  'sesame seeds': { GU: 'તલ', HI: 'तिल' },
  'til': { GU: 'તલ', HI: 'तिल' },
  'cashews': { GU: 'કાજુ', HI: 'काजू' },
  'kaju': { GU: 'કાજુ', HI: 'काजू' },
  'raisins': { GU: 'કિસમિસ (દ્રાક્ષ)', HI: 'किशमिश' },
  'dates': { GU: 'ખજૂર', HI: 'खजूर' },
  'khajur': { GU: 'ખજૂર', HI: 'खजूर' },
  'pistachios': { GU: 'પિસ્તા', HI: 'पिस्ता' },
  'peanuts': { GU: 'સીંગદાણા', HI: 'मूंगफली' },

  // Dairy & Liquids
  'cold milk': { GU: 'ઠંડુ દૂધ', HI: 'ठंडा दूध' },
  'warm milk': { GU: 'હુંફાળું દૂધ', HI: 'गुनगुना दूध' },
  'milk': { GU: 'દૂધ', HI: 'दूध' },
  'coconut water': { GU: 'નાળિયેર પાણી', HI: 'नारियल पानी' },
  'buttermilk': { GU: 'છાશ (મોળી)', HI: 'छाछ' },
  'curd': { GU: 'દહીં', HI: 'दही' },
  'low-fat curd': { GU: 'ઓછી ચરબીવાળું દહીં / છાશ', HI: 'कम वसा वाला दही' },
  'paneer': { GU: 'પનીર', HI: 'पनीर' },
  'low-fat paneer': { GU: 'ઓછી ચરબીવાળું પનીર', HI: 'कम वसा वाला पनीर' },
  'boiled water': { GU: 'ઉકાળેલું પાણી', HI: 'उबला पानी' },
  'warm water': { GU: 'હુંફાળું પાણી', HI: 'गुनगुना पानी' },
  'boiled food': { GU: 'બાફેલો હળવો ખોરાક', HI: 'उबला हल्का भोजन' },
  'plenty of warm fluids': { GU: 'હુંફાળા પ્રવાહી (સૂપ, દાળનું પાણી)', HI: 'गुनगुने तरल पदार्थ' },
  'high fluid intake': { GU: 'ભરપૂર પાણી અને પ્રવાહી', HI: 'भरपूर पानी और तरल पदार्थ' },
  'plenty of water': { GU: 'રોજ ૩-૪ લીટર પાણી', HI: 'भरपूर पानी (३-४ लीटर)' },
  'plenty of water (3-4 liters/day)': { GU: 'રોજ ૩-૪ લીટર પાણી', HI: 'प्रतिदिन ३-૪ लीटर पानी' },
  '3-4l water': { GU: 'રોજ ૩-૪ લીટર પાણી', HI: 'प्रतिदिन ३-૪ लीटर पानी' },
  'water': { GU: 'પૂરતું પાણી', HI: 'पर्याप्त पानी' },
  'soup': { GU: 'ગરમ વેજિટેબલ સૂપ', HI: 'सूप' },
  'warm vegetable soup': { GU: 'ગરમ વેજિટેબલ સૂપ', HI: 'गर्म सब्जियों का सूप' },
  'vegetable soup': { GU: 'ગરમ વેજિટેબલ સૂપ', HI: 'सब्जियों का सूप' },
  'low-calorie soups': { GU: 'હળવો વેજિટેબલ સૂપ', HI: 'हल्का वेज सूप' },
  'green tea': { GU: 'ગ્રીન ટી', HI: 'ग्रीन टी' },
  'isabgol': { GU: 'ઈસબગોલ', HI: 'ईसबगोल' },
  'warm milk with isabgol': { GU: 'રાત્રે હુંફાળા દૂધ સાથે ઈસબગોલ', HI: 'गुनगुने दूध के साथ ईसबगोल' },
  'iodized salt': { GU: 'આયોડિનયુક્ત મીઠું', HI: 'आयोडीन युक्त नमक' },
  'rock salt': { GU: 'સિંધવ મીઠું (સેંધા નમક)', HI: 'सेंधा नमक' },
  'olive oil': { GU: 'ઓલિવ ઓઈલ', HI: 'जैतून का तेल' },
  'low-sodium food': { GU: 'ઓછા મીઠાવાળો ખોરાક', HI: 'कम नमक वाला भोजन' },
  'light home-cooked meals': { GU: 'હળવો સાદો ઘરનો ખોરાક', HI: 'हल्का सादा घर का खाना' },
  'high-fibre diet': { GU: 'રેસાયુક્ત (ફાઈબરવાળો) ખોરાક', HI: 'फाइबर युक्त आहार' },

  // Sweets & Sugars (Avoid)
  'direct sugar': { GU: 'સીધી ખાંડ', HI: 'सीधी चीनी' },
  'sugar': { GU: 'ખાંડ', HI: 'चीनी' },
  'sweets': { GU: 'મીઠાઈ', HI: 'मिठाई' },
  'sweet': { GU: 'મીઠાઈ', HI: 'मिठाई' },
  'jaggery': { GU: 'ગોળ', HI: 'गुड़' },
  'gur': { GU: 'ગોળ', HI: 'गुड़' },
  'honey': { GU: 'મધ', HI: 'शहद' },
  'chocolate': { GU: 'ચોકલેટ', HI: 'चॉकलेट' },
  'chocolates': { GU: 'ચોકલેટ', HI: 'चॉकलेट' },
  'ice cream': { GU: 'આઈસ્ક્રીમ', HI: 'आइसक्रीम' },
  'bakery items': { GU: 'બેકરી ઉત્પાદનો (બિસ્કીટ, પાવ, કેક)', HI: 'बेकरी उत्पाद (बिस्कुट, पाव, केक)' },
  'bakery products': { GU: 'બેકરી ઉત્પાદનો', HI: 'बेकरी उत्पाद' },
  'biscuits': { GU: 'બિસ્કીટ', HI: 'बिस्कुट' },
  'bread': { GU: 'બ્રેડ', HI: 'ब्रेड' },
  'toast': { GU: 'ટોસ્ટ / રસ્ક', HI: 'टोस्ट' },
  'soft drinks': { GU: 'કોલ્ડ ડ્રિંક્સ / ઠંડા પીણા', HI: 'कोल्ड ड्रिंक्स / शीतल पेय' },
  'cold drinks': { GU: 'ઠંડા પીણા (કોલ્ડ ડ્રિંક્સ)', HI: 'शीतल पेय (कोल्ड ड्रिंક્સ)' },
  'cold beverages': { GU: 'ઠંડા પીણા', HI: 'ठंडे पेय' },
  'aerated drinks': { GU: 'સોડા / કોલ્ડ ડ્રિંક્સ', HI: 'सोडा / कोल्ड ड्रिंक्स' },
  'sugary drinks': { GU: 'ખાંડવાળા પીણા / સોડા', HI: 'मीठे पेय / सोडा' },

  // Oily, Salty & Spicy Foods (Avoid)
  'extra salt': { GU: 'વધારાનું મીઠું', HI: 'अतिरिक्त नमक' },
  'excess salt': { GU: 'વધુ મીઠું', HI: 'अधिक नमक' },
  'salt': { GU: 'મીઠું', HI: 'नमक' },
  'pickles': { GU: 'અથાણું', HI: 'अचार' },
  'pickle': { GU: 'અથાણું', HI: 'अचार' },
  'papad': { GU: 'પાપડ', HI: 'પાપડ' },
  'salty snacks': { GU: 'ખારા નાસ્તા / નમકીન', HI: 'नमकीन / खारे स्नैक्स' },
  'dry snacks': { GU: 'સૂકો નાસ્તો', HI: 'सूखा नाश्ता' },
  'namkeen': { GU: 'નમકીન / ફરસાણ', HI: 'नमकीन' },
  'farsan': { GU: 'તળેલા ફરસાણ', HI: 'फरसाण / नमकीन' },
  'fried snacks': { GU: 'તળેલા નાસ્તા / ફરસાણ', HI: 'तले हुए स्नैक्स' },
  'deep-fried snacks': { GU: 'વધુ તળેલા નાસ્તા / ફરસાણ', HI: 'तले हुए स्नैक्स' },
  'fried items': { GU: 'તળેલી વસ્તુઓ', HI: 'तली हुई चीजें' },
  'fried food': { GU: 'તળેલો ખોરાક', HI: 'तला हुआ भोजन' },
  'fried foods': { GU: 'તળેલો ખોરાક', HI: 'तला हुआ भोजन' },
  'oily food': { GU: 'તેલવાળો ખોરાક', HI: 'तैलीय भोजन' },
  'oily foods': { GU: 'તેલવાળો ખોરાક', HI: 'तैलीय भोजन' },
  'oily/fried foods': { GU: 'તેલવાળો અને તળેલો ખોરાક', HI: 'तैलीय और तला हुआ खाना' },
  'oily and fried foods': { GU: 'તેલવાળો અને તળેલો ખોરાક', HI: 'तैलीय और तला-भुना खाना' },
  'heavy oily food': { GU: 'તેલવાળું ભારે ભોજન', HI: 'भारी तैलीय भोजन' },
  'spicy food': { GU: 'તીખો મસાલેદાર ખોરાક', HI: 'तीखा मसालेदार भोजन' },
  'spicy foods': { GU: 'તીખો મસાલેદાર ખોરાક', HI: 'तीखा मसालेदार खाना' },
  'spicy curries': { GU: 'તીખા રસાવાળા શાક', HI: 'तीखी मसालेदार सब्जियां' },
  'heavy spicy meals': { GU: 'તીખું અને ભારે ભોજન', HI: 'तीखा और भारी भोजन' },
  'heavy spices': { GU: 'વધુ પડતા તીખા મસાલા', HI: 'तेज मसाले' },
  'sour/fried items': { GU: 'ખાટી અને તળેલી વસ્તુઓ', HI: 'खट्टी और तली हुई चीजें' },
  'fast food': { GU: 'ફાસ્ટ ફૂડ', HI: 'फास्ट फूड' },
  'fast foods': { GU: 'ફાસ્ટ ફૂડ', HI: 'फास्ट फूड' },
  'outside fast foods': { GU: 'બહારનો ફાસ્ટ ફૂડ', HI: 'बाहर का फास्ट फूड' },
  'junk food': { GU: 'જંક ફૂડ', HI: 'जंक फूड' },
  'processed junk food': { GU: 'પ્રોસેસ્ડ જંક ફૂડ', HI: 'पैक्ड जंक फूड' },
  'packaged/processed fast foods': { GU: 'પેકેજ્ડ ફાસ્ટ ફૂડ', HI: 'पैकेज्ड फास्ट फूड' },
  'street food': { GU: 'બહારનો ખુલ્લો ખોરાક', HI: 'बाहर का खाना' },
  'hard-to-digest items': { GU: 'પચવામાં ભારે વસ્તુઓ', HI: 'पचने में भारी चीजें' },
  'butter': { GU: 'માખણ', HI: 'मक्खन' },
  'ghee': { GU: 'વધુ પડતું ઘી', HI: 'अधिक घी' },
  'ghee in excess': { GU: 'વધુ પડતું ઘી', HI: 'अधिक घी' },
  'cheese': { GU: 'ચીઝ', HI: 'चीज' },
  'processed cheese': { GU: 'ચીઝ / પ્રોસેસ્ડ ફૂડ', HI: 'चीज' },
  'trans fats': { GU: 'ટ્રાન્સ ફેટ', HI: 'ट्रांस फैट' },
  'tea': { GU: 'ચા', HI: 'चाय' },
  'coffee': { GU: 'કોફી', HI: 'कॉफी' },
  'tea, coffee': { GU: 'ચા, કોફી', HI: 'चाय, कॉफी' },
  'tea/coffee excess': { GU: 'વધુ પડતી ચા/કોફી', HI: 'अधिक चाय/कॉफी' },
  'alcohol': { GU: 'દારૂ / આલ્કોહોલ', HI: 'शराब' },
  'beer': { GU: 'બીયર / આલ્કોહોલ', HI: 'बीयर / शराब' },
  'beer/alcohol': { GU: 'દારૂ / આલ્કોહોલ', HI: 'शराब / बीयर' },
  'smoking': { GU: 'સિગારેટ / ધૂમ્રપાન', HI: 'धूम्रपान' },
  'tobacco': { GU: 'તંબાકુ / ગુટખા', HI: 'तंबाकू' },
  'red meat': { GU: 'માંસાહાર (નોન-વેજ)', HI: 'मांसाहार' },
  'non-veg': { GU: 'માંસાહાર (નોન-વેજ)', HI: 'मांसाहार' },
  'meat': { GU: 'માંસાહાર', HI: 'मांसाहार' },
  'organ meats': { GU: 'નોન-વેજ / ઓર્ગન મીટ', HI: 'मांसाहार' },
  'seafood': { GU: 'સી-ફૂડ (માછલી/ઝીંગા)', HI: 'समुद्री भोजन' },
  'fish': { GU: 'માછલી', HI: 'मछली' },
  'chicken': { GU: 'ચિકન (માંસાહાર)', HI: 'चिकन' },
  'egg yolk': { GU: 'ઈંડાની જરદી (પીળો ભાગ)', HI: 'अंडे की जर्दी' },
  'boiled eggs': { GU: 'બાફેલા ઈંડા (સફેદ ભાગ)', HI: 'उबले अंडे (सफेद भाग)' },
  'eggs': { GU: 'ઈંડા', HI: 'अंडे' },
  'egg': { GU: 'ઈંડું', HI: 'अंडा' },
  'stale food': { GU: 'વાસી ખોરાક', HI: 'बासी खाना' },
  'late night heavy meals': { GU: 'રાત્રે મોડેથી ભારે ભોજન', HI: 'रात में देर से भारी भोजन' },
  'canned food': { GU: 'પેક્ડ / તૈયાર ખોરાક', HI: 'पैक्ड फूड' },
  'high-purine pulses': { GU: 'વધુ પ્યુરીનવાળા કઠોળ', HI: 'अधिक प्यूरीन वाली दालें' },
  'soy products': { GU: 'સોયાબીન ઉત્પાદનો', HI: 'सोया उत्पाद' },

  // Common Medical Complaints, Diagnoses & Symptoms
  'fever': { GU: 'તાવ', HI: 'बुखार' },
  'viral fever': { GU: 'વાઇરલ તાવ', HI: 'वायरल बुखार' },
  'high fever': { GU: 'વધુ તાવ', HI: 'तेज बुखार' },
  'cold': { GU: 'શરદી', HI: 'सर्दी / जुकाम' },
  'cough': { GU: 'ખાંસી / ઉધરસ', HI: 'खांसी' },
  'dry cough': { GU: 'સૂકી ખાંસી', HI: 'सूखी खांसी' },
  'wet cough': { GU: 'કફવાળી ખાંસી', HI: 'बलगम वाली खांसी' },
  'headache': { GU: 'માથાનો દુઃખાવો', HI: 'सिरदर्द' },
  'body ache': { GU: 'શરીરનો દુઃખાવો', HI: 'बदन दर्द' },
  'weakness': { GU: 'નબળાઈ', HI: 'कमजोरी' },
  'vomiting': { GU: 'ઉલટી', HI: 'उल्टी' },
  'nausea': { GU: 'ઉબકા', HI: 'जी मिचलाना' },
  'loose motion': { GU: 'ઝાડા / ડાયરિયા', HI: 'दस्त' },
  'loose motions': { GU: 'ઝાડા', HI: 'दस्त' },
  'diarrhea': { GU: 'ઝાડા', HI: 'दस्त' },
  'constipation': { GU: 'કબજિયાત', HI: 'कब्ज' },
  'acidity': { GU: 'એસિડિટી', HI: 'एसिडिटी' },
  'gas': { GU: 'ગેસ / વાયુ', HI: 'गैस' },
  'chest pain': { GU: 'છાતીમાં દુઃખાવો', HI: 'सीने में दर्द' },
  'joint pain': { GU: 'સાંધાનો દુઃખાવો', HI: 'जोड़ों का दर्द' },
  'knee pain': { GU: 'ઘૂંટણનો દુઃખાવો', HI: 'घुटनों का दर्द' },
  'back pain': { GU: 'કમરનો દુઃખાવો', HI: 'कमर दर्द' },
  'throat pain': { GU: 'ગળામાં દુઃખાવો', HI: 'गले में दर्द' },
  'sore throat': { GU: 'ગળામાં ખારાશ', HI: 'गले में खराश' },
  'infection': { GU: 'ઇન્ફેક્શન / ચેપ', HI: 'संक्रमण' },
  'throat infection': { GU: 'ગળાનું ઇન્ફેક્શન', HI: 'गले का संक्रमण' },
  'chest infection': { GU: 'છાતીનું ઇન્ફેક્શન', HI: 'छाती का संक्रमण' },
  'uti': { GU: 'પેશાબમાં ઇન્ફેક્શન (UTI)', HI: 'पेशाब में इन्फेक्शन (UTI)' },
  'typhoid': { GU: 'ટાઈફોઈડ', HI: 'टाइफाइड' },
  'malaria': { GU: 'મેલેરિયા', HI: 'मलेरिया' },
  'dengue': { GU: 'ડેન્ગ્યુ', HI: 'डेंगू' },
  'jaundice': { GU: 'કમળો', HI: 'पीलिया' },
  'allergy': { GU: 'એલર્જી', HI: 'एलर्जी' },
  'asthma': { GU: 'દમ / અસ્થમા', HI: 'दमा / अस्थमा' },
  'breathlessness': { GU: 'શ્વાસ ચડવો', HI: 'सांस फूलना' },
  'hypertension': { GU: 'હાઈ બ્લડ પ્રેશર', HI: 'उच्च रक्तचाप' },
  'diabetes': { GU: 'ડાયાબિટીસ (મધુપ્રમેહ)', HI: 'मधुमेह (डायबिटीज)' },
  'gout': { GU: 'વા / ગાઉટ (યુરિક એસિડ)', HI: 'गठिया (यूरिक एसिड)' },
  'migraine': { GU: 'આધાશીશી (માઈગ્રેન)', HI: 'माइग्रेन' },
  'indigestion': { GU: 'અપચો', HI: 'अपच / बदहजमी' },

  // Investigations / Lab Tests
  'cbc': { GU: 'સી.બી.સી. (લોહીની તપાસ)', HI: 'सी.बी.सी. ब्लड टेस्ट' },
  'complete blood count': { GU: 'સંપૂર્ણ લોહી તપાસ (CBC)', HI: 'सी.बी.सी. जांच' },
  'widal': { GU: 'વિડાલ ટેસ્ટ (ટાઈફોઈડ)', HI: 'विडाल टेस्ट' },
  'widal test': { GU: 'વિડાલ ટેસ્ટ (ટાઈફોઈડ)', HI: 'विडाल टेस्ट' },
  'rbs': { GU: 'રેન્ડમ બ્લડ સુગર (RBS)', HI: 'ब्लड शुगर (RBS)' },
  'fbs': { GU: 'ફાસ્ટિંગ બ્લડ સુગર (FBS)', HI: 'फास्टिंग शुगर (FBS)' },
  'pp2bs': { GU: 'પોસ્ટ પ્રાંડિયલ સુગર (PP2BS)', HI: 'पीपी शुगर (PP2BS)' },
  'hba1c': { GU: 'HbA1c (૩ મહિનાની સુગર)', HI: 'HbA1c टेस्ट' },
  'lipid profile': { GU: 'લિપિડ પ્રોફાઇલ (કોલેસ્ટ્રોલ તપાસ)', HI: 'लिपिड प्रोफाइल' },
  'lft': { GU: 'લીવર ફંક્શન ટેસ્ટ (LFT)', HI: 'लिवर फंक्शन टेस्ट' },
  'kft': { GU: 'કિડની ફંક્શન ટેસ્ટ (KFT)', HI: 'किडनी फंक्शन टेस्ट' },
  'creatinine': { GU: 'સીરમ ક્રિએટિનાઇન', HI: 'सीरम क्रिएटिनिन' },
  'serum uric acid': { GU: 'યુરિક એસિડ રિપોર્ટ', HI: 'यूरिक एसिड जांच' },
  'uric acid test': { GU: 'યુરિક એસિડ ટેસ્ટ', HI: 'यूरिक एसिड टेस्ट' },
  'urine r/m': { GU: 'પેશાબની સામાન્ય તપાસ (Urine R/M)', HI: 'पेशाब जांच (Urine R/M)' },
  'urine routine': { GU: 'પેશાબની તપાસ', HI: 'पेशाब जांच' },
  'x-ray': { GU: 'એક્સ-રે (X-Ray)', HI: 'एक्स-रे (X-Ray)' },
  'x-ray chest': { GU: 'છાતીનો એક્સ-રે', HI: 'चेस्ट एक्स-रे' },
  'ecg': { GU: '૧૨-લીડ ઈ.સી.જી. (હૃદય તપાસ)', HI: 'ई.सी.जी. (ECG)' },
  'usg': { GU: 'સોનોગ્રાફી (USG Abdomen)', HI: 'सोनोग्राफी (USG)' },
  'sonography': { GU: 'સોનોગ્રાફી', HI: 'सोनोग्राफी' },
  'thyroid profile': { GU: 'થાઇરોઇડ પ્રોફાઇલ (T3, T4, TSH)', HI: 'थायराइड प्रोफाइल (T3, T4, TSH)' },
  'tsh': { GU: 'TSH ટેસ્ટ', HI: 'TSH टेस्ट' },
  'sgpt': { GU: 'SGPT (લીવર તપાસ)', HI: 'SGPT टेस्ट' },
  'crp': { GU: 'સી.આર.પી. ટેસ્ટ (CRP)', HI: 'सी.आर.पी. टेस्ट' },
  'esr': { GU: 'ઈ.એસ.આર. ટેસ્ટ (ESR)', HI: 'ई.एस.आर. टेस्ट' },
  'dengue ns1': { GU: 'ડેન્ગ્યુ NS1 એન્ટિજેન ટેસ્ટ', HI: 'डेंगू NS1 टेस्ट' },
  'malaria rapid': { GU: 'મેલેરિયા રેપિડ ટેસ્ટ', HI: 'मलेरिया टेस्ट' },
};

// Condition Name Translations
export const CONDITION_TRANSLATIONS = {
  DB: { EN: 'Diabetes Mellitus', GU: 'ડાયાબિટીસ (મધુપ્રમેહ)', HI: 'मधुमेह (डायबिटीज)' },
  SUGAR: { EN: 'Blood Sugar / Diabetes', GU: 'ડાયાબિટીસ (સુગર)', HI: 'ब्लड शुगर (डायबिटीज)' },
  BP: { EN: 'Hypertension (High BP)', GU: 'હાઈ બ્લડ પ્રેશર (હાયપરટેન્શન)', HI: 'उच्च रक्तचाप (हाइपरटेंशन)' },
  ACID: { EN: 'Acidity / GERD / Gastritis', GU: 'એસિડિટી / પિત્ત / ગેસ', HI: 'એસિડિટી / ગેસ / જલન' },
  THYROID: { EN: 'Thyroid Disorder', GU: 'થાઇરોઇડ', HI: 'थायराइड विकार' },
  URIC: { EN: 'High Uric Acid / Gout', GU: 'યુરિક એસિડ / વા (ગાઉટ)', HI: 'यूरिक एसिड / गठिया' },
  STONE: { EN: 'Kidney Stone', GU: 'કિડની સ્ટોન (પથરી)', HI: 'गुर्दे की पथरी (किडनी स्टोन)' },
  CONST: { EN: 'Constipation & Indigestion', GU: 'કબજિયાત અને અપચો', HI: 'कब्ज और अपच' },
  FEV: { EN: 'Fever / Infection', GU: 'તાવ / શરદી / ઇન્ફેક્શન', HI: 'बुखार / संक्रमण' },
  LQ: { EN: 'Viral Illness / Weakness', GU: 'તાવ / નબળાઈ / ડીહાઇડ્રેશન', HI: 'बुखार / कमजोरी' },
  CV: { EN: 'Heart Disease / Cholesterol', GU: 'હૃદય રોગ / કોલેસ્ટ્રોલ', HI: 'हृदय रोग / कोलेस्ट्रॉल' },
  LIPID: { EN: 'High Cholesterol / Triglycerides', GU: 'હાઈ કોલેસ્ટ્રોલ / ટ્રાઇગ્લિસરાઇડ', HI: 'उच्च कोलेस्ट्रॉल' },
  LIVER: { EN: 'Liver / Fatty Liver / Jaundice', GU: 'લીવરની તકલીફ / કમળો / ફેટી લીવર', HI: 'लिवर रोग / पीलिया' },
  WEIGHT: { EN: 'Weight Loss & Fitness', GU: 'વજન નિયંત્રણ / સ્થૂળતા નિવારણ', HI: 'वजन घटाने व मोटापा' },
};

// Fallback Phrase Dictionary for Freeform Medical Advice
export const PHRASE_DICTIONARY = {
  GU: [
    { en: /drink (?:plenty of )?water/gi, trans: 'પૂરતું પાણી પીવું' },
    { en: /take rest/gi, trans: 'પૂરતો આરામ કરવો' },
    { en: /avoid oily/gi, trans: 'તેલવાળો ખોરાક ન લેવો' },
    { en: /avoid spicy/gi, trans: 'તીખો ખોરાક ન લેવો' },
    { en: /avoid sweets?/gi, trans: 'મીઠાઈ અને ખાંડ ન લેવી' },
    { en: /light food/gi, trans: 'હળવો સાદો ખોરાક' },
    { en: /home cooked meals?/gi, trans: 'ઘરનો તાજો ખોરાક' },
    { en: /outside food/gi, trans: 'બહારનો ખુલ્લો ખોરાક' },
    { en: /cold water/gi, trans: 'ઠંડુ પાણી' },
    { en: /warm water/gi, trans: 'હુંફાળું પાણી' },
  ],
  HI: [
    { en: /drink (?:plenty of )?water/gi, trans: 'भरपूर पानी पिएं' },
    { en: /take rest/gi, trans: 'पर्याप्त आराम करें' },
    { en: /avoid oily/gi, trans: 'तैलीय भोजन से बचें' },
    { en: /avoid spicy/gi, trans: 'तीखा भोजन न करें' },
    { en: /avoid sweets?/gi, trans: 'मीठा और चीनी न लें' },
    { en: /light food/gi, trans: 'हल्का सादा भोजन' },
    { en: /home cooked meals?/gi, trans: 'घर का ताजा भोजन' },
    { en: /outside food/gi, trans: 'बाहर का खाना' },
    { en: /cold water/gi, trans: 'ठंडा पानी' },
    { en: /warm water/gi, trans: 'गुनगुना पानी' },
  ],
};

/**
 * Localizes numbers for Gujarati and Hindi scripts where applicable
 */
export function toLocalNumber(num, lang = 'EN') {
  if (num === undefined || num === null || num === '') return '';
  const str = String(num);
  const cleanLang = (lang || 'EN').toUpperCase();
  if (cleanLang === 'GU') {
    const guDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
    return str.replace(/[0-9]/g, (d) => guDigits[Number(d)] || d);
  }
  if (cleanLang === 'HI') {
    const hiDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
    return str.replace(/[0-9]/g, (d) => hiDigits[Number(d)] || d);
  }
  return str;
}

/**
 * Translates an editable list of food items into target language
 * preserving only the items remaining in the list.
 */
export function translateFoodList(listStr, lang = 'EN') {
  if (!listStr || !listStr.trim()) return '';
  const cleanLang = (lang || 'EN').toUpperCase();
  if (cleanLang === 'EN') return listStr.trim().replace(/^[,;\s]+|[,;\s]+$/g, '');

  // Split items by comma, semicolon, bullet, newline, or 'and' / '&'
  const rawItems = listStr.split(/[,;\n•|]+|\s+(?:and|&)\s+/i).map((s) => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);

  const translatedItems = rawItems.map((item) => {
    let rawClean = item.trim().replace(/^[,;\s]+|[,;\s]+$/g, '');
    if (!rawClean) return '';

    const lowItem = rawClean.toLowerCase();

    // 1. Direct dictionary lookup
    if (FOOD_TRANSLATIONS[lowItem] && FOOD_TRANSLATIONS[lowItem][cleanLang]) {
      return FOOD_TRANSLATIONS[lowItem][cleanLang];
    }

    // 2. Try stripping common prefixes
    const prefixMatch = lowItem.match(/^(?:eat|avoid|take|no|don'?t(?:\s+eat)?|strictly\s+avoid|restricted|excess|more|less|fresh|warm|cold|boiled|raw|low|high)\s+(.+)$/i);
    if (prefixMatch && prefixMatch[1]) {
      const coreFood = prefixMatch[1].trim();
      if (FOOD_TRANSLATIONS[coreFood] && FOOD_TRANSLATIONS[coreFood][cleanLang]) {
        return FOOD_TRANSLATIONS[coreFood][cleanLang];
      }
    }

    // 3. Try singular form if word ends in 's' or 'es'
    if (lowItem.endsWith('es') && FOOD_TRANSLATIONS[lowItem.slice(0, -2)] && FOOD_TRANSLATIONS[lowItem.slice(0, -2)][cleanLang]) {
      return FOOD_TRANSLATIONS[lowItem.slice(0, -2)][cleanLang];
    }
    if (lowItem.endsWith('s') && FOOD_TRANSLATIONS[lowItem.slice(0, -1)] && FOOD_TRANSLATIONS[lowItem.slice(0, -1)][cleanLang]) {
      return FOOD_TRANSLATIONS[lowItem.slice(0, -1)][cleanLang];
    }

    // 4. Substring replacement for multi-word or compound items (longest keys first)
    let matchedText = rawClean;
    let found = false;

    const sortedKeys = Object.keys(FOOD_TRANSLATIONS).sort((a, b) => b.length - a.length);
    for (const k of sortedKeys) {
      const reg = new RegExp(`\\b${k}\\b`, 'gi');
      if (reg.test(matchedText)) {
        const trans = FOOD_TRANSLATIONS[k][cleanLang];
        matchedText = matchedText.replace(reg, trans);
        found = true;
      }
    }

    if (found) return matchedText.trim();

    // 5. Fallback phrase dictionary
    if (PHRASE_DICTIONARY[cleanLang]) {
      for (const p of PHRASE_DICTIONARY[cleanLang]) {
        matchedText = matchedText.replace(p.en, p.trans);
      }
    }

    return matchedText.trim();
  });

  return translatedItems.filter(Boolean).join(', ');
}

/**
 * Parses raw dietary advice string containing multiple shortcuts or Eat/Avoid blocks,
 * translating each into the target language with What to Eat and What NOT to Eat sections.
 */
export function translateDietaryText(rawInput, lang = 'EN', dbDietary = {}) {
  if (!rawInput || !rawInput.trim()) return '';
  const cleanLang = (lang || 'EN').toUpperCase();
  const trimmed = rawInput.trim();

  // Split blocks by condition code or Eat: separator
  let blocks = trimmed
    .split(/(?:^|\n|,\s+)(?=(?:[A-Za-z0-9_-]+(?:\s*\([^\)]+\))?\s*:\s*)?(?:Eat|What to Eat|Recommended)\s*:|[A-Za-z0-9_-]{2,15}\s*:\s*(?:Eat|What to Eat)\s*:)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  // Fallback: If no Eat: pattern matched, try splitting by comma/newline if it looks like shortcut codes (e.g. "DB, BP, ACID")
  if (blocks.length === 1 && !blocks[0].toLowerCase().includes('eat:') && blocks[0].includes(',')) {
    blocks = blocks[0].split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  }

  const outputBlocks = [];

  for (const block of blocks) {
    if (!block) continue;

    // Pattern 1: Structured "CODE: Eat: ... | Avoid: ..." or "Eat: ... | Avoid: ..." or "What to Eat: ... | What NOT to Eat: ..."
    const structuredMatch = block.match(
      /^(?:([A-Za-z0-9_-]+)(?:\s*\(([^\)]+)\))?\s*:\s*)?(?:What to Eat|Eat|Recommended)\s*:\s*([^|•\n]+?)\s*(?:\||•|\n|(?:What NOT to Eat|Avoid|Don'?t Eat|Restricted)\s*:)\s*(?:(?:What NOT to Eat|Avoid|Don'?t Eat|Restricted)\s*:\s*)?(.+)$/i
    );

    if (structuredMatch) {
      const code = (structuredMatch[1] || '').trim().toUpperCase();
      const explicitDisease = (structuredMatch[2] || '').trim();
      const rawEat = (structuredMatch[3] || '').trim();
      const rawAvoid = (structuredMatch[4] || '').trim().replace(/,\s*$/, '');

      const matchedDict = DIETARY_TRANSLATIONS[code] || (code ? DIETARY_TRANSLATIONS[code.replace(/[^A-Z]/g, '')] : null);
      const condDict = CONDITION_TRANSLATIONS[code];
      const customDbEntry = dbDietary[code] || (code ? dbDietary[code.replace(/[^A-Z]/g, '')] : null);

      let diseaseTitle = explicitDisease;
      if (!diseaseTitle && condDict && condDict[cleanLang]) {
        diseaseTitle = condDict[cleanLang];
      } else if (!diseaseTitle && matchedDict && matchedDict.disease[cleanLang]) {
        diseaseTitle = matchedDict.disease[cleanLang];
      } else if (!diseaseTitle && customDbEntry) {
        diseaseTitle = customDbEntry.disease || customDbEntry.code;
      } else if (!diseaseTitle && code) {
        diseaseTitle = code;
      }

      // Translate the actual food items based on doctor's current edited list!
      const translatedEat = translateFoodList(rawEat, cleanLang);
      const translatedAvoid = translateFoodList(rawAvoid, cleanLang);

      const codeSuffix = code ? ` (${code})` : '';

      if (cleanLang === 'GU') {
        const header = diseaseTitle ? `• ${diseaseTitle}${codeSuffix} ખોરાકની પરેજી:` : '• ખોરાકની પરેજી:';
        outputBlocks.push(
          `${header}\n   ✔ શું ખાવું (ભલામણ કરેલ): ${translatedEat || 'સાદો હળવો ખોરાક'}\n   ✖ શું ન ખાવું (સખત પરેજી): ${translatedAvoid || 'તીખું, તળેલું અને બહારનો ખોરાક'}`
        );
      } else if (cleanLang === 'HI') {
        const header = diseaseTitle ? `• ${diseaseTitle}${codeSuffix} आहार संबंधी सलाह:` : '• आहार संबंधी सलाह:';
        outputBlocks.push(
          `${header}\n   ✔ क्या खाएं (सलाह योग्य): ${translatedEat || 'सादा हल्का भोजन'}\n   ✖ क्या न खाएं (सख्ती से परहेज): ${translatedAvoid || 'तीखा, तला-भुना और बाहर का खाना'}`
        );
      } else {
        const header = diseaseTitle ? `• ${diseaseTitle}${codeSuffix} Dietary Advice:` : '• Dietary Advice:';
        outputBlocks.push(
          `${header}\n   ✔ What to Eat (Recommended): ${translatedEat || 'Light home-cooked meals'}\n   ✖ What NOT to Eat (Strictly Avoid): ${translatedAvoid || 'Spicy, fried and outside foods'}`
        );
      }
    } else {
      // Pattern 2: Pure shortcut code (e.g. "DB" or "BP" or "ACID")
      const cleanToken = block.replace(/[,;]/g, '').trim().toUpperCase();
      const matchedDict = DIETARY_TRANSLATIONS[cleanToken] || DIETARY_TRANSLATIONS[cleanToken.replace(/[^A-Z]/g, '')];
      const customDbEntry = dbDietary[cleanToken] || dbDietary[cleanToken.replace(/[^A-Z]/g, '')];

      if (matchedDict) {
        const dis = matchedDict.disease[cleanLang] || matchedDict.disease.EN;
        const eat = matchedDict.eat[cleanLang] || matchedDict.eat.EN;
        const avoid = matchedDict.avoid[cleanLang] || matchedDict.avoid.EN;

        if (cleanLang === 'GU') {
          outputBlocks.push(
            `• ${dis} (${cleanToken}) ખોરાકની પરેજી:\n   ✔ શું ખાવું (ભલામણ કરેલ): ${eat}\n   ✖ શું ન ખાવું (સખત પરેજી): ${avoid}`
          );
        } else if (cleanLang === 'HI') {
          outputBlocks.push(
            `• ${dis} (${cleanToken}) आहार संबंधी सलाह:\n   ✔ क्या खाएं (सलाह योग्य): ${eat}\n   ✖ क्या न खाएं (सख्ती से परहेज): ${avoid}`
          );
        } else {
          outputBlocks.push(
            `• ${dis} (${cleanToken}) Dietary Advice:\n   ✔ What to Eat (Recommended): ${eat}\n   ✖ What NOT to Eat (Strictly Avoid): ${avoid}`
          );
        }
      } else if (customDbEntry && customDbEntry.eat && customDbEntry.avoid) {
        const disText = customDbEntry.disease || customDbEntry.code;
        const transEat = translateFoodList(customDbEntry.eat, cleanLang);
        const transAvoid = translateFoodList(customDbEntry.avoid, cleanLang);

        if (cleanLang === 'GU') {
          outputBlocks.push(
            `• ${disText} (${customDbEntry.code}) ખોરાકની પરેજી:\n   ✔ શું ખાવું (ભલામણ કરેલ): ${transEat}\n   ✖ શું ન ખાવું (સખત પરેજી): ${transAvoid}`
          );
        } else if (cleanLang === 'HI') {
          outputBlocks.push(
            `• ${disText} (${customDbEntry.code}) आहार संबंधी सलाह:\n   ✔ क्या खाएं (सलाह योग्य): ${transEat}\n   ✖ क्या न खाएं (सख्ती से परहेज): ${transAvoid}`
          );
        } else {
          outputBlocks.push(
            `• ${disText} (${customDbEntry.code}) Dietary Advice:\n   ✔ What to Eat (Recommended): ${transEat}\n   ✖ What NOT to Eat (Strictly Avoid): ${transAvoid}`
          );
        }
      } else {
        // Pattern 3: Freeform sentence translation
        let translated = block;
        if (cleanLang === 'GU' && PHRASE_DICTIONARY.GU) {
          PHRASE_DICTIONARY.GU.forEach((p) => {
            translated = translated.replace(p.en, p.trans);
          });
        } else if (cleanLang === 'HI' && PHRASE_DICTIONARY.HI) {
          PHRASE_DICTIONARY.HI.forEach((p) => {
            translated = translated.replace(p.en, p.trans);
          });
        }
        outputBlocks.push(`• ${translated}`);
      }
    }
  }

  return outputBlocks.join('\n\n');
}

/**
 * Formats parsed dietary text into structured, elegant HTML cards for prescription printing
 */
export function formatDietaryHTML(text, lang = 'EN') {
  if (!text || !text.trim()) return '';
  const cleanLang = (lang || 'EN').toUpperCase();

  let eatLabel = 'What to Eat (Recommended):';
  let avoidLabel = 'What NOT to Eat (Strictly Avoid):';
  if (cleanLang === 'GU') {
    eatLabel = 'શું ખાવું (ભલામણ કરેલ):';
    avoidLabel = 'શું ન ખાવું (સખત પરેજી):';
  } else if (cleanLang === 'HI') {
    eatLabel = 'क्या खाएं (सलाह योग्य):';
    avoidLabel = 'क्या न खाएं (सख्ती से परहेज):';
  }

  const blocks = text.split('\n\n').filter(Boolean);

  return blocks
    .map((b) => {
      const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
      const titleLine = lines[0] || '';
      const eatLine = lines.find((l) => l.includes('✔') || l.includes('ખાવું') || l.includes('खाएं') || /What to Eat/i.test(l)) || '';
      const avoidLine = lines.find((l) => l.includes('✖') || l.includes('ન ખાવું') || l.includes('न खाएं') || /What NOT to Eat|Avoid/i.test(l)) || '';

      if (eatLine || avoidLine) {
        const eatContent = eatLine ? eatLine.replace(/^[^:]+:\s*/, '') : '';
        const avoidContent = avoidLine ? avoidLine.replace(/^[^:]+:\s*/, '') : '';
        const cleanTitle = (lines.length > 1 && titleLine.startsWith('•')) ? titleLine.replace(/^•\s*/, '').replace(/:$/, '') : '';

        return `
        <div style="margin-bottom: 8px; border: 1.5px solid #146B5C; border-radius: 6px; padding: 6px 10px; background: #fafdfc;">
          ${cleanTitle ? `<div style="font-weight: 800; color: #146B5C; font-size: 10.5pt; margin-bottom: 4px; border-bottom: 1px dashed #bbf7d0; padding-bottom: 2px;"><i class="fa-solid fa-notes-medical" style="font-size: 9.5pt;"></i> ${cleanTitle}</div>` : ''}
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10pt;">
            ${eatContent ? `
            <div style="color: #047857; line-height: 1.4;">
              <span style="font-weight: 800; color: #065f46;"><i class="fa-solid fa-circle-check" style="color: #10b981;"></i> ${eatLabel}</span>
              <span style="color: #111; font-weight: 600;"> ${eatContent}</span>
            </div>` : ''}
            ${avoidContent ? `
            <div style="color: #b91c1c; line-height: 1.4;">
              <span style="font-weight: 800; color: #991b1b;"><i class="fa-solid fa-ban" style="color: #ef4444;"></i> ${avoidLabel}</span>
              <span style="color: #111; font-weight: 600;"> ${avoidContent}</span>
            </div>` : ''}
          </div>
        </div>
      `;
      } else {
        return `<div style="margin-bottom: 6px; font-size: 10pt; line-height: 1.5; color: #111; background: #f8fafc; border-left: 3px solid #146B5C; padding: 4px 8px; border-radius: 0 4px 4px 0;">${b}</div>`;
      }
    })
    .join('');
}

/**
 * Opens the interactive Prescription Print Preview Modal with Multi-Language Selection
 * and Live Editable Dietary Advice Sync
 */
export function openPrescriptionModal(patient, visit, onClose) {
  const session = getAuthSession();
  const clinicId = session?.profile?.activeClinicId || 'demo';
  const db = getLocalDB(clinicId);

  let currentLang = 'EN';
  // Initialize with visit's saved dietary advice or empty
  let dietaryInput = visit.dietary || '';

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'cms-overlay';
  modalOverlay.style.zIndex = '9999';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.background = 'rgba(0,0,0,0.65)';
  modalOverlay.style.padding = '12px';

  const I18N = {
    EN: {
      drTitle: 'Dr. Chirag Paghdal',
      drDegree: 'FAMILY PHYSICIAN (B.H.M.S.)',
      mobileLabel: 'Mo.: +91 98793 80508',
      regLabel: 'Reg. No. G-9035',
      clinicBanner: 'Dhyey Clinic & Nursing Home : Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.',
      for: 'FOR:',
      age: 'Age:',
      date: 'DATE:',
      case: 'Case:',
      bp: 'BP:',
      weight: 'Weight:',
      sugar: 'Blood Sugar:',
      complaint: 'Complaint:',
      diagnosis: 'Diagnosis:',
      inv: 'Inv / Reports:',
      rx: '℞',
      med: 'Medicine / Drug',
      qty: 'Qty',
      inst: 'Dosage Instructions',
      noMed: 'No medicines prescribed.',
      trHeader: 'Clinic Treatments & Procedures',
      trName: 'Treatment / Procedure',
      diet: 'Dietary Advice (Food Care & Restrictions):',
      mor: 'Morning',
      noon: 'Noon',
      eve: 'Evening',
      ngt: 'Night',
      bf: 'Before Food',
      af: 'After Food',
      hs: 'At Bedtime',
      sos: 'When Needed',
      emptyStomach: 'Empty Stomach',
      onceDaily: 'Once Daily',
      twiceDaily: 'Twice Daily',
      thriceDaily: 'Three Times Daily',
      chemistNote: '+ Harsh Medical & General Stores +',
    },
    GU: {
      drTitle: 'Dr. Chirag Paghdal',
      drDegree: 'ફેમિલી ફિઝિશિયન (B.H.M.S.)',
      mobileLabel: 'મો.: +91 98793 80508',
      regLabel: 'રજી. નં. G-9035',
      clinicBanner: 'ધ્યેય ક્લિનિક અને નર્સિંગ હોમ : શોપ નં. ૧, મહાવીર હાઈટ્સ, ન્યુ કોસાડ રોડ, અમરોલી, સુરત.',
      for: 'દર્દીનું નામ:',
      age: 'ઉંમર:',
      date: 'તારીખ:',
      case: 'કેસ નં.:',
      bp: 'બી.પી.:',
      weight: 'વજન:',
      sugar: 'સુગર:',
      complaint: 'તકલીફ / ફરિયાદ:',
      diagnosis: 'નિદાન:',
      inv: 'લેબ રિપોર્ટ:',
      rx: '℞',
      med: 'દવાનું નામ',
      qty: 'માત્રા',
      inst: 'લેવાની રીત / માત્રા',
      noMed: 'કોઈ દવા લખેલ નથી.',
      trHeader: 'ક્લિનિક સારવાર અને ઉપચાર',
      trName: 'ઉપચાર / પ્રોસિજર',
      diet: 'ખોરાકની પરેજી (શું ખાવું / શું ન ખાવું):',
      mor: 'સવારે',
      noon: 'બપોરે',
      eve: 'સાંજે',
      ngt: 'રાત્રે',
      bf: 'જમ્યા પહેલાં',
      af: 'જમ્યા પછી',
      hs: 'રાત્રે સૂતી વખતે',
      sos: 'જરૂર પડે ત્યારે',
      emptyStomach: 'ભૂખ્યા પેટે',
      onceDaily: 'દિવસમાં ૧ વાર',
      twiceDaily: 'દિવસમાં ૨ વાર',
      thriceDaily: 'દિવસમાં ૩ વાર',
      chemistNote: '+ હર્ષ મેડિકલ એન્ડ જનરલ સ્ટોર્સ +',
    },
    HI: {
      drTitle: 'Dr. Chirag Paghdal',
      drDegree: 'फैमिली फिजिशियन (B.H.M.S.)',
      mobileLabel: 'मो.: +91 98793 80508',
      regLabel: 'पंजी. सं. G-9035',
      clinicBanner: 'ध्येय क्लिनिक एवं नर्सिंग होम : शॉप नं. १, महावीर हाइट्स, न्यू कोसाड रोड, अमरोली, सूरत.',
      for: 'मरीज का नाम:',
      age: 'उम्र:',
      date: 'दिनांक:',
      case: 'केस नं.:',
      bp: 'बी.पी.:',
      weight: 'वजन:',
      sugar: 'ब्लड शुगर:',
      complaint: 'तकलीफ / लक्षण:',
      diagnosis: 'निदान:',
      inv: 'जांच रिपोर्ट:',
      rx: '℞',
      med: 'दवा का नाम',
      qty: 'मात्रा',
      inst: 'खुराक और लेने का तरीका',
      noMed: 'कोई दवा निर्धारित नहीं है।',
      trHeader: 'क्लिनिक उपचार एवं प्रक्रिया',
      trName: 'उपचार / प्रक्रिया',
      diet: 'आहार संबंधी सलाह (क्या खाएं / क्या न खाएं):',
      mor: 'सुबह',
      noon: 'दोपहर',
      eve: 'शाम',
      ngt: 'रात',
      bf: 'खाने से पहले',
      af: 'खाने के बाद',
      hs: 'रात को सोते समय',
      sos: 'जरूरत पड़ने पर',
      emptyStomach: 'खाली पेट',
      onceDaily: 'दिन में १ बार',
      twiceDaily: 'दिन में २ बार',
      thriceDaily: 'दिन में ३ बार',
      chemistNote: '+ हर्ष मेडिकल एंड जनरल स्टोर्स +',
    },
  };

  const renderModalContent = () => {
    const t = I18N[currentLang];

    const parseDosage = (p) => {
      const parts = [];
      const m = toLocalNumber(p.mor, currentLang);
      const n = toLocalNumber(p.noon, currentLang);
      const e = toLocalNumber(p.eve, currentLang);
      const ng = toLocalNumber(p.ngt, currentLang);

      if (p.mor && p.mor !== '0') parts.push(`${m} ${t.mor}`);
      if (p.noon && p.noon !== '0') parts.push(`${n} ${t.noon}`);
      if (p.eve && p.eve !== '0') parts.push(`${e} ${t.eve}`);
      if (p.ngt && p.ngt !== '0') parts.push(`${ng} ${t.ngt}`);

      let timing = '';
      const rawTiming = (p.timing || '').trim().toUpperCase();
      if (rawTiming === 'BF' || rawTiming.includes('BEFORE')) {
        timing = ` (${t.bf})`;
      } else if (rawTiming === 'AF' || rawTiming.includes('AFTER')) {
        timing = ` (${t.af})`;
      } else if (rawTiming === 'HS' || rawTiming.includes('BED') || rawTiming.includes('NIGHT')) {
        timing = ` (${t.hs})`;
      } else if (rawTiming === 'SOS') {
        timing = ` (${t.sos})`;
      } else if (rawTiming.includes('EMPTY')) {
        timing = ` (${t.emptyStomach})`;
      } else if (rawTiming === 'OD') {
        timing = ` (${t.onceDaily})`;
      } else if (rawTiming === 'BD') {
        timing = ` (${t.twiceDaily})`;
      } else if (rawTiming === 'TDS') {
        timing = ` (${t.thriceDaily})`;
      } else if (p.timing && p.timing.trim()) {
        const transTiming = translateFoodList(p.timing, currentLang);
        timing = ` (${transTiming || p.timing})`;
      }

      if (parts.length === 0) return timing ? timing.trim() : '-';
      return parts.join(', ') + timing;
    };

    const renderedDietaryText = translateDietaryText(dietaryInput, currentLang, db.dietary || {});
    const renderedDietaryHTML = formatDietaryHTML(renderedDietaryText, currentLang);

    modalOverlay.innerHTML = `
      <div class="cms-modal cms-prescription-preview-modal" style="width: 16.5cm; max-width: 98vw; height: 94vh; max-height: 94vh; display: flex; flex-direction: column; padding: 0; box-shadow: 0 25px 60px rgba(0,0,0,0.4); border-radius: 12px; overflow: hidden; background: #ffffff;" onclick="event.stopPropagation()">
        
        <!-- Top Toolbar (Fixed Header) -->
        <div class="no-print" style="flex-shrink: 0; display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; border-bottom: 1.5px solid var(--border); background: var(--surface);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: #0f5132; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 15px;">
              <i class="fa-solid fa-print"></i>
            </div>
            <div>
              <div class="font-display" style="font-weight: 800; font-size: 14.5px; color: var(--text);">
                Prescription Print Preview &middot; Case #${visit.caseId}
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${patient.name} &middot; ${fmtDate(visit.date)}</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 6px; background: var(--surface-alt); padding: 3px 8px; border-radius: 6px; border: 1px solid var(--border);">
              <label for="modal-lang-select" style="font-size: 11px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-language" style="color: #0f5132;"></i> Print Language:
              </label>
              <select id="modal-lang-select" class="cms-select cms-input-sm" style="width: 145px; font-weight: 800; border: none; background: transparent; padding: 2px 4px; color: #0f5132; cursor: pointer;">
                <option value="EN" ${currentLang === 'EN' ? 'selected' : ''}>English</option>
                <option value="GU" ${currentLang === 'GU' ? 'selected' : ''}>ગુજરાતી (Gujarati)</option>
                <option value="HI" ${currentLang === 'HI' ? 'selected' : ''}>हिंदी (Hindi)</option>
              </select>
            </div>

            <button type="button" id="modal-close-btn" class="cms-btn cms-btn-ghost" style="padding: 6px 10px; font-size: 16px; color: var(--text-muted);" title="Close preview">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Dietary Advice Input & Quick Shortcut Tool (Fixed Controls) -->
        <div class="no-print" style="flex-shrink: 0; padding: 10px 18px; border-bottom: 1.5px solid var(--border); display: flex; flex-direction: column; gap: 6px; background: #f8fafc;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
            <label class="cms-label" style="margin-bottom: 0; font-size: 11.5px; font-weight: 800; display: flex; align-items: center; gap: 6px; color: #0f5132;">
              <i class="fa-solid fa-utensils"></i>
              <span>Dietary Advice (Editable &amp; Auto-translated to ${currentLang === 'GU' ? 'ગુજરાતી' : currentLang === 'HI' ? 'हिंदी' : 'English'})</span>
            </label>

            <!-- Quick Shortcut Chips -->
            <div style="display: flex; gap: 4px; flex-wrap: wrap;" id="modal-dietary-chips">
              ${
                Object.values(db?.dietary || {}).length > 0
                  ? Object.values(db.dietary).map(tpl => `
                      <span class="cms-pill cms-clickable quick-diet-chip" data-code="${tpl.code}" style="font-size: 9.5px; padding: 1px 6px; cursor: pointer; background: #e0f2fe; color: #0369a1; font-weight: 800;" title="${tpl.disease || tpl.code}">+ ${tpl.code}</span>
                    `).join('')
                  : '<span style="font-size: 10px; color: var(--text-muted); font-style: italic;">No dietary shortcuts for this clinic.</span>'
              }
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center;">
            <input type="text" id="modal-dietary-input" class="cms-input" style="flex: 1; padding: 6px 10px; font-size: 12px; background: #fff; border: 1.5px solid #86efac;" placeholder="e.g. DB: Eat: Green vegetables, Oats | Avoid: Sugar, Sweets (delete/add items freely)..." value="${dietaryInput}" />
            
            <button type="button" id="modal-print-btn" class="cms-btn cms-btn-primary" style="padding: 7px 22px; font-weight: 800; background: #0f5132; border-color: #0f5132; white-space: nowrap; cursor: pointer;">
              <span><i class="fa-solid fa-print"></i></span>
              <span>Print A5 Sheet</span>
            </button>
          </div>
          <div style="font-size: 10.5px; color: var(--text-muted);">
            Tip: You can freely delete any food name in the box above (e.g. remove "Cucumbers" or "Potatoes"), and remaining foods will be cleanly translated when printing.
          </div>
        </div>

        <!-- Scrollable A5 Paper Sheet Viewport -->
        <div class="cms-prescription-scroll-viewport" style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 18px 12px; background: #94a3b8; display: flex; justify-content: center; align-items: flex-start;">
          
          <!-- Printable A5 Sheet Content Area -->
          <div id="cms-print-area" class="cms-print-preview-box" style="width: 148mm; min-height: 205mm; max-width: 100%; background: #ffffff; padding: 7mm 9mm; box-shadow: 0 8px 30px rgba(0,0,0,0.28); border-radius: 4px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
            
            <div>
              <!-- Doctor & Clinic Letterhead -->
              <div class="cms-print-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px;">
                <div>
                  <div style="font-size: 22pt; font-weight: 800; color: #146B5C; letter-spacing: -0.5px; line-height: 1.1;">${t.drTitle}</div>
                  <div style="font-size: 11pt; font-weight: 800; color: #146B5C; letter-spacing: 0.5px;">
                    ${t.drDegree}
                  </div>
                </div>
                <div style="text-align: right; font-size: 9pt; color: #333; font-weight: bold; line-height: 1.4;">
                  <div>${t.mobileLabel}</div>
                  <div>${t.regLabel}</div>
                </div>
              </div>

              <!-- Address Banner -->
              <div class="cms-print-banner" style="background: #e2e8f0; padding: 3px 8px; border-bottom: 1.5px solid #94a3b8; border-top: 1.5px solid #94a3b8; font-size: 9.5pt; text-align: center; margin-bottom: 6px; color: #1e293b; font-weight: 700;">
                ${t.clinicBanner}
              </div>

              <!-- Patient Header -->
              <div class="cms-print-patient-bar" style="display: flex; justify-content: space-between; font-size: 10.5pt; font-weight: bold; margin-bottom: 6px; padding: 0 2px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">
                <div>${t.for} <span style="font-weight: 800; text-transform: uppercase;">${patient.name}</span> (${t.age} ${toLocalNumber(patient.age, currentLang) || '-'}${patient.bloodGroup ? `, ${patient.bloodGroup}` : ''})</div>
                <div>${t.date} <span style="font-weight: 700;">${fmtDate(visit.date)}</span> &middot; <span style="font-size: 10pt;">${t.case} ${toLocalNumber(visit.caseId, currentLang)}</span></div>
              </div>

              <!-- Clinical Vitals -->
              <div style="display: flex; gap: 14px; font-size: 9.5pt; color: #334155; margin-bottom: 6px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; flex-wrap: wrap;">
                ${visit.bp ? `<div>${t.bp} <b>${visit.bp}</b></div>` : ''}
                ${visit.weight ? `<div>${t.weight} <b>${toLocalNumber(visit.weight, currentLang)} kg</b></div>` : ''}
                ${visit.sugar ? `<div>${t.sugar} <b>${toLocalNumber(visit.sugar, currentLang)}</b></div>` : ''}
                ${visit.complaint ? `<div>${t.complaint} <b>${translateFoodList(visit.complaint, currentLang) || visit.complaint}</b></div>` : ''}
                ${visit.diagnosis ? `<div>${t.diagnosis} <b>${translateFoodList(visit.diagnosis, currentLang) || visit.diagnosis}</b></div>` : ''}
                ${visit.investigation ? `<div>${t.inv} <b>${translateFoodList(visit.investigation, currentLang) || visit.investigation}</b></div>` : ''}
              </div>

              <!-- Prescription Table (Rx) -->
              <div style="margin-top: 4px;">
                <div style="font-size: 18pt; font-weight: 900; font-family: 'Times New Roman', serif; color: #146B5C; margin-bottom: 2px;">℞</div>
                <table class="cms-print-table" style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr>
                      <th style="width: 42%; text-align: left; border-bottom: 2px solid #94a3b8; padding: 4px 6px; font-size: 9.5pt;">${t.med}</th>
                      <th style="width: 14%; text-align: center; border-bottom: 2px solid #94a3b8; padding: 4px 6px; font-size: 9.5pt;">${t.qty}</th>
                      <th style="width: 44%; text-align: left; border-bottom: 2px solid #94a3b8; padding: 4px 6px; font-size: 9.5pt;">${t.inst}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      (visit.prescription || []).length === 0
                        ? `<tr><td colspan="3" style="text-align: center; color: #666; padding: 10px; font-size: 9.5pt;">${t.noMed}</td></tr>`
                        : (visit.prescription || [])
                            .map(
                              (p) => `
                            <tr>
                              <td style="padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9.5pt; font-weight: 700; color: #0f172a;">${p.name}</td>
                              <td style="padding: 4px 6px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 800; font-size: 9.5pt;">${toLocalNumber(p.qty || '1', currentLang)}</td>
                              <td style="padding: 4px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9.5pt; font-weight: 600; color: #1e293b;">${parseDosage(p)}</td>
                            </tr>
                          `
                            )
                            .join('')
                    }
                  </tbody>
                </table>
              </div>

              <!-- Treatments / Procedures Table (if present) -->
              ${
                (visit.treatments || []).length > 0
                  ? `
                <div style="margin-top: 10px;">
                  <div style="font-size: 10pt; font-weight: 800; color: #dc2626; margin-bottom: 2px;"><i class="fa-solid fa-syringe"></i> ${t.trHeader}</div>
                  <table class="cms-print-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th style="width: 75%; text-align: left; border-bottom: 1.5px solid #fca5a5; padding: 3px 6px; font-size: 9pt; color: #991b1b;">${t.trName}</th>
                        <th style="width: 25%; text-align: center; border-bottom: 1.5px solid #fca5a5; padding: 3px 6px; font-size: 9pt; color: #991b1b;">${t.qty}</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${(visit.treatments || [])
                        .map(
                          (tr) => `
                        <tr>
                          <td style="padding: 3px 6px; border-bottom: 1px solid #fee2e2; font-size: 9pt; font-weight: 600;">${tr.name}</td>
                          <td style="padding: 3px 6px; border-bottom: 1px solid #fee2e2; text-align: center; font-weight: 700; font-size: 9pt;">${toLocalNumber(tr.qty || '1', currentLang)}</td>
                        </tr>
                      `
                        )
                        .join('')}
                    </tbody>
                  </table>
                </div>
              `
                  : ''
              }

              <!-- Multi-Language Translated Dietary Advice Block -->
              <div id="print-dietary-section" style="${renderedDietaryHTML.trim() ? 'display: block;' : 'display: none;'} margin-top: 12px; border-top: 1.5px dashed #146B5C; padding-top: 6px;">
                <div style="font-size: 10.5pt; font-weight: 800; color: #146B5C; text-decoration: underline; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-utensils" style="font-size: 9.5pt;"></i> <span>${t.diet}</span>
                </div>
                <div id="print-dietary-content" style="font-family: 'Mukta', 'Hind', 'Noto Sans Gujarati', 'Noto Sans Devanagari', Arial, sans-serif;">${renderedDietaryHTML}</div>
              </div>
            </div>

            <!-- Footer Chemist Note -->
            <div class="cms-print-footer" style="text-align: center; font-size: 12pt; font-weight: 900; border-top: 1.5px solid #cbd5e1; padding-top: 6px; margin-top: 14px; color: #1167B1;">
              ${t.chemistNote}
            </div>
          </div>

        </div>

      </div>
    `;

    // Rebind Language Switcher
    const langSelect = modalOverlay.querySelector('#modal-lang-select');
    langSelect?.addEventListener('change', (e) => {
      currentLang = e.target.value;
      renderModalContent();
    });

    // Dietary input live sync (updates preview directly without replacing modal overlay)
    const dietaryEl = modalOverlay.querySelector('#modal-dietary-input');
    if (dietaryEl) {
      dietaryEl.addEventListener('input', (e) => {
        dietaryInput = e.target.value;
        visit.dietary = dietaryInput; // Update active visit object in memory
        
        const dietaryPrintMount = modalOverlay.querySelector('#print-dietary-section');
        const dietaryContentMount = modalOverlay.querySelector('#print-dietary-content');
        const newRenderedText = translateDietaryText(dietaryInput, currentLang, db.dietary || {});
        const newRenderedHTML = formatDietaryHTML(newRenderedText, currentLang);
        
        if (dietaryPrintMount && dietaryContentMount) {
          if (newRenderedHTML.trim()) {
            dietaryContentMount.innerHTML = newRenderedHTML;
            dietaryPrintMount.style.display = 'block';
          } else {
            dietaryPrintMount.style.display = 'none';
          }
        }
      });
    }

    // Quick Dietary Chips Click
    modalOverlay.querySelectorAll('.quick-diet-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const code = chip.getAttribute('data-code');
        if (!code) return;
        const entry = db?.dietary?.[code] || Object.values(db?.dietary || {}).find(d => (d.code || '').toUpperCase() === code.toUpperCase());
        const dict = DIETARY_TRANSLATIONS[code];
        const formatted = entry 
          ? `${entry.code}: Eat: ${entry.eat} | Avoid: ${entry.avoid}` 
          : (dict ? `${code}: Eat: ${dict.eat.EN} | Avoid: ${dict.avoid.EN}` : code);

        const currentVal = dietaryInput.trim();
        dietaryInput = currentVal ? `${currentVal}, ${formatted}` : formatted;
        visit.dietary = dietaryInput;
        renderModalContent();
      });
    });

    // Close button
    const closeBtn = modalOverlay.querySelector('#modal-close-btn');
    closeBtn?.addEventListener('click', () => {
      modalOverlay.remove();
      if (onClose) onClose();
    });

    // Print button - uses direct isolated iframe printing to completely prevent blank pages
    const printBtn = modalOverlay.querySelector('#modal-print-btn');
    printBtn?.addEventListener('click', () => {
      const printArea = modalOverlay.querySelector('#cms-print-area');
      if (printArea) {
        printPrescriptionDirect(printArea);
      } else {
        window.print();
      }
    });
  };

  renderModalContent();
  document.body.appendChild(modalOverlay);
}

/**
 * Directly prints the A5 prescription using an isolated, clean off-screen iframe.
 * This guarantees zero blank pages, no CSS inheritance issues, and crisp typography.
 */
export function printPrescriptionDirect(printAreaElement) {
  if (!printAreaElement) {
    window.print();
    return;
  }

  // Remove existing print frame if any
  let printFrame = document.getElementById('cms-direct-print-frame');
  if (printFrame) printFrame.remove();

  printFrame = document.createElement('iframe');
  printFrame.id = 'cms-direct-print-frame';
  // Position offscreen, with positive width/height so Blink/Chromium layout engine fully paints and prints it
  printFrame.style.position = 'fixed';
  printFrame.style.left = '-9999px';
  printFrame.style.top = '-9999px';
  printFrame.style.width = '148mm';
  printFrame.style.minHeight = '210mm';
  printFrame.style.border = '0';
  printFrame.style.opacity = '0';
  printFrame.style.zIndex = '-9999';
  document.body.appendChild(printFrame);

  const doc = printFrame.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Prescription Print</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Hind:wght@400;600;700&family=Mukta:wght@400;600;700;800&family=Noto+Sans+Devanagari:wght@400;600;700;800&family=Noto+Sans+Gujarati:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>
          @page {
            size: A5 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            width: 148mm;
            min-height: 205mm;
            background: #ffffff !important;
            color: #111111 !important;
            font-family: 'Mukta', 'Hind', 'Noto Sans Gujarati', 'Noto Sans Devanagari', Arial, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            padding: 6mm 8mm;
          }
          .cms-print-preview-box {
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .cms-print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 4px;
          }
          .cms-print-banner {
            background: #e2e8f0 !important;
            padding: 3px 8px;
            border-bottom: 1.5px solid #94a3b8;
            border-top: 1.5px solid #94a3b8;
            font-size: 9.5pt;
            text-align: center;
            margin-bottom: 6px;
            color: #1e293b;
            font-weight: 700;
          }
          .cms-print-patient-bar {
            display: flex;
            justify-content: space-between;
            font-size: 10.5pt;
            font-weight: bold;
            margin-bottom: 6px;
            padding: 0 2px;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
          }
          .cms-print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          .cms-print-table th {
            border-bottom: 2px solid #94a3b8;
            padding: 4px 6px;
            font-size: 9.5pt;
            text-align: left;
          }
          .cms-print-table td {
            padding: 4px 6px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 9.5pt;
            font-weight: 600;
          }
          .cms-print-footer {
            text-align: center;
            font-size: 12pt;
            font-weight: 900;
            border-top: 1.5px solid #cbd5e1;
            padding-top: 6px;
            margin-top: 12px;
            color: #1167B1 !important;
          }
          #print-dietary-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        ${printAreaElement.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
    } catch (e) {
      console.warn('Iframe print error fallback:', e);
      window.print();
    }
  };

  // Wait for fonts to ready before printing
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(() => {
      setTimeout(triggerPrint, 150);
    });
  } else {
    setTimeout(triggerPrint, 350);
  }
}

