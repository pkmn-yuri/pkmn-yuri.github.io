// 1. 필요한 HTML 요소들을 찾기
const categorySelect = document.getElementById('categorySelect');
const sourceLangSelect = document.getElementById('sourceLang');
const targetLangSelect = document.getElementById('targetLang');
const searchInput = document.getElementById('searchInput');
const translateButton = document.getElementById('translateButton'); // ⭐️ (이제는 HTML에 없음)
const resultArea = document.getElementById('resultArea');
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;
const swapButton = document.getElementById('swapButton');

// 2. 마스터 데이터베이스 변수
let masterDB = {};

// 3. 페이지가 로드되면 'database.json'을 불러옵니다.
async function loadData() {
    try {
        const response = await fetch('database.json');
        masterDB = await response.json();
        console.log('마스터 DB 로딩 성공!');
        
        for (const category in masterDB) {
            if (Object.keys(masterDB[category].db).length === 0) {
                const option = categorySelect.querySelector(`option[value="${category}"]`);
                if (option) {
                    option.disabled = true;
                }
            }
        }
    } catch (error) {
        console.error('데이터 로딩 실패:', error);
        resultArea.value = '오류: DB 로딩 실패';
    }
}

// 4. 번역 실행 함수
function doTranslate() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    if (!category) {
        resultArea.value = '카테고리를 먼저 선택하세요.';
        return;
    }
    if (!sourceLang) {
        resultArea.value = '번역할 언어를 선택하세요.';
        return;
    }
    if (!targetLang) {
        resultArea.value = '번역될 언어를 선택하세요.';
        return;
    }

    if (!masterDB[category]) {
        resultArea.value = '카테고리 오류';
        return;
    }

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

// 5. 버튼에 클릭 이벤트 연결 (수정됨)
// ⬇️ ⬇️ ⬇️ (수정) 버튼이 존재할 때만(if) 이벤트를 추가 ⬇️ ⬇️ ⬇️
if (translateButton) {
    translateButton.addEventListener('click', doTranslate);
}
// ⬆️ ⬆️ ⬆️ 이 수정으로 스크립트 오류가 해결됩니다 ⬆️ ⬆️ ⬆️

// 6. 엔터 키로도 검색되게 설정 (이제 다시 작동합니다)
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // (이게 없으면 줄넘김이 됩니다)
        doTranslate();
    }
});

// 7. 언어 선택창 동기화 함수
function syncLanguages() {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;

    for (const option of targetLangSelect.options) {
        if (option.value && option.value === sourceVal) {
            option.disabled = true;
        } else {
            option.disabled = false;
        }
    }

    for (const option of sourceLangSelect.options) {
        if (option.value && option.value === targetVal) {
            option.disabled = true;
        } else {
            option.disabled = false;
        }
    }
}

// 8. 두 선택창이 '변경'될 때마다(change) 동기화 함수 실행
sourceLangSelect.addEventListener('change', syncLanguages);
targetLangSelect.addEventListener('change', syncLanguages);

// 9. 언어 교환 (Swap) 로직
swapButton.addEventListener('click', () => {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;
    
    sourceLangSelect.value = targetVal;
    targetLangSelect.value = sourceVal;

    const sourceText = searchInput.value;
    const resultText = resultArea.value;

    const isErrorOrPlaceholder = [
        '결과 없음', 
        '카테고리를 먼저 선택하세요.', 
        '번역할 언어를 선택하세요.', 
        '번역될 언어를 선택하세요.', 
        '카테고리 오류', 
        '해당 언어 데이터 없음'
    ].includes(resultText.trim());

    if (!isErrorOrPlaceholder && resultText.trim() !== '') {
        searchInput.value = resultText;
        resultArea.value = sourceText;
    } else {
        resultArea.value = '';
    }
    syncLanguages();
});

// 10. 테마 (라이트/다크 모드) 로직 (이제 다시 작동합니다)
function applyTheme(theme) {
    if (theme === 'dark') {
        htmlEl.classList.add('dark');
        themeToggle.textContent = '☀️';
    } else {
        htmlEl.classList.remove('dark');
        themeToggle.textContent = '🌙';
    }
}
function setInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }
}
themeToggle.addEventListener('click', () => {
    const isDark = htmlEl.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    const savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
        applyTheme(event.matches ? 'dark' : 'light');
    }
});

// --- 스크립트 시작 시 실행 ---
loadData();
syncLanguages();
setInitialTheme();
