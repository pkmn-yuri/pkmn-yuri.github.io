// 1. 필요한 HTML 요소들을 찾기 (동일)
const categorySelect = document.getElementById('categorySelect');
const sourceLangSelect = document.getElementById('sourceLang');
const targetLangSelect = document.getElementById('targetLang');
const searchInput = document.getElementById('searchInput');
const translateButton = document.getElementById('translateButton');
const resultArea = document.getElementById('resultArea');
const pronunciationArea = document.getElementById('pronunciationArea');
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const swapButton = document.getElementById('swapButton');
const copySourceBtn = document.getElementById('copySource');
const copyTargetBtn = document.getElementById('copyTarget');

// 2. 마스터 데이터베이스 변수 (동일)
let masterDB = {};

// 3. 페이지가 로드되면 'database.json'을 불러옵니다. (동일)
async function loadData() {
    try {
        const response = await fetch('database.json');
        masterDB = await response.json();
        console.log('마스터 DB 로딩 성공!');
    } catch (error) {
        console.error('데이터 로딩 실패:', error);
        resultArea.textContent = '오류: DB 로딩 실패';
    }
}

// --- [수정] doTranslate 함수 (에러 시 초기화 및 레이아웃 최적화) ---
// --- [수정] doTranslate: 통합 검색 및 자동 인식 탑재 ---
async function doTranslate() {
    let query = searchInput.value.trim();
    let category = categorySelect.value;
    let sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    const pronHangeul = document.getElementById('pronHangeul') || pronunciationArea;
    const pronRomaji = document.getElementById('pronRomaji');

    // 초기화
    pronHangeul.textContent = "";
    if (pronRomaji) pronRomaji.textContent = "";
    pronHangeul.style.display = "none";
    if (pronRomaji) pronRomaji.style.display = "none";

    if (!targetLang) {
        resultArea.textContent = '번역될 언어를 선택해주세요.';
        return;
    }
    if (!query) return;

    // ---------------------------------------------------------
    // ⭐️ [통합 검색 및 자동 인식 로직]
    // ---------------------------------------------------------
    let foundId = null;
    let detectedCategory = null;
    let detectedLang = null;

    if (category === 'all' || sourceLang === 'auto') {

        // 위에서 특수 패턴(숫자 등)으로 감지되지 않았다면 일반 텍스트 검색 시작
        if (!foundId && !detectedCategory) {
            const categoriesToSearch = (category === 'all') 
                ? Object.keys(masterDB) 
                : [category];

            searchLoop:
            for (const cat of categoriesToSearch) {
                if (!masterDB[cat] || !masterDB[cat].map) continue;
                
                const langsToSearch = (sourceLang === 'auto') 
                    ? Object.keys(masterDB[cat].map) 
                    : [sourceLang];

                for (const lang of langsToSearch) {
                    const map = masterDB[cat].map[lang];
                    if (!map) continue;

                    let processedQuery = query;
                    // 전각/반각/소문자 보정
                    if (lang === 'ja' || lang.startsWith('zh')) {
                        processedQuery = processedQuery.replace(/[!-~]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0));
                        processedQuery = processedQuery.toLowerCase().replace(/ /g, "\u3000");
                    } else {
                        processedQuery = processedQuery.toLowerCase();
                    }

                    if (map[processedQuery]) {
                        foundId = map[processedQuery];
                        detectedCategory = cat;
                        detectedLang = lang;
                        lastDetectedLang = lang; // 스왑용 저장
                        break searchLoop; 
                    }
                }
            }
        }

        if (!foundId && !detectedCategory) {
            resultArea.textContent = '결과를 찾을 수 없습니다.';
            return;
        }

        // 감지된 값 적용
        if (detectedCategory) category = detectedCategory;
        if (detectedLang) sourceLang = detectedLang;
    } 
    else {
        // [기존] 단일 카테고리/언어 검색
        // ... (기존 로직 유지) ...
        // 단, 여기서도 숫자 입력 시 pokemon -> dex_id 처리는 필요하다면 추가
        if (masterDB[category] && masterDB[category].map[sourceLang]) {
            // 전처리 생략 (위와 동일)
             let processedQuery = query.toLowerCase(); // 간단 처리
             foundId = masterDB[category].map[sourceLang][processedQuery];
        }
    }

    // =========================================================
    // 2. [OUTPUT] 출력 호환성 검사 (에러 메시지 처리)
    // =========================================================
    
    // 상황 A: 결과 언어가 'dex_id'(도감번호)인데, 찾은 카테고리가 'pokemon'이 아님
    if (targetLang === 'dex_id' && category !== 'pokemon') {
        resultArea.innerHTML = `<span style="color: #ef4444;">도감 번호는 '포켓몬' 카테고리에서만 확인할 수 있습니다.<br>Only Available in 'Pokémon' Category.</span>`;
        return;
    }

    // 상황 B: 결과 언어가 'stats'(능력치)인데, 찾은 카테고리가 'nature'가 아님
    if (targetLang === 'stats' && category !== 'nature') {
        resultArea.innerHTML = `<span style="color: #ef4444;">능력치 변화는 '성격' 카테고리에서만 확인할 수 있습니다.<br>Only Available in 'Nature' Category.</span>`;
        return;
    }

    // ---------------------------------------------------------
    
    if (!foundId) {
        resultArea.textContent = '결과 없음';
        return;
    }

    // --- 이후 결과 출력 로직 (기존과 동일 + 뱃지 표시) ---
    
    let translation;
    let reading = null; 
    let japaneseText = null; 

    // (기존 fetchFromApi 및 로컬 DB 조회 로직...)
    if (typeof foundId === 'string' || typeof foundId === 'number') {
        const localEntry = masterDB[category].db[foundId];
        if (localEntry) {
            translation = localEntry[targetLang];
            if (targetLang === 'ja') {
                japaneseText = localEntry['ja'];
                reading = localEntry['ja_reading_ko'];
            }
        }
        if (!translation) { 
            translation = await fetchFromApi(foundId, category, sourceLang, targetLang);
            if (targetLang === 'ja') japaneseText = translation;
        }
    }

    // 결과 출력
    if (translation && translation !== '결과 없음' && !translation.includes('오류')) {
        const categoryLabels = { 'pokemon': '포켓몬(Pokémon)', 'move': '기술(Move)', 'item': '도구(Item)', 'ability': '특성(Ability)', 'nature': '성격(Nature)' };

        if (categorySelect.value === 'all') {
            const label = categoryLabels[category] || category;
            resultArea.innerHTML = `<span style="font-size:0.6em; color:#888; display:block; margin-bottom:4px;">[${label}]</span>${translation}`;
        } else {
            resultArea.textContent = translation;
        }
        
        if (targetLang === 'ja') {
            if (japaneseText === '無に帰す光') {
                reading = "무니키스히카리";
            } else if (!reading && japaneseText) {
                reading = transliterateJapanese(japaneseText);
            }
            pronHangeul.textContent = reading || "";
            if(pronRomaji) pronRomaji.textContent = getJapaneseRomaji(japaneseText || translation);
            pronHangeul.style.display = "block";
            if(pronRomaji) pronRomaji.style.display = "block";
        } 
        else if (targetLang.startsWith('zh')) { 
            await loadPinyinData(); 
            const pinyin = getChinesePinyin(translation);
            const hangeul = getChineseHangeul(pinyin);
            pronHangeul.textContent = hangeul;
            if(pronRomaji) pronRomaji.textContent = pinyin;
            pronHangeul.style.display = "block";
            if(pronRomaji) pronRomaji.style.display = "block";
        }
        else if (targetLang === 'ko') {
            pronHangeul.textContent = getKoreanRomaji(translation);
            pronHangeul.style.display = "block";
        }
    } else {
        resultArea.textContent = translation || '결과 없음 (최종)';
    }
}

