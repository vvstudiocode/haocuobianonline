/**
 * @file data.ts
 * @description
 * 應用程式的中央數據與 logique庫。
 * 負責定義所有靜態數據，包括：
 * - 圖庫分類與圖片路徑 (`CATEGORIES`)。
 * - 編輯器中可用的祝福語 (`GREETING_CATEGORIES`)。
 * - LocalStorage 的儲存鍵 (`STORAGE_KEYS`)。
 * - 完整的遊戲化系統 (`GAMIFICATION`)，包含：
 * - 等級 (Levels)。
 * - 多層次、隱藏及後設徽章 (Badges)。
 * - 每日與每週任務 (Tasks)。
 * - 提供初始化使用者資料、檢查成就與任務進度的核心函式。
 */
import { UserProfile, Achievements, Badge, Level, TaskDefinition, Pin } from './types.ts';

// --- NEW: Cloud & Local Image Configuration ---
// 所有分類的圖片現在都透過 jsDelivr CDN 從 GitHub 儲存庫提供，允許即時更新。
// 操作指南：若要更新任何分類的圖片，請將圖片上傳至 GitHub 儲存庫 (`vvstudiocode/haocuobian`) 對應的 `images/` 子資料夾中。
const BASE_IMAGE_URL = 'https://cdn.jsdelivr.net/gh/vvstudiocode/haocuobian@main';


// --- Helper Functions (UPDATED) ---
/*
  【遠端路徑函式】
  此函式會將 GitHub 上的圖片基本 URL (BASE_IMAGE_URL)
  與相對路徑結合，產生完整的圖片 CDN 網址。
*/
const createRemoteImagePaths = (basePath: string, fileNames: string[]): string[] => {
  const formattedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return fileNames.map(name => `${BASE_IMAGE_URL}${formattedBasePath}${name}`);
};

// **【統一的圖片路徑生成函式】**
// 修正：為了配合新的探測 logique，現在從 start 遞增到 end，確保探測效率。
// 顯示順序將在 HomeScreen 元件中反轉，以保持最新圖片在最前面。
const generatePaths = (prefix: string, start: number, end: number): string[] => {
  const paths: string[] = [];
  // 關鍵修正：迴圈從 start 遞增到 end
  for (let i = start; i <= end; i++) {
    // 使用傳入的 prefix (字首) + 數字 + .webp
    paths.push(`${prefix}${i}.webp`); 
  }
  return paths;
};

// --- Data ---
/*
  【統一遠端路徑】
  - 所有分類現在都使用 `createRemoteImagePaths` 從 CDN 載入。
*/
export const CATEGORIES = {
  '每週新圖': createRemoteImagePaths(
    '/images/daily_new',
    generatePaths('d', 1, 15)
  ),
  // 福氣花開: f1.webp, f2.webp, ... f99.webp
  '福氣花開': createRemoteImagePaths(
    '/images/flowering_bliss', 
    generatePaths('f', 1, 65) 
  ),
  '世界畫卷': {
    '亞洲風華': createRemoteImagePaths('/images/world_scroll/asia', generatePaths('t', 1, 10)),
    '歐洲經典': createRemoteImagePaths('/images/world_scroll/europe', generatePaths('we', 1, 10)),
    '北美廣域': createRemoteImagePaths('/images/world_scroll/north_america', generatePaths('wn', 1, 10)),
    '中南美洲': createRemoteImagePaths('/images/world_scroll/south_america', generatePaths('ws', 1, 10)),
    //'大洋洲秘境': createRemoteImagePaths('/images/world_scroll/oceania', generatePaths('wo', 1, 1)),
    //'非洲野趣': createRemoteImagePaths('/images/world_scroll/africa', generatePaths('wf', 1, 1)),
  },
  // 靜思小品: z1.webp, z2.webp, ... z99.webp
  '靜思小品': createRemoteImagePaths(
    '/images/zen_moments', 
    generatePaths('z', 1, 23) 
  ),
  '萌寵療癒': createRemoteImagePaths(
    '/images/cute_pets',
    generatePaths('c', 1, 36) 
  ),
  '搞怪無厘': createRemoteImagePaths(
    '/images/wacky_style',
    generatePaths('w', 1, 19)
  ),
  '節日祝福': {
    //'通用祝福': createRemoteImagePaths('/images/holiday_greetings/general',  generatePaths('hg', 1, 99)),
    
    '新年賀歲': createRemoteImagePaths('/images/holiday_greetings/new_year', 
      generatePaths('hn', 1, 14)),

    '端午安康': createRemoteImagePaths('/images/holiday_greetings/dragon_boat',
       generatePaths('hd', 1, 18)),

    '中秋月圓': createRemoteImagePaths('/images/holiday_greetings/mid_autumn', 
       generatePaths('hm', 1, 12)),

    '溫馨聖誕': createRemoteImagePaths('/images/holiday_greetings/christmas', 
      generatePaths('hc', 1, 20)),
    
  },
};
export const STATIC_CATEGORY_KEYS = Object.keys(CATEGORIES);

