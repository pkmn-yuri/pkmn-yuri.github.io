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

// 4. 번역 실행 함수 (동일)
async function doTranslate() {
    // ... (이전 코드와 동일) ...
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;
    if (!category) { resultArea.textContent = '카테고리를 먼저 선택하세요.'; return; }
    if (!sourceLang) { resultArea.textContent = '번역할 언어를 선택하세요.'; return; }
    if (!targetLang) { resultArea.textContent = '번역될 언어를 선택하세요.'; return; }
    if (!masterDB[category]) { resultArea.textContent = '카테고리 오류'; return; }
    const langMap = masterDB[category].map[sourceLang];
    const resourceId = langMap ? langMap[query] : undefined;
    if (!resourceId) { resultArea.textContent = '결과 없음'; return; }
    let translation;
    let reading = null; 
    let japaneseText = null; 
    if (typeof resourceId === 'string') {
        const localEntry = masterDB[category].db[resourceId];
        if (localEntry) {
            translation = localEntry[targetLang];
            if (targetLang === 'ja') {
                japaneseText = localEntry['ja'];
                if (localEntry['ja_reading_ko']) { reading = localEntry['ja_reading_ko']; }
            }
            if (!translation && category === 'pokemon' && targetLang === 'dex_id') {
                translation = localEntry['dex_id'] || '로컬 DB에 dex_id 없음';
            }
            if (!translation) { 
                translation = await fetchFromApi(resourceId, category, sourceLang, targetLang);
                if (targetLang === 'ja') japaneseText = translation;
                reading = null;
            }
        } else {
            translation = await fetchFromApi(resourceId, category, sourceLang, targetLang);
            if (targetLang === 'ja') japaneseText = translation;
        }
    } else if (typeof resourceId === 'number') {
        translation = await fetchFromApi(resourceId, category, sourceLang, targetLang);
        if (targetLang === 'ja') japaneseText = translation;
    } else {
        translation = '유효하지 않은 ID';
    }
    // ... doTranslate 함수 내부 ...

    // ... doTranslate 함수 하단부 ...
    if (translation) {
        resultArea.textContent = translation;
        
        // 2열과 3열 요소 가져오기 (HTML에 id="pronHangeul"과 id="pronRomaji"가 있어야 합니다)
        const pronHangeul = document.getElementById('pronHangeul') || pronunciationArea; 
        const pronRomaji = document.getElementById('pronRomaji'); 

        // 초기화
        pronHangeul.textContent = "";
        if(pronRomaji) pronRomaji.textContent = "";
        resultArea.style.borderBottomLeftRadius = "8px";
        resultArea.style.borderBottomRightRadius = "8px";

        if (translation && translation !== '결과 없음' && !translation.includes('오류')) {
            resultArea.textContent = translation;

        if (targetLang === 'ja') {
            // 일본어: 2열에 한글 발음, 3열에 로마자
            if (!reading && japaneseText) {
                reading = (japaneseText === '無に帰す光') ? "무니키스히카리" : transliterateJapanese(japaneseText);
            }
            pronHangeul.textContent = reading || "";
            if(pronRomaji) pronRomaji.textContent = getJapaneseRomaji(japaneseText || translation);
            
            pronHangeul.style.display = "block";
            if(pronRomaji) pronRomaji.style.display = "block";
            resultArea.style.borderBottomLeftRadius = "0";
            resultArea.style.borderBottomRightRadius = "0";
        } 
        else if (targetLang === 'ko') {
            // 한국어: 2열에 바로 로마자 배치 (3열 비움)
            pronHangeul.textContent = getKoreanRomaji(translation);
            if(pronRomaji) {
                pronRomaji.textContent = "";
                pronRomaji.style.display = "none";
            }
            
            pronHangeul.style.display = "block";
            resultArea.style.borderBottomLeftRadius = "0";
            resultArea.style.borderBottomRightRadius = "0";
        } 
        else {
            // 기타 언어: 발음 영역 숨김
            pronHangeul.style.display = "none";
            if(pronRomaji) pronRomaji.style.display = "none";
            resultArea.style.borderBottomLeftRadius = "8px";
            resultArea.style.borderBottomRightRadius = "8px";
        }
    } else {
        resultArea.textContent = '결과 없음 (최종)';
        pronunciationArea.textContent = "";
        pronunciationArea.style.display = "none";
        resultArea.style.borderBottomLeftRadius = "0";
        resultArea.style.borderBottomRightRadius = "0";
    } else {
        resultArea.textContent = translation || '결과 없음';
        // 이 블록에 들어오면 이미 위에서 초기화했으므로 발음이 보이지 않음
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
            let batchim = (lastCharWasLongVowel) ? '응' : 'ㄴ';
            if (batchim === 'ㄴ' && result.length > 0) {
                let lastCharCode = result.charCodeAt(result.length - 1);
                if (lastCharCode >= HANGUL_START && lastCharCode <= HANGUL_END && (lastCharCode - HANGUL_START) % 28 === 0) {
                    let newCharCode = lastCharCode + FINAL_N; // 'ㄴ' 받침 추가
                    result = result.slice(0, -1) + String.fromCharCode(newCharCode);
                    lastCharWasLongVowel = false;
                    continue; 
                }
            }
            result += batchim;
            lastCharWasLongVowel = false;
        
        // ッ (촉음) 처리
        } else if (char === 'ッ') {
            if (result.length > 0) {
                let lastCharCode = result.charCodeAt(result.length - 1);
                if (lastCharCode >= HANGUL_START && lastCharCode <= HANGUL_END && (lastCharCode - HANGUL_START) % 28 === 0) {
                    let newCharCode = lastCharCode + FINAL_S; // 'ㅅ' 받침 추가
                    result = result.slice(0, -1) + String.fromCharCode(newCharCode);
                    lastCharWasLongVowel = false;
                    continue;
                }
            }
            result += 'ㅅ';
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

    let result = [];
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const code = char.charCodeAt(0) - 44032;

        if (code >= 0 && code <= 11171) {
            const c = Math.floor(code / 588);
            const ju = Math.floor((code % 588) / 28);
            const jo = code % 28;
            // 한글인 경우 변환 후 소문자화 + 앞글자가 한글이면 하이픈 추가
            let romaji = (cho[c] + jung[ju] + jong[jo]).toLowerCase();
            if (i > 0 && (text.charCodeAt(i-1) - 44032 >= 0 && text.charCodeAt(i-1) - 44032 <= 11171)) {
                result += "-" + romaji;
            } else {
                result += romaji;
            }
        } else {
            // 한글이 아닌 경우(Z, !, 공백 등) 그대로 보존
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

    // 1. 모든 히라가나를 가타카나로 먼저 변환 (로직 단순화)
    let convertedText = text.replace(/[\u3041-\u3096]/g, function(s) {
        return String.fromCharCode(s.charCodeAt(0) + 0x60);
    });

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
    let res = "";
    for (let i = 0; i < processed.length; i++) {
        let char = processed[i];
        let next = processed[i + 1] || "";

        // 알파벳/숫자/특수기호는 대문자로 고정 (요청사항 반영)
        if (/[a-zA-Z0-9]/.test(char)) {
            res += char.toUpperCase();
            continue;
        }
        if (char === 'ッ') {
            if (!next || /[アイウエオヤユヨ]/.test(next)) { res += "'"; }
            else {
                let nR = map[text.substring(i+1, i+3)] || map[next] || "";
                res += (nR.startsWith('ch')) ? 't' : (nR[0] || "");
            }
            continue;
        }
        if (char === 'ー' && res.length > 0) {
            let last = res.slice(-1);
            if (longVowelMarks[last]) res = res.slice(0, -1) + longVowelMarks[last];
            continue;
        }
        let dual = map[text.substring(i, i+2)];
        if (dual) { res += dual; i++; }
        else {
            let single = map[char] || char;
            if (char === 'ン') {
                let nR = map[convertedText.substring(i+1, i+3)] || map[next] || "";
                if (nR && /[aiueoy]/.test(nR[0])) {
                    res += "n'";
                } else {
                    res += "n";
                }
            } else {
                // 일본어 맵에 있으면 변환, 없으면(한자 등) 원본 유지
                res += map[char] ? map[char].toLowerCase() : char;
            }
        }
    }
    return res;
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
    copyToClipboard(resultArea.textContent, copyTargetBtn);
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
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;

    // 2. 언어 설정 교체
    sourceLangSelect.value = targetVal;
    targetLangSelect.value = sourceVal;

    const sourceText = searchInput.value;
    let resultText = resultArea.textContent;

    // 3. 에러 메시지 목록
    const isErrorOrPlaceholder = [
        '결과 없음', '카테고리 오류', '해당 언어 데이터 없음', 'API 검색 중...', 
        '오류: API 연결 실패', '해당 언어 데이터 없음 (API)', '카테고리를 먼저 선택하세요.', 
        '번역할 언어를 선택하세요.', '번역될 언어를 선택하세요.', 
        '이 카테고리는 도감번호를 지원하지 않습니다.', '결과 없음 (최종)', 
        '유효하지 않은 ID', '로컬 DB에 dex_id 없음'
    ].includes(resultText.trim());

    // 4. 텍스트 스왑 실행
    if (!isErrorOrPlaceholder && resultText.trim() !== '') {
        // 이제 발음이 따로 분리되었으므로 괄호 제거 로직은 안전장치로만 남겨둡니다.
        if (resultText.includes(' (')) {
            resultText = resultText.split(' (')[0];
        }
        searchInput.value = resultText;
        resultArea.textContent = sourceText;
    } else {
        resultArea.textContent = '';
    }

    // 발음 영역 초기화 추가
    const pronHangeul = document.getElementById('pronHangeul') || pronunciationArea;
    const pronRomaji = document.getElementById('pronRomaji');
    
    if (pronHangeul) pronHangeul.textContent = "";
    if (pronRomaji) pronRomaji.textContent = "";
    
    // UI 복구
    resultArea.style.borderBottomLeftRadius = "8px";
    resultArea.style.borderBottomRightRadius = "8px";
    
    syncLanguages();
    // 복사 버튼 텍스트 초기화 (혹시 복사 직후에 스왑할 경우 대비)
    copySourceBtn.textContent = "Copy";
    copyTargetBtn.textContent = "Copy";
});
function applyTheme(theme) { if (theme === 'dark') { htmlEl.classList.add('dark'); themeToggle.textContent = '🌙'; } else { htmlEl.classList.remove('dark'); themeToggle.textContent = '☀️'; } }
function setInitialTheme() { const savedTheme = localStorage.getItem('theme'); if (savedTheme) { applyTheme(savedTheme); } else { const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; applyTheme(prefersDark ? 'dark' : 'light'); } }
themeToggle.addEventListener('click', () => { const isDark = htmlEl.classList.contains('dark'); const newTheme = isDark ? 'light' : 'dark'; applyTheme(newTheme); localStorage.setItem('theme', newTheme); });
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => { const savedTheme = localStorage.getItem('theme'); if (!savedTheme) { applyTheme(event.matches ? 'dark' : 'light'); } });
function handleCategoryChange() { const category = categorySelect.value; const isPokemon = (category === 'pokemon'); const isNature = (category === 'nature'); const dexOptions = document.querySelectorAll('.pokemon-only-option'); dexOptions.forEach(option => { option.hidden = !isPokemon; }); document.querySelectorAll('.nature-only-option').forEach(option => { option.hidden = !isNature; }); if (!isPokemon) { if (sourceLangSelect.value === 'dex_id') sourceLangSelect.value = ""; if (targetLangSelect.value === 'dex_id') targetLangSelect.value = ""; } if (!isNature) { if (sourceLangSelect.value === 'stats') sourceLangSelect.value = ""; if (targetLangSelect.value === 'stats') targetLangSelect.value = ""; } syncLanguages(); }
categorySelect.addEventListener('change', handleCategoryChange);
loadData();
syncLanguages();
setInitialTheme();
handleCategoryChange();