// (API 호출 함수 및 기타 함수는 이전과 동일)
// ... (fetchFromApi, findNameInApiData) ...

// ⬇️ ⬇️ ⬇️ (NEW) ⭐️⭐️⭐️ 일본어 자동 음차 함수 (맵 수정됨) ⭐️⭐️⭐️ ⬇️ ⬇️ ⬇️
function transliterateJapanese(text) {
    if (!text) return null;

    // 1. 히라가나를 가타카나로 변환하는 로직 (코드 포인트 차이 이용)
    // 히라가나 영역: 0x3041 ~ 0x3096 / 가타카나 영역: 0x30A1 ~ 0x30F6
    let convertedText = text.replace(/[\u3041-\u3096]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) + 0x60);
    });

    // 1. 한글 유니코드 상수
    const HANGUL_START = 0xAC00; // '가'
    const HANGUL_END = 0xD7A3;   // '힣'
    const FINAL_N = 4; // 'ㄴ' 받침
    const FINAL_S = 19; // 'ㅅ' 받침

    // 2. 단순 규칙 매핑 (⭐️ 수정됨)
    const map = {
        'ア':'아', 'イ':'이', 'ウ':'우', 'エ':'에', 'オ':'오',
        'カ':'카', 'キ':'키', 'ク':'쿠', 'ケ':'케', 'コ':'코',
        'サ':'사', 'シ':'시', 'ス':'스', 'セ':'세', 'ソ':'소',
        'タ':'타', 'チ':'치', 'ツ':'츠', 'テ':'테', 'ト':'토',
        'ナ':'나', 'ニ':'니', 'ヌ':'누', 'ネ':'네', 'ノ':'노',
        'ハ':'하', 'ヒ':'히', 'フ':'후', 'ヘ':'헤', 'ホ':'호',
        'マ':'마', 'ミ':'미', 'ム':'무', 'メ':'메', 'モ':'모',
        'ヤ':'야', 'ユ':'유', 'ヨ':'요',
        'ラ':'라', 'リ':'리', 'ル':'루', 'レ':'레', 'ロ':'로',
        'ワ':'와', 'ヲ':'오',
        'ガ':'가', 'ギ':'기', 'グ':'구', 'ゲ':'게', 'ゴ':'고',
        'ザ':'자', 'ジ':'지', 'ズ':'즈', 'ゼ':'제', 'ゾ':'조',
        'ダ':'다', 'ヂ':'지', 'ヅ':'즈', 'デ':'데', 'ド':'도',
        'バ':'바', 'ビ':'비', 'ブ':'부', 'ベ':'베', 'ボ':'보',
        'パ':'파', 'ピ':'피', 'プ':'푸', 'ペ':'페', 'ポ':'포',
        'ヴ': '부',
        // ⭐️ ⬇️ ⬇️ ⬇️ (핵심 수정!) ⬇️ ⬇️ ⬇️ ⭐️
        'ファ':'화', 'フィ':'휘', 'フェ':'훼', 'フォ':'훠', 'フュ': '휴',
        'キャ':'캬', 'キュ':'큐', 'キョ':'쿄',
        'シャ':'샤', 'シュ':'슈', 'ショ':'쇼', 'シェ':'셰',
        'チャ':'챠', 'チュ':'츄', 'チョ':'쵸', 'チェ':'체',
        'ニャ':'냐', 'ニュ':'뉴', 'ニョ':'뇨',
        'ヒャ':'햐', 'ヒュ':'휴', 'ヒョ':'효',
        'ミャ':'먀', 'ミュ':'뮤', 'ミョ':'묘',
        'リャ':'랴', 'リュ':'류', 'リョ':'료',
        'ギャ':'갸', 'ギュ':'규', 'ギョ':'교',
        'ジャ':'쟈', 'ジュ':'쥬', 'ジョ':'죠', 'ジェ':'제',
        'ビャ':'뱌', 'ビュ':'뷰', 'ビョ':'뵤',
        'ピャ':'퍄', 'ピュ':'퓨', 'ピョ':'표',
        'ヴァ':'바', 'ヴィ':'비', 'ヴェ':'베', 'ヴォ':'보', 'ヴュ': '뷰',
        'イェ': '예', 'ウィ': '위', 'ウェ': '웨', 'ウォ': '워',
        'スィ': '시', 'ズィ': '지', 'スュ': '슈', 'ズュ': '쥬',
        'ティ':'티', 'ディ':'디', 'トゥ': '투', 'ドゥ': '두', 'テュ': '튜', 'デュ':'듀',
        'ツァ': '차', 'ツィ': '치', 'ツェ': '체', 'ツォ': '초', 'ツュ': '츄',
        'ァ':'아', 'ィ':'이', 'ゥ':'우', 'ェ':'에', 'ォ':'오',
        'ャ':'야', 'ュ':'유', 'ョ':'요'
        // ⭐️ ⬆️ ⬆️ ⬆️ (핵심 수정 끝) ⬆️ ⬆️ ⬆️ ⭐️
    };

    let result = '';
    let lastCharWasLongVowel = false;

    // ... (이전 코드 동일)

    for (let i = 0; i < convertedText.length; i++) {
        let char = convertedText[i];
        
        // 3글자 복합 (text -> convertedText 로 변경)
        if (i + 2 < convertedText.length && map[convertedText.substring(i, i + 3)]) {
            result += map[convertedText.substring(i, i + 3)];
            i += 2;
            lastCharWasLongVowel = false;
        // 2글자 복합 (text -> convertedText 로 변경)
        } else if (i + 1 < convertedText.length && map[convertedText.substring(i, i + 2)]) {
            result += map[convertedText.substring(i, i + 2)];
            i += 1;
            lastCharWasLongVowel = false;
        
        // ... (나머지 로직 동일)
        
        // ン (N) 처리
        } else if (char === 'ン') {
            let handled = false;
            // 1. 앞에 글자가 있고, 그 글자가 '받침이 없는 한글'인 경우에만 받침으로 합침
            if (result.length > 0) {
                let lastCharCode = result.charCodeAt(result.length - 1);
                // 한글이면서 받침이 없는 경우 (28로 나눈 나머지가 0)
                if (lastCharCode >= HANGUL_START && lastCharCode <= HANGUL_END && (lastCharCode - HANGUL_START) % 28 === 0) {
                    let newCharCode = lastCharCode + FINAL_N; // 'ㄴ' 받침 추가
                    result = result.slice(0, -1) + String.fromCharCode(newCharCode);
                    handled = true;
                }
            }
            
            // 2. 받침으로 합치지 못한 경우 (어두, 장음 뒤, 이미 받침이 있는 경우 등)
            if (!handled) {
                result += '응';
            }
            lastCharWasLongVowel = false;
        
        // ッ (촉음) 처리
        } else if (char === 'ッ') {
            let handled = false;
            if (result.length > 0) {
                let lastCharCode = result.charCodeAt(result.length - 1);
                if (lastCharCode >= HANGUL_START && lastCharCode <= HANGUL_END && (lastCharCode - HANGUL_START) % 28 === 0) {
                    let newCharCode = lastCharCode + FINAL_S; // 'ㅅ' 받침 추가
                    result = result.slice(0, -1) + String.fromCharCode(newCharCode);
                    handled = true;
                }
            }

            if (!handled) {
                result += '읏';
            }
            lastCharWasLongVowel = false;
            
        // ー (장음) 처리
        } else if (char === 'ー') {
            result += '-';
            lastCharWasLongVowel = true;
        // 1글자 처리
        } else if (map[char]) {
            result += map[char];
            lastCharWasLongVowel = false;
        // 맵에 없는 글자
        } else {
            result += char;
            lastCharWasLongVowel = false;
        }
    }
    return result;
}