// --- Storage Keys ---
// 採用遊戲化系統程式碼中的 Key，但保留您提供的 '我的作品' 等 Key 命名方式
export const MY_CREATIONS_KEY = 'hucuobian_creations';
export const PINS_KEY = 'hucuobian_pins_v1';
export const BOARDS_KEY = 'hucuobian_boards_v1';
export const WELCOME_SEEN_KEY = 'hucuobian_welcome_seen_v3';
export const USER_PROFILE_KEY = 'hucuobian_user_profile_v2';
export const ACHIEVEMENTS_KEY = 'hucuobian_achievements_v2';
export const NOTIFICATION_SETTINGS_KEY = 'hucuobian_notification_settings_v1';
export const ACCESSIBILITY_SETTINGS_KEY = 'hucuobian_accessibility_settings_v1';
export const USER_PREMIUM_STATUS_KEY = 'hucuobian_premium_status_v1';
export const MY_FAVORITES_BOARD_ID = 'my-favorites-board';
export const MY_FAVORITES_BOARD_NAME = '我的最愛';
export const MY_CREATIONS_BOARD_ID = 'my-creations-board';


// --- Editor Options ---
export const FONT_OPTIONS = [
    { name: '思源黑體', value: '"Noto Sans TC", sans-serif' },
    { name: '思源宋體', value: '"Noto Serif TC", serif' },
    { name: '芫荽', value: '"Coriander", cursive' },
    { name: '粉圓體', value: '"jf open 粉圓", sans-serif' },
    { name: '辰宇落雁體', value: '"ChenYuluoyan", cursive' },
    { name: '莫大毛筆', value: '"Bakudai-Regular", cursive' },
];

