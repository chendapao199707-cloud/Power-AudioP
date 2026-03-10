(function() {
    // 下载限制核心逻辑
    const STORAGE_KEY = 'power_audio_download_stats';
    let dailyLimit = 5; // 默认值，稍后会从 config.json 同步
    let noticeText = ''; // 公告文字，稍后会从 config.json 同步

    // 获取今日日期字符串 (YYYY-MM-DD)
    function getTodayStr() {
        const now = new Date();
        return now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
    }

    // 获取或初始化下载统计
    function getStats() {
        const stats = localStorage.getItem(STORAGE_KEY);
        const today = getTodayStr();
        if (stats) {
            try {
                const parsed = JSON.parse(stats);
                if (parsed.date === today) {
                    return parsed;
                }
            } catch (e) {}
        }
        return { date: today, count: 0 };
    }

    // 保存统计
    function saveStats(stats) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }

    // 更新界面展示
    function updateUI() {
        const stats = getStats();
        const remaining = Math.max(0, dailyLimit - stats.count);
        
        // 创建或更新剩余次数展示标签
        let badge = document.getElementById('download-limit-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'download-limit-badge';
            badge.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(0,0,0,0.8);color:#fff;padding:10px 15px;border-radius:12px;font-size:13px;z-index:9999;pointer-events:none;border:1px solid rgba(255,255,255,0.1);box-shadow:0 4px 12px rgba(0,0,0,0.3);font-family:sans-serif;transition:all 0.3s ease;';
            document.body.appendChild(badge);
        }
        
        badge.innerHTML = `📅 今日剩余下载次数: <b style="color:${remaining > 0 ? '#4caf50' : '#ff5252'};font-size:15px;">${remaining}</b> / ${dailyLimit}`;
        
        // 根据剩余下载次数启用或禁用链接样式
        document.querySelectorAll('a[href*="123pan.cn"], a[href*="v.123pan.cn"]').forEach(a => {
            if (remaining <= 0) {
                a.style.opacity = '0.5';
                a.style.cursor = 'not-allowed';
            } else {
                a.style.opacity = '1';
                a.style.cursor = 'pointer';
            }
        });
    }

    // 显示公告文字
    function displayNotice() {
        if (!noticeText) return;

        let noticeElement = document.getElementById('site-notice');
        if (!noticeElement) {
            noticeElement = document.createElement('div');
            noticeElement.id = 'site-notice';
            noticeElement.style.cssText = 'margin-top: 10px; padding: 10px; background-color: #fff3cd; border: 1px solid #ffeeba; color: #856404; border-radius: 5px; font-size: 14px; text-align: center;';
            
            // 尝试找到“请输入用户名和密码登录”的父元素，在其后插入
            const loginPrompt = document.querySelector('p'); // 假设这是唯一的p标签或者第一个p标签
            if (loginPrompt && loginPrompt.textContent.includes('请输入用户名和密码登录')) {
                loginPrompt.parentNode.insertBefore(noticeElement, loginPrompt.nextSibling);
            } else {
                // 如果找不到特定元素，则尝试在 root 元素内部的某个位置插入
                const root = document.getElementById('root');
                if (root) {
                    const firstChild = root.querySelector('div'); // 假设登录框是root的第一个子div
                    if (firstChild) {
                        firstChild.insertBefore(noticeElement, firstChild.children[2]); // 插入到标题和描述之间
                    } else {
                        root.appendChild(noticeElement);
                    }
                }
            }
        }
        noticeElement.innerHTML = noticeText;
    }

    // 拦截下载点击
    document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (target && target.href && (target.href.includes('123pan.cn') || target.href.includes('v.123pan.cn') || target.href.includes('175.178.59.88:5244'))) {
            const stats = getStats();
            if (stats.count >= dailyLimit) {
                e.preventDefault();
                alert(`⚠️ 抱歉，今日免费下载次数已达上限 (${dailyLimit}次)。\n\n请明天再来，或联系管理员获取更多权限。`);
                return false;
            }
            
            // 记录下载
            stats.count += 1;
            saveStats(stats);
            updateUI();

            // 核心修复：解决浏览器拦截“非安全下载”问题
            // 使用新窗口打开链接，可以有效绕过 Chrome 等浏览器对不安全下载的直接拦截
            e.preventDefault();
            window.open(target.href, '_blank');
            
            return false;
        }
    }, true);

    // 从 config.json 同步配置
    function syncConfig() {
        fetch('config.json?t=' + Date.now())
            .then(res => res.json())
            .then(config => {
                if (config.site) {
                    if (config.site.downloadLimit) {
                        dailyLimit = parseInt(config.site.downloadLimit);
                    }
                    if (config.site.notice) {
                        noticeText = config.site.notice;
                        displayNotice(); // 显示公告
                    }
                } else if (config.downloadLimit) {
                    dailyLimit = parseInt(config.downloadLimit);
                }
                updateUI();
            })
            .catch(err => {
                console.error('无法加载配置:', err);
                updateUI();
            });
    }

    syncConfig();
    setInterval(updateUI, 3000);
    
    window.resetDownloadCount = function() {
        localStorage.removeItem(STORAGE_KEY);
        syncConfig();
        console.log('下载计数已重置');
    };
})();
