// 1. 필요한 HTML 요소들을 찾기 (동일)
const categorySelect = document.getElementById('categorySelect');
const sourceLangSelect = document.getElementById('sourceLang');
const targetLangSelect = document.getElementById('targetLang');
const searchInput = document.getElementById('searchInput');
const translateButton = document.getElementById('translateButton');
const resultArea = document.getElementById('resultArea');
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const swapButton = document.getElementById('swapButton');

// 2. 마스터 데이터베이스 변수 (동일)
let masterDB = {};

// 3. 페이지가 로드되면 'database.json'을 불러옵니다. (동일)
async function loadData() {
    try {
        const response = await fetch('database.json');
        masterDB = await response.json();
        console.log('마스터 DB 로딩 성공!');
        for (const category in masterDB) {
            if (category === 'character' && Object.keys(masterDB[category].db).length === 0) {
                const option = categorySelect.querySelector(`option[value="${category}"]`);
                if (option) option.disabled = true;
            }
        }
    } catch (error) {
        console.error('데이터 로딩 실패:', error);
        resultArea.value = '오류: DB 로딩 실패';
    }
}

// 4. 번역 실행 함수 (⭐️ '포켓몬' 카테고리 한정 로직 추가)
async function doTranslate() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value; // ⭐️ 카테고리 값
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value; // ⭐️ 타겟 언어 값

    // (방어 코드 - 동일)
    if (!category) { resultArea.value = '카테고리를 먼저 선택하세요.'; return; }
    if (!sourceLang) { resultArea.value = '번역할 언어를 선택하세요.'; return; }
    if (!targetLang) { resultArea.value = '번역될 언어를 선택하세요.'; return; }
    if (!masterDB[category]) { resultArea.value = '카테고리 오류'; return; }

    // 1. '지도(map)'에서 '리소스 ID'를 찾습니다.
    const langMap = masterDB[category].map[sourceLang];
    const resourceId = langMap ? langMap[query] : undefined;

    if (!resourceId) {
        resultArea.value = '결과 없음';
        return;
    }

    // 2. 하이브리드 분기
    let translation;
    let reading = null; // ⭐️ 한글 발음 변수
    let japaneseText = null; // ⭐️ 일본어 원문 변수
    
    // 2A. ID가 '문자열'인 경우 (로컬 DB 우선)
    if (typeof resourceId === 'string') {
        const localEntry = masterDB[category].db[resourceId];
        
        if (localEntry) {
            // 2A-1. 로컬 DB
            translation = localEntry[targetLang];
            
            // ⭐️ (NEW) 발음 찾기 (1순위: 수동 입력)
            if (targetLang === 'ja' && category === 'pokemon') { // ⭐️ '포켓몬' 카테고리인지 확인
                japaneseText = localEntry['ja']; // 일본어 원문
                if (localEntry['ja_reading_ko']) {
                    reading = localEntry['ja_reading_ko']; // 수동 발음
                }
            }
            
            if (!translation && category === 'pokemon' && targetLang === 'dex_id') {
                translation = localEntry['dex_id'] || '로컬 DB에 dex_id 없음';
            }

            // (API Fallback)
            if (!translation && category !== 'character') { 
                translation = await fetchFromApi(resourceId, category, sourceLang, targetLang);
                if (targetLang === 'ja' && category === 'pokemon') japaneseText = translation; // API의 일본어 원문
                reading = null; // API로 폴백하면 로컬 발음 리셋
            }

        } else {
            // 2A-2. 로컬 DB에 없는 ID -> API 호출
            translation = await fetchFromApi(resourceId, category, sourceLang, targetLang);
            if (targetLang === 'ja' && category === 'pokemon') japaneseText = translation; // API의 일본어 원문
        }
    
    // 2B. ID가 '숫자'인 경우 (포켓몬 API)
    } else if (typeof resourceId === 'number') {
        translation = await fetchFromApi(resourceId, category, sourceLang, targetLang);
        if (targetLang === 'ja' && category === 'pokemon') japaneseText = translation; // API의 일본어 원문
    
    } else {
        translation = '유효하지 않은 ID';
    }

    // 3. 최종 결과 표시
    if (translation) {
        // ⭐️ ⬇️ ⬇️ ⬇️ (수정!) '포켓몬' 카테고리일 때만 발음 처리 ⬇️ ⬇️ ⬇️
        if (targetLang === 'ja' && category === 'pokemon') {
            // 2순위: 수동 발음(reading)이 없으면, 자동 음차 실행
            if (!reading && japaneseText) {
                reading = transliterateJapanese(japaneseText);
            }
            resultArea.value = reading ? `${translation} (${reading})` : translation;
        } else {
            resultArea.value = translation; // 포켓몬이 아니면 발음 표시 안 함
        }
    } else {
        resultArea.value = '결과 없음 (최종)';
    }
}