// --- Text Style Templates ---
export const TEXT_TEMPLATES = [
    {
        name: '富貴金',
        styles: {
            fill: '#8C1C1C',
            stroke: '#FFD700',
            strokeWidth: 2,
            shadow: null,
        }
    },
    {
        name: '墨香書法',
        styles: {
            fill: '#000000',
            strokeWidth: 0,
            shadow: {
                color: 'rgba(0,0,0,0.3)',
                blur: 5,
                offsetX: 2,
                offsetY: 2
            },
        }
    },
    {
        name: '懷舊直書',
        styles: {
            fill: '#5C4033',
            strokeWidth: 0,
            shadow: null,
            _isVertical: true, // Custom flag
        }
    },
    {
        name: '閃亮霓虹',
        styles: {
            fontWeight: 'bold',
            fill: '#FF00FF',
            strokeWidth: 0,
            shadow: {
                color: '#FF00FF',
                blur: 15,
                offsetX: 0,
                offsetY: 0
            },
        }
    },
    {
        name: '烈焰霓虹',
        styles: {
            fontWeight: 'bold',
            fill: '#FFFFFF',
            strokeWidth: 0,
            shadow: {
                color: '#F00',
                blur: 20,
                offsetX: 0,
                offsetY: 0
            },
        }
    },
    {
        name: '囡仔字',
        styles: {
            fill: '#00BFFF',
            stroke: '#00008B',
            strokeWidth: 1,
            shadow: null,
        }
    },
    {
        name: '圓潤可愛',
        styles: {
            fontWeight: 'bold',
            fill: '#FFFFFF',
            stroke: '#FFC0CB',
            strokeWidth: 3,
            shadow: {
                color: 'rgba(0,0,0,0.2)',
                blur: 0,
                offsetX: 3,
                offsetY: 3
            },
        }
    },
    {
        name: '清晨白',
        styles: {
            fill: '#F5F5DC',
            strokeWidth: 0,
            shadow: {
                color: '#555555',
                blur: 0,
                offsetX: 2,
                offsetY: 2
            },
        }
    },
    {
        name: '森林綠',
        styles: {
            fill: '#228B22',
            stroke: '#90EE90',
            strokeWidth: 1,
            shadow: null,
        }
    },
    {
        name: '暖心棕',
        styles: {
            fill: '#A0522D',
            strokeWidth: 0,
            shadow: {
                color: '#FFFDD0',
                blur: 3,
                offsetX: 2,
                offsetY: 2
            },
        }
    },
    {
        name: '海報黃',
        styles: {
            fontWeight: 'bold',
            fill: '#FFFF00',
            stroke: '#000000',
            strokeWidth: 1,
            shadow: {
                color: 'rgba(0,0,0,0.8)',
                blur: 0,
                offsetX: 4,
                offsetY: 4
            },
        }
    },
    {
        name: '紅色印章',
        styles: {
            fill: '#C82536',
            strokeWidth: 0,
            shadow: null,
            _isVertical: true, // Custom flag
        }
    }
];



