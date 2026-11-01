import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fmtDate, todayISO } from '../services/api';

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
};

// Vocabulary dictionary
export const FOOD_TRANSLATIONS = {
  'green leafy vegetables': { GU: 'લીલા પાંદડાવાળા શાકભાજી', HI: 'हरी पत्तेदार सब्जियां' },
  'green vegetables': { GU: 'લીલા શાકભાજી', HI: 'हरी सब्जियां' },
  'bitter gourd': { GU: 'કારેલા', HI: 'करेला' },
  'cucumber': { GU: 'કાકડી', HI: 'खीरा' },
  'cucumbers': { GU: 'કાકડી', HI: 'खीरा' },
  'spinach': { GU: 'પાલક', HI: 'पालक' },
  'fresh salads': { GU: 'તાજું કચુંબર (સલાડ)', HI: 'ताजा सलाद' },
  'salad': { GU: 'કચુંબર', HI: 'सलाद' },
  'salads': { GU: 'કચુંબર (સલાડ)', HI: 'सलाद' },
  'potatoes': { GU: 'બટેટા', HI: 'आलू' },
  'potato': { GU: 'બટેટા', HI: 'आलू' },
  'tomatoes': { GU: 'ટામેટા', HI: 'टमाटर' },
  'tomato': { GU: 'ટામેટા', HI: 'टमाटर' },
  'whole grains': { GU: 'આખા અનાજ', HI: 'साबुत अनाज' },
  'oats': { GU: 'ઓટ્સ', HI: 'ओट्स' },
  'pulses': { GU: 'કઠોળ', HI: 'दालें' },
  'moong dal khichdi': { GU: 'મગની દાળની ખીચડી', HI: 'मूंग दाल खिचड़ी' },
  'khichdi': { GU: 'ખીચડી', HI: 'खिचड़ी' },
  'fresh fruits': { GU: 'તાજા ફળો', HI: 'ताजे फल' },
  'apple': { GU: 'સફરજન', HI: 'सेब' },
  'apples': { GU: 'સફરજન', HI: 'सेब' },
  'papaya': { GU: 'પપૈયું', HI: 'पपीता' },
  'mangoes': { GU: 'કેરી', HI: 'आम' },
  'mango': { GU: 'કેરી', HI: 'आम' },
  'bananas': { GU: 'કેળા', HI: 'केला' },
  'banana': { GU: 'કેળા', HI: 'केला' },
  'lemon water': { GU: 'લીંબુ પાણી', HI: 'नींबू पानी' },
  'almonds': { GU: 'બદામ', HI: 'बादाम' },
  'walnuts': { GU: 'અખરોટ', HI: 'अखरोट' },
  'coconut water': { GU: 'નાળિયેર પાણી', HI: 'नारियल पानी' },
  'boiled water': { GU: 'ઉકાળેલું પાણી', HI: 'उबला पानी' },
  'warm water': { GU: 'હુંફાળું પાણી', HI: 'गुनगुना पानी' },
  'water': { GU: 'પૂરતું પાણી', HI: 'पर्याप्त पानी' },
  'direct sugar': { GU: 'સીધી ખાંડ', HI: 'सीधी चीनी' },
  'sugar': { GU: 'ખાંડ', HI: 'चीनी' },
  'sweets': { GU: 'મીઠાઈ', HI: 'मिठाई' },
  'jaggery': { GU: 'ગોળ', HI: 'गुड़' },
  'bakery items': { GU: 'બેકરી ઉત્પાદનો', HI: 'बेकरी उत्पाद' },
  'soft drinks': { GU: 'કોલ્ડ ડ્રિંક્સ', HI: 'कोल्ड ड्रिंक्स' },
  'cold drinks': { GU: 'ઠંડા પીણા (કોલ્ડ ડ્રિંક્સ)', HI: 'शीतल पेय' },
  'extra salt': { GU: 'વધારાનું મીઠું', HI: 'अतिरिक्त नमक' },
  'salt': { GU: 'મીઠું', HI: 'नमक' },
  'pickles': { GU: 'અથાણું', HI: 'अचार' },
  'papad': { GU: 'પાપડ', HI: 'पापड़' },
  'salty snacks': { GU: 'ખારા નાસ્તા / નમકીન', HI: 'नमकीन' },
  'fried items': { GU: 'તળેલી વસ્તુઓ', HI: 'तली हुई चीजें' },
  'fried snacks': { GU: 'તળેલા નાસ્તા', HI: 'तले हुए स्नैक्स' },
  'oily food': { GU: 'તેલવાળો ખોરાક', HI: 'तैलीय भोजन' },
  'spicy food': { GU: 'તીખો મસાલેદાર ખોરાક', HI: 'तीखा भोजन' },
  'fast food': { GU: 'ફાસ્ટ ફૂડ', HI: 'फास्ट फूड' },
  'butter': { GU: 'માખણ', HI: 'मक्खन' },
  'ghee': { GU: 'વધુ પડતું ઘી', HI: 'अधिक घी' },
  'fever': { GU: 'તાવ', HI: 'बुखार' },
  'high fever': { GU: 'વધુ તાવ', HI: 'तेज बुखार' },
  'cough': { GU: 'ખાંસી / ઉધરસ', HI: 'खांसी' },
  'cold': { GU: 'શરદી', HI: 'सर्दी / जुकाम' },
  'headache': { GU: 'માથાનો દુઃખાવો', HI: 'सिरदर्द' },
  'body ache': { GU: 'શરીરનો દુઃખાવો', HI: 'बदन दर्द' },
  'weakness': { GU: 'નબળાઈ', HI: 'कमजोरी' },
  'vomiting': { GU: 'ઉલટી', HI: 'उल्टी' },
  'cbc': { GU: 'સી.બી.સી. (CBC)', HI: 'सी.बी.સી. (CBC)' },
  'chest x-ray': { GU: 'છાતીનો એક્સ-રે (Chest X-Ray)', HI: 'चेस्ट एक्स-रे' },
  'chest x-ray pa view': { GU: 'Chest એક્સ-રે (X-Ray) PA View', HI: 'Chest एक्स-रे PA View' },
  'fever / high temperature': { GU: 'તાવ / High Temperature', HI: 'बुखार / तेज तापमान' },
};

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