// (API 호출 함수 및 나머지 모든 코드는 이전과 동일합니다)

// ⬇️ ⬇️ ⬇️ (NEW) ⭐️⭐️⭐️ 일본어 자동 음차 함수 (ピョ -> 표 수정됨) ⭐️⭐️⭐️ ⬇️ ⬇️ ⬇️
function transliterateJapanese(text) {
    if (!text) return null;

    // 1. 단순 규칙 매핑 (가타카나 -> 한글)
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
        'バ':'바', 'ビ':'비', 'ブ':'부', 'ベ':'베', '보':'보',
        'パ':'파', 'ピ':'피', 'プ':'푸', 'ペ':'페', 'ポ':'포',
        'キャ':'캬', 'キュ':'큐', 'キョ':'쿄',
        'シャ':'샤', 'シュ':'슈', 'ショ':'쇼',
        'チャ':'챠', 'チュ':'츄', 'チョ':'쵸',
        'ニャ':'냐', 'ニュ':'뉴', 'ニョ':'뇨',
        'ヒャ':'햐', 'ヒュ':'휴', 'ヒョ':'효',
        'ミャ':'먀', 'ミュ':'뮤', 'ミョ':'묘',
        'リャ':'랴', 'リュ':'류', 'リョ':'료',
        'ギャ':'갸', 'ギュ':'규', 'ギョ':'교',
        'ジャ':'쟈', 'ジュ':'쥬', 'ジョ':'죠',
        'ビャ':'뱌', 'ビュ':'뷰', 'ビョ':'뵤',
        'ピャ':'퍄', 'ピュ':'퓨', 'ピョ':'표', // ⭐️ '뾰' -> '표'로 수정됨
        'ヴァ':'바', 'ヴィ':'비', 'ヴェ':'베', 'ヴォ':'보', 'ティ':'티', 'ディ':'디', 'デュ':'듀',
        'ァ':'ㅏ', 'ィ':'ㅣ', 'ゥ':'ㅜ', 'ェ':'ㅔ', 'ォ':'ㅗ',
        'ャ':'ㅑ', 'ュ':'ㅠ', 'ョ':'ㅛ'
    };

    let result = '';
    let lastCharWasLongVowel = false;

    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        
        // 3글자 복합 (e.g., ヴァ)
        if (i + 2 < text.length && map[text.substring(i, i + 3)]) {
            result += map[text.substring(i, i + 3)];
            i += 2;
            lastCharWasLongVowel = false;
        // 2글자 복합 (e.g., キャ)
        } else if (i + 1 < text.length && map[text.substring(i, i + 2)]) {
            result += map[text.substring(i, i + 2)];
            i += 1;
            lastCharWasLongVowel = false;
        // ン (N) 처리
        } else if (char === 'ン') {
            if (lastCharWasLongVowel) {
                result += '응';
            } else {
                result += 'ㄴ';
            }
            lastCharWasLongVowel = false;
        // ッ (촉음) 처리
        } else if (char === 'ッ') {
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
        // 맵에 없는 글자 (e.g., 한자, 숫자)
        } else {
            result += char;
            lastCharWasLongVowel = false;
        }
    }
    return result;
}