// --- Greetings ---
// 採用您新提供的 GREETING_CATEGORIES
export const GREETING_CATEGORIES: { [key: string]: string[] } = {
  '早安問候': [
    '新的一天，元氣滿滿！',
    '早安，願你今天充滿陽光',
    '一日之計在於晨，早安！',
    '晨光熹微，為你送上第一份祝福',
    '早安！又是充滿希望的一天',
    '起床看看窗外的太陽，今天也要加油喔！',
    '用微笑迎接新的一天，早安',
    '早安，願你心情如清晨的空氣般清新',
    '吃頓豐盛的早餐，開啟美好的一天',
    '早安，記得給自己一個微笑',
    '新的一天，新的開始，祝你一切順利',
    '清晨的露珠，帶給你晶瑩剔透的好心情',
    '早安，全世界！還有最特別的你',
    '願晨光照亮你的每一分努力。',
    '早晨的風，帶走你的煩惱；早晨的露，滋潤你的心田。',
    '送你一杯早茶，茶香飄滿情意。',
    '早安，願你的日子比花還美。',
    '美好的一天從美好的心情開始。',
    '睜開眼睛，給你一個輕輕的祝福。',
    '早安，願你有個美好的一天。',
  ],
  '晚安祝福': [
    '晚安，祝您好夢',
    '卸下今日的疲憊，靜心入眠',
    '星光閃爍，祝您安睡',
    '月光灑滿窗前，願你一夜安眠',
    '晚安，把所有煩惱都留在今天',
    '放下手機，好好休息，明天又是新的一天',
    '願你的夢裡有繁星點點',
    '夜深了，早點休息，別熬夜喔',
    '蓋好被子，做個甜甜的夢',
    '晚安，世界和你',
    '祝你今夜無夢，一覺到天亮',
    '辛苦了一天，好好睡一覺吧',
    '讓夜晚的寧靜，撫平你白日的疲憊'
  ],
  '生日快樂': [
    '生日快樂，歲歲平安',
    '福如東海，壽比南山',
    '願所有美好都與您相伴',
    '祝你生日快樂，天天開心，心想事成',
    '願你的生日充滿無窮的快樂',
    '新的一歲，願你夢想成真，萬事如意',
    '生日快樂！願你的人生充滿色彩',
    '願快樂的歌聲永遠伴你左右',
    '祝你度過一個最美好的生日！',
    '年年有今日，歲歲有今朝',
    '青春永駐，笑口常開',
    '願你的未來光明燦爛，生日快樂！',
    '為你點亮生日的燭光，照亮你前行的路'
  ],
  '佳節通用': [
    '佳節愉快',
    '闔家團圓，幸福美滿',
    '祝您有個美好的假期',
    '佳節快樂，萬事順心',
    '祝您和您的家人佳節安康，笑口常開',
    '願節日的喜悅與你同在',
    '假期愉快，好好放鬆一下吧！',
    '願節日的鐘聲，為你帶來平安與喜悅',
    '祝您節節高升，好事連連',
    '願你所有的期盼都能出現，所有的夢想都能實現',
    '佳節來臨，福氣滿滿',
    '幸福安康，佳節同慶',
    '願這美好的節日帶給你無限的溫馨'
  ],
  '日常關懷': [
    '天氣多變，注意保暖',
    '記得多喝水，照顧好自己',
    '忙碌之餘，也要好好休息',
    '今天過得好嗎？別太累了',
    '出門記得帶傘，以防萬一',
    '按時吃飯，身體是革命的本錢',
    '工作再忙，也別忘了微笑',
    '有空多出去走走，看看風景',
    '最近好嗎？隨時都可以找我聊聊',
    '你的健康，是我最大的牽掛',
    '適時放鬆，別給自己太大壓力',
    '不管多忙，都要愛護自己',
    '願你三餐四季，溫暖有趣'
  ],
  '身體健康': [
    '平安健康',
    '身心安泰，活力滿滿',
    '祝您龍馬精神，健健康康',
    '祝您身體康健，笑口常開',
    '願您吃嘛嘛香，身體倍兒棒',
    '祝您精神煥發，神采奕奕',
    '願健康與您常伴，平安與您同行',
    '好好吃飯，好好睡覺，健康最重要',
    '祝您無病無災，歲月靜好',
    '願您活力四射，青春常在',
    '身心健康，萬事如意',
    '祝您體健安康，福壽綿長',
    '保持好心情，是健康的最佳秘訣'
  ],
  '勵志小語': [
    '相信自己，你最棒！',
    '每天進步一點點',
    '保持微笑，好運自來',
    '你努力的樣子，真的很耀眼',
    '堅持下去，就是勝利',
    '乾坤未定，你我皆是黑馬',
    '越努力，越幸運',
    '生活或許沉悶，但跑起來就有風',
    '你若盛開，蝴蝶自來',
    '今天的努力，是為了明天的幸運',
    '別回頭，路在前方',
    '你比你想像的更堅強',
    '星光不問趕路人，時光不負有心人'
  ],
  '溫馨感謝': [
    '感謝有你，溫暖我心',
    '謝謝您的幫忙',
    '感恩生命中的每一次相遇',
    '您的支持，是我前進的動力',
    '千言萬語，道不盡的感謝',
    '謝謝你，出現在我的生命裡',
    '滴水之恩，湧泉相報',
    '真心感謝您的慷慨相助',
    '感恩有你，一路同行',
    '謝謝您的理解與支持',
    '您的善意，我銘記在心',
    '感謝您為我做的一切',
    '有你真好，謝謝！'
  ],
  '靜思禪語': [
    '心靜自然涼',
    '日日是好日',
    '活在當下，珍惜眼前',
    '一念放下，萬般自在',
    '心若無塵，處處皆風景',
    '隨緣自適，煩惱即去',
    '世間本無事，庸人自擾之',
    '看淡得失，內心方得安寧',
    '菩提本無樹，明鏡亦非台',
    '一笑置之，超然待之',
    '心寬一寸，路寬一丈',
    '花開花落，雲卷雲舒',
    '簡單生活，便是幸福'
  ],
  '俏皮可愛': [
    '今天也要開心鴨！',
    '你是最可愛的崽',
    '給你一個大大的擁抱',
    '發射愛心光波，biu biu biu！',
    '今天也要元氣滿滿哦！',
    '你是吃可愛長大的嗎？',
    '想你，啾咪！',
    '送你一朵小紅花，獎勵你的乖巧',
    '不開心的時候，就捏捏自己的臉蛋',
    '今天也要加油呀，你是最胖（棒）的！',
    '祝你今天的好運，像空氣一樣無處不在',
    '你的可愛，治癒一切不可愛',
    '喂，在嗎？想你了'
  ],
  '商業祝福': [
    '生意興隆，財源廣進',
    '大展鴻圖，業績長紅',
    '開市大吉，萬商雲集',
    '恭祝開業，鴻運當頭',
    '財源滾滾達三江，生意興隆通四海',
    '祝您宏圖大展，裕業有孚',
    '合作愉快，共創輝煌',
    '祝貴公司駿業日新，蒸蒸日上',
    '願您的事業一帆風順，財源廣進',
    '祝您開業大吉，日進斗金',
    '鴻基始創，駿業日新',
    '願我們攜手共進，再創佳績',
    '祝您商機無限，事業騰飛'
  ],
  '四季平安': [
    '春風得意',
    '夏日安康',
    '秋收豐碩',
    '冬日溫暖',
    '願你春日看花，夏日聽雨',
    '願你秋日登高，冬日賞雪',
    '四季流轉，願你平安喜樂',
    '願你歲歲常歡愉，年年皆勝意',
    '春有百花秋有月，夏有涼風冬有雪',
    '願時光荏苒，你我安好如初',
    '一年四季，平安順遂',
    '願你每日有陽光，每季有花香',
    '無論季節如何變換，願你心中常暖',
    '願你歷經四季，歸來仍是少年'
  ]
};