// --- [추가 1] 한국어 로마자 변환 (음절별 하이픈, 겹받침 규칙) ---
function getKoreanRomaji(text) {
    if (!text) return "";
    const cho = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
    const jung = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
    const jong = ["","k","k","k","n","n","n","t","l","k","m","l","l","l","p","l","m","p","p","t","t","ng","t","t","k","t","p","t"];

    let result = "";
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0) - 44032;

        if (code >= 0 && code <= 11171) {
            const c = Math.floor(code / 588);
            const ju = Math.floor((code % 588) / 28);
            const jo = code % 28;
            let romaji = (cho[c] + jung[ju] + jong[jo]).toLowerCase();
            
            // 앞글자가 한글인 경우에만 하이픈 추가
            const prevCode = text.charCodeAt(i-1) - 44032;
            if (i > 0 && prevCode >= 0 && prevCode <= 11171) {
                result += "-" + romaji;
            } else {
                result += romaji;
            }
        } else {
            // 한글이 아닌 문자(Z, !, 공백 등)는 원본 그대로(대문자 유지) 추가
            result += char;
        }
    }
    return result;
}

// --- [추가 2] 일본어 로마자 변환 (개정 헵번식, 장음 Ā, 촉음 ', n') ---
function getJapaneseRomaji(text) {
    if (!text) return "";
    if (text === "無に帰す光") return "munikisuhikari";

    // 1. 전각 영숫자/기호를 반각으로 변환 (Ｚ -> Z)
    let processed = text.replace(/[\uFF01-\uFF5E]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    // 2. 히라가나를 가타카나로 변환
    processed = processed.replace(/[\u3041-\u3096]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60));

    const map = {
        'ア':'a', 'イ':'i', 'ウ':'u', 'エ':'e', 'オ':'o',
        'カ':'ka', 'キ':'ki', 'ク':'ku', 'ケ':'ke', 'コ':'ko',
        'サ':'sa', 'シ':'shi', 'ス':'su', 'セ':'se', 'ソ':'so',
        'タ':'ta', 'チ':'chi', 'ツ':'tsu', 'テ':'te', 'ト':'to',
        'ナ':'na', 'ニ':'ni', 'ヌ':'nu', 'ネ':'ne', 'ノ':'no',
        'ハ':'ha', 'ヒ':'hi', 'フ':'fu', 'ヘ':'he', 'ホ':'ho',
        'マ':'ma', 'ミ':'mi', 'ム':'mu', 'メ':'me', 'モ':'mo',
        'ヤ':'ya', 'ユ':'yu', 'ヨ':'yo',
        'ラ':'ra', 'リ':'ri', 'ル':'ru', 'レ':'re', 'ロ':'ro',
        'ワ':'wa', 'ヲ':'o',
        'ガ':'ga', 'ギ':'gi', 'グ':'gu', 'ゲ':'ge', 'ゴ':'go',
        'ザ':'za', 'ジ':'ji', 'ズ':'zu', 'ゼ':'ze', 'ゾ':'zo',
        'ダ':'da', 'ヂ':'ji', 'ヅ':'zu', 'デ':'de', 'ド':'do',
        'バ':'ba', 'ビ':'bi', 'ブ':'bu', 'ベ':'be', 'ボ':'bo',
        'パ':'pa', 'ピ':'pi', 'プ':'pu', 'ペ':'pe', 'ポ':'po',
        'ヴ': 'vu',
        // ⭐️ ⬇️ ⬇️ ⬇️ (핵심 수정!) ⬇️ ⬇️ ⬇️ ⭐️
        'ファ':'fa', 'フィ':'fi', 'フェ':'fe', 'フォ':'fo', 'フュ': 'fyu',
        'キャ':'kya', 'キュ':'kyu', 'キョ':'kyo',
        'シャ':'sha', 'シュ':'shu', 'ショ':'sho', 'シェ':'she',
        'チャ':'cha', 'チュ':'chu', 'チョ':'cho', 'チェ':'che',
        'ニャ':'nya', 'ニュ':'nyu', 'ニョ':'nyo',
        'ヒャ':'hya', 'ヒュ':'hyu', 'ヒョ':'hyo',
        'ミャ':'mya', 'ミュ':'myu', 'ミョ':'myo',
        'リャ':'rya', 'リュ':'ryu', 'リョ':'ryo',
        'ギャ':'gya', 'ギュ':'gyu', 'ギョ':'gyo',
        'ジャ':'ja', 'ジュ':'ju', 'ジョ':'jo', 'ジェ':'je',
        'ビャ':'bya', 'ビュ':'byu', 'ビョ':'byo',
        'ピャ':'pya', 'ピュ':'pyu', 'ピョ':'pyo',
        'ヴァ':'va', 'ヴィ':'vi', 'ヴェ':'ve', 'ヴォ':'vo', 'ヴュ': 'vyu',
        'イェ': 'ye', 'ウィ': 'wi', 'ウェ': 'we', 'ウォ': 'wo',
        'スィ': 'si', 'ズィ': 'zi', 'スュ': 'syu', 'ズュ': 'zyu',
        'ティ':'ti', 'ディ':'di', 'トゥ': 'tu', 'ドゥ': 'du', 'テュ': 'tyu', 'デュ':'dyu',
        'ツァ': 'tsa', 'ツィ': 'tsi', 'ツェ': 'tse', 'ツォ': 'tso', 'ツュ': 'tsyu',
        'ァ':'a', 'ィ':'i', 'ゥ':'u', 'ェ':'e', 'ォ':'o',
        'ャ':'ya', 'ュ':'yu', 'ョ':'yo'
        // ⭐️ ⬆️ ⬆️ ⬆️ (핵심 수정 끝) ⬆️ ⬆️ ⬆️ ⭐️
    };
    const longVowelMarks = {'a':'ā','i':'ī','u':'ū','e':'ē','o':'ō'};

    let res = "";
    for (let i = 0; i < processed.length; i++) {
        let char = processed[i];
        let next = processed[i+1] || "";

        // 알파벳과 숫자는 대문자로 변환하여 유지
        if(/[a-zA-Z0-9]/.test(char)) { res += char.toUpperCase(); continue; }

        if (char === 'ッ') {
            let nR = map[processed.substring(i+1, i+3)] || map[next] || "";
            res += (nR.startsWith('ch')) ? 't' : (nR[0] || "");
            continue;
        }
        if (char === 'ー' && res.length > 0) {
            let last = res.slice(-1);
            if (longVowelMarks[last]) res = res.slice(0, -1) + longVowelMarks[last];
            continue;
        }

        let dual = map[processed.substring(i, i+2)];
        if (dual) { res += dual; i++; }
        else {
            if (char === 'ン') {
                let nR = map[processed.substring(i+1, i+3)] || map[next] || "";
                res += (nR && /[aiueoy]/.test(nR[0])) ? "n'" : "n";
            } else {
                res += (map[char] || char).toLowerCase();
            }
        }
    }
    return res;
}

const PINYIN_TONE_MAP = {
    // a 시리즈
    'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
    // e 시리즈
    'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
    // i 시리즈
    'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
    // o 시리즈
    'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
    // u 시리즈
    'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
    // ü 시리즈 (ü는 발음 구분을 위해 유지)
    'ü': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü', 'ǖ': 'ü',
    // ê 시리즈 (다이어크리틱 유지하며 성조만 제거)
    'ê': 'ê', 'ế': 'ê', 'ề': 'ê', 'ê̄': 'ê', 'ê̌': 'ê'
};

// [데이터 로드 로직]
let pinyinDict = null;
async function loadPinyinData() {
    if (pinyinDict) return;
    const response = await fetch('pinyin-data.json');
    pinyinDict = await response.json();
}

// [3행용: 한자 -> 성조 병음]
function getChinesePinyin(text) {
    if (!pinyinDict || !text) return "";
    const pinyins = pinyinDict.data.split(',');
    
    // 1. 먼저 병음들을 합쳐서 'result' 변수에 담습니다. (return 하지 않음)
    let result = text.split('').map(char => {
        const code = char.charCodeAt(0);
        const index = code - pinyinDict.start;
        const pinyin = pinyins[index];
        
        if (index >= 0 && index < pinyins.length && pinyin && pinyin !== "null") {
            return pinyin;
        }
        return char;
    }).join(' ');

    // 2. 변수에 담긴 문자열에서 전각 문자를 반각으로 변환한 뒤 최종 반환합니다.
    return result.replace(/[\uFF01-\uFF5E]/g, s => 
        String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
    );
}

