document.addEventListener('DOMContentLoaded', function() {
    const serverTableBody = document.getElementById('serverTableBody');
    const mobileServersContainer = document.createElement('div');
    mobileServersContainer.className = 'mobile-servers';
    const mainContent = document.querySelector('.main-content');
    
    // 将移动端容器插入到表格后面
    if (mainContent && mainContent.querySelector('.table-wrapper')) {
        mainContent.insertBefore(mobileServersContainer, mainContent.querySelector('.table-wrapper').nextSibling);
    }
    
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
            mobileServersContainer.innerHTML = '<div class="loading">数据加载失败</div>';
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

    function getPromotionWeight(server, isOvernight) {
        const promo = server.promotion;
        if (!promo) return { weight: 0, order: 999 };

        const type = promo.type;
        const isOvernightType = type.includes('通宵');
        const isAllDayType = type.includes('全天');

        if (isOvernight) {
            if (!isOvernightType && !isAllDayType) return { weight: 0, order: 999 };
        } else {
            if (isOvernightType) return { weight: 0, order: 999 };
        }

        let weight = 0;
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

        return {
            weight: weight,
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

        processedServers = processedServers.filter(server => server._promotionData.weight > 0);
        renderTableRows(processedServers);
        renderMobileCards(processedServers); // 新增：渲染移动端卡片
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
            if (server.promotion) {
                let badgeClass = 'promotion-badge';
                if (promoType.includes('通宵')) badgeClass += ' badge-overnight';
                if (promoType.includes('全天')) badgeClass += ' badge-allday';
                promotionBadge = `<span class="${badgeClass}">${server.promotion.type}</span>`;
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
    
    // 新增：渲染移动端卡片
    function renderMobileCards(servers) {
        mobileServersContainer.innerHTML = '';
        
        if (servers.length === 0) {
            mobileServersContainer.innerHTML = '<div class="loading">当前分类下暂无开服信息。</div>';
            return;
        }
        
        servers.forEach(server => {
            const card = document.createElement('div');
            card.className = 'mobile-server-card';
            
            // 添加特殊样式类
            const promoType = server.promotion?.type || '';
            if (promoType.includes('套黄')) {
                card.classList.add('row-yellow-bg');
            }
            
            let tagsHtml = '';
            if (server.new) tagsHtml += '<span class="mobile-tag new">新服</span>';
            if (server.hot) tagsHtml += '<span class="mobile-tag hot">火爆</span>';
            
            const detailUrl = server.detailUrl || '#';
            
            let promotionBadge = '';
            if (server.promotion) {
                let badgeClass = 'mobile-promotion-badge';
                if (promoType.includes('通宵')) badgeClass += ' badge-overnight';
                if (promoType.includes('全天')) badgeClass += ' badge-allday';
                promotionBadge = `<span class="${badgeClass}">${server.promotion.type}</span>`;
            }
            
            card.innerHTML = `
                <div class="mobile-card-header">
                    <div>
                        <div class="mobile-server-name" onclick="openServerDetail('${detailUrl}')">${server.name}</div>
                        <div class="mobile-server-tags">${tagsHtml}</div>
                    </div>
                    ${promotionBadge}
                </div>
                
                <div class="mobile-card-info">
                    <div class="mobile-info-row">
                        <div class="mobile-info-label">服务器IP:</div>
                        <div class="mobile-info-value mobile-ip-value" onclick="openServerDetail('${detailUrl}')">${server.ip}</div>
                    </div>
                    <div class="mobile-info-row">
                        <div class="mobile-info-label">开放时间:</div>
                        <div class="mobile-info-value">${server.openTime}</div>
                    </div>
                    <div class="mobile-info-row">
                        <div class="mobile-info-label">版本介绍:</div>
                        <div class="mobile-info-value">${server.version}</div>
                    </div>
                    <div class="mobile-info-row">
                        <div class="mobile-info-label">客服QQ:</div>
                        <div class="mobile-info-value">${server.qq}</div>
                    </div>
                    <div class="mobile-info-row">
                        <div class="mobile-info-label">特色备注:</div>
                        <div class="mobile-info-value">${server.feature}</div>
                    </div>
                </div>
                
                <div class="mobile-card-footer">
                    <button class="mobile-btn-detail" onclick="openServerDetail('${detailUrl}')">点击查看</button>
                </div>
            `;
            
            mobileServersContainer.appendChild(card);
        });
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
        renderMobileCards(serversToSort); // 同步更新移动端卡片
    });

    setInterval(() => {
        filterAndRenderServers();
    }, 10 * 60 * 1000);
});