// --- Daily Notification Quotes ---
// A curated list of 30 quotes specifically for daily morning notifications.
export const DAILY_NOTIFICATION_QUOTES: string[] = [
  '晨光是你夢想的鬧鐘，早安！',
  '新的一天，是寫下新故事的最好時機。',
  '願你的早晨，像第一杯咖啡那樣香醇。',
  '微笑是最好的妝容，記得為今天化上。',
  '每天都是一份禮物，拆開它，享受它。',
  '陽光正好，微風不燥，一切都剛剛好。',
  '用希望迎接朝陽，用笑聲點亮今天。',
  '別忘了告訴自己：你是最棒的！早安。',
  '願你今天的每一步，都踏在幸福的節拍上。',
  '清晨的風，願它吹走你所有的煩惱。',
  '一個好心情，是開啟美好一天的鑰匙。',
  '早安！願你眼裡有光，心裡有愛。',
  '生活或許沉悶，但跑起來就有風。',
  '為自己加油，你是自己最重要的支持者。',
  '願你活成一束光，溫暖自己，也照亮別人。',
  '今天也要元氣滿滿，可愛滿分喔！',
  '把願望種在今天，用行動去澆灌。',
  '早安，願你遇見的一切，都是溫柔的。',
  '世界那麼大，去創造屬於你的精彩吧！',
  '小小的進步，也能累積成大大的夢想。',
  '相信美好的事情，正在悄悄發生。',
  '吃頓好早餐，儲備一整天的能量。',
  '別讓昨天定義你，今天才是你的舞台。',
  '深呼吸，感受清晨的寧靜與力量。',
  '願你的努力，都能開出美麗的花。',
  '早安！送你一個擁抱，祝你今天開心。',
  '像向日葵一樣，永遠朝著陽光的方向。',
  '你若盛開，蝴蝶自來。願你芬芳。',
  '心懷感恩，所遇皆是溫柔。早安。',
  '今天也要比昨天更喜歡自己一點。'
];


