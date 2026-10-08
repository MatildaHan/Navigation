document.addEventListener('DOMContentLoaded', () => {
    initTimeAndCalendar();
    loadAllConfigurations();
});

// 1. 根据当前小时数获取问候语
function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
        return '早上好';
    } else if (hour >= 11 && hour < 13) {
        return '中午好';
    } else if (hour >= 13 && hour < 18) {
        return '下午好';
    } else {
        return '晚上好';
    }
}

// 2. 初始化时间和日历
function initTimeAndCalendar() {
    const updateTime = () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const dateStr = `${now.getMonth() + 1}/${now.getDate()} 星期${['日', '一', '二', '三', '四', '五', '六'][now.getDay()]}`;
        
        document.getElementById('time').innerText = timeStr;
        document.getElementById('date').innerText = dateStr;
    };
    updateTime();
    setInterval(updateTime, 1000);

    // 生成当月日历
    const calendarEl = document.getElementById('calendar');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let calendarHTML = '';
    
    ['日', '一', '二', '三', '四', '五', '六'].forEach(d => {
        calendarHTML += `<span style="opacity: 0.5; font-size: 0.8rem;">${d}</span>`;
    });

    for (let i = 0; i < firstDay; i++) {
        calendarHTML += `<span class="empty"></span>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = i === now.getDate();
        calendarHTML += `<span class="${isToday ? 'today' : ''}">${i}</span>`;
    }
    calendarEl.innerHTML = calendarHTML;
}

// 通用 MD 解析器
function parseMdToObjects(mdText) {
    if (!mdText) return [];
    const cleanText = mdText.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
    const blocks = cleanText.split(/\n\s*\n/); 
    const result = [];
    
    blocks.forEach(block => {
        const lines = block.split('\n');
        const obj = {};
        let hasValidData = false;
        
        lines.forEach(line => {
            const match = line.match(/^([^：:]+)[：:]\s*(.+)$/);
            if (match) {
                obj[match[1].trim()] = match[2].trim();
                hasValidData = true;
            }
        });
        if (hasValidData) result.push(obj);
    });
    return result;
}

// 3. 读取并解析所有的 Markdown 配置文件
async function loadAllConfigurations() {
    
    // --- 加载个人基础信息 (结合动态问候语) ---
    fetch('../../config/profile.md').then(r => r.text()).then(md => {
        const profile = parseMdToObjects(md)[0] || {};
        const nickname = profile['昵称'] || '用户';
        const greetingWord = getGreeting(); // 调用动态问候语
        
        document.getElementById('greeting-title').innerText = `${greetingWord}，这里是${nickname}！`;
        document.getElementById('profile-signature').innerText = profile['个人签名'] || '';
        
        if (profile['头像网址']) {
            document.getElementById('avatar-img').src = profile['头像网址'];
        }
    }).catch(e => console.error("读取 profile 失败", e));

    // --- 加载格言与笔记 ---
    fetch('../../config/note.md').then(r => r.text()).then(md => {
        const noteData = parseMdToObjects(md)[0] || {};
        const quoteContent = document.querySelector('.quote-content');
        if (quoteContent) {
            quoteContent.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px; color: #ff7eb3;">“ ${noteData['格言'] || '暂无格言'} ”</div>
                <div style="opacity: 0.8; font-size: 0.85rem;">${noteData['随笔'] || ''}</div>
            `;
        }
    });

    // --- 加载书架 ---
    fetch('../../config/book.md').then(r => r.text()).then(md => {
        const books = parseMdToObjects(md);
        const container = document.getElementById('book-list');
        container.innerHTML = books.map(b => `
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;">
                    <span>${b['书名'] || '未知书名'}</span>
                </div>
                <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 3px; display: flex; justify-content: space-between;">
                    <span>${b['作者'] || '佚名'}</span>
                    <span style="color: var(--accent-green);">${b['状态'] || ''} · ${b['进度'] || ''}</span>
                </div>
            </div>
        `).join('');
    });

    // --- 加载观影 ---
    fetch('../../config/movie.md').then(r => r.text()).then(md => {
        const movies = parseMdToObjects(md);
        const container = document.getElementById('movie-list');
        container.innerHTML = movies.map(m => `
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: bold;">${m['片名'] || '未知片名'}</span>
                    <span style="color: #ff7eb3; font-weight: bold;">★ ${m['评分'] || 'N/A'}</span>
                </div>
                <div style="font-size: 0.75rem; opacity: 0.7; margin-top: 3px;">
                    ${m['类型'] || ''} · ${m['状态'] || ''}
                </div>
            </div>
        `).join('');
    });

    // --- 加载纪念日 ---
    fetch('../../config/anniversary.md').then(r => r.text()).then(md => {
        const events = parseMdToObjects(md);
        const listEl = document.getElementById('anniversary-list').querySelector('ul');
        listEl.innerHTML = '';
        
        const today = new Date();
        today.setHours(0,0,0,0);

        events.forEach(ev => {
            if (!ev['日期']) return;
            const targetDate = new Date(ev['日期']);
            const eventName = ev['事件'] || '未命名事件';
            const type = ev['类型'] || '已过日';
            
            const diffTime = Math.abs(today - targetDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let dayText = type === '倒数日' ? `还有 ${diffDays} 天` : `已经历 ${diffDays} 天`;
            const highlightStyle = type === '倒数日' ? 'color: #ff7eb3;' : 'color: #a3c4bc;';

            listEl.innerHTML += `
                <li>
                    <span>${eventName}</span> 
                    <strong style="${highlightStyle}">${dayText}</strong>
                </li>
            `;
        });
        
        if(listEl.innerHTML === '') listEl.innerHTML = '<li style="opacity: 0.5;">暂无纪念日</li>';
    });

    // --- 加载导航标签 ---
    fetch('../../config/nav.md').then(r => r.text()).then(md => {
        const navItems = parseMdToObjects(md);
        const navEl = document.getElementById('nav-links');
        navEl.innerHTML = ''; 
        
        navItems.forEach((item, index) => {
            const a = document.createElement('a');
            a.href = item['网址'] || '#';
            a.title = item['名称'] || '链接';
            if (index === 0) a.classList.add('active');
            a.innerHTML = `<i class="${item['图标'] || 'fa-solid fa-link'}"></i>`;
            navEl.appendChild(a);
        });
    });
}
