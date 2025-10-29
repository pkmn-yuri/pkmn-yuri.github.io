// 1. 필요한 HTML 요소들을 찾기
const categorySelect = document.getElementById('categorySelect');
const sourceLangSelect = document.getElementById('sourceLang');
const targetLangSelect = document.getElementById('targetLang');
const searchInput = document.getElementById('searchInput');
const translateButton = document.getElementById('translateButton');
const resultArea = document.getElementById('resultArea');

// 2. 마스터 데이터베이스 변수
let masterDB = {};

// 3. 페이지가 로드되면 'database.json'을 불러옵니다.
async function loadData() {
    try {
        const response = await fetch('database.json');
        masterDB = await response.json();
        console.log('마스터 DB 로딩 성공!');
        
        // 데이터가 없는 카테고리는 비활성화 (선택사항)
        for (const category in masterDB) {
            if (Object.keys(masterDB[category].db).length === 0) {
                const option = categorySelect.querySelector(`option[value="${category}"]`);
                if (option) {
                    option.disabled = true;
                    // option.textContent += " (준비중)";
                }
            }
        }
    } catch (error) {
        console.error('데이터 로딩 실패:', error);
        resultArea.value = '오류: DB 로딩 실패';
    }
}

// 4. 번역 실행 함수 (완전히 새로 작성)
function doTranslate() {
    
    // 4.1. 사용자가 입력한 값 (소문자, 공백 제거)
    const query = searchInput.value.trim().toLowerCase();
    
    // 4.2. 사용자가 선택한 카테고리, 소스 언어, 타겟 언어
    const category = categorySelect.value;
    const sourceLang = sourceLangSelect.value;
    const targetLang = targetLangSelect.value;

    // 4.3. DB에 해당 카테고리가 없으면 중단
    if (!masterDB[category]) {
        resultArea.value = '카테고리 오류';
        return;
    }

    // 4.4. 해당 카테고리의 '지도(map)'와 'DB'를 가져옴
    const categoryMap = masterDB[category].map;
    const categoryDB = masterDB[category].db;

    // 4.5. '소스 언어 지도'에서 마스터 키(ID)를 찾음
    const langMap = categoryMap[sourceLang];
    const masterKey = langMap ? langMap[query] : undefined;
    
    // 4.6. 마스터 키가 없다면 (결과 없음)
    if (!masterKey) {
        resultArea.value = '결과 없음';
        return;
    }

    // 4.7. 마스터 DB에서 해당 항목(entry)을 찾음
    const entry = categoryDB[masterKey];
    
    // 4.8. 해당 항목에서 '타겟 언어'의 번역본을 찾음
    const translation = entry ? entry[targetLang] : undefined;

    if (translation) {
        resultArea.value = translation; // 결과를 textarea에 표시
    } else {
        resultArea.value = '해당 언어 데이터 없음';
    }
}

// 5. 버튼에 클릭 이벤트 연결
translateButton.addEventListener('click', doTranslate);

// 6. 엔터 키로도 검색되게 설정 (textarea에서는 Ctrl + Enter 또는 Shift + Enter가 일반적이나, 편의를 위해 Enter로 설정)
searchInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) { // Shift+Enter는 줄바꿈
        event.preventDefault(); // 기본 Enter 동작(줄바꿈) 방지
        doTranslate();
    }
});

// 7. (유지) 언어 선택창 동기화 함수
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

// 8. (유지) 두 선택창이 '변경'될 때마다(change) 동기화 함수 실행
sourceLangSelect.addEventListener('change', syncLanguages);
targetLangSelect.addEventListener('change', syncLanguages);

// --- 스크립트 시작 시 바로 데이터 로딩 실행 ---
loadData();

// 9. (유지) 페이지가 처음 로드될 때 동기화 함수를 1회 실행
syncLanguages();
