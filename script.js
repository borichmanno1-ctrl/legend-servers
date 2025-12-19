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

    function isOvernightPeriod() {
        const now = new Date();
        const currentHour = now.getHours();
        return currentHour >= 0 && currentHour < 7;
    }

    function parseChineseDate(dateStr) {
        const match = dateStr.match(/(\d{1,2})月(\d{1,2})日[\/]?(\d{1,2})点(\d{1,2})分?/);
        if (!match) return null;
        const [, month, day, hour = 0, minute = 0] = match.map(Number);
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, month - 1, day, hour, minute);
    }

    // 获取当前半小时区间
    function getCurrentHalfHourSlot() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        // 计算当前属于哪个半小时区间
        let slotHour = currentHour;
        let slotMinute = currentMinute >= 30 ? 30 : 0;
        
        return { hour: slotHour, minute: slotMinute };
    }

    // 检查服务器开放时间是否在当前半小时区间内
    function isInCurrentHalfHourSlot(openTime) {
        const currentSlot = getCurrentHalfHourSlot();
        const serverTime = parseChineseDate(openTime);
        if (!serverTime) return false;
        
        // 获取服务器的小时和分钟
        const serverHour = serverTime.getHours();
        const serverMinute = serverTime.getMinutes();
        
        // 检查服务器时间是否在当前半小时区间
        const serverSlotMinute = serverMinute >= 30 ? 30 : 0;
        
        return serverHour === currentSlot.hour && serverSlotMinute === currentSlot.minute;
    }

    function getPromotionWeight(server, isOvernight) {
        const promo = server.promotion;
        const inCurrentSlot = isInCurrentHalfHourSlot(server.openTime);
        
        if (!promo) {
            // 没有推广信息的服务器，检查是否在当前半小时区间
            if (inCurrentSlot) {
                return { weight: 40, order: 999, type: 'current_slot' };
            }
            return { weight: 0, order: 999, type: 'none' };
        }

        const type = promo.type;
        const isOvernightType = type.includes('通宵');
        const isAllDayType = type.includes('全天');

        if (isOvernight) {
            if (!isOvernightType && !isAllDayType) {
                // 非通宵时段，但服务器是白天类型，检查是否在当前半小时区间
                if (inCurrentSlot) {
                    return { weight: 40, order: 999, type: 'current_slot' };
                }
                return { weight: 0, order: 999, type: 'none' };
            }
        } else {
            if (isOvernightType) {
                // 白天时段，但服务器是通宵类型，检查是否在当前半小时区间
                if (inCurrentSlot) {
                    return { weight: 40, order: 999, type: 'current_slot' };
                }
                return { weight: 0, order: 999, type: 'none' };
            }
        }

        let weight = 0;
        let promoType = type;
        
        if (isOvernight) {
            if (type.includes('通宵置顶推荐')) weight = 300;
            else if (type.includes('通宵套黄推荐')) weight = 200;
            else if (type.includes('通宵推荐')) weight = 150;
            else if (type.includes('全天置顶推荐')) weight = 100;
            else if (type.includes('全天套黄推荐')) weight = 80;
            else if (type.includes('全天推荐')) weight = 60;
        } else {
            if (type.includes('全天置顶推荐')) weight = 100;
            else if (type.includes('全天套黄推荐')) weight = 80;
            else if (type.includes('全天推荐')) weight = 60;
        }
        
        // 如果在当前半小时区间内，增加权重（但不超过置顶推荐）
        if (inCurrentSlot && weight < 100) {
            // 确保权重不会超过套黄推荐
            weight = Math.max(weight, 70);
            promoType = '当前时段推荐';
        }

        return {
            weight: weight,
            order: promo.order || 999,
            type: promoType
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

        if (periodIndicator) {
            if (isOvernight) {
                periodIndicator.textContent = '🌙 当前为通宵时段 (0:00 - 7:00)';
                periodIndicator.className = 'period-indicator overnight';
            } else {
                periodIndicator.textContent = '☀️ 当前为白天时段 (7:00 - 24:00)';
                periodIndicator.className = 'period-indicator daytime';
            }
        }

        let processedServers = allServers.filter(server => {
            const categoryMatch = activeCategory === '全部' || server.category.includes(activeCategory);
            return categoryMatch;
        });

        processedServers.forEach(server => {
            server._promotionData = getPromotionWeight(server, isOvernight);
        });

        processedServers.sort((a, b) => {
            const promoA = a._promotionData;
            const promoB = b._promotionData;

            // 首先按权重排序
            if (promoB.weight !== promoA.weight) {
                return promoB.weight - promoA.weight;
            }

            // 如果权重相同，按推广顺序排序
            if (promoB.weight > 0 && promoA.weight === promoB.weight) {
                return promoA.order - promoB.order;
            }

            // 最后按开放时间排序
            const timeA = parseChineseDate(a.openTime);
            const timeB = parseChineseDate(b.openTime);
            return (timeB || 0) - (timeA || 0);
        });

        // 只显示有推广权重或当前时段推荐的服务器
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
            if (promoType && promoType !== '') {
                rowClass += ' row-promoted';
            }

            row.className = rowClass;

            let promotionBadge = '';
            if (server._promotionData.type !== 'none') {
                let badgeClass = 'promotion-badge';
                if (server._promotionData.type.includes('通宵')) badgeClass += ' badge-overnight';
                else if (server._promotionData.type.includes('全天')) badgeClass += ' badge-allday';
                else if (server._promotionData.type.includes('当前时段')) badgeClass += ' badge-allday';
                
                promotionBadge = `<span class="${badgeClass}">${server._promotionData.type}</span>`;
            }

            // 修改这里：将服务器名和服务器IP都改为可点击的链接
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

    // 每30分钟重新检查时间区间
    setInterval(() => {
        filterAndRenderServers();
    }, 30 * 60 * 1000);
});
[file content end]
