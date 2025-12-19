[file name]: script.js
[file content begin]
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
        // 北京时间 = UTC + 8
        const beijingOffset = 8 * 60; // 分钟
        const localOffset = now.getTimezoneOffset();
        const beijingTime = new Date(now.getTime() + (beijingOffset + localOffset) * 60000);
        return beijingTime;
    }

    // 判断是否通宵时段 (0:00-7:00)
    function isOvernightPeriod() {
        const beijingTime = getBeijingTime();
        const currentHour = beijingTime.getHours();
        return currentHour >= 0 && currentHour < 7;
    }

    // 获取当前半小时区间 (如 22:30-23:00)
    function getCurrentHalfHourInterval() {
        const beijingTime = getBeijingTime();
        const currentHour = beijingTime.getHours();
        const currentMinute = beijingTime.getMinutes();
        
        // 计算当前半小时区间的开始分钟
        const halfHourStart = currentMinute >= 30 ? 30 : 0;
        
        // 计算区间开始和结束时间
        const startHour = currentHour;
        const startMinute = halfHourStart;
        
        let endHour = startHour;
        let endMinute = startMinute + 30;
        
        if (endMinute >= 60) {
            endHour = (endHour + 1) % 24;
            endMinute = endMinute - 60;
        }
        
        // 格式化时间为两位数
        const formatTime = (hour, minute) => {
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        };
        
        return {
            start: formatTime(startHour, startMinute),
            end: formatTime(endHour, endMinute)
        };
    }

    // 解析中文日期时间
    function parseChineseDate(dateStr) {
        const match = dateStr.match(/(\d{1,2})月(\d{1,2})日[\/]?(\d{1,2}):(\d{1,2})/);
        if (!match) return null;
        const [, month, day, hour = 0, minute = 0] = match.map(Number);
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, month - 1, day, hour, minute);
    }

    // 检查服务器开放时间是否在当前半小时区间
    function isInCurrentHalfHourInterval(serverOpenTime) {
        const interval = getCurrentHalfHourInterval();
        const openDate = parseChineseDate(serverOpenTime);
        if (!openDate) return false;
        
        const openHour = openDate.getHours();
        const openMinute = openDate.getMinutes();
        
        // 解析区间开始时间
        const [startHour, startMinute] = interval.start.split(':').map(Number);
        
        // 检查是否匹配当前半小时区间
        return openHour === startHour && openMinute === startMinute;
    }

    // 计算推广权重
    function getPromotionWeight(server, isOvernight) {
        const promo = server.promotion;
        if (!promo) return { weight: 0, order: 999 };

        const type = promo.type;
        const isInCurrentInterval = isInCurrentHalfHourInterval(server.openTime);
        const isOvernightType = type.includes('通宵');
        const isAllDayType = type.includes('全天');
        const isTimeSpecificType = type.includes('时间推荐');

        // 非通宵时段规则
        if (!isOvernight) {
            // 非通宵时段不显示通宵推荐
            if (isOvernightType) return { weight: 0, order: 999 };
            
            let weight = 0;
            
            // 全天置顶推荐
            if (type.includes('全天置顶推荐')) {
                weight = 1000;
            }
            // 全天套黄推荐
            else if (type.includes('全天套黄推荐')) {
                weight = 800;
            }
            // 当前时间推荐（在半小时区间内）
            else if (isInCurrentInterval && isTimeSpecificType) {
                weight = 600;
            }
            // 其他全天推荐
            else if (isAllDayType) {
                weight = 400;
            }
            
            // 如果是当前半小时区间的服务器，增加权重
            if (isInCurrentInterval) {
                weight += 50;
            }
            
            return {
                weight: weight,
                order: promo.order || 999
            };
        }
        // 通宵时段规则
        else {
            let weight = 0;
            
            // 通宵置顶推荐
            if (type.includes('通宵置顶推荐')) {
                weight = 1000;
            }
            // 通宵套黄推荐
            else if (type.includes('通宵套黄推荐')) {
                weight = 800;
            }
            // 通宵推荐
            else if (type.includes('通宵推荐')) {
                weight = 600;
            }
            // 全天置顶推荐
            else if (type.includes('全天置顶推荐')) {
                weight = 400;
            }
            // 全天套黄推荐
            else if (type.includes('全天套黄推荐')) {
                weight = 200;
            }
            // 当前时间推荐（在半小时区间内）
            else if (isInCurrentInterval && isTimeSpecificType) {
                weight = 100;
            }
            // 其他全天推荐
            else if (isAllDayType) {
                weight = 50;
            }
            
            // 如果是当前半小时区间的服务器，增加权重
            if (isInCurrentInterval) {
                weight += 50;
            }
            
            return {
                weight: weight,
                order: promo.order || 999
            };
        }
    }

    // 添加点击跳转函数
    function openServerDetail(detailUrl) {
        if (detailUrl && detailUrl !== '#') {
            window.open(detailUrl, '_blank');
        }
    }

    function filterAndRenderServers() {
        const isOvernight = isOvernightPeriod();
        const interval = getCurrentHalfHourInterval();

        // 更新时段指示器
        if (periodIndicator) {
            if (isOvernight) {
                periodIndicator.textContent = `🌙 当前为通宵时段 (0:00-7:00) | 当前半小时区间: ${interval.start}-${interval.end}`;
                periodIndicator.className = 'period-indicator overnight';
            } else {
                periodIndicator.textContent = `☀️ 当前为白天时段 (7:00-24:00) | 当前半小时区间: ${interval.start}-${interval.end}`;
                periodIndicator.className = 'period-indicator daytime';
            }
        }

        let processedServers = allServers.filter(server => {
            const categoryMatch = activeCategory === '全部' || server.category.includes(activeCategory);
            return categoryMatch;
        });

        // 计算每个服务器的权重
        processedServers.forEach(server => {
            server._promotionData = getPromotionWeight(server, isOvernight);
            server._isInCurrentInterval = isInCurrentHalfHourInterval(server.openTime);
        });

        // 过滤掉权重为0的服务器（不显示的推广）
        processedServers = processedServers.filter(server => server._promotionData.weight > 0);

        // 排序规则
        processedServers.sort((a, b) => {
            const promoA = a._promotionData;
            const promoB = b._promotionData;

            // 1. 按权重降序
            if (promoB.weight !== promoA.weight) {
                return promoB.weight - promoA.weight;
            }

            // 2. 权重相同时，按推广顺序升序
            if (promoB.weight > 0 && promoA.weight === promoB.weight) {
                return promoA.order - promoB.order;
            }

            // 3. 相同推广级别时，当前半小时区间的优先
            if (a._isInCurrentInterval && !b._isInCurrentInterval) {
                return -1;
            }
            if (!a._isInCurrentInterval && b._isInCurrentInterval) {
                return 1;
            }

            // 4. 最后按开放时间倒序（最新的在前）
            const timeA = parseChineseDate(a.openTime);
            const timeB = parseChineseDate(b.openTime);
            return (timeB || 0) - (timeA || 0);
        });

        renderTableRows(processedServers);
    }

    function renderTableRows(servers) {
        serverTableBody.innerHTML = '';
        if (servers.length === 0) {
            serverTableBody.innerHTML = '<tr><td colspan="7" class="loading">当前分类下暂无推荐服务器。</td></tr>';
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
            
            // 套黄推荐的行样式
            if (promoType.includes('套黄')) {
                rowClass = 'row-yellow-bg';
            }
            
            // 当前半小时区间的行样式（可以添加特殊样式）
            if (server._isInCurrentInterval) {
                rowClass += ' current-interval-highlight';
            }

            row.className = rowClass;

            let promotionBadge = '';
            if (server.promotion) {
                let badgeClass = 'promotion-badge';
                if (promoType.includes('通宵')) badgeClass += ' badge-overnight';
                if (promoType.includes('全天')) badgeClass += ' badge-allday';
                // 如果是当前半小时区间，添加特殊标记
                if (server._isInCurrentInterval) {
                    badgeClass += ' current-interval';
                }
                promotionBadge = `<span class="${badgeClass}">${server.promotion.type}</span>`;
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

        renderTableRows(serversToSort);
    });

    // 每5分钟检查一次时间段变化（而不是10分钟）
    setInterval(() => {
        filterAndRenderServers();
    }, 5 * 60 * 1000);
    
    // 每半小时触发一次重新排序（针对半小时区间变化）
    setInterval(() => {
        filterAndRenderServers();
    }, 30 * 60 * 1000);
});
[file content end]