// [2행용: 성조 병음 -> 한글 발음]
function getChineseHangeul(pinyinWithTone) {
    if (!pinyinWithTone) return "";

    return pinyinWithTone.split(' ').map(py => {
        // 1. 병음 성조 기호가 있는지 확인하는 정규식
        const hasTone = /[āáǎàēéěèīíǐìōóǒòūúǔùüǘǚǜǖêếề]/.test(py);

        // 2. 성조가 없는 순수 알파벳/기호라면 원본(py) 그대로 반환 (대소문자 유지)
        if (!hasTone) {
            return py; 
        }

        // 3. 성조가 있는 '병음'일 때만 소문자로 바꿔서 한글 합성 진행
        let raw = py.split('').map(c => PINYIN_TONE_MAP[c] || c).join('').toLowerCase();
        
        let sm = "", um = "";
        const smList = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s"];
        
        for (let s of smList) {
            if (raw.startsWith(s)) { sm = s; um = raw.substring(s.length); break; }
        }
        if (!sm) um = raw; 
        
        // ... 이하 smMap, umMap, assembleHangeul 호출 로직 동일 ...
        const smMap = {'b':'ㅂ','p':'ㅍ','m':'ㅁ','f':'ㅍ','d':'ㄷ','t':'ㅌ','n':'ㄴ','l':'ㄹ','g':'ㄱ','k':'ㅋ','h':'ㅎ','j':'ㅈ','q':'ㅊ','x':'ㅅ','zh':'ㅈ','ch':'ㅊ','sh':'ㅅ','r':'ㄹ','z':'ㅉ','c':'ㅊ','s':'ㅆ'};
        let hangeulUm = "";

        if (um === "i" && ["c", "ch", "r", "s", "sh", "z", "zh"].includes(sm)) {
            hangeulUm = "으";
        } else if (["j", "q", "x"].includes(sm) && ["u", "ue", "uan", "un"].includes(um)) {
            const jqxuMap = { 'u':'위', 'ue':'웨', 'uan':'위안', 'un':'윈' };
            hangeulUm = jqxuMap[um];
        } else {
            const umMap = {
                'wei':'웨이', 'wen':'원', 'weng':'웡', 'ui': '우이', 'un': '운', 'ong': '웅',
                'a':'아','o':'오','e':'어','ê':'에','ai':'아이','ei':'에이','ao':'아오','ou':'어우','an':'안','en':'언', 'ang':'앙','eng':'엉','er':'얼','r':'얼',
                'yi':'이','i':'이','wu':'우','u':'우','yu':'위','ü':'위','ya':'야','ia':'야','yo':'요','ye':'예','ie':'예','yai':'야이','iai':'야이','yao':'야오','iao':'야오','you':'유','iu':'유','yan':'옌','ian':'옌','yin':'인','in':'인','yang':'양','iang':'양','ying':'잉','ing':'잉','wa':'와','ua':'와','wo':'워','uo':'워','wai':'와이','uai':'와이','wan':'완','uan':'완','wang':'왕','uang':'왕','yue':'웨','üe':'웨','yuan':'위안','üan':'위안','yun':'윈','ün':'윈','yong':'융','iong':'융'
            };
            hangeulUm = umMap[um] || um;
        }
        return assembleHangeul(smMap[sm] || "", hangeulUm);
    }).join('');
}