export function translateFoodList(listStr, lang = 'EN') {
  if (!listStr || !listStr.trim()) return '';
  const cleanLang = (lang || 'EN').toUpperCase();
  if (cleanLang === 'EN') return listStr.trim().replace(/^[,;\s]+|[,;\s]+$/g, '');

  const rawItems = listStr.split(/[,;\n•|]+|\s+(?:and|&)\s+/i).map((s) => s.trim().replace(/^[-•*]\s*/, '')).filter(Boolean);

  const translatedItems = rawItems.map((item) => {
    let rawClean = item.trim().replace(/^[,;\s]+|[,;\s]+$/g, '');
    if (!rawClean) return '';
    const lowItem = rawClean.toLowerCase();

    if (FOOD_TRANSLATIONS[lowItem] && FOOD_TRANSLATIONS[lowItem][cleanLang]) {
      return FOOD_TRANSLATIONS[lowItem][cleanLang];
    }

    const sortedKeys = Object.keys(FOOD_TRANSLATIONS).sort((a, b) => b.length - a.length);
    for (const k of sortedKeys) {
      const reg = new RegExp(`\\b${k}\\b`, 'gi');
      if (reg.test(rawClean)) {
        rawClean = rawClean.replace(reg, FOOD_TRANSLATIONS[k][cleanLang]);
      }
    }
    return rawClean.trim();
  });

  return translatedItems.filter(Boolean).join(', ');
}

