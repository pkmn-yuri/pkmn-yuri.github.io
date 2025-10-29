// 1. 필요한 HTML 요소들을 찾기
const sourceLangSelect = document.getElementById('sourceLang'); // ⭐️ 상단 선택창
const targetLangSelect = document.getElementById('targetLang');
const searchInput = document.getElementById('searchInput');
const translateButton = document.getElementById('translateButton');
const resultArea = document.getElementById('resultArea');

// 2. 데이터베이스와 룩업(지도책) 변수 준비
let pokemonDB = {};
let pokemonLookup = {}; // 이제 '지도책' 역할을 합니다.

// 3. 페이지가 로드되면 두 개의 JSON 파일을 모두 불러옵니다.
async function loadData() {
    try {
        const [dbResponse, mapResponse] = await Promise.all([
            fetch('pokemon-db.json'),
            fetch('pokemon-map.json')
        ]);
        
        pokemonDB = await dbResponse.json();
        pokemonLookup = await mapResponse.json(); // 지도책 로드
        
        console.log('DB 및 맵 로딩 성공!');

    } catch (error) {
        console.error('데이터 로딩 실패:', error);
        resultArea.value = '오류: DB 로딩 실패';
    }
}

// 4. 번역 실행 함수
function doTranslate() {
    
    // 4.1. 사용자가 입력한 값 (소문자로)
    const query = searchInput.value.trim().toLowerCase();
    
    // 4.2. 사용자가 선택한 '번역할' 언어 (예: "ko")
    const sourceLang = sourceLangSelect.value;
    
    // 4.3. 사용자가 선택한 '번역될' 언어 (예: "en")
    const targetLang = targetLangSelect.value;

    // 4.4. ⭐️ (로직 변경!) ⭐️
    // 지도책(pokemonLookup)에서 해당 언어의 지도(langMap)를 먼저 찾습니다.
    const langMap = pokemonLookup[sourceLang];
    
    // 4.5. ⭐️ (로직 변경!) ⭐️
    // 그 '언어별 지도' 안에서만 query를 검색합니다.
    const masterKey = langMap ? langMap[query] : undefined;
    
    // 4.6. 마스터 ID가 없다면 (해당 언어 지도에 없는 단어)
    if (!masterKey) {
        resultArea.value = '결과 없음';
        return;
    }

    // 4.7. DB(pokemonDB)에서 마스터 ID(pikachu)의 항목을 찾습니다.
    const entry = pokemonDB[masterKey];
    
    // 4.8. 해당 항목에서 원하는 언어(targetLang)의 번역본을 찾습니다.
    const translation = entry[targetLang];

    if (translation) {
        resultArea.value = translation; // 결과를 input 창에 표시
    } else {
        resultArea.value = '해당 언어 데이터 없음';
    }
}

// 5. 버튼에 클릭 이벤트 연결
translateButton.addEventListener('click', doTranslate);

// 6. 엔터 키로도 검색되게 설정
searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
        doTranslate();
    }
});

// --- 스크립트 시작 시 바로 데이터 로딩 실행 ---
loadData();
