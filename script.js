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
    // ... (이전 코드와 동일) ...
    try {
        const response = await fetch('database.json');
        masterDB = await response.json();
        console.log('마스터 DB 로딩 성공!');
        for (const category in masterDB) {
            if (Object.keys(masterDB[category].db).length === 0 && category !== 'pokemon') { // 'pokemon' 카테고리는 db가 비어있어도 됨
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
// 'async' 키워드 추가 (API 호출을 기다리기 위해)
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

    // ⭐️ (NEW) 카테고리에 따라 분기 ⭐️
    if (category === 'pokemon') {
        // --- 4A. 포켓몬 카테고리 (API 사용) ---
        await handlePokemonTranslation(query, sourceLang, targetLang);
    } else {
        // --- 4B. 다른 카테고리 (기존 방식) ---
        handleOtherTranslation(query, category, sourceLang, targetLang);
    }
}

// 4A-1. (NEW) 포켓몬 번역 함수
async function handlePokemonTranslation(query, sourceLang, targetLang) {
    const langMap = masterDB.pokemon.map[sourceLang];
    const pokemonId = langMap ? langMap[query] : undefined;

    if (!pokemonId) {
        resultArea.value = '결과 없음';
        return;
    }

    // (특수 케이스) 타겟이 '도감번호'인 경우
    if (targetLang === 'dex_id') {
        resultArea.value = pokemonId;
        return;
    }

    // (로딩 표시)
    resultArea.value = 'API 검색 중...';

    try {
        // 4A-2. (NEW) PokéAPI 호출
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemonId}`);
        if (!response.ok) {
            throw new Error('API 응답 실패');
        }
        const speciesData = await response.json();
        
        // 4A-3. (NEW) API에서 이름 찾기
        const translation = findPokemonName(speciesData, targetLang);

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

// 4A-4. (NEW) API 응답에서 언어 찾는 헬퍼 함수
function findPokemonName(speciesData, langCode) {
    // API가 사용하는 언어 코드와 우리 코드를 매칭
    const apiLangMap = {
        "ko": "ko",
        "ja": "ja-Hrkt", // (히라가나/가타카나)
        "en": "en",
        "es": "es",
        "fr": "fr",
        "de": "de",
        "it": "it",
        "zh-Hans": "zh-Hans", // (간체)
        "zh-Hant": "zh-Hant"  // (번체)
    };

    const apiLang = apiLangMap[langCode];
    if (!apiLang) return null;

    const nameEntry = speciesData.names.find(name => name.language.name === apiLang);
    return nameEntry ? nameEntry.name : null;
}


// 4B. (NEW) 기존 번역 함수
function handleOtherTranslation(query, category, sourceLang, targetLang) {
    const categoryMap = masterDB[category].map;
    const categoryDB = masterDB[category].db;

    const langMap = categoryMap[sourceLang];
    const masterKey = langMap ? langMap[query] : undefined;
    
    if (!masterKey) {
        resultArea.value = '결과 없음';
        return;
    }

    const entry = categoryDB[masterKey];
    const translation = entry ? entry[targetLang] : undefined;

    if (translation) {
        resultArea.value = translation;
    } else {
        resultArea.value = '해당 언어 데이터 없음';
    }
}


// 5. 버튼에 클릭 이벤트 연결
if (translateButton) {
    translateButton.addEventListener('click', doTranslate);
}

// 6. 엔터 키로도 검색되게 설정
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        doTranslate();
    }
});

// 7. 언어 선택창 동기화 함수
function syncLanguages() {
    // ... (이전 코드와 동일) ...
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

// 8. 두 선택창이 '변경'될 때마다(change) 동기화 함수 실행
sourceLangSelect.addEventListener('change', syncLanguages);
targetLangSelect.addEventListener('change', syncLanguages);

// 9. 언어 교환 (Swap) 로직
swapButton.addEventListener('click', () => {
    // ... (이전 코드와 동일) ...
    // (API 방식으로 바뀌어도 이 로직은 수정할 필요가 없습니다!)
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;
    sourceLangSelect.value = targetVal;
    targetLangSelect.value = sourceVal;
    const sourceText = searchInput.value;
    const resultText = resultArea.value;
    const isErrorOrPlaceholder = ['결과 없음', '카테고리 오류', '해당 언어 데이터 없음', 'API 검색 중...', '오류: API 연결 실패', '해당 언어 데이터 없음 (API)', '카테고리를 먼저 선택하세요.', '번역할 언어를 선택하세요.', '번역될 언어를 선택하세요.'].includes(resultText.trim());
    if (!isErrorOrPlaceholder && resultText.trim() !== '') {
        searchInput.value = resultText;
        resultArea.value = sourceText;
    } else {
        resultArea.value = '';
    }
    syncLanguages();
});

// 10. 테마 (라이트/다크 모드) 로직
// ... (이전 코드와 동일) ...
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


// 11. 카테고리 변경 감지 로직
function handleCategoryChange() {
    // ... (이전 코드와 동일) ...
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

// 12. 카테고리 선택창에 이벤트 리스너 추가
categorySelect.addEventListener('change', handleCategoryChange);

// --- 스크립트 시작 시 실행 ---
loadData();
syncLanguages();
setInitialTheme();
handleCategoryChange();