export function translateDietaryText(rawInput, lang = 'EN') {
  if (!rawInput || !rawInput.trim()) return '';
  const cleanLang = (lang || 'EN').toUpperCase();
  const trimmed = rawInput.trim();

  const shortcutKey = trimmed.toUpperCase().trim();
  const matched = DIETARY_TRANSLATIONS[shortcutKey] || (shortcutKey.includes('DB') ? DIETARY_TRANSLATIONS.DB : null);

  if (matched) {
    const dis = matched.disease[cleanLang] || matched.disease.EN;
    const eat = matched.eat[cleanLang] || matched.eat.EN;
    const avoid = matched.avoid[cleanLang] || matched.avoid.EN;
    return {
      title: `${dis} (${shortcutKey})`,
      eat,
      avoid,
    };
  }

  // Fallback: parse structured "Eat: ... | Avoid: ..."
  const eatMatch = trimmed.match(/(?:Eat|What to Eat|Recommended)\s*:\s*([^|•\n]+)/i);
  const avoidMatch = trimmed.match(/(?:Avoid|What NOT to Eat|Strictly Avoid)\s*:\s*(.+)$/i);

  if (eatMatch || avoidMatch) {
    const rawEat = eatMatch ? eatMatch[1].trim() : '';
    const rawAvoid = avoidMatch ? avoidMatch[1].trim() : '';
    return {
      title: 'Dietary Advice',
      eat: translateFoodList(rawEat, cleanLang) || rawEat,
      avoid: translateFoodList(rawAvoid, cleanLang) || rawAvoid,
    };
  }

  return {
    title: 'Dietary Advice',
    eat: translateFoodList(trimmed, cleanLang) || trimmed,
    avoid: '',
  };
}