// --- Gamification System ---

// 1. Levels
export const LEVELS: Level[] = [
    // --- 基礎階段 ---
    { level: 1, name: '平安喜樂', points: 0, icon: '😊' },
    { level: 2, name: '福氣滿滿', points: 51, icon: '🏮' },
    { level: 3, name: '笑口常開', points: 151, icon: '☀️' },
    { level: 4, name: '四季平安', points: 301, icon: '🌸' },
    { level: 5, name: '龍馬精神', points: 501, icon: '🐉' },
    { level: 6, name: '六六大順', points: 801, icon: '✨' },
    
    // --- 家庭與財富 ---
    { level: 7, name: '家和萬事興', points: 1201, icon: '🏡' },
    { level: 8, name: '八方來財', points: 1701, icon: '💰' },
    { level: 9, name: '五福臨門', points: 2301, icon: '🧧' },
    { level: 10, name: '十全十美', points: 3001, icon: '💯' },
    
    // --- 成就與傳承 ---
    { level: 11, name: '金玉滿堂', points: 3801, icon: '🏆' },
    { level: 12, name: '兒孫滿堂', points: 4701, icon: '👨‍👩‍👧‍👦' },
    { level: 13, name: '長命百歲', points: 5701, icon: '🐢' },
    { level: 14, name: '福壽雙全', points: 6801, icon: '🍑' },
    
    // --- 智慧與心靈 ---
    { level: 15, name: '智慧圓融', points: 8001, icon: '💎' },
    { level: 16, name: '萬事如意', points: 9501, icon: '🙏' },
    { level: 17, name: '德高望重', points: 11501, icon: '👑' },
    { level: 18, name: '名利雙收', points: 14001, icon: '🌟' },
    
    // --- 超然境界 ---
    { level: 19, name: '逍遙自在', points: 17001, icon: '🏞️' },
    { level: 20, name: '圓滿無礙', points: 20001, icon: '🧘' },
];

// FIX: Moved getLevelInfo here and exported it for global use.
export const getLevelInfo = (points: number) => {
    let currentLevel: Level = LEVELS[0];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (points >= LEVELS[i].points) {
            currentLevel = LEVELS[i];
            break;
        }
    }
    const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1);
    return { ...currentLevel, nextLevel };
};

