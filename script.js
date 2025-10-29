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

// 3. 페이지가 로드되면 'database.json'을 불러옵니다. (수정됨)
async function loadData() {
    try {
        const response = await fetch('database.json');
        masterDB = await response.json();
        console.log('마스터 DB 로딩 성공!');
        
        // (NEW) 'character' 카테고리(수동)를 제외하고, DB가 비어있는지 체크
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

// 4. 번역 실행 함수 (⭐️⭐️⭐️ 대규모 수정 ⭐️⭐️⭐️)
async function doTranslate() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    // (방어 코드 - 동일)
    if (!category) { resultArea.value = '카테고리를 먼저 선택하세요.'; return; }
    if (!sourceLang) { resultArea.value = '번역할 언어를 선택하세요.'; return; }
    if (!targetLang) { resultArea.value = '번역될 언어를 선택하세요.'; return; }
    if (!masterDB[category]) { resultArea.value = '카테고리 오류'; return; }

    // (NEW) API를 사용하는 카테고리 목록
    const apiCategories = ['pokemon', 'ability', 'move', 'item', 'location', 'nature'];
    
    if (apiCategories.includes(category)) {
        // --- 4A. API 사용 카테고리 (6개) ---
        await handleApiTranslation(query, category, sourceLang, targetLang);
    } else {
        // --- 4B. 로컬 DB 사용 카테고리 (e.g., 'character') ---
        handleLocalTranslation(query, category, sourceLang, targetLang);
    }
}

// 4A-1. (NEW) ⭐️ API 번역 일반 함수
async function handleApiTranslation(query, category, sourceLang, targetLang) {
    // 1. 로컬 맵에서 리소스 ID (e.g., 25 또는 "static") 찾기
    const langMap = masterDB[category].map[sourceLang];
    const resourceId = langMap ? langMap[query] : undefined;

    if (!resourceId) {
        resultArea.value = '결과 없음';
        return;
    }

    // (특수 케이스) 포켓몬 -> 도감번호
    if (category === 'pokemon' && targetLang === 'dex_id') {
        resultArea.value = resourceId;
        return;
    }
    // (특수 케이스) 도감번호 -> 포켓몬
    if (category === 'pokemon' && sourceLang === 'dex_id') {
         // (findNameInApiData가 처리하도록 resourceId를 API 데이터 객체처럼 만듦)
         const translation = await findNameInApiData({ id: resourceId }, targetLang, category);
         resultArea.value = translation || '결과 없음';
         return;
    }

    resultArea.value = 'API 검색 중...';

    try {
        // 2. API 엔드포인트 결정 (카테고리 이름과 동일)
        const endpoint = category === 'pokemon' ? 'pokemon-species' : category;
        
        // 3. API 호출
        const response = await fetch(`https://pokeapi.co/api/v2/${endpoint}/${resourceId}`);
        if (!response.ok) { throw new Error('API 응답 실패'); }
        const apiData = await response.json();
        
        // 4. API에서 이름 찾기
        const translation = await findNameInApiData(apiData, targetLang, category);

        if (translation) {
            resultArea.value = translation;
        } else {
            resultArea.value = '해당 언어 데이터 없음 (API)';
        }

    } catch (error) {
        console.error('API 호출 오류:', error);
        resultArea.value = '오류: API 연결 실패';
    }
}

// 4A-2. (NEW) ⭐️ API에서 이름 찾는 헬퍼 함수
async function findNameInApiData(apiData, langCode, category) {
    // (특수 케이스) 타겟이 '도감번호'인 경우
    if (langCode === 'dex_id' && category === 'pokemon') {
         // 도감번호 -> 도감번호 (자기 자신)
         if (apiData.id) return apiData.id.toString();
         // 이름 -> 도감번호
         const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${apiData.name}`);
         const speciesData = await response.json();
         return speciesData.id.toString();
    }

    const apiLangMap = { "ko":"ko", "ja":"ja-Hrkt", "en":"en", "es":"es", "fr":"fr", "de":"de", "it":"it", "zh-Hans":"zh-Hans", "zh-Hant":"zh-Hant" };
    const apiLang = apiLangMap[langCode];
    if (!apiLang) return null;

    // (포켓몬 도감번호 -> 이름 번역)
    if (apiData.id && !apiData.names) {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${apiData.id}`);
        apiData = await response.json();
    }

    const nameEntry = apiData.names.find(name => name.language.name === apiLang);
    return nameEntry ? nameEntry.name : null;
}

// 4B. (NEW) ⭐️ 로컬 DB 번역 함수
function handleLocalTranslation(query, category, sourceLang, targetLang) {
    const categoryMap = masterDB[category].map;
    const categoryDB = masterDB[category].db;

    // (로컬 DB는 'dex_id'를 지원하지 않음)
    if (sourceLang === 'dex_id' || targetLang === 'dex_id') {
        resultArea.value = '이 카테고리는 도감번호를 지원하지 않습니다.';
        return;
    }

    const langMap = categoryMap[sourceLang];
    const masterKey = langMap ? langMap[query] : undefined;
    
    if (!masterKey) { resultArea.value = '결과 없음'; return; }
    const entry = categoryDB[masterKey];
    const translation = entry ? entry[targetLang] : undefined;

    if (translation) { resultArea.value = translation; }
    else { resultArea.value = '해당 언어 데이터 없음'; }
}


// 5. 버튼에 클릭 이벤트 연결 (동일)
if (translateButton) {
    translateButton.addEventListener('click', doTranslate);
}

// 6. 엔터 키로도 검색되게 설정 (동일)
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        doTranslate();
    }
});

// 7. 언어 선택창 동기화 함수 (동일)
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

// 8. 두 선택창이 '변경'될 때마다(change) 동기화 함수 실행 (동일)
sourceLangSelect.addEventListener('change', syncLanguages);
targetLangSelect.addEventListener('change', syncLanguages);

// 9. 언어 교환 (Swap) 로직 (수정됨 - 에러 메시지 추가)
swapButton.addEventListener('click', () => {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;
    sourceLangSelect.value = targetVal;
    targetLangSelect.value = sourceVal;
    const sourceText = searchInput.value;
    const resultText = resultArea.value;
    
    const isErrorOrPlaceholder = [
        '결과 없음', '카테고리 오류', '해당 언어 데이터 없음', 'API 검색 중...', '오류: API 연결 실패', 
        '해당 언어 데이터 없음 (API)', '카테고리를 먼저 선택하세요.', '번역할 언어를 선택하세요.', '번역될 언어를 선택하세요.',
        '이 카테고리는 도감번호를 지원하지 않습니다.'
    ].includes(resultText.trim());

    if (!isErrorOrPlaceholder && resultText.trim() !== '') {
        searchInput.value = resultText;
        resultArea.value = sourceText;
    } else {
        resultArea.value = '';
    }
    syncLanguages();
});

// 10. 테마 (라이트/다크 모드) 로직 (동일)
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

// 11. 카테고리 변경 감지 로직 (동일)
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

// 12. 카테고리 선택창에 이벤트 리스너 추가 (동일)
categorySelect.addEventListener('change', handleCategoryChange);

// --- 스크립트 시작 시 실행 --- (동일)
loadData();
syncLanguages();
setInitialTheme();
handleCategoryChange();
