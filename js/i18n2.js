"use strict";
/* Additional strings merged into I18N (loaded after i18n.js):
   new hazards (extreme cold, dust/sandstorm, cyclone), worldwide city search, map view.
   Prototype-quality translations - have native speakers review before real-world use. */
(function () {
  const X = {
    en: {
      ui: {
        ranked_title: "Safe places, ranked by walking time and hazard type",
        city_ph: "Search any city or place worldwide…", city_none: "No matching place found",
        city_err: "Search unavailable – showing saved cities",
        t_cold: "Extreme cold – feels like {a} °C",
        t_dust: "Dust / sandstorm – dust up to {u} µg/m³ (forecast)",
        map_title: "Map: safe places & hazards", map_load: "Load map (uses data)", map_loading: "Loading map…",
        map_fail: "Map could not load. The text guidance above still applies.",
        map_you: "You are here", map_rec: "Recommended", map_hazards: "Zoom to hazards", map_places: "Zoom to safe places",
        map_radar: "Rain radar", map_radar_off: "Hide radar", map_radar_fail: "Radar unavailable",
        map_proj: "Projected (rough estimate)", map_front: "Wave front (estimate)", map_area: "Forecast area (approximate)",
        map_track: "Past track", map_wind: "Downwind spread (rough estimate)",
        map_note: "Walk times use OpenStreetMap routes where available, otherwise straight-line estimates. Hazard positions and projections are rough estimates, not official forecasts.",
        route_tag: "route", est_tag: "est.",
        why_high: "Higher ground", why_open: "Open assembly point", why_indoor: "Sturdy / indoor shelter", why_away: "Away from the hazard",
        why_near: "Closest", why_sturdy: "Sturdy building", higher_pt: "Higher ground point",
        kind_shelter: "Shelter", kind_hospital: "Hospital", kind_community_centre: "Community centre", kind_townhall: "Town hall",
        kind_library: "Library", kind_assembly_point: "Assembly point", kind_higher: "Higher ground",
        footer: "Data: Open-Meteo, USGS, NASA EONET, US NWS, OpenStreetMap (maps, shelters, routes), RainViewer, Leaflet. Estimates are not official warnings – always follow local authorities."
      },
      hz: { cold: "Extreme cold", dust: "Dust / sandstorm", cyclone: "Cyclone / Hurricane / Typhoon" },
      G: {
        cold: ["Get indoors to a heated place; layer up (hat, gloves, scarf, windproof outer layer) and keep skin covered.",
          "Keep clothes and boots dry; wet cold is dangerous. Avoid sweating and alcohol.",
          "Shivering that won't stop, numb skin, slurred speech or confusion: warm the person slowly and call emergency services.",
          "Avoid driving; if you must, carry blankets, water and a charged phone. Never heat a room with a stove or grill indoors (carbon monoxide)."],
        dust: ["Go indoors or into a vehicle and close windows, doors and vents; stay put until it passes.",
          "Cover nose and mouth with a mask or damp cloth and protect your eyes with goggles or glasses.",
          "Do not drive in low visibility; if caught, pull off the road, switch lights off, keep your foot off the brake, and wait.",
          "Drink water, keep medicines (e.g. inhalers) close, and avoid outdoor exercise until the air clears."],
        cyclone: ["Move now to a strong shelter or sturdy building away from the coast and low ground; follow evacuation orders early.",
          "Stay away from windows; keep to an interior room above any flood level but not on the top floors. Storm surge and flooding are the main killers near the coast.",
          "Prepare: charge phone and power banks; keep water, food, cash, medicines and passport in a waterproof bag.",
          "The calm “eye” is not the end – the winds return from the other direction. Stay inside until authorities say it is safe."]
      }
    },
    hi: {
      ui: {
        ranked_title: "सुरक्षित जगहें – पैदल समय और ख़तरे के प्रकार के अनुसार क्रमबद्ध",
        city_ph: "दुनिया का कोई भी शहर खोजें…", city_none: "कोई जगह नहीं मिली", city_err: "ऑफ़लाइन – सहेजे गए शहर दिखा रहे हैं",
        t_cold: "भीषण ठंड – महसूस होगा {a} °C", t_dust: "धूल / रेतीला तूफ़ान – धूल {u} µg/m³ तक (पूर्वानुमान)",
        map_title: "नक्शा: सुरक्षित जगहें और ख़तरे", map_load: "नक्शा लोड करें (डेटा लगेगा)", map_loading: "नक्शा लोड हो रहा है…",
        map_fail: "नक्शा लोड नहीं हो सका। ऊपर दिया गया टेक्स्ट मार्गदर्शन अब भी लागू है।",
        map_you: "आप यहाँ हैं", map_rec: "सुझाया गया", map_hazards: "ख़तरों पर ज़ूम", map_places: "सुरक्षित जगहों पर ज़ूम",
        map_radar: "बारिश रडार", map_radar_off: "रडार छिपाएँ", map_radar_fail: "रडार उपलब्ध नहीं",
        map_proj: "अनुमानित मार्ग (मोटा अंदाज़ा)", map_front: "तरंग अग्रभाग (अनुमान)", map_area: "पूर्वानुमान क्षेत्र (अनुमानित)",
        map_track: "पिछला मार्ग", map_wind: "हवा की दिशा में फैलाव (मोटा अंदाज़ा)",
        map_note: "पैदल समय जहाँ संभव हो OpenStreetMap मार्ग से, वरना सीधी दूरी के अनुमान से है। ख़तरों की स्थिति और आगे का अनुमान मोटे अनुमान हैं, आधिकारिक पूर्वानुमान नहीं।",
        route_tag: "मार्ग", est_tag: "अनुमान",
        why_high: "ऊँची जगह", why_open: "खुला सभा-स्थल", why_indoor: "मज़बूत / भीतरी आश्रय", why_away: "ख़तरे से दूर",
        why_near: "सबसे नज़दीक", why_sturdy: "मज़बूत इमारत", higher_pt: "ऊँची जगह",
        kind_shelter: "आश्रय", kind_hospital: "अस्पताल", kind_community_centre: "सामुदायिक केंद्र", kind_townhall: "नगर भवन",
        kind_library: "पुस्तकालय", kind_assembly_point: "सभा-स्थल", kind_higher: "ऊँची जगह"
      },
      hz: { cold: "भीषण ठंड", dust: "धूल / रेतीला तूफ़ान", cyclone: "चक्रवात (हरिकेन / टाइफून)" },
      G: {
        cold: ["किसी गर्म जगह के अंदर चले जाएँ; टोपी, दस्ताने, मफलर और हवा-रोधी परतें पहनें, त्वचा ढकें।",
          "कपड़े और जूते सूखे रखें; गीली ठंड ख़तरनाक है। पसीने और शराब से बचें।",
          "लगातार कंपकंपी, सुन्न त्वचा, लड़खड़ाती बोली या भ्रम हो तो व्यक्ति को धीरे-धीरे गर्म करें और आपातकालीन सेवा बुलाएँ।",
          "गाड़ी चलाने से बचें; ज़रूरी हो तो कंबल, पानी और चार्ज फ़ोन रखें। कमरे के अंदर अंगीठी या ग्रिल न जलाएँ (कार्बन मोनोऑक्साइड)।"],
        dust: ["घर या गाड़ी के अंदर चले जाएँ, खिड़कियाँ, दरवाज़े और वेंट बंद करें; तूफ़ान गुज़रने तक वहीं रहें।",
          "नाक-मुँह मास्क या गीले कपड़े से ढकें और आँखों को चश्मे से बचाएँ।",
          "कम दृश्यता में गाड़ी न चलाएँ; फँस जाएँ तो सड़क से हटकर रुकें, लाइटें बंद करें, पैर ब्रेक से हटा लें और प्रतीक्षा करें।",
          "पानी पिएँ, दवाएँ (जैसे इन्हेलर) पास रखें और हवा साफ़ होने तक बाहर कसरत न करें।"],
        cyclone: ["अभी तटीय इलाक़े और निचली जगहों से दूर किसी मज़बूत आश्रय या इमारत में जाएँ; निकासी का आदेश मिलते ही निकलें।",
          "खिड़कियों से दूर, इमारत के भीतरी कमरे में रहें; बाढ़ के स्तर से ऊपर, पर सबसे ऊपरी मंज़िलों पर नहीं। तट के पास तूफ़ानी लहरें और बाढ़ सबसे बड़ा ख़तरा हैं।",
          "फ़ोन और पावर बैंक चार्ज करें; पानी, खाना, नक़दी, दवाएँ और पासपोर्ट वाटरप्रूफ़ थैले में रखें।",
          "तूफ़ान की “आँख” की शांति अंत नहीं है – हवा दूसरी दिशा से लौटती है। अधिकारियों के सुरक्षित बताने तक अंदर रहें।"]
      }
    },
    ta: {
      ui: {
        ranked_title: "பாதுகாப்பான இடங்கள் – நடை நேரம், ஆபத்து வகைப்படி வரிசை",
        city_ph: "உலகின் எந்த நகரத்தையும் தேடுங்கள்…", city_none: "பொருந்தும் இடம் இல்லை", city_err: "இணையம் இல்லை – சேமித்த நகரங்களைக் காட்டுகிறது",
        t_cold: "கடும் குளிர் – உணர்வு வெப்பநிலை {a} °C", t_dust: "புழுதி / மணல் புயல் – புழுதி {u} µg/m³ வரை (முன்னறிவிப்பு)",
        map_title: "வரைபடம்: பாதுகாப்பான இடங்கள் & ஆபத்துகள்", map_load: "வரைபடத்தை ஏற்று (டேட்டா செலவாகும்)", map_loading: "வரைபடம் ஏற்றப்படுகிறது…",
        map_fail: "வரைபடம் ஏற்ற முடியவில்லை. மேலுள்ள உரை வழிகாட்டல் தொடர்ந்து பொருந்தும்.",
        map_you: "நீங்கள் இங்கே", map_rec: "பரிந்துரை", map_hazards: "ஆபத்துகளுக்கு பெரிதாக்கு", map_places: "பாதுகாப்பான இடங்களுக்கு பெரிதாக்கு",
        map_radar: "மழை ரேடார்", map_radar_off: "ரேடாரை மறை", map_radar_fail: "ரேடார் கிடைக்கவில்லை",
        map_proj: "கணிக்கப்பட்ட பாதை (தோராயம்)", map_front: "அலை முனை (மதிப்பீடு)", map_area: "முன்னறிவிப்புப் பகுதி (தோராயம்)",
        map_track: "கடந்த பாதை", map_wind: "காற்றுத் திசையில் பரவல் (தோராயம்)",
        map_note: "நடை நேரம் முடிந்தவரை OpenStreetMap பாதையின்படி, இல்லையெனில் நேர்கோட்டு மதிப்பீடு. ஆபத்தின் இடம், முன்கணிப்பு தோராய மதிப்பீடுகள்; அதிகாரப்பூர்வ முன்னறிவிப்பு அல்ல.",
        route_tag: "பாதை", est_tag: "மதிப்பீடு",
        why_high: "உயரமான இடம்", why_open: "திறந்த கூடுமிடம்", why_indoor: "உறுதியான / உள்ளரங்கு தங்குமிடம்", why_away: "ஆபத்திலிருந்து விலகி",
        why_near: "மிக அருகில்", why_sturdy: "உறுதியான கட்டடம்", higher_pt: "உயரமான இடம்",
        kind_shelter: "தங்குமிடம்", kind_hospital: "மருத்துவமனை", kind_community_centre: "சமூக மையம்", kind_townhall: "நகர மண்டபம்",
        kind_library: "நூலகம்", kind_assembly_point: "கூடுமிடம்", kind_higher: "உயரமான இடம்"
      },
      hz: { cold: "கடும் குளிர்", dust: "புழுதி / மணல் புயல்", cyclone: "சூறாவளி / ஹரிகேன் / டைபூன்" },
      G: {
        cold: ["சூடான இடத்திற்குள் செல்லுங்கள்; தொப்பி, கையுறை, துணி அடுக்குகள் அணிந்து தோலை மூடுங்கள்.",
          "ஆடைகளையும் காலணிகளையும் உலர வைத்திருங்கள்; ஈரக் குளிர் ஆபத்தானது. வியர்வை, மதுவைத் தவிர்க்கவும்.",
          "நிற்காத நடுக்கம், மரத்துப்போன தோல், குழறிய பேச்சு அல்லது குழப்பம் இருந்தால் மெதுவாக வெப்பப்படுத்தி அவசர சேவையை அழையுங்கள்.",
          "வாகனம் ஓட்டுவதைத் தவிர்க்கவும்; தேவைப்பட்டால் போர்வை, தண்ணீர், சார்ஜ் செய்த போன் வைத்திருங்கள். அறைக்குள் அடுப்பு அல்லது கிரில் எரிக்க வேண்டாம் (கார்பன் மோனாக்சைடு)."],
        dust: ["வீட்டிற்குள் அல்லது வாகனத்திற்குள் சென்று ஜன்னல், கதவுகளை மூடுங்கள்; புயல் கடக்கும் வரை அங்கேயே இருங்கள்.",
          "மூக்கையும் வாயையும் முகக்கவசம் அல்லது ஈரத் துணியால் மூடி, கண்களைக் கண்ணாடியால் பாதுகாக்கவும்.",
          "பார்வை குறைவாக இருக்கும்போது வாகனம் ஓட்ட வேண்டாம்; சிக்கினால் சாலையோரம் நிறுத்தி, விளக்குகளை அணைத்து, பிரேக்கிலிருந்து காலை எடுத்துக் காத்திருங்கள்.",
          "தண்ணீர் குடியுங்கள், மருந்துகளை (இன்ஹேலர் போன்றவை) அருகில் வைத்திருங்கள்; காற்று தெளியும் வரை வெளியே உடற்பயிற்சி வேண்டாம்."],
        cyclone: ["இப்போதே கடற்கரை, தாழ்வான பகுதிகளிலிருந்து விலகி உறுதியான தங்குமிடம் அல்லது கட்டடத்திற்குச் செல்லுங்கள்; வெளியேற்ற உத்தரவை முன்கூட்டியே பின்பற்றுங்கள்.",
          "ஜன்னல்களிலிருந்து விலகி, கட்டடத்தின் உட்புற அறையில் இருங்கள்; வெள்ள மட்டத்திற்கு மேல், ஆனால் மேல் தளங்களில் அல்ல. கடலோரத்தில் புயல் அலையும் வெள்ளமும் மிகப் பெரிய ஆபத்து.",
          "போன், பவர் பேங்க் சார்ஜ் செய்யுங்கள்; தண்ணீர், உணவு, பணம், மருந்து, பாஸ்போர்ட்டை நீர்புகாப் பையில் வையுங்கள்.",
          "புயலின் “கண்” அமைதி முடிவல்ல – காற்று எதிர்த் திசையிலிருந்து திரும்பும். அதிகாரிகள் பாதுகாப்பு என்று சொல்லும் வரை உள்ளே இருங்கள்."]
      }
    },
    es: {
      ui: {
        ranked_title: "Lugares seguros, ordenados por tiempo a pie y tipo de peligro",
        city_ph: "Busca cualquier ciudad del mundo…", city_none: "No se encontró ningún lugar", city_err: "Sin conexión – mostrando ciudades guardadas",
        t_cold: "Frío extremo – sensación de {a} °C", t_dust: "Polvo / tormenta de arena – polvo de hasta {u} µg/m³ (pronóstico)",
        map_title: "Mapa: lugares seguros y peligros", map_load: "Cargar mapa (usa datos)", map_loading: "Cargando mapa…",
        map_fail: "No se pudo cargar el mapa. La guía en texto de arriba sigue siendo válida.",
        map_you: "Estás aquí", map_rec: "Recomendado", map_hazards: "Ver peligros", map_places: "Ver lugares seguros",
        map_radar: "Radar de lluvia", map_radar_off: "Ocultar radar", map_radar_fail: "Radar no disponible",
        map_proj: "Proyección (estimación aproximada)", map_front: "Frente de onda (estimación)", map_area: "Zona de pronóstico (aproximada)",
        map_track: "Trayectoria pasada", map_wind: "Avance a favor del viento (estimación aproximada)",
        map_note: "Los tiempos a pie usan rutas de OpenStreetMap cuando es posible; si no, estimaciones en línea recta. Las posiciones y proyecciones de los peligros son estimaciones aproximadas, no pronósticos oficiales.",
        route_tag: "ruta", est_tag: "est.",
        why_high: "Terreno elevado", why_open: "Punto de reunión al aire libre", why_indoor: "Refugio resistente / interior", why_away: "Lejos del peligro",
        why_near: "El más cercano", why_sturdy: "Edificio resistente", higher_pt: "Punto elevado",
        kind_shelter: "Refugio", kind_hospital: "Hospital", kind_community_centre: "Centro comunitario", kind_townhall: "Ayuntamiento",
        kind_library: "Biblioteca", kind_assembly_point: "Punto de reunión", kind_higher: "Terreno elevado"
      },
      hz: { cold: "Frío extremo", dust: "Polvo / tormenta de arena", cyclone: "Ciclón / huracán / tifón" },
      G: {
        cold: ["Entra en un lugar con calefacción; abrígate por capas (gorro, guantes, bufanda, capa cortaviento) y cubre la piel.",
          "Mantén la ropa y el calzado secos; el frío húmedo es peligroso. Evita sudar y el alcohol.",
          "Si hay temblores que no paran, piel entumecida, habla torpe o confusión: calienta a la persona poco a poco y llama a emergencias.",
          "Evita conducir; si debes, lleva mantas, agua y el móvil cargado. Nunca uses estufas o parrillas dentro de casa (monóxido de carbono)."],
        dust: ["Entra en un edificio o vehículo y cierra ventanas, puertas y ventilaciones; quédate hasta que pase.",
          "Cúbrete nariz y boca con mascarilla o tela húmeda y protege los ojos con gafas.",
          "No conduzcas con poca visibilidad; si te sorprende, sal de la carretera, apaga las luces, quita el pie del freno y espera.",
          "Bebe agua, ten a mano tus medicinas (p. ej. inhalador) y evita el ejercicio al aire libre hasta que el aire se despeje."],
        cyclone: ["Ve ahora a un refugio o edificio resistente, lejos de la costa y de zonas bajas; sigue pronto las órdenes de evacuación.",
          "Aléjate de las ventanas; permanece en una habitación interior, por encima del nivel de inundación pero no en los pisos más altos. La marejada y las inundaciones son el mayor peligro en la costa.",
          "Carga el móvil y las baterías externas; guarda agua, comida, efectivo, medicinas y pasaporte en una bolsa impermeable.",
          "La calma del “ojo” no es el final: el viento vuelve desde el otro lado. Permanece dentro hasta que las autoridades indiquen que es seguro."]
      }
    },
    zh: {
      ui: {
        ranked_title: "安全地点（按步行时间和灾害类型排序）",
        city_ph: "搜索全球任意城市或地点…", city_none: "未找到匹配地点", city_err: "离线 – 显示已保存的城市",
        t_cold: "极端寒冷 – 体感 {a} °C", t_dust: "沙尘 / 沙尘暴 – 沙尘最高 {u} µg/m³（预报）",
        map_title: "地图：安全地点与灾害", map_load: "加载地图（会使用流量）", map_loading: "正在加载地图…",
        map_fail: "地图无法加载。上方的文字指引仍然适用。",
        map_you: "你在这里", map_rec: "推荐", map_hazards: "查看灾害", map_places: "查看安全地点",
        map_radar: "降雨雷达", map_radar_off: "隐藏雷达", map_radar_fail: "雷达不可用",
        map_proj: "预测路径（粗略估计）", map_front: "波前（估计）", map_area: "预报区域（近似）",
        map_track: "过往路径", map_wind: "顺风蔓延（粗略估计）",
        map_note: "步行时间尽可能使用 OpenStreetMap 路线，否则为直线距离估算。灾害位置与预测为粗略估计，并非官方预报。",
        route_tag: "路线", est_tag: "估算",
        why_high: "地势较高", why_open: "开阔集合点", why_indoor: "坚固 / 室内避难所", why_away: "远离灾害",
        why_near: "最近", why_sturdy: "坚固建筑", higher_pt: "高地",
        kind_shelter: "避难所", kind_hospital: "医院", kind_community_centre: "社区中心", kind_townhall: "市政厅",
        kind_library: "图书馆", kind_assembly_point: "集合点", kind_higher: "高地"
      },
      hz: { cold: "极端寒冷", dust: "沙尘 / 沙尘暴", cyclone: "气旋 / 飓风 / 台风" },
      G: {
        cold: ["进入有暖气的室内；分层穿衣（帽子、手套、围巾、防风外层），遮盖裸露皮肤。",
          "保持衣服和鞋袜干燥；湿冷更危险。避免出汗和饮酒。",
          "若持续发抖、皮肤麻木、口齿不清或意识混乱：缓慢为其保暖并拨打急救电话。",
          "避免驾车；必须出行请带毯子、水和充满电的手机。切勿在室内使用炉子或烧烤架取暖（一氧化碳）。"],
        dust: ["进入室内或车内，关紧门窗和通风口，待沙尘过去再出来。",
          "用口罩或湿布遮住口鼻，戴护目镜或眼镜保护眼睛。",
          "能见度低时不要开车；若被困，请驶离道路、关闭车灯、松开刹车并等待。",
          "多喝水，随身携带药物（如吸入器），空气好转前避免户外运动。"],
        cyclone: ["立即前往远离海岸和低洼地的坚固避难所或建筑；尽早服从撤离命令。",
          "远离窗户，待在建筑内侧房间，高于可能的淹水水位但不要在最高楼层。沿海地区风暴潮和洪水最致命。",
          "给手机和充电宝充电；把水、食物、现金、药品和护照放入防水袋。",
          "风眼的平静不是结束——风会从相反方向再次袭来。在当局宣布安全前请留在室内。"]
      }
    }
  };
  for (const l in X) {
    Object.assign(I18N[l], X[l].ui);
    Object.assign(I18N[l].hz, X[l].hz);
    Object.assign(I18N[l].G, X[l].G);
  }
})();