// 2. Achievements & Badges
export const BADGES: { [id: string]: Badge } = {
    // --- 創作類 (Creation) ---
    CREATE_1: { id: 'CREATE_1', name: '初試啼聲', description: '完成 1 張作品', points: 10, category: 'creation', icon: '🎨', goal: 1, progressKey: 'creationCount' },
    CREATE_10: { id: 'CREATE_10', name: '創作達人・銅', description: '累計完成 10 張作品', points: 30, category: 'creation', icon: '🥉', goal: 10, progressKey: 'creationCount' },
    CREATE_50: { id: 'CREATE_50', name: '創作達人・銀', description: '累計完成 50 張作品', points: 100, category: 'creation', icon: '🥈', goal: 50, progressKey: 'creationCount' },
    CREATE_150: { id: 'CREATE_150', name: '創作達人・金', description: '累計完成 150 張作品', points: 200, category: 'creation', icon: '🥇', reward: '解鎖限定版貼圖', goal: 150, progressKey: 'creationCount' },
    FONT_5: { id: 'FONT_5', name: '風格大師', description: '使用過 5 種不同的字體', points: 20, category: 'creation', icon: '✍️', goal: 5, progressKey: 'fontsUsed' },

    // --- 分享類 (Sharing) ---
    SHARE_1: { id: 'SHARE_1', name: '分享喜悅', description: '首次分享作品', points: 10, category: 'sharing', icon: '💌', goal: 1, progressKey: 'shareCount' },
    SHARE_20: { id: 'SHARE_20', name: '分享大使・銅', description: '累計分享 20 次', points: 50, category: 'sharing', icon: '🥉', goal: 20, progressKey: 'shareCount' },
    SHARE_100: { id: 'SHARE_100', name: '分享大使・銀', description: '累計分享 100 次', points: 150, category: 'sharing', icon: '🥈', goal: 100, progressKey: 'shareCount' },
    SHARE_300: { id: 'SHARE_300', name: '分享大使・金', description: '累計分享 300 次', points: 300, category: 'sharing', icon: '🥇', reward: '解鎖限定版金色外框', goal: 300, progressKey: 'shareCount' },

    // --- 習慣類 (Habit) ---
    CHECKIN_1: { id: 'CHECKIN_1', name: '每日一安', description: '首次完成每日簽到', points: 0, category: 'habit', icon: '☀️', goal: 1, progressKey: 'consecutiveCheckInDays' },
    CHECKIN_7: { id: 'CHECKIN_7', name: '持之以恆', description: '連續簽到 7 天', points: 30, category: 'habit', icon: '🗓️', goal: 7, progressKey: 'consecutiveCheckInDays' },
    CHECKIN_30: { id: 'CHECKIN_30', name: '全勤模範生', description: '連續簽到 30 天', points: 100, category: 'habit', icon: '💯', goal: 30, progressKey: 'consecutiveCheckInDays' },
    FAVORITE_10: { id: 'FAVORITE_10', name: '收藏家', description: '將 10 張圖片加入「我的最愛」', points: 20, category: 'habit', icon: '💖', goal: 10, progressKey: 'favoritesCount' },

    // --- 隱藏成就 (Hidden) ---
    NIGHT_OWL: { id: 'NIGHT_OWL', name: '深夜貓頭鷹', description: '在凌晨 0-2 點間完成創作', points: 30, icon: '🦉', hidden: true, category: 'hidden' },
    COLOR_MASTER: { id: 'COLOR_MASTER', name: '色彩魔法師', description: '在單張作品中使用超過 5 種顏色', points: 30, icon: '🌈', hidden: true, category: 'hidden' },
    FONT_ALL: { id: 'FONT_ALL', name: '博學家', description: '使用過所有類型的字體', points: 50, icon: '✒️', hidden: true, category: 'hidden', goal: FONT_OPTIONS.length, progressKey: 'fontsUsed' },
    
    // --- 後設徽章 (Meta) ---
    CREATION_MASTER: { id: 'CREATION_MASTER', name: '靈感泉源', description: '解鎖所有創作類徽章', points: 150, icon: '🌟', meta: true, requiredCategory: 'creation', category: 'meta' },
    SHARING_GURU: { id: 'SHARING_GURU', name: '人氣之星', description: '解鎖所有分享類徽章', points: 150, icon: '✨', meta: true, requiredCategory: 'sharing', category: 'meta' },
    HABIT_HERO: { id: 'HABIT_HERO', name: '時間的朋友', description: '解鎖所有習慣類徽章', points: 150, icon: '⏳', meta: true, requiredCategory: 'habit', category: 'meta' },
};

