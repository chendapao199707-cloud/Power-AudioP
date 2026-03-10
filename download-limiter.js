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
        document.querySelectorAll('a[href*="123pan.cn"], a[href*="v.123pan.cn"], a[href*="175.178.59.88:5244"]').forEach(a => {
            if (remaining <= 0) {
                a.style.opacity = '0.5';
                a.style.cursor = 'not-allowed';
            } else {
                a.style.opacity = '1';
                a.style.cursor = 'pointer';
            }
        });

        // 持续检查并显示公告（应对 SPA 路由切换）
        if (noticeText) {
            displayNotice();
        }
    }

    // 显示公告文字（优化版：放置在登录框顶部并美化）
    function displayNotice() {
        if (!noticeText) return;

        let noticeElement = document.getElementById('site-notice');
        if (!noticeElement) {
            noticeElement = document.createElement('div');
            noticeElement.id = 'site-notice';
            // 更加精致的公告样式：浅蓝色背景、深蓝色边框、圆角和阴影
            noticeElement.style.cssText = 'margin: 15px 0; padding: 12px 16px; background-color: #e7f3ff; border: 1px solid #b3d7ff; color: #004085; border-radius: 8px; font-size: 14px; text-align: center; line-height: 1.6; box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;';
            
            // 查找登录框容器（通常是包含标题的那个div）
            const loginCard = document.querySelector('div.bg-white.p-8.rounded-2xl.shadow-xl') || document.querySelector('#root > div > div');
            if (loginCard) {
                // 找到标题（h1）并在其下方插入公告
                const title = loginCard.querySelector('h1');
                if (title) {
                    title.parentNode.insertBefore(noticeElement, title.nextSibling);
                } else {
                    loginCard.prepend(noticeElement);
                }
            } else {
                // 兜底方案：插入到 root 顶部
                const root = document.getElementById('root');
                if (root) root.prepend(noticeElement);
            }
        }
        
        // 只有当内容发生变化时才更新 innerHTML，避免闪烁
        if (noticeElement.innerHTML !== noticeText) {
            noticeElement.innerHTML = noticeText;
        }
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
                        displayNotice(); // 初始显示公告
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
    // 缩短刷新间隔，确保在单页应用路由切换时公告能迅速重新显示
    setInterval(updateUI, 1000);
    
    window.resetDownloadCount = function() {
        localStorage.removeItem(STORAGE_KEY);
        syncConfig();
        console.log('下载计数已重置');
    };
})();
