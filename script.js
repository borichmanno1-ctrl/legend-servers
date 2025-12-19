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
            // 添加窗口大小变化监听
            window.addEventListener('resize', handleResize);
            handleResize(); // 初始执行一次
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            serverTableBody.innerHTML = '<tr><td colspan="7" style="color:red;font-size:0.7rem;">数据加载失败</td></tr>';
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

    // 处理窗口大小变化
    function handleResize() {
        const isMobile = window.innerWidth <= 480;
        const serverNames = document.querySelectorAll('.server-name');
        
        if (isMobile) {
            // 在超小屏幕上截断过长的服务器名
            serverNames.forEach(name => {
                const originalText = name.textContent.replace(/[\s\uFEFF\xA0]+/g, ' ').trim();
                if (originalText.length > 8) {
                    name.textContent = originalText.substring(0, 6) + '...';
                }
            });
        }
    }

    function filterAndRenderServers() {
        const isOvernight = isOvernightPeriod();

        if (periodIndicator) {
            if (isOvernight) {
                periodIndicator.textContent = '🌙 通宵时段 (0-7点)';
                periodIndicator.className = 'period-indicator overnight';
            } else {
                periodIndicator.textContent = '☀️ 白天时段 (7-24点)';
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
                
                // 简化推广标签文本
                let badgeText = promoType;
                if (window.innerWidth <= 480) {
                    if (promoType.includes('置顶')) badgeText = '置顶';
                    else if (promoType.includes('套黄')) badgeText = '套黄';
                    else if (promoType.includes('通宵')) badgeText = '夜';
                    else if (promoType.includes('全天')) badgeText = '日';
                }
                promotionBadge = `<span class="${badgeClass}">${badgeText}</span>`;
            }

            // 创建特色信息的简化和完整版本
            let featureFull = server.feature;
            let featureShort = server.feature;
            if (featureFull.length > 8) {
                featureShort = featureFull.substring(0, 6) + '...';
            }

            // 修改这里：将服务器名和服务器IP都改为可点击的链接
            row.innerHTML = `
                <td>
                    <div>
                        <span class="server-name" onclick="openServerDetail('${detailUrl}')" title="${server.name}">${server.name}</span>
                        ${promotionBadge}
                    </div>
                    <div class="server-tags">${tagsHtml}</div>
                </td>
                <td><span class="server-ip" onclick="openServerDetail('${detailUrl}')" title="${server.ip}">${server.ip}</span></td>
                <td>${server.openTime}</td>
                <td>${server.version}</td>
                <td>${server.qq}</td>
                <td class="server-feature" title="${featureFull}">
                    ${featureFull}
                    <span class="server-feature short">${featureShort}</span>
                </td>
                <td><button class="btn-detail" onclick="openServerDetail('${detailUrl}')">进入</button></td>
            `;
            serverTableBody.appendChild(row);
        });

        serverCount.textContent = servers.length;
        
        // 重新计算并应用响应式样式
        setTimeout(handleResize, 0);
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

    setInterval(() => {
        filterAndRenderServers();
    }, 10 * 60 * 1000);
});
