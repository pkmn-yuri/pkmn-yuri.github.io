// 1. 필요한 HTML 요소들을 찾기 (동일)
const categorySelect = document.getElementById('categorySelect');
const sourceLangSelect = document.getElementById('sourceLang');
const targetLangSelect = document.getElementById('targetLang');
const searchInput = document.getElementById('searchInput');
const translateButton = document.getElementById('translateButton');
const resultArea = document.getElementById('resultArea');
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;

// 2. 마스터 데이터베이스 변수 (동일)
let masterDB = {};

// 3. 페이지가 로드되면 'database.json'을 불러옵니다. (동일)
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

// 4. 번역 실행 함수 (수정됨)
function doTranslate() {
    
    // 4.1. 사용자가 입력한 값
    const query = searchInput.value.trim().toLowerCase();
    
    // 4.2. 사용자가 선택한 값
    const category = categorySelect.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    // 4.2-1. 카테고리 방어 코드
    if (!category) {
        resultArea.value = '카테고리를 먼저 선택하세요.';
        return;
    }
    
    // ⬇️ ⬇️ ⬇️ (NEW) 언어 방어 코드 추가 ⬇️ ⬇️ ⬇️
    // 4.2-2. 언어가 선택되지 않았으면 중단
    if (!sourceLang) {
        resultArea.value = '번역할 언어를 선택하세요.';
        return;
    }
    if (!targetLang) {
        resultArea.value = '번역될 언어를 선택하세요.';
        return;
    }
    // ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️ ⬆️

    // 4.3. DB에 해당 카테고리가 없으면 중단
    if (!masterDB[category]) {
        resultArea.value = '카테고리 오류';
        return;
    }

    // (이하 로직은 동일합니다)
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

// 5. 버튼에 클릭 이벤트 연결 (동일)
translateButton.addEventListener('click', doTranslate);

// 6. 엔터 키로도 검색되게 설정 (동일)
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        doTranslate();
    }
});

// 7. 언어 선택창 동기화 함수 (수정됨)
function syncLanguages() {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;

    // '번역될' 언어(Target) 목록 업데이트
    for (const option of targetLangSelect.options) {
        // 1. 값이 있는(placeholder가 아닌) 옵션이고,
        // 2. 그 값이 sourceVal과 같다면
        if (option.value && option.value === sourceVal) {
            option.disabled = true;
        } else {
            option.disabled = false; // 다른 모든 옵션은 활성화
        }
    }

    // '번역할' 언어(Source) 목록 업데이트
    for (const option of sourceLangSelect.options) {
        // 1. 값이 있는(placeholder가 아닌) 옵션이고,
        // 2. 그 값이 targetVal과 같다면
        if (option.value && option.value === targetVal) {
            option.disabled = true;
        } else {
            option.disabled = false;
        }
    }
}

// 8. 두 선택창이 '변경'될 때마다(change) 동기화 함수 실행 (동일)
sourceLangSelect.addEventListener('change', syncLanguages);
targetLangSelect.addEventListener('change', syncLanguages);

// 9. 테마 (라이트/다크 모드) 로직 (동일)
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
    if (isDark) {
        applyTheme('light');
        localStorage.setItem('theme', 'light');
    } else {
        applyTheme('dark');
        localStorage.setItem('theme', 'dark');
    }
});

// --- 스크립트 시작 시 실행 --- (동일)
loadData();
syncLanguages();
setInitialTheme();