// [유니코드 합성 함수]
function assembleHangeul(cho, jung) {
    // 1. 초성/중성/종성 인덱스 정의 (유니코드 표준 순서)
    const choList = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    const jungList = ["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"];
    const jongList = ["", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

    // 2. 한 글자로 결합이 안 되는 발음들을 먼저 분리 (재귀 호출)
    // 초성이 "ㅇ"이 아닐 때 "저우"처럼 결합하려면 초성을 넘겨줘야 합니다.
    const splitCheck = {
        "어우": ["어", "우"], "아이": ["아", "이"], "에이": ["에", "이"],
        "아오": ["아", "오"], "웨이": ["웨", "이"], "우이": ["우", "이"],
        "야이": ["야", "이"], "야오": ["야", "오"], "와이": ["와", "이"],
        "위안": ["위", "안"]
    };

    if (splitCheck[jung]) {
        const [first, second] = splitCheck[jung];
        // 첫 글자는 초성과 결합하고, 뒤의 글자는 따로 붙임
        return assembleHangeul(cho, first) + second;
    }

    // 3. 실제 중성과 종성 분리 매핑
    const complexMap = {
        "아": ["ㅏ", ""], "어": ["ㅓ", ""], "이": ["ㅣ", ""], "오": ["ㅗ", ""], "우": ["ㅜ", ""], "으": ["ㅡ", ""],
        "에": ["ㅔ", ""], "예": ["ㅖ", ""], "웨": ["ㅞ", ""], "위": ["ㅟ", ""], "워": ["ㅝ", ""], "요": ["ㅛ", ""], "유": ["ㅠ", ""],
        "야": ["ㅑ", ""], "와": ["ㅘ", ""],
        "얼": ["ㅓ", "ㄹ"], "안": ["ㅏ", "ㄴ"], "언": ["ㅓ", "ㄴ"], "인": ["ㅣ", "ㄴ"], "운": ["ㅜ", "ㄴ"], "원": ["ㅝ", "ㄴ"], "윈": ["ㅟ", "ㄴ"], "완": ["ㅘ", "ㄴ"], "옌": ["ㅖ", "ㄴ"],
        "앙": ["ㅏ", "ㅇ"], "엉": ["ㅓ", "ㅇ"], "잉": ["ㅣ", "ㅇ"], "웅": ["ㅜ", "ㅇ"], "왕": ["ㅘ", "ㅇ"], "웡": ["ㅝ", "ㅇ"], "양": ["ㅑ", "ㅇ"], "융": ["ㅠ", "ㅇ"]
    };

    let realJung = jung;
    let realJong = "";

    if (complexMap[jung]) {
        [realJung, realJong] = complexMap[jung];
    }

    // 4. 인덱스 찾기 및 유니코드 결합
    const cIdx = choList.indexOf(cho || "ㅇ");
    const jIdx = jungList.indexOf(realJung);
    const bIdx = jongList.indexOf(realJong);

    // 유효한 인덱스일 때만 결합 수행
    if (cIdx !== -1 && jIdx !== -1) {
        return String.fromCharCode(0xAC00 + (cIdx * 588) + (jIdx * 28) + (bIdx !== -1 ? bIdx : 0));
    }

    // 결합 실패 시 자모 나열 (예외 상황)
    return (cho || "") + jung;
}

// 복사 함수 정의
function copyToClipboard(text, button) {
    if (!text || text === "번역 결과..." || text === "결과 없음 (최종)") return;

    navigator.clipboard.writeText(text).then(() => {
        // 복사 성공 시 버튼 텍스트 변경 피드백
        const originalText = button.textContent;
        button.textContent = "Copied!";
        button.style.backgroundColor = "#4ade80"; // 초록색 피드백
        button.style.color = "white";

        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = "";
            button.style.color = "";
        }, 1500);
    }).catch(err => {
        console.error('복사 실패:', err);
    });
}

