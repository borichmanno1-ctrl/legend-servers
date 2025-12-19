document.addEventListener('DOMContentLoaded', function() {
    const serverTableBody = document.getElementById('serverTableBody');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortSelect = document.getElementById('sortSelect');
    const serverCount = document.getElementById('serverCount');
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
            serverCount.textContent = allServers.length;
            generateCategoryButtons(data.categories);
            filterAndRenderServers();
            updatePeriodIndicator();
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

    // 获取当前北京时间
    function getBeijingTime() {
        const now = new Date();
        // 北京时间为UTC+8
        const beijingOffset = 8 * 60; // 分钟
        const localOffset = now.getTimezoneOffset(); // 本地时区偏移（分钟）
        const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60000);
        return beijingTime;
    }

    // 检查是否为通宵时段 (0:00-7:00)
    function isOvernightPeriod() {
        const beijingTime = getBeijingTime();
        const currentHour = beijingTime.getHours();
        return currentHour >= 0 && currentHour < 7;
    }

    // 获取当前半小时区间
    function getCurrentHalfHourPeriod() {
        const beijingTime = getBeijingTime();
        const hours = beijingTime.getHours();
        const minutes = beijingTime.getMinutes();
        
        // 计算当前属于哪个半小时区间
        let periodHour = hours;
        let periodMinute = minutes < 30 ? 0 : 30;
        
        // 格式化输出，用于匹配服务器开放时间
        const month = beijingTime.getMonth() + 1;
        const date = beijingTime.getDate();
        const formattedTime = `${month}月${date}日/${periodHour.toString().padStart(2, '0')}:${periodMinute.toString().padStart(2, '0')}`;
        
        return {
            startHour: periodHour,
            startMinute: periodMinute,
            formattedTime: formattedTime
        };
    }

    // 更新时段指示器
    function updatePeriodIndicator() {
        const isOvernight = isOvernightPeriod();
        const period = getCurrentHalfHourPeriod();
        
        if (periodIndicator) {
            if (isOvernight) {
                periodIndicator.textContent = `🌙 当前为通宵时段 (0:00 - 7:00) | 当前时间区间: ${period.formattedTime}`;
                periodIndicator.className = 'period-indicator overnight';
            } else {
                periodIndicator.textContent = `☀️ 当前为白天时段 (7:00 - 24:00) | 当前时间区间: ${period.formattedTime}`;
                periodIndicator.className = 'period-indicator daytime';
            }
        }
    }

    // 解析中文日期时间
    function parseChineseDateTime(dateStr) {
        // 匹配格式如 "12月20日/22:30" 或 "12月20日/22点30分"
        const match = dateStr.match(/(\d{1,2})月(\d{1,2})日[\/]?(\d{1,2})[:点](\d{1,2})分?/);
        if (!match) return null;
        
        const [, month, day, hour, minute] = match.map(Number);
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, month - 1, day, hour, minute);
    }

    // 获取服务器的时间匹配分数
    function getTimeMatchScore(server, currentPeriod) {
        const serverTime = parseChineseDateTime(server.openTime);
        if (!serverTime) return 0;
        
        // 检查服务器时间是否在当前半小时区间内
        const serverHour = serverTime.getHours();
        const serverMinute = serverTime.getMinutes();
        
        // 判断是否在同一个半小时区间
        if (serverHour === currentPeriod.startHour) {
            const serverHalfHour = serverMinute < 30 ? 0 : 30;
            if (serverHalfHour === currentPeriod.startMinute) {
                return 10; // 时间完全匹配当前半小时区间
            }
        }
        
        return 0;
    }

    // 获取推广权重
    function getPromotionWeight(server, isOvernight) {
        const promo = server.promotion;
        if (!promo) return { weight: 0, order: 999 };
        
        const type = promo.type || '';
        
        // 通宵时段
        if (isOvernight) {
            if (type.includes('通宵置顶推荐')) return { weight: 600, order: promo.order || 999 };
            if (type.includes('通宵套黄推荐')) return { weight: 500, order: promo.order || 999 };
            if (type.includes('通宵推荐')) return { weight: 400, order: promo.order || 999 };
            if (type.includes('全天置顶推荐')) return { weight: 300, order: promo.order || 999 };
            if (type.includes('全天套黄推荐')) return { weight: 200, order: promo.order || 999 };
            if (type.includes('全天推荐')) return { weight: 100, order: promo.order || 999 };
        } 
        // 白天时段
        else {
            if (type.includes('全天置顶推荐')) return { weight: 600, order: promo.order || 999 };
            if (type.includes('全天套黄推荐')) return { weight: 500, order: promo.order || 999 };
            if (type.includes('全天推荐')) return { weight: 400, order: promo.order || 999 };
            if (type.includes('通宵置顶推荐')) return { weight: 50, order: promo.order || 999 };
            if (type.includes('通宵套黄推荐')) return { weight: 40, order: promo.order || 999 };
            if (type.includes('通宵推荐')) return { weight: 30, order: promo.order || 999 };
        }
        
        return { weight: 0, order: 999 };
    }

    // 点击跳转函数
    function openServerDetail(detailUrl) {
        if (detailUrl && detailUrl !== '#') {
            window.open(detailUrl, '_blank');
        }
    }

    // 过滤和渲染服务器
    function filterAndRenderServers() {
        const isOvernight = isOvernightPeriod();
        const currentPeriod = getCurrentHalfHourPeriod();
        updatePeriodIndicator();
        
        // 过滤服务器
        let processedServers = allServers.filter(server => {
            const categoryMatch = activeCategory === '全部' || server.category.includes(activeCategory);
            return categoryMatch;
        });
        
        // 计算每个服务器的权重
        processedServers.forEach(server => {
            const promotionData = getPromotionWeight(server, isOvernight);
            const timeMatchScore = getTimeMatchScore(server, currentPeriod);
            
            // 总权重 = 推广权重 + 时间匹配分数
            server._totalWeight = promotionData.weight + timeMatchScore;
            server._promotionOrder = promotionData.order;
            server._timeMatchScore = timeMatchScore;
        });
        
        // 排序逻辑
        processedServers.sort((a, b) => {
            // 1. 按总权重降序
            if (b._totalWeight !== a._totalWeight) {
                return b._totalWeight - a._totalWeight;
            }
            
            // 2. 权重相同时，按推广顺序升序
            if (b._totalWeight > 0 && a._totalWeight > 0 && b._totalWeight === a._totalWeight) {
                return a._promotionOrder - b._promotionOrder;
            }
            
            // 3. 按时间匹配分数降序
            if (b._timeMatchScore !== a._timeMatchScore) {
                return b._timeMatchScore - a._timeMatchScore;
            }
            
            // 4. 按开放时间倒序（最新的在前）
            const timeA = parseChineseDateTime(a.openTime);
            const timeB = parseChineseDateTime(b.openTime);
            return (timeB || 0) - (timeA || 0);
        });
        
        // 只显示有推广或时间匹配的服务器
        processedServers = processedServers.filter(server => server._totalWeight > 0);
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
            if (promoType && promoType !== '') {
                rowClass += ' row-promoted';
            }
            
            // 如果时间匹配当前半小时区间，添加特殊样式
            if (server._timeMatchScore > 0) {
                rowClass += ' time-match-highlight';
            }
            
            row.className = rowClass;
            
            let promotionBadge = '';
            if (server.promotion) {
                let badgeClass = 'promotion-badge';
                if (promoType.includes('通宵')) badgeClass += ' badge-overnight';
                if (promoType.includes('全天')) badgeClass += ' badge-allday';
                promotionBadge = `<span class="${badgeClass}">${server.promotion.type}</span>`;
            }
            
            // 添加时间匹配提示
            let timeMatchBadge = '';
            if (server._timeMatchScore > 0) {
                timeMatchBadge = '<span class="promotion-badge badge-allday">当前时段推荐</span>';
            }
            
            row.innerHTML = `
                <td>
                    <div>
                        <span class="server-name" onclick="openServerDetail('${detailUrl}')">${server.name}</span>
                        ${promotionBadge}
                        ${timeMatchBadge}
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
        
        serverCount.textContent = servers.length;
    }
    
    // 将openServerDetail函数暴露给全局作用域
    window.openServerDetail = openServerDetail;
    
    sortSelect.addEventListener('change', function() {
        filterAndRenderServers();
    });
    
    // 每半小时更新一次（北京时间）
    function scheduleNextUpdate() {
        const now = getBeijingTime();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        // 计算到下一个半小时的时间
        let minutesToNextHalfHour;
        if (minutes < 30) {
            minutesToNextHalfHour = 30 - minutes;
        } else {
            minutesToNextHalfHour = 60 - minutes;
        }
        
        // 转换为毫秒
        const millisecondsToNextHalfHour = 
            (minutesToNextHalfHour * 60 - seconds) * 1000;
        
        // 设置定时器
        setTimeout(() => {
            filterAndRenderServers();
            // 设置下一次更新为30分钟后
            setInterval(filterAndRenderServers, 30 * 60 * 1000);
        }, millisecondsToNextHalfHour);
    }
    
    // 启动定时更新
    scheduleNextUpdate();
});
