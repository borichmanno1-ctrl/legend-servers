document.addEventListener('DOMContentLoaded', function() {
    const serverTableBody = document.getElementById('serverTableBody');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortSelect = document.getElementById('sortSelect');
    const serverCount = document.getElementById('serverCount');
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    const currentYear = document.getElementById('currentYear');
    const periodIndicator = document.getElementById('periodIndicator');
    const siteLogo = document.querySelector('.site-logo');

    let allServers = [];
    let activeCategory = '全部';

    currentYear.textContent = new Date().getFullYear();
    lastUpdateTime.textContent = new Date().toLocaleDateString('zh-CN') + ' ' + new Date().toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'});

    // 模拟一个logo图片，实际使用时替换为真实的logo.jpg
    if (siteLogo) {
        siteLogo.onerror = function() {
            this.style.display = 'none';
            const siteTitle = document.querySelector('.site-title');
            if (siteTitle) {
                siteTitle.style.display = 'block';
                siteTitle.textContent = 'JJJ传奇发布网';
            }
        };
        
        // 如果logo不存在，直接显示标题
        if (!siteLogo.complete || siteLogo.naturalWidth === 0) {
            const siteTitle = document.querySelector('.site-title');
            if (siteTitle) {
                siteTitle.style.display = 'block';
                siteTitle.textContent = 'JJJ传奇发布网';
            }
        }
    }

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allServers = data.servers;
            serverCount.textContent = allServers.length;
            generateCategoryButtons(data.categories);
            filterAndRenderServers();
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            serverTableBody.innerHTML = '<tr><td colspan="7" style="color:#ff6666;padding:20px;text-align:center;">数据加载失败，请刷新页面重试</td></tr>';
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
        const hour = beijingTime.getUTCHours();
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
        
        serverCount.textContent = servers.length;
    }
    
    // 将openServerDetail函数暴露给全局作用域
    window.openServerDetail = openServerDetail;
    
    sortSelect.addEventListener('change', function() {
        const sortValue = this.value;
        let serversToSort = Array.from(serverTableBody.querySelectorAll('tr'))
            .map(row => {
                const nameCell = row.querySelector('.server-name');
                if (!nameCell) return null;
                const badge = nameCell.querySelector('.promotion-badge');
                let originalName = nameCell.textContent;
                if (badge) originalName = originalName.replace(badge.textContent, '').trim();
                return allServers.find(s => s.name === originalName);
            })
            .filter(s => s);
        
        if (sortValue === 'time-desc') {
            serversToSort.sort((a, b) => (parseChineseDate(b.openTime) || 0) - (parseChineseDate(a.openTime) || 0));
        } else if (sortValue === 'time-asc') {
            serversToSort.sort((a, b) => (parseChineseDate(a.openTime) || 0) - (parseChineseDate(b.openTime) || 0));
        } else if (sortValue === 'name-asc') {
            serversToSort.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        }
        
        // 重新计算权重和排序
        const isOvernight = isOvernightPeriod();
        serversToSort.forEach(server => {
            server._promotionData = getPromotionWeight(server, isOvernight);
            server._isInCurrentSlot = isInCurrentTimeSlot(server);
        });
        
        // 按照优先级排序
        serversToSort.sort((a, b) => {
            const promoA = a._promotionData;
            const promoB = b._promotionData;
            
            if (promoB.weight !== promoA.weight) {
                return promoB.weight - promoA.weight;
            }
            
            if (promoB.weight > 0 && promoA.weight === promoB.weight) {
                return promoA.order - promoB.order;
            }
            
            const timeA = parseChineseDate(a.openTime);
            const timeB = parseChineseDate(b.openTime);
            return (timeB || 0) - (timeA || 0);
        });
        
        renderTableRows(serversToSort);
    });
    
    // 每30秒检查一次时间，更新显示
    setInterval(() => {
        filterAndRenderServers();
    }, 30 * 1000);
});