// 출발어 복사 버튼 이벤트 (textarea 사용)
copySourceBtn.addEventListener('click', () => {
    copyToClipboard(searchInput.value, copySourceBtn);
});

// 도착어 복사 버튼 이벤트 (div 사용)
copyTargetBtn.addEventListener('click', () => {
    let textToCopy = resultArea.innerText;

    // [수정] 통합 검색 시 추가된 카테고리 뱃지 제거 로직
    // 뱃지는 보통 첫 줄에 [카테고리] 형태로 들어가고 줄바꿈(\n)이 생깁니다.
    if (textToCopy.includes('\n')) {
        const lines = textToCopy.split('\n');
        // 마지막 줄이 실제 번역 결과이므로 마지막 요소만 선택
        textToCopy = lines[lines.length - 1].trim();
    }

    // 예외 처리: 결과가 비어있거나 안내 문구 혹은 초기 문구인 경우 복사 방지
    if (!textToCopy || 
        textToCopy === '결과 없음' || 
        textToCopy === '번역 결과...' || 
        textToCopy === '결과 없음 (최종)' || 
        textToCopy.includes('선택해주세요')) {
        return;
    }

    // ⭐️ 정의해둔 copyToClipboard 함수를 호출하여 텍스트 복사와 색상 피드백을 한 번에 처리
    copyToClipboard(textToCopy, copyTargetBtn);
});

