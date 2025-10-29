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

// 4. 번역 실행 함수 (동일)
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

// 5. 버튼에 클릭 이벤트 연결 (동일)
translateButton.addEventListener('click', doTranslate);

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

// 8. 두 선택창이 '변경'될 때마다(change) 동기화 함수 실행 (동일)
sourceLangSelect.addEventListener('change', syncLanguages);
targetLangSelect.addEventListener('change', syncLanguages);

// ----------------------------------------------------
// ⬇️ ⬇️ ⬇️ (수정됨) 9. 테마 (라이트/다크 모드) 로직 ⬇️ ⬇️ ⬇️
// ----------------------------------------------------

// 9-1. 테마 적용 함수
function applyTheme(theme) {
    if (theme === 'dark') {
        htmlEl.classList.add('dark');
        themeToggle.textContent = '☀️'; // 다크모드일땐 해 아이콘
    } else {
        htmlEl.classList.remove('dark');
        themeToggle.textContent = '🌙'; // 라이트모드일땐 달 아이콘
    }
}

// 9-2. 페이지 로드 시 초기 테마 설정
function setInitialTheme() {
    // 1. 로컬 스토리지에 저장된 값 확인 (사용자 수동 선택)
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // 2. 저장된 값이 없으면 OS 설정(prefers-color-scheme) 확인
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }
}

// 9-3. 토글 버튼 클릭 이벤트 (사용자 수동 변경)
themeToggle.addEventListener('click', () => {
    const isDark = htmlEl.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme); // 사용자의 수동 선택을 저장
});

// 9-4. (NEW) OS 테마 변경 실시간 감지
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    // ⚠️ 중요: 사용자가 수동으로 테마를 선택(저장)한 적이 있는지 확인
    const savedTheme = localStorage.getItem('theme');
    
    // 사용자가 수동으로 선택한 값이 없을 때만 OS 설정을 따라감
    if (!savedTheme) {
        applyTheme(event.matches ? 'dark' : 'light');
    }
});


// --- 스크립트 시작 시 실행 --- (동일)
loadData();
syncLanguages();
setInitialTheme();