// 3. Daily & Weekly Tasks
export const TASKS: { [id: string]: TaskDefinition } = {
    DAILY_CHECKIN: { id: 'DAILY_CHECKIN', type: 'daily', name: '每日簽到', description: '點擊領取每日暖心點數', goal: 1, points: 5, event: 'claim_task' },
    DAILY_CREATE: { id: 'DAILY_CREATE', type: 'daily', name: '今日創作', description: '今天完成 1 張新作品', goal: 1, points: 3, event: 'create' },
    DAILY_SHARE: { id: 'DAILY_SHARE', type: 'daily', name: '暖心問候', description: '今天分享 1 次作品', goal: 1, points: 5, event: 'share' },
    DAILY_USE_CATEGORY_WORLD: { id: 'DAILY_USE_CATEGORY_WORLD', type: 'daily', name: '世界之旅', description: '使用一張「世界畫卷」的圖片進行創作', goal: 1, points: 5, event: 'create', condition: { category: '世界畫卷' } },
    DAILY_USE_FONT_CORIANDER: { id: 'DAILY_USE_FONT_CORIANDER', type: 'daily', name: '字體雅興', description: '在作品中使用「芫荽」字體', goal: 1, points: 5, event: 'create', condition: { font: '"Coriander", cursive' } },
    
    WEEKLY_CREATE: { id: 'WEEKLY_CREATE', type: 'weekly', name: '創意一週', description: '本週累計完成 5 張作品', goal: 5, points: 15, event: 'create' },
    WEEKLY_CREATE_VERTICAL: { id: 'WEEKLY_CREATE_VERTICAL', type: 'weekly', name: '直書挑戰', description: '本週累計完成 3 張使用直式文字的作品', goal: 3, points: 20, event: 'create', condition: { isVertical: true } },
    WEEKLY_USE_SAME_BG: { id: 'WEEKLY_USE_SAME_BG', type: 'weekly', name: '一圖多變', description: '本週用同一張背景圖創作出 2 次', goal: 2, points: 20, event: 'create', condition: { sameBackground: true } },

};


// --- Badge Series Definition ---
// This groups badges that are part of a progression (e.g., Bronze, Silver, Gold).
// The Honor Wall uses this to show only one representative badge per series.
export const BADGE_SERIES: { [key: string]: string[] } = {
    creation_pro: ['CREATE_1', 'CREATE_10', 'CREATE_50', 'CREATE_150'],
    sharing_ambassador: ['SHARE_1', 'SHARE_20', 'SHARE_100', 'SHARE_300'],
    checkin_streak: ['CHECKIN_1', 'CHECKIN_7', 'CHECKIN_30'],
};


// 4. Data Structures & Initializers
export const initializeUserProfile = (): UserProfile => ({
    nickname: '厝邊好鄰居',
    points: 0,
    tasks: {
        daily: { lastReset: null, progress: {} },
        weekly: { lastReset: null, progress: {} }
    }
});

export const initializeAchievements = (): Achievements => ({
    creationCount: 0,
    shareCount: 0,
    fontsUsed: [],
    favoritesCount: 0,
    consecutiveCheckInDays: 0,
    lastCheckInDate: null,
    unlockedBadges: [],
});


// --- Data Transformation ---
/**
 * Converts the static CATEGORIES object into a flat array of Pin objects.
 * This is used for initializing the app with a base set of content for the new Pin/Board system.
 * This function should only be run once when the app's pin storage is empty.
 * @param categories The CATEGORIES object from data.ts
 * @returns An array of Pin objects.
 */
export const convertCategoriesToPins = (categories: typeof CATEGORIES): Pin[] => {
    const pins: Pin[] = [];

    const processCategory = (items: string[] | { [key: string]: string[] }, titlePrefix: string) => {
        if (Array.isArray(items)) {
            items.forEach(url => {
                pins.push({
                    pinId: crypto.randomUUID(),
                    imageUrl: url,
                    aspectRatio: 0.75, // Default aspect ratio for static images (matches 3:4 from CSS)
                    title: titlePrefix,
                    description: `來自「${titlePrefix}」分類的精選圖片。`,
                    creatorId: 'official',
                    sourceType: 'STATIC_IMAGE',
                });
            });
        } else {
            for (const subCategory in items) {
                processCategory(items[subCategory], `${titlePrefix} - ${subCategory}`);
            }
        }
    };

    for (const category in categories) {
        processCategory(categories[category as keyof typeof CATEGORIES], category);
    }

    return pins;
};