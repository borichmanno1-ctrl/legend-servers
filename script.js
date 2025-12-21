// SEO优化：动态更新页面标题和关键词
function updateSEOTags() {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const month = beijingTime.getUTCMonth() + 1;
    const day = beijingTime.getUTCDate();
    const hour = beijingTime.getUTCHours();
    
    let periodText = '';
    if (hour >= 9 && hour < 24) {
        periodText = '白天';
    } else {
        periodText = '通宵';
    }
    
    // 更新页面标题
    document.title = `${month}月${day}日${periodText}传奇开服表_最新传奇私服开区信息发布网`;
    
    // 更新meta描述
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        metaDesc.content = `${month}月${day}日最新${periodText}传奇私服开区信息，权威发布每日新开传奇服务器，实时更新传奇版本介绍、服务器IP地址和在线客服QQ。`;
    }
    
    // 更新结构化数据
    updateStructuredData(month, day, periodText);
}

function updateStructuredData(month, day, periodText) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": `${month}月${day}日${periodText}传奇开服表`,
        "url": window.location.href,
        "description": `每日最新${periodText}传奇私服开区信息发布平台`,
        "dateModified": new Date().toISOString(),
        "potentialAction": {
            "@type": "SearchAction",
            "target": `${window.location.origin}/?q={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    };
    
    // 更新或创建结构化数据
    let schemaScript = document.querySelector('script[type="application/ld+json"]');
    if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.type = 'application/ld+json';
        document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(schema);
}

// 在DOM加载完成后调用
document.addEventListener('DOMContentLoaded', function() {
    // 调用现有的初始化函数...
    
    // 添加SEO优化
    updateSEOTags();
    
    // 每10分钟更新一次SEO标签
    setInterval(updateSEOTags, 10 * 60 * 1000);
    
    // 添加SEO相关内容到页面底部
    addSEOContent();
});

// 添加SEO相关内容
function addSEOContent() {
    // 创建关键词区域
    const keywordsFooter = document.createElement('div');
    keywordsFooter.className = 'keywords-footer';
    keywordsFooter.innerHTML = `
        热门搜索：
        <a href="/">传奇开服表</a> |
        <a href="/">新开传奇私服</a> |
        <a href="/">传奇发布网</a> |
        <a href="/">传奇私服</a> |
        <a href="/">传奇服务器</a> |
        <a href="/">传奇开区</a> |
        <a href="/">传奇版本</a> |
        <a href="/">传奇游戏</a> |
        <a href="/">1.76复古传奇</a> |
        <a href="/">1.80战神传奇</a> |
        <a href="/">1.85传奇</a> |
        <a href="/">传奇合击</a> |
        <a href="/">传奇微变</a> |
        <a href="/">传奇中变</a>
    `;
    
    // 插入到footer之前
    const footer = document.querySelector('.site-footer');
    footer.parentNode.insertBefore(keywordsFooter, footer);
    
    // 创建隐藏的SEO内容（搜索引擎可抓取，用户不可见）
    const seoContent = document.createElement('div');
    seoContent.className = 'seo-content';
    seoContent.innerHTML = `
        <h2>传奇开服表 - 最新传奇私服发布平台</h2>
        <p>本站是专业的传奇游戏开服信息发布平台，每日实时更新最新传奇私服开区信息，包括1.76复古传奇、1.80战神传奇、1.85传奇版本、传奇合击、传奇微变、传奇中变等多种版本。</p>
        
        <h3>主要功能</h3>
        <ul>
            <li>实时更新每日新开传奇服务器信息</li>
            <li>提供服务器IP地址和开放时间</li>
            <li>展示传奇版本特色介绍</li>
            <li>提供在线客服QQ联系方式</li>
            <li>区分白天和通宵开服时段</li>
            <li>标记新服、火爆服务器</li>
        </ul>
        
        <h3>使用指南</h3>
        <p>用户可以通过分类筛选功能快速找到特定类型的传奇服务器，如复古传奇、微变传奇、合击传奇等。每个服务器都提供详细的版本介绍和特色说明，方便玩家选择适合自己的游戏服务器。</p>
        
        <h3>关于我们</h3>
        <p>我们致力于为传奇游戏玩家提供最全面、最及时的传奇私服开服信息，帮助玩家快速找到合适的游戏服务器，享受传奇游戏的乐趣。</p>
    `;
    
    // 添加到body末尾
    document.body.appendChild(seoContent);
}





document.addEventListener('DOMContentLoaded', function() {
    const serverTableBody = document.getElementById('serverTableBody');
    const categoryFilter = document.getElementById('categoryFilter');
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    const currentYear = document.getElementById('currentYear');
    const periodIndicator = document.getElementById('periodIndicator');

    let allServers = [];
    let activeCategory = '全部';

    currentYear.textContent = new Date().getFullYear();
    lastUpdateTime.textContent = new Date().toLocaleDateString('zh-CN');

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allServers = data.servers;
            // 移除服务器数量统计
            generateCategoryButtons(data.categories);
            filterAndRenderServers();
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            serverTableBody.innerHTML = '<tr><td colspan="7" style="color:red;">数据加载失败</td></tr>';
        });

    function generateCategoryButtons(categories) {
        categoryFilter.innerHTML = '';
        categories.forEach(cat => {
            const button = document.createElement('button');
            button.className = `cat-btn ${cat === '全部' ? 'active' : ''}`;
            button.textContent = cat;
            button.dataset.category = cat;
            button.addEventListener('click', () => {
                activeCategory = cat;
                document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                filterAndRenderServers();
            });
            categoryFilter.appendChild(button);
        });
    }

    // 获取当前北京时间（东八区）
    function getBeijingTime() {
        const now = new Date();
        // 转换为北京时间（UTC+8）
        const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        return beijingTime;
    }

    // 获取当前半小时区间
    function getCurrentTimeSlot() {
        const beijingTime = getBeijingTime();
        const hour = beijingTime.getUTCHours(); // 注意：使用getUTCHours因为我们已经加了8小时
        const minute = beijingTime.getUTCMinutes();
        
        // 计算当前半小时区间
        let startHour = hour;
        let startMinute = minute >= 30 ? 30 : 0;
        let endHour = hour;
        let endMinute = startMinute + 30;
        
        if (endMinute === 60) {
            endHour += 1;
            endMinute = 0;
            if (endHour === 24) {
                endHour = 0;
            }
        }
        
        return {
            startHour: startHour,
            startMinute: startMinute,
            endHour: endHour,
            endMinute: endMinute,
            hour: hour,
            minute: minute
        };
    }

    // 判断是否是通宵时段（0:00-9:00）
    function isOvernightPeriod() {
        const timeSlot = getCurrentTimeSlot();
        // 通宵时段：0:00-9:00
        return timeSlot.hour >= 0 && timeSlot.hour < 9;
    }

    function parseChineseDate(dateStr) {
        const match = dateStr.match(/(\d{1,2})月(\d{1,2})日[\/]?(\d{1,2})点(\d{1,2})分?/);
        if (!match) {
            // 尝试另一种格式：12月20日/22:30
            const match2 = dateStr.match(/(\d{1,2})月(\d{1,2})日[\/]?(\d{1,2}):(\d{1,2})/);
            if (!match2) return null;
            const [, month, day, hour, minute] = match2.map(Number);
            const currentYear = new Date().getFullYear();
            return new Date(currentYear, month - 1, day, hour, minute);
        }
        const [, month, day, hour = 0, minute = 0] = match.map(Number);
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, month - 1, day, hour, minute);
    }

    // 检查服务器开放时间是否在当前半小时区间
    function isInCurrentTimeSlot(server) {
        const timeSlot = getCurrentTimeSlot();
        const serverTime = parseChineseDate(server.openTime);
        if (!serverTime) return false;
        
        const serverHour = serverTime.getHours();
        const serverMinute = serverTime.getMinutes();
        
        // 判断是否在当前半小时区间内
        if (serverHour === timeSlot.startHour && serverMinute >= timeSlot.startMinute && 
            serverMinute < timeSlot.startMinute + 30) {
            return true;
        }
        
        // 处理跨小时的情况
        if (timeSlot.startMinute === 30 && 
            serverHour === timeSlot.startHour + 1 && 
            serverMinute < timeSlot.endMinute) {
            return true;
        }
        
        return false;
    }

    function getPromotionWeight(server, isOvernight) {
        const promo = server.promotion;
        if (!promo) return { weight: 0, order: 999 };
        
        const type = promo.type;
        const isOvernightType = type.includes('通宵');
        const isAllDayType = type.includes('全天');
        
        // 根据当前时段过滤推荐类型
        if (isOvernight) {
            if (!isOvernightType && !isAllDayType) return { weight: 0, order: 999 };
        } else {
            // 白天时段不显示通宵推荐
            if (isOvernightType) return { weight: 0, order: 999 };
        }
        
        let weight = 0;
        let timeSlotBonus = 0;
        
        // 检查是否在当前半小时区间
        if (isInCurrentTimeSlot(server)) {
            timeSlotBonus = 50; // 在当前时间段的服务器获得额外权重
        }
        
        // 根据推荐类型设置基础权重
        if (isOvernight) {
            // 通宵时段优先级
            if (type.includes('通宵置顶推荐')) weight = 300;
            else if (type.includes('通宵套黄推荐')) weight = 200;
            else if (type.includes('通宵推荐')) weight = 150;
            else if (type.includes('全天置顶推荐')) weight = 100;
            else if (type.includes('全天套黄推荐')) weight = 80;
            else if (type.includes('全天推荐')) weight = 60;
        } else {
            // 白天时段优先级
            if (type.includes('全天置顶推荐')) weight = 100;
            else if (type.includes('全天套黄推荐')) weight = 80;
            else if (type.includes('全天推荐')) weight = 60;
        }
        
        // 总权重 = 基础权重 + 时间段加成 + 顺序权重
        return {
            weight: weight + timeSlotBonus,
            order: promo.order || 999
        };
    }

    // 添加点击跳转函数
    function openServerDetail(detailUrl) {
        if (detailUrl && detailUrl !== '#') {
            window.open(detailUrl, '_blank');
        }
    }

    function filterAndRenderServers() {
        const isOvernight = isOvernightPeriod();
        const timeSlot = getCurrentTimeSlot();
        
        // 更新时段指示器
        if (periodIndicator) {
            if (isOvernight) {
                periodIndicator.textContent = `🌙 当前为通宵时段 (0:00 - 9:00) | 当前时间段: ${String(timeSlot.startHour).padStart(2, '0')}:${String(timeSlot.startMinute).padStart(2, '0')} - ${String(timeSlot.endHour).padStart(2, '0')}:${String(timeSlot.endMinute).padStart(2, '0')}`;
                periodIndicator.className = 'period-indicator overnight';
            } else {
                periodIndicator.textContent = `☀️ 当前为白天时段 (9:00 - 24:00) | 当前时间段: ${String(timeSlot.startHour).padStart(2, '0')}:${String(timeSlot.startMinute).padStart(2, '0')} - ${String(timeSlot.endHour).padStart(2, '0')}:${String(timeSlot.endMinute).padStart(2, '0')}`;
                periodIndicator.className = 'period-indicator daytime';
            }
        }
        
        // 过滤分类
        let processedServers = allServers.filter(server => {
            const categoryMatch = activeCategory === '全部' || server.category.includes(activeCategory);
            return categoryMatch;
        });
        
        // 计算每个服务器的权重
        processedServers.forEach(server => {
            server._promotionData = getPromotionWeight(server, isOvernight);
            server._isInCurrentSlot = isInCurrentTimeSlot(server);
        });
        
        // 按照优先级排序
        processedServers.sort((a, b) => {
            const promoA = a._promotionData;
            const promoB = b._promotionData;
            
            // 先按权重排序
            if (promoB.weight !== promoA.weight) {
                return promoB.weight - promoA.weight;
            }
            
            // 权重相同，按推荐顺序排序
            if (promoB.weight > 0 && promoA.weight === promoB.weight) {
                return promoA.order - promoB.order;
            }
            
            // 没有推荐权重的，按开放时间倒序
            const timeA = parseChineseDate(a.openTime);
            const timeB = parseChineseDate(b.openTime);
            return (timeB || 0) - (timeA || 0);
        });
        
        // 只显示有推荐权重的服务器
        processedServers = processedServers.filter(server => server._promotionData.weight > 0);
        
        renderTableRows(processedServers);
    }

    function renderTableRows(servers) {
        serverTableBody.innerHTML = '';
        if (servers.length === 0) {
            serverTableBody.innerHTML = '<tr><td colspan="7" class="loading">当前分类下暂无开服信息。</td></tr>';
            return;
        }
        
        servers.forEach(server => {
            const row = document.createElement('tr');
            let tagsHtml = '';
            if (server.new) tagsHtml += '<span class="tag new">新服</span>';
            if (server.hot) tagsHtml += '<span class="tag hot">火爆</span>';
            
            const detailUrl = server.detailUrl || '#';
            
            let rowClass = '';
            const promoType = server.promotion?.type || '';
            if (promoType.includes('套黄')) {
                rowClass = 'row-yellow-bg';
            }
            
            // 如果在当前时间段，添加高亮样式
            if (server._isInCurrentSlot) {
                rowClass += ' current-time-slot';
            }
            
            row.className = rowClass;
            
            let promotionBadge = '';
            if (server.promotion) {
                let badgeClass = 'promotion-badge';
                if (promoType.includes('通宵')) badgeClass += ' badge-overnight';
                if (promoType.includes('全天')) badgeClass += ' badge-allday';
                
                // 添加时间段标记
                if (server._isInCurrentSlot) {
                    promotionBadge = `<span class="${badgeClass}">${server.promotion.type} ⏰当前时段</span>`;
                } else {
                    promotionBadge = `<span class="${badgeClass}">${server.promotion.type}</span>`;
                }
            }
            
            row.innerHTML = `
                <td>
                    <div>
                        <span class="server-name" onclick="openServerDetail('${detailUrl}')">${server.name}</span>
                        ${promotionBadge}
                    </div>
                    <div class="server-tags">${tagsHtml}</div>
                </td>
                <td><span class="server-ip" onclick="openServerDetail('${detailUrl}')">${server.ip}</span></td>
                <td>${server.openTime}</td>
                <td>${server.version}</td>
                <td>${server.qq}</td>
                <td class="server-feature">${server.feature}</td>
                <td><button class="btn-detail" onclick="openServerDetail('${detailUrl}')">点击查看</button></td>
            `;
            serverTableBody.appendChild(row);
        });
        
        // 移除服务器数量更新
    }
    
    // 将openServerDetail函数暴露给全局作用域
    window.openServerDetail = openServerDetail;
    
    // 移除排序事件监听器
    
    // 每30秒检查一次时间，更新显示
    setInterval(() => {
        filterAndRenderServers();
    }, 30 * 1000);
});

