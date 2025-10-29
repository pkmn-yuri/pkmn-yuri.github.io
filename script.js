// 1. 필요한 HTML 요소들을 찾기
const categorySelect = document.getElementById('categorySelect');
const sourceLangSelect = document.getElementById('sourceLang');
const targetLangSelect = document.getElementById('targetLang');
const searchInput = document.getElementById('searchInput');
const translateButton = document.getElementById('translateButton');
const resultArea = document.getElementById('resultArea');
// ⬇️ ⬇️ ⬇️ 테마 로직에 필요한 요소 추가 ⬇️ ⬇️ ⬇️
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement; // <html> 태그

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

// 4. 번역 실행 함수 (기존과 동일)
function doTranslate() {
    const query = searchInput.value.trim().toLowerCase();
    const category = categorySelect.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

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

// 5. 버튼에 클릭 이벤트 연결 (기존과 동일)
translateButton.addEventListener('click', doTranslate);

// 6. 엔터 키로도 검색되게 설정 (기존과 동일)
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        doTranslate();
    }
});

// 7. 언어 선택창 동기화 함수 (기존과 동일)
function syncLanguages() {
    const sourceVal = sourceLangSelect.value;
    const targetVal = targetLangSelect.value;

    for (const option of targetLangSelect.options) {
        option.disabled = (option.value === sourceVal);
    }
    for (const option of sourceLangSelect.options) {
        option.disabled = (option.value === targetVal);
    }
}

// 8. 두 선택창이 '변경'될 때마다(change) 동기화 함수 실행 (기존과 동일)
sourceLangSelect.addEventListener('change', syncLanguages);
targetLangSelect.addEventListener('change', syncLanguages);


// ----------------------------------------------------
// ⬇️ ⬇️ ⬇️ (NEW) 9. 테마 (라이트/다크 모드) 로직 ⬇️ ⬇️ ⬇️
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
    // 1. 로컬 스토리지에 저장된 값 확인
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme) {
        // 저장된 값이 있으면 그걸 적용
        applyTheme(savedTheme);
    } else {
        // 저장된 값이 없으면 OS 설정(prefers-color-scheme) 확인
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark ? 'dark' : 'light');
    }
}

// 9-3. 토글 버튼 클릭 이벤트
themeToggle.addEventListener('click', () => {
    // 현재 다크 모드인지 확인
    const isDark = htmlEl.classList.contains('dark');
    
    if (isDark) {
        // 라이트 모드로 변경
        applyTheme('light');
        localStorage.setItem('theme', 'light'); // 선택 저장
    } else {
        // 다크 모드로 변경
        applyTheme('dark');
        localStorage.setItem('theme', 'dark'); // 선택 저장
    }
});

// --- (기존) 스크립트 시작 시 실행 ---
loadData();
syncLanguages();

// --- (NEW) 스크립트 시작 시 테마 적용 ---
setInitialTheme();