// (기존 코드들)
// (fetchFromApi, findNameInApiData, syncLanguages, swapButton, theme logic, category change logic)
const statAbbr = {
    "attack": "A",
    "defense": "B",
    "special-attack": "C",
    "special-defense": "D",
    "speed": "S"
};
async function fetchFromApi(resourceId, category, sourceLang, targetLang) { if (category === 'pokemon' && targetLang === 'dex_id') { return resourceId.toString(); } if (category === 'pokemon' && sourceLang === 'dex_id') { const apiData = { id: resourceId }; return await findNameInApiData(apiData, targetLang, category); } resultArea.textContent = 'API 검색 중...'; try { const endpoint = category === 'pokemon' ? 'pokemon-species' : category; const response = await fetch(`https://pokeapi.co/api/v2/${endpoint}/${resourceId}`); if (!response.ok) { throw new Error('API 응답 실패'); } const apiData = await response.json(); if (category === 'nature' && targetLang === 'stats') { const up = apiData.increased_stat ? statAbbr[apiData.increased_stat.name] : null; const down = apiData.decreased_stat ? statAbbr[apiData.decreased_stat.name] : null; if (!up && !down) return "-"; return `${up}+ ${down}-`; } return await findNameInApiData(apiData, targetLang, category); } catch (error) { console.error('API 호출 오류:', error); return '오류: API 연결 실패'; } }
async function findNameInApiData(apiData, langCode, category) { if (langCode === 'dex_id' && category === 'pokemon') { if (apiData.id) return apiData.id.toString(); const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${apiData.name}`); const speciesData = await response.json(); return speciesData.id.toString(); } const apiLangMap = { "ko":"ko", "ja":"ja-Hrkt", "en":"en", "es":"es", "fr":"fr", "de":"de", "it":"it", "zh-Hans":"zh-Hans", "zh-Hant":"zh-Hant" }; const apiLang = apiLangMap[langCode]; if (!apiLang) return null; if (apiData.id && !apiData.names) { const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${apiData.id}`); apiData = await response.json(); } const nameEntry = apiData.names.find(name => name.language.name === apiLang); return nameEntry ? nameEntry.name : null; }
if (translateButton) { translateButton.addEventListener('click', doTranslate); }
searchInput.addEventListener('keydown', function(event) { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); doTranslate(); } });
function syncLanguages() { const sourceVal = sourceLangSelect.value; const targetVal = targetLangSelect.value; for (const option of targetLangSelect.options) { if (option.value && option.value === sourceVal) option.disabled = true; else option.disabled = false; } for (const option of sourceLangSelect.options) { if (option.value && option.value === targetVal) option.disabled = true; else option.disabled = false; } }
sourceLangSelect.addEventListener('change', syncLanguages); targetLangSelect.addEventListener('change', syncLanguages);
swapButton.addEventListener('click', () => {
    // 1. 현재 설정 값 가져오기
    const currentSource = sourceLangSelect.value;
    const currentTarget = targetLangSelect.value;

    // 2. 언어 교체 로직 (핵심 수정 부분)
    
    // [윗칸 결정]
    // 아랫칸이 비어있었다면 -> 윗칸은 'auto'가 됩니다.
    // 아랫칸에 값이 있었다면 -> 그 값 그대로 올라갑니다.
    if (!currentTarget) {
        sourceLangSelect.value = 'auto';
    } else {
        sourceLangSelect.value = currentTarget;
    }

    // [아랫칸 결정]
    // 윗칸이 'auto'였다면 -> 아랫칸은 '빈칸(선택 안 함)'이 됩니다.
    // 윗칸이 특정 언어였다면 -> 그 값 그대로 내려옵니다.
    if (currentSource === 'auto') {
        targetLangSelect.value = ""; 
    } else {
        targetLangSelect.value = currentSource;
    }

    // 3. 텍스트 및 화면 처리 (기존과 동일)
    let resultText = resultArea.innerText; 
    
    // 결과창 텍스트 정제 (카테고리 뱃지 등 제거)
    if (resultText.includes('\n')) {
        const parts = resultText.split('\n');
        resultText = parts[parts.length - 1].trim();
    }
    
    const sourceText = searchInput.value;
    
    // 텍스트 교환
    // (결과가 없거나 에러 메시지인 경우 텍스트 이동 막기)
    const isErrorOrPlaceholder = [
        '결과 없음', '카테고리 오류', 'API 검색 중...', '오류', 
        '결과를 찾을 수 없습니다.', '번역될 언어를 선택해주세요.',
        'Only Available in \'Pokémon\' Category.',
        'Only Available in \'Nature\' Category.'
    ].some(msg => resultText.includes(msg));

    if (!isErrorOrPlaceholder && resultText) {
        searchInput.value = resultText;
    }
    
    // 결과창 및 발음창 초기화
    resultArea.textContent = ""; 
    const pronHangeul = document.getElementById('pronHangeul') || pronunciationArea;
    const pronRomaji = document.getElementById('pronRomaji');
    if (pronHangeul) { pronHangeul.textContent = ""; pronHangeul.style.display = "none"; }
    if (pronRomaji) { pronRomaji.textContent = ""; pronRomaji.style.display = "none"; }

    // 4. 버튼 상태 복구 및 UI 동기화
    copySourceBtn.textContent = "Copy";
    copyTargetBtn.textContent = "Copy";
    
    syncLanguages();
});
function applyTheme(theme) { if (theme === 'dark') { htmlEl.classList.add('dark'); themeToggle.textContent = '🌙'; } else { htmlEl.classList.remove('dark'); themeToggle.textContent = '☀️'; } }
function setInitialTheme() { const savedTheme = localStorage.getItem('theme'); if (savedTheme) { applyTheme(savedTheme); } else { const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; applyTheme(prefersDark ? 'dark' : 'light'); } }
themeToggle.addEventListener('click', () => { const isDark = htmlEl.classList.contains('dark'); const newTheme = isDark ? 'light' : 'dark'; applyTheme(newTheme); localStorage.setItem('theme', newTheme); });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => { const savedTheme = localStorage.getItem('theme'); if (!savedTheme) { applyTheme(event.matches ? 'dark' : 'light'); } });
function handleCategoryChange() {
    const category = categorySelect.value;
    const isPokemon = (category === 'pokemon');
    const isNature = (category === 'nature');
    const isAll = (category === 'all'); // 통합 검색 여부 추가

    // 1. 도감 번호 옵션 표시 (포켓몬 전용이거나 'All'일 때)
    const dexOptions = document.querySelectorAll('.pokemon-only-option');
    dexOptions.forEach(option => { 
        option.hidden = !(isPokemon || isAll); 
    });

    // 2. 능력치 변화 옵션 표시 (성격 전용이거나 'All'일 때)
    document.querySelectorAll('.nature-only-option').forEach(option => { 
        option.hidden = !(isNature || isAll); 
    });

    // 3. 만약 'All'도 아니고 전용 카테고리도 아닌데 해당 옵션이 선택되어 있다면 초기화
    if (!isPokemon && !isAll && sourceLangSelect.value === 'dex_id') sourceLangSelect.value = "auto";
    if (!isPokemon && !isAll && targetLangSelect.value === 'dex_id') targetLangSelect.value = "";
    
    if (!isNature && !isAll && sourceLangSelect.value === 'stats') sourceLangSelect.value = "auto";
    if (!isNature && !isAll && targetLangSelect.value === 'stats') targetLangSelect.value = "";

    syncLanguages();
}
categorySelect.addEventListener('change', handleCategoryChange);
loadData();
syncLanguages();
setInitialTheme();
handleCategoryChange();