export default function PrescriptionModal({ patient = {}, visit = {}, onClose, autoPrint = false }) {
  const [lang, setLang] = useState('EN');
  const [dietaryInput, setDietaryInput] = useState(visit.dietary || 'db');

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

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
      inv: 'Inv / Reports:',
      rx: '℞',
      med: 'Medicine / Drug',
      qty: 'Qty',
      inst: 'Dosage Instructions',
      noMed: 'No medicines prescribed.',
      diet: 'Dietary Advice (Food Care & Restrictions):',
      eatLabel: 'What to Eat (Recommended):',
      avoidLabel: 'What NOT to Eat (Strictly Avoid):',
      mor: 'Morning',
      noon: 'Noon',
      eve: 'Evening',
      ngt: 'Night',
      bf: 'Before Food',
      af: 'After Food',
      hs: 'At Bedtime',
      sos: 'When Needed',
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
      inv: 'લેબ રિપોર્ટ:',
      rx: '℞',
      med: 'દવાનું નામ',
      qty: 'માત્રા',
      inst: 'લેવાની રીત / માત્રા',
      noMed: 'કોઈ દવા લખેલ નથી.',
      diet: 'ખોરાકની પરેજી (શું ખાવું / શું ન ખાવું):',
      eatLabel: 'શું ખાવું (ભલામણ કરેલ):',
      avoidLabel: 'શું ન ખાવું (સખત પરેજી):',
      mor: 'સવારે',
      noon: 'બપોરે',
      eve: 'સાંજે',
      ngt: 'રાત્રે',
      bf: 'જમ્યા પહેલાં',
      af: 'જમ્યા પછી',
      hs: 'રાત્રે સૂતી વખતે',
      sos: 'જરૂર પડે ત્યારે',
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
      case: 'केस નં.:',
      bp: 'बी.पी.:',
      weight: 'वजन:',
      sugar: 'ब्लड शुगर:',
      complaint: 'तकलीफ / लक्षण:',
      inv: 'जांच रिपोर्ट:',
      rx: '℞',
      med: 'दवा का नाम',
      qty: 'मात्रा',
      inst: 'खुराक और लेने का तरीका',
      noMed: 'कोई दवा निर्धारित नहीं है।',
      diet: 'आहार संबंधी सलाह (क्या खाएं / क्या न खाएं):',
      eatLabel: 'क्या खाएं (सलाह योग्य):',
      avoidLabel: 'क्या न खाएं (सख्ती से परहेज):',
      mor: 'सुबह',
      noon: 'दोपहर',
      eve: 'शाम',
      ngt: 'रात',
      bf: 'खाने से पहले',
      af: 'खाने के बाद',
      hs: 'रात को सोते समय',
      sos: 'जरूरत पड़ने पर',
      chemistNote: '+ हर्ष मेडिकल एंड जनरल स्टोर्स +',
    },
  };

  const t = I18N[lang] || I18N.EN;

  const parseDosage = (p) => {
    const parts = [];
    const m = toLocalNumber(p.mor, lang);
    const n = toLocalNumber(p.noon, lang);
    const e = toLocalNumber(p.eve, lang);
    const ng = toLocalNumber(p.ngt, lang);

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
    }

    if (parts.length === 0) return timing ? timing.trim() : '-';
    return parts.join(', ') + timing;
  };

  const parsedDiet = translateDietaryText(dietaryInput, lang);

  const caseIdDisplay = visit.caseId || '000120260004-0104';
  const visitDateDisplay = fmtDate(visit.date || todayISO());

  return (
    <div
      className="cms-modal-backdrop"
      style={{
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)',
        padding: '12px',
        position: 'fixed',
        inset: 0,
      }}
      onClick={onClose}
    >
      <div
        className="cms-modal-content cms-prescription-preview-modal"
        style={{
          width: '16.5cm',
          maxWidth: '98vw',
          height: '94vh',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Toolbar (Fixed Header matching Screenshot 1 & 2) */}
        <div
          className="no-print"
          style={{
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 18px',
            borderBottom: '1.5px solid #cbd5e1',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#0f5132',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
              }}
            >
              <i className="fa-solid fa-print"></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>
                Prescription Print Preview · Case #{caseIdDisplay}
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                {patient.name} · {visitDateDisplay}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f8fafc',
                padding: '3px 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
              }}
            >
              <label
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <i className="fa-solid fa-language" style={{ color: '#0f5132' }}></i> Print Language:
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                style={{
                  fontWeight: 800,
                  border: 'none',
                  background: 'transparent',
                  padding: '2px 4px',
                  color: '#0f5132',
                  cursor: 'pointer',
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="EN">English</option>
                <option value="GU">ગુજરાતી (Gujarati)</option>
                <option value="HI">हिंदी (Hindi)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '4px 8px',
                fontSize: '16px',
                color: '#64748b',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '6px',
              }}
              title="Close preview"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* Dietary Advice Input & Quick Shortcut Tool (Fixed Controls matching Screenshot 1 & 2) */}
        <div
          className="no-print"
          style={{
            flexShrink: 0,
            padding: '10px 18px',
            borderBottom: '1.5px solid #cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <label
              style={{
                marginBottom: 0,
                fontSize: '11.5px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#0f5132',
                textTransform: 'uppercase',
              }}
            >
              <i className="fa-solid fa-utensils"></i>
              <span>DIETARY ADVICE (EDITABLE &amp; AUTO-TRANSLATED TO {lang === 'GU' ? 'ગુજરાતી' : lang === 'HI' ? 'हिंदी' : 'ENGLISH'})</span>
            </label>

            {/* Quick Shortcut Chips */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {['db', 'sugar', 'bp', 'acid', 'thyroid', 'uric', 'cv', 'lq'].map((code) => (
                <span
                  key={code}
                  onClick={() => setDietaryInput(code)}
                  style={{
                    fontSize: '9.5px',
                    padding: '1px 6px',
                    cursor: 'pointer',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontWeight: 800,
                    borderRadius: '4px',
                    border: '1px solid #bae6fd',
                  }}
                  title={code.toUpperCase()}
                >
                  + {code.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={dietaryInput}
              onChange={(e) => setDietaryInput(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '12px',
                background: '#fff',
                border: '1.5px solid #86efac',
                borderRadius: '6px',
                outline: 'none',
              }}
              placeholder="e.g. db, bp, acid, or custom food items..."
            />

            <button
              type="button"
              onClick={() => window.print()}
              style={{
                padding: '7px 22px',
                fontWeight: 800,
                background: '#0f5132',
                borderColor: '#0f5132',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
              }}
            >
              <i className="fa-solid fa-print"></i>
              <span>Print A5 Sheet</span>
            </button>
          </div>
          <div style={{ fontSize: '10.5px', color: '#64748b' }}>
            Tip: You can freely delete any food name in the box above (e.g. remove "Cucumbers" or "Potatoes"), and remaining foods will be cleanly translated when printing.
          </div>
        </div>

        {/* Scrollable A5 Paper Sheet Viewport (Gray background matching Screenshot 1 & 2) */}
        <div
          className="cms-prescription-scroll-viewport"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '18px 12px',
            background: '#94a3b8',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {/* Printable A5 Sheet Content Area matching exact layout */}
          <div
            id="cms-print-area"
            className="cms-print-area cms-print-preview-box"
            style={{
              width: '148mm',
              minHeight: '205mm',
              maxWidth: '100%',
              background: '#ffffff',
              padding: '7mm 9mm',
              boxShadow: '0 8px 30px rgba(0,0,0,0.28)',
              borderRadius: '4px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              color: '#0f172a',
            }}
          >
            <div>
              {/* Doctor & Clinic Letterhead */}
              <div
                className="cms-print-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginBottom: '4px',
                }}
              >
                <div>
                  <div style={{ fontSize: '20pt', fontWeight: 800, color: '#146B5C', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                    {t.drTitle}
                  </div>
                  <div style={{ fontSize: '10.5pt', fontWeight: 800, color: '#146B5C', letterSpacing: '0.3px' }}>
                    {t.drDegree}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '9pt', color: '#333', fontWeight: 'bold', lineHeight: 1.4 }}>
                  <div>{t.mobileLabel}</div>
                  <div>{t.regLabel}</div>
                </div>
              </div>

              {/* Address Banner */}
              <div
                className="cms-print-banner"
                style={{
                  background: '#e2e8f0',
                  padding: '3px 8px',
                  borderBottom: '1.5px solid #94a3b8',
                  borderTop: '1.5px solid #94a3b8',
                  fontSize: '9.5pt',
                  textAlign: 'center',
                  marginBottom: '6px',
                  color: '#1e293b',
                  fontWeight: 700,
                }}
              >
                {t.clinicBanner}
              </div>

              {/* Patient Header */}
              <div
                className="cms-print-patient-bar"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10pt',
                  fontWeight: 'bold',
                  marginBottom: '6px',
                  padding: '0 2px',
                  borderBottom: '1px solid #cbd5e1',
                  paddingBottom: '4px',
                }}
              >
                <div>
                  {t.for} <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{patient.name}</span> ({t.age} {toLocalNumber(patient.age, lang) || '-'}{patient.bloodGroup ? `, ${patient.bloodGroup}` : ''})
                </div>
                <div>
                  {t.date} <span style={{ fontWeight: 700 }}>{fmtDate(visit.date)}</span> · <span style={{ fontSize: '9.5pt' }}>{t.case} {toLocalNumber(caseIdDisplay, lang)}</span>
                </div>
              </div>

              {/* Clinical Vitals */}
              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  fontSize: '9pt',
                  color: '#334155',
                  marginBottom: '6px',
                  borderBottom: '1px dashed #cbd5e1',
                  paddingBottom: '4px',
                  flexWrap: 'wrap',
                }}
              >
                {visit.complaint && (
                  <div>
                    {t.complaint} <b>{translateFoodList(visit.complaint, lang) || visit.complaint}</b>
                  </div>
                )}
                {visit.investigation && (
                  <div>
                    {t.inv} <b>{translateFoodList(visit.investigation, lang) || visit.investigation}</b>
                  </div>
                )}
                {visit.bp && (
                  <div>
                    {t.bp} <b>{visit.bp}</b>
                  </div>
                )}
                {visit.sugar && (
                  <div>
                    {t.sugar} <b>{toLocalNumber(visit.sugar, lang)}</b>
                  </div>
                )}
              </div>

              {/* Prescription Table (Rx) */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '18pt', fontWeight: 900, fontFamily: "'Times New Roman', serif", color: '#146B5C', marginBottom: '2px' }}>
                  ℞
                </div>
                <table className="cms-print-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '45%', textAlign: 'left', borderBottom: '2px solid #94a3b8', padding: '4px 6px', fontSize: '9.5pt' }}>
                        {t.med}
                      </th>
                      <th style={{ width: '15%', textAlign: 'center', borderBottom: '2px solid #94a3b8', padding: '4px 6px', fontSize: '9.5pt' }}>
                        {t.qty}
                      </th>
                      <th style={{ width: '40%', textAlign: 'left', borderBottom: '2px solid #94a3b8', padding: '4px 6px', fontSize: '9.5pt' }}>
                        {t.inst}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(visit.prescription || []).filter((p) => p.name && p.name.trim()).length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: '#666', padding: '10px', fontSize: '9.5pt' }}>
                          {t.noMed}
                        </td>
                      </tr>
                    ) : (
                      (visit.prescription || [])
                        .filter((p) => p.name && p.name.trim())
                        .map((p, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0', fontSize: '9.5pt', fontWeight: 700, color: '#0f172a' }}>
                              {p.name}
                            </td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, fontSize: '9.5pt' }}>
                              {toLocalNumber(p.qty || '1', lang)}
                            </td>
                            <td style={{ padding: '4px 6px', borderBottom: '1px solid #e2e8f0', fontSize: '9.5pt', fontWeight: 600, color: '#1e293b' }}>
                              {parseDosage(p)}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Multi-Language Translated Dietary Advice Block */}
              {dietaryInput && dietaryInput.trim() && (
                <div style={{ marginTop: '12px', borderTop: '1.5px dashed #146B5C', paddingTop: '6px' }}>
                  <div style={{ fontSize: '10pt', fontWeight: 800, color: '#146B5C', textDecoration: 'underline', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-utensils" style={{ fontSize: '9.5pt' }}></i> <span>{t.diet}</span>
                  </div>
                  <div
                    style={{
                      border: '1.5px solid #146B5C',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      background: '#fafdfc',
                    }}
                  >
                    {parsedDiet.title && (
                      <div style={{ fontWeight: 800, color: '#146B5C', fontSize: '10pt', marginBottom: '4px', borderBottom: '1px dashed #bbf7d0', paddingBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="fa-solid fa-notes-medical" style={{ fontSize: '9pt' }}></i> {parsedDiet.title} {lang === 'GU' ? 'ખોરાકની પરેજી' : lang === 'HI' ? 'आहार संबंधी सलाह' : 'Dietary Advice'}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '9.5pt' }}>
                      {parsedDiet.eat && (
                        <div style={{ color: '#047857', lineHeight: '1.4' }}>
                          <span style={{ fontWeight: 800, color: '#065f46' }}>
                            <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i> {t.eatLabel}
                          </span>
                          <span style={{ color: '#111', fontWeight: 600 }}> {parsedDiet.eat}</span>
                        </div>
                      )}
                      {parsedDiet.avoid && (
                        <div style={{ color: '#b91c1c', lineHeight: '1.4' }}>
                          <span style={{ fontWeight: 800, color: '#991b1b' }}>
                            <i className="fa-solid fa-ban" style={{ color: '#ef4444' }}></i> {t.avoidLabel}
                          </span>
                          <span style={{ color: '#111', fontWeight: 600 }}> {parsedDiet.avoid}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Chemist Note */}
            <div
              className="cms-print-footer"
              style={{
                textAlign: 'center',
                fontSize: '11pt',
                fontWeight: 900,
                borderTop: '1.5px solid #cbd5e1',
                paddingTop: '6px',
                marginTop: '14px',
                color: '#1167B1',
              }}
            >
              {t.chemistNote}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