// (기존 코드들)
// (fetchFromApi, findNameInApiData, syncLanguages, swapButton, theme logic, category change logic)
async function fetchFromApi(resourceId, category, sourceLang, targetLang) {
    if (category === 'pokemon' && targetLang === 'dex_id') { return resourceId.toString(); }
    if (category === 'pokemon' && sourceLang === 'dex_id') {
         const apiData = { id: resourceId };
         return await findNameInApiData(apiData, targetLang, category);
    }
    resultArea.value = 'API 검색 중...';
    try {
        const endpoint = category === 'pokemon' ? 'pokemon-species' : category;
        const response = await fetch(`https://pokeapi.co/api/v2/${endpoint}/${resourceId}`);
        if (!response.ok) { throw new Error('API 응답 실패'); }
        const apiData = await response.json();
        return await findNameInApiData(apiData, targetLang, category);
    } catch (error) {
        console.error('API 호출 오류:', error);
        return '오류: API 연결 실패';
    }
}
async function findNameInApiData(apiData, langCode, category) {
    if (langCode === 'dex_id' && category === 'pokemon') {
         if (apiData.id) return apiData.id.toString();
         const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${apiData.name}`);
         const speciesData = await response.json();
         return speciesData.id.toString();
    }
    const apiLangMap = { "ko":"ko", "ja":"ja-Hrkt", "en":"en", "es":"es", "fr":"fr", "de":"de", "it":"it", "zh-Hans":"zh-Hans", "zh-Hant":"zh-Hant" };
    const apiLang = apiLangMap[langCode];
    if (!apiLang) return null;
    if (apiData.id && !apiData.names) {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${apiData.id}`);
        apiData = await response.json();
    }
    const nameEntry = apiData.names.find(name => name.language.name === apiLang);
    return nameEntry ? nameEntry.name : null;
}
if (translateButton) {
    translateButton.addEventListener('click', doTranslate);
}
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        doTranslate();
    }
});
function syncLanguages() {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;
    for (const option of targetLangSelect.options) {
        if (option.value && option.value === sourceVal) option.disabled = true;
        else option.disabled = false;
    }
    for (const option of sourceLangSelect.options) {
        if (option.value && option.value === targetVal) option.disabled = true;
        else option.disabled = false;
    }
}
sourceLangSelect.addEventListener('change', syncLanguages);
targetLangSelect.addEventListener('change', syncLanguages);
swapButton.addEventListener('click', () => {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;
    sourceLangSelect.value = targetVal;
    targetLangSelect.value = sourceVal;
    const sourceText = searchInput.value;
    const resultText = resultArea.value;
    const isErrorOrPlaceholder = ['결과 없음', '카테고리 오류', '해당 언어 데이터 없음', 'API 검색 중...', '오류: API 연결 실패', '해당 언어 데이터 없음 (API)', '카테고리를 먼저 선택하세요.', '번역할 언어를 선택하세요.', '번역될 언어를 선택하세요.', '이 카테고리는 도감번호를 지원하지 않습니다.', '결과 없음 (최종)', '유효하지 않은 ID', '로컬 DB에 dex_id 없음'].includes(resultText.trim());
    if (!isErrorOrPlaceholder && resultText.trim() !== '') {
        searchInput.value = resultText;
        resultArea.value = sourceText;
    } else {
        resultArea.value = '';
    }
    syncLanguages();
});
function applyTheme(theme) {
    if (theme === 'dark') { htmlEl.classList.add('dark'); themeToggle.textContent = '☀️'; }
    else { htmlEl.classList.remove('dark'); themeToggle.textContent = '🌙'; }
}
function setInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) { applyTheme(savedTheme); }
    else { const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; applyTheme(prefersDark ? 'dark' : 'light'); }
}
themeToggle.addEventListener('click', () => {
    const isDark = htmlEl.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) { applyTheme(event.matches ? 'dark' : 'light'); }
});
function handleCategoryChange() {
    const category = categorySelect.value;
    const isPokemon = (category === 'pokemon');
    const dexOptions = document.querySelectorAll('.pokemon-only-option');
    dexOptions.forEach(option => {
        option.hidden = !isPokemon;
    });
    if (!isPokemon) {
        if (sourceLangSelect.value === 'dex_id') sourceLangSelect.value = "";
        if (targetLangSelect.value === 'dex_id') targetLangSelect.value = "";
    }
    syncLanguages();
}
categorySelect.addEventListener('change', handleCategoryChange);
loadData();
syncLanguages();
setInitialTheme();
handleCategoryChange();
