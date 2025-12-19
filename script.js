document.addEventListener('DOMContentLoaded', function() {
    const serverTableBody = document.getElementById('serverTableBody');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortSelect = document.getElementById('sortSelect');
    const serverCount = document.getElementById('serverCount');
    const lastUpdateTime = document.getElementById('lastUpdateTime');
    const currentYear = document.getElementById('currentYear');
    const periodIndicator = document.getElementById('periodIndicator'); // 新增：时段提示元素

    let allServers = [];
    let filteredServers = [];
    let activeCategory = '全部';

    // 1. 初始化
    currentYear.textContent = new Date().getFullYear();
    lastUpdateTime.textContent = new Date().toLocaleDateString('zh-CN');

    // 2. 加载数据
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allServers = data.servers;
            serverCount.textContent = allServers.length;
            generateCategoryButtons(data.categories);
            // 首次渲染
            filterAndRenderServers();
        })
        .catch(error => {
            console.error('加载数据失败:', error);
            serverTableBody.innerHTML = '<tr><td colspan="8" style="color:red;">数据加载失败，请检查data.json文件。</td></tr>';
        });

    // 3. 生成分类按钮
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

    // 4. 核心：判断当前是否属于“通宵时段”（0点到7点）
    function isOvernightPeriod() {
        const now = new Date();
        const currentHour = now.getHours();
        return currentHour >= 0 && currentHour < 7; // 0点至7点
    }

    // 5. 核心：解析中文日期并判断是否过期（24小时有效期）
    function parseChineseDate(dateStr) {
        const match = dateStr.match(/(\d{1,2})月(\d{1,2})日[\/]?(\d{1,2})点(\d{1,2})分?/);
        if (!match) return null;
        const [, month, day, hour = 0, minute = 0] = match.map(Number);
        const currentYear = new Date().getFullYear();
        return new Date(currentYear, month - 1, day, hour, minute);
    }
    function isServerExpired(server) {
        const serverTime = parseChineseDate(server.openTime);
        if (!serverTime) return false;
        const expireTime = new Date(serverTime.getTime() + 24 * 60 * 60 * 1000);
        return expireTime < new Date();
    }

    // 6. 核心：推荐类型判断与权重计算（根据你的要求修正）
    function getPromotionWeight(server, isOvernight) {
        const promo = server.promotion;
        if (!promo) return { weight: 0, order: 999 }; // 无推广权重最低，order设大值

        const type = promo.type;
        const isOvernightType = type.includes('通宵');
        const isAllDayType = type.includes('全天');

        /* === 关键修正逻辑 === */
        if (isOvernight) {
            // 通宵时段：展示“通宵XX”和“全天XX”
            if (!isOvernightType && !isAllDayType) return { weight: 0, order: 999 };
        } else {
            // 白天时段：只展示“全天XX”，不展示“通宵XX”
            if (isOvernightType) return { weight: 0, order: 999 };
        }

        // 定义权重（数值越大，排序越靠前）
        // 通宵时段的“通宵类”权重要高于“全天类”，以实现通宵在上
        let weight = 0;
        if (isOvernight) {
            if (type.includes('通宵置顶推荐')) weight = 300;
            else if (type.includes('通宵套黄推荐')) weight = 200;
            else if (type.includes('通宵推荐')) weight = 150;
            else if (type.includes('全天置顶推荐')) weight = 100; // 全天置顶在通宵时段排在后面
            else if (type.includes('全天套黄推荐')) weight = 80;
            else if (type.includes('全天推荐')) weight = 60;
        } else {
            // 白天时段：全天类推荐权重
            if (type.includes('全天置顶推荐')) weight = 100;
            else if (type.includes('全天套黄推荐')) weight = 80;
            else if (type.includes('全天推荐')) weight = 60;
            // 通宵类在白天权重为0，上面已排除
        }

        return {
            weight: weight,
            order: promo.order || 999 // 仅对置顶推荐有效，其他类型order忽略
        };
    }

    // 7. 核心：综合过滤、排序与渲染入口函数
    function filterAndRenderServers() {
        const now = new Date();
        const isOvernight = isOvernightPeriod();

        // 更新时段提示
        if (periodIndicator) {
            if (isOvernight) {
                periodIndicator.style.display = 'block';
                periodIndicator.textContent = '🌙 当前为通宵时段 (0:00 - 7:00)：显示通宵推荐与全天推荐';
                periodIndicator.className = 'period-indicator overnight';
            } else {
                periodIndicator.style.display = 'block';
                periodIndicator.textContent = '☀️ 当前为白天时段 (7:00 - 24:00)：显示全天推荐';
                periodIndicator.className = 'period-indicator daytime';
            }
        }

        // 步骤1: 基础筛选（分类 + 未过期）
        let processedServers = allServers.filter(server => {
            // 分类筛选
            const categoryMatch = activeCategory === '全部' || server.category.includes(activeCategory);
            // 过期筛选
            const notExpired = !isServerExpired(server);
            return categoryMatch && notExpired;
        });

        // 步骤2: 为每个服务器计算推荐权重
        processedServers.forEach(server => {
            server._promotionData = getPromotionWeight(server, isOvernight);
        });

        // 步骤3: 复杂排序（推荐权重 > 置顶内部顺序 > 开放时间倒序）
        processedServers.sort((a, b) => {
            const promoA = a._promotionData;
            const promoB = b._promotionData;

            // 1. 按推荐权重降序（核心）
            if (promoB.weight !== promoA.weight) {
                return promoB.weight - promoA.weight;
            }

            // 2. 权重相同时（如同为“全天置顶推荐”），按order升序（order越小越靠前）
            if (promoB.weight > 0 && promoA.weight === promoB.weight) {
                return promoA.order - promoB.order;
            }

            // 3. 非推荐服务器或同权重的非置顶服务器，按开放时间倒序（最新的在前）
            const timeA = parseChineseDate(a.openTime);
            const timeB = parseChineseDate(b.openTime);
            return (timeB || 0) - (timeA || 0);
        });

        // 步骤4: 移除被过滤掉的数据（权重为0）
        processedServers = processedServers.filter(server => server._promotionData.weight > 0);

        // 步骤5: 渲染
        renderTableRows(processedServers);
    }

    // 8. 渲染表格行
    function renderTableRows(servers) {
        serverTableBody.innerHTML = '';
        if (servers.length === 0) {
            serverTableBody.innerHTML = '<tr><td colspan="8" class="loading">当前分类下暂无开服信息。</td></tr>';
            return;
        }

        servers.forEach(server => {
            const row = document.createElement('tr');
            let tagsHtml = '';
            if (server.new) tagsHtml += '<span class="tag new">新服</span>';
            if (server.hot) tagsHtml += '<span class="tag hot">火爆</span>';

            const detailUrl = server.detailUrl || '#';

            // 根据推荐类型添加特殊CSS类
            let rowClass = '';
            const promoType = server.promotion?.type || '';
            if (promoType.includes('套黄')) {
                rowClass = 'row-yellow-bg';
            }
            if (promoType && promoType !== '') {
                rowClass += ' row-promoted';
                if (promoType.includes('置顶')) {
                    rowClass += ' row-sticky';
                }
            }

            row.className = rowClass;

            // 添加推荐角标
            let promotionBadge = '';
            if (server.promotion) {
                let badgeClass = 'promotion-badge';
                if (promoType.includes('通宵')) badgeClass += ' badge-overnight';
                if (promoType.includes('全天')) badgeClass += ' badge-allday';
                promotionBadge = `<span class="${badgeClass}">${server.promotion.type}</span>`;
            }

            row.innerHTML = `
                <td>
                    <div class="server-name">${server.name} ${promotionBadge}</div>
                    <div class="server-tags">${tagsHtml}</div>
                </td>
                <td>${server.ip}</td>
                <td>${server.openTime}</td>
                <td>${server.line}</td>
                <td>${server.version}</td>
                <td>${server.qq}</td>
                <td class="server-feature">${server.feature}</td>
                <td><button class="btn-detail" onclick="window.open('${detailUrl}', '_blank')">点击查看</button></td>
            `;
            serverTableBody.appendChild(row);
        });

        // 更新计数显示
        document.getElementById('serverCount').textContent = servers.length;
    }

    // 9. 监听排序下拉框变化
    sortSelect.addEventListener('change', function() {
        // 当用户选择非默认排序时，临时取消推荐排序，按选择排序
        const sortValue = this.value;
        let serversToSort = Array.from(serverTableBody.querySelectorAll('tr'))
            .map(row => {
                const nameCell = row.querySelector('.server-name');
                if (!nameCell) return null;
                // 移除角标文本获取原始服务器名
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

        renderTableRows(serversToSort, isOvernightPeriod());
    });

    // 10. 每10分钟检查一次时段是否变化（从通宵变白天或反之）
    setInterval(() => {
        filterAndRenderServers();
    }, 10 * 60 * 1000);
});