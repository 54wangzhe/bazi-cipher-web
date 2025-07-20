// script.js
// 加密器核心类
class DotCipher {
    constructor() {
        this.BASE_CHARS = ["点", "击", "输", "入", "文", "本", "，", "。"];
        this.encoding_map = {};
        this.decoding_map = {};

        // 创建编码映射
        for (let i = 0; i < this.BASE_CHARS.length; i++) {
            this.encoding_map[i] = this.BASE_CHARS[i];
            this.decoding_map[this.BASE_CHARS[i]] = i;
        }
    }

    encrypt(text) {
        const byteData = new TextEncoder().encode(text);
        const encrypted = [];

        for (const byte of byteData) {
            const parts = [
                (byte >> 5) & 0x07,
                (byte >> 2) & 0x07,
                (byte & 0x03) << 1
            ];

            for (const p of parts) {
                encrypted.push(this.encoding_map[p]);
            }
        }

        return encrypted.join('');
    }

    decrypt(cipherText) {
        if (cipherText.length % 3 !== 0) {
            throw new Error("加密文本长度必须是3的倍数");
        }

        const byteList = [];

        for (let i = 0; i < cipherText.length; i += 3) {
            const chars = cipherText.slice(i, i + 3);

            for (const c of chars) {
                if (!(c in this.decoding_map)) {
                    throw new Error("包含无效字符");
                }
            }

            const parts = [
                this.decoding_map[chars[0]],
                this.decoding_map[chars[1]],
                this.decoding_map[chars[2]] >> 1  // 移除填充位
            ];

            const byteVal = (parts[0] << 5) | (parts[1] << 2) | parts[2];
            byteList.push(byteVal);
        }

        return new TextDecoder().decode(new Uint8Array(byteList));
    }
}

// 历史记录类
class HistoryEntry {
    constructor(operation, original, result) {
        this.timestamp = new Date();
        this.operation = operation;
        this.original = original;
        this.result = result;
        this.id = Math.random().toString(36).substr(2, 9); // 生成唯一ID
    }

    toObject() {
        return {
            id: this.id,
            timestamp: this.timestamp.toISOString(),
            operation: this.operation,
            original: this.original,
            result: this.result
        };
    }

    static fromObject(data) {
        const entry = new HistoryEntry(data.operation, data.original, data.result);
        entry.timestamp = new Date(data.timestamp);
        entry.id = data.id;
        return entry;
    }
}

// 应用类
class BaziCipherApp {
    constructor() {
        this.cipher = new DotCipher();
        this.history = [];
        this.selectedHistoryId = null;
        this.historyVisible = true;

        // 初始化DOM元素引用
        this.dom = {
            inputText: document.getElementById('input-text'),
            resultText: document.getElementById('result-text'),
            encryptBtn: document.getElementById('encrypt-btn'),
            decryptBtn: document.getElementById('decrypt-btn'),
            clearBtn: document.getElementById('clear-btn'),
            copyBtn: document.getElementById('copy-btn'),
            viewDetailBtn: document.getElementById('view-detail-btn'),
            deleteSelectedBtn: document.getElementById('delete-selected-btn'),
            exportBtn: document.getElementById('export-btn'),
            clearHistoryBtn: document.getElementById('clear-history-btn'),
            historyBody: document.getElementById('history-body'),
            status: document.getElementById('status'),
            detailModal: document.getElementById('detail-modal'),
            closeDetailBtn: document.getElementById('close-detail-btn'),
            detailTime: document.getElementById('detail-time'),
            detailOperation: document.getElementById('detail-operation'),
            detailOriginal: document.getElementById('detail-original'),
            detailResult: document.getElementById('detail-result'),
            notification: document.getElementById('notification'),
            historyPanel: document.getElementById('history-panel'),
            toggleHistoryBtn: document.getElementById('toggle-history-btn')
        };

        // 初始化事件监听器
        this.initEventListeners();

        // 加载历史记录
        this.loadHistory();

        // 检查屏幕高度，决定是否默认显示历史面板
        if (window.innerHeight <= 600) {
            this.toggleHistoryPanel(); // 小屏幕默认隐藏历史
        }
    }

    initEventListeners() {
        // 绑定按钮事件
        this.dom.encryptBtn.addEventListener('click', () => this.encryptAction());
        this.dom.decryptBtn.addEventListener('click', () => this.decryptAction());
        this.dom.clearBtn.addEventListener('click', () => this.clearAction());
        this.dom.copyBtn.addEventListener('click', () => this.copyResult());
        this.dom.viewDetailBtn.addEventListener('click', () => this.viewHistoryDetail());
        this.dom.deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedHistory());
        this.dom.exportBtn.addEventListener('click', () => this.exportHistory());
        this.dom.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.dom.closeDetailBtn.addEventListener('click', () => this.closeDetailModal());
        this.dom.toggleHistoryBtn.addEventListener('click', () => this.toggleHistoryPanel());

        // 点击模态框外部关闭
        this.dom.detailModal.addEventListener('click', (e) => {
            if (e.target === this.dom.detailModal) {
                this.closeDetailModal();
            }
        });

        // 绑定键盘事件
        this.dom.inputText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.encryptAction();
            }
        });

        // 绑定历史记录点击事件（委托）
        this.dom.historyBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row) {
                // 移除之前选中的样式
                document.querySelectorAll('.history-table tr.selected').forEach(el => {
                    el.classList.remove('selected');
                });

                // 添加当前选中样式
                row.classList.add('selected');

                // 保存选中ID
                this.selectedHistoryId = row.dataset.id;
            }
        });

        // 移动端触摸反馈
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {
                button.style.transform = 'scale(0.95)';
            });

            button.addEventListener('touchend', () => {
                button.style.transform = 'scale(1)';
            });

            button.addEventListener('touchcancel', () => {
                button.style.transform = 'scale(1)';
            });
        });
    }

    showNotification(message, type = 'success') {
        const notification = this.dom.notification;
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    toggleHistoryPanel() {
        this.historyVisible = !this.historyVisible;
        if (this.historyVisible) {
            this.dom.historyPanel.style.display = 'block';
            this.dom.toggleHistoryBtn.innerHTML = '<span>⇧</span>';
        } else {
            this.dom.historyPanel.style.display = 'none';
            this.dom.toggleHistoryBtn.innerHTML = '<span>📜</span>';
        }
    }

    encryptAction() {
        const text = this.dom.inputText.value.trim();
        if (!text) {
            this.showNotification('请输入要加密的内容', 'warning');
            return;
        }

        try {
            const encrypted = this.cipher.encrypt(text);
            this.dom.resultText.value = encrypted;
            this.dom.status.textContent = `加密成功 | 原始长度: ${text.length} 加密长度: ${encrypted.length}`;

            // 添加到历史记录
            this.addHistory('加密', text, encrypted);

            this.showNotification('加密成功');
        } catch (e) {
            this.showNotification(`加密失败: ${e.message}`, 'error');
        }
    }

    decryptAction() {
        const text = this.dom.inputText.value.trim();
        if (!text) {
            this.showNotification('请输入要解密的内容', 'warning');
            return;
        }

        try {
            const decrypted = this.cipher.decrypt(text);
            this.dom.resultText.value = decrypted;
            this.dom.status.textContent = `解密成功 | 加密长度: ${text.length} 原始长度: ${decrypted.length}`;

            // 添加到历史记录
            this.addHistory('解密', text, decrypted);

            this.showNotification('解密成功');
        } catch (e) {
            this.showNotification(`解密失败: ${e.message}`, 'error');
        }
    }

    clearAction() {
        this.dom.inputText.value = '';
        this.dom.resultText.value = '';
        this.dom.status.textContent = '已清空输入和结果';
        this.dom.inputText.focus();
    }

    copyResult() {
        const result = this.dom.resultText.value.trim();
        if (result) {
            navigator.clipboard.writeText(result)
               .then(() => {
                    this.showNotification('结果已复制到剪贴板');
                    this.dom.status.textContent = '结果已复制到剪贴板';
                })
               .catch(err => {
                    // 兼容不支持clipboard API的浏览器
                    this.dom.resultText.select();
                    document.execCommand('copy');
                    this.showNotification('结果已复制到剪贴板');
                    this.dom.status.textContent = '结果已复制到剪贴板';
                });
        } else {
            this.showNotification('没有可复制的内容', 'warning');
        }
    }

    addHistory(operation, original, result) {
        const entry = new HistoryEntry(operation, original, result);
        this.history.push(entry);
        this.saveHistory();
        this.refreshHistoryTree();
    }

    refreshHistoryTree() {
        this.dom.historyBody.innerHTML = '';

        // 倒序显示，最新的在前面
        const reversedHistory = [...this.history].reverse();

        for (const entry of reversedHistory) {
            // 截断过长的文本
            const origDisplay = entry.original.length > 30 ?
                entry.original.substring(0, 27) + '...' : entry.original;
            const resultDisplay = entry.result.length > 30 ?
                entry.result.substring(0, 27) + '...' : entry.result;

            const row = document.createElement('tr');
            row.dataset.id = entry.id;
            row.innerHTML = `
                <td>${entry.timestamp.toLocaleString()}</td>
                <td>${entry.operation}</td>
                <td>${origDisplay}</td>
                <td>${resultDisplay}</td>
            `;

            this.dom.historyBody.appendChild(row);
        }
    }

    viewHistoryDetail() {
        if (!this.selectedHistoryId) {
            this.showNotification('请先选择历史记录', 'warning');
            return;
        }

        const entry = this.history.find(e => e.id === this.selectedHistoryId);
        if (!entry) return;

        this.dom.detailTime.textContent = entry.timestamp.toLocaleString();
        this.dom.detailOperation.textContent = entry.operation;
        this.dom.detailOriginal.textContent = entry.original;
        this.dom.detailResult.textContent = entry.result;

        this.dom.detailModal.style.display = 'flex';
    }

    closeDetailModal() {
        this.dom.detailModal.style.display = 'none';
    }

    deleteSelectedHistory() {
        if (!this.selectedHistoryId) {
            this.showNotification('请先选择要删除的历史记录', 'warning');
            return;
        }

        if (confirm('确定要删除选中的历史记录吗？')) {
            this.history = this.history.filter(e => e.id !== this.selectedHistoryId);
            this.saveHistory();
            this.refreshHistoryTree();
            this.selectedHistoryId = null;
            this.dom.status.textContent = '已删除选中的历史记录';
            this.showNotification('历史记录已删除');
        }
    }

    clearHistory() {
        if (this.history.length === 0) {
            this.dom.status.textContent = '历史记录已为空';
            return;
        }

        if (confirm('确定要清空所有历史记录吗？')) {
            this.history = [];
            this.saveHistory();
            this.refreshHistoryTree();
            this.selectedHistoryId = null;
            this.dom.status.textContent = '历史记录已清空';
            this.showNotification('历史记录已清空');
        }
    }

    exportHistory() {
        if (this.history.length === 0) {
            this.showNotification('没有可导出的历史记录', 'warning');
            return;
        }

        let content = `八字神人加密器历史记录 (${new Date().toLocaleDateString()})\n\n`;

        for (const entry of this.history) {
            content += `时间: ${entry.timestamp.toLocaleString()}\n`;
            content += `操作: ${entry.operation}\n`;
            content += `原始内容: ${entry.original}\n`;
            content += `结果: ${entry.result}\n`;
            content += '-'.repeat(50) + '\n';
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `八字神人加密器历史记录_${new Date().toISOString().slice(0,10)}.txt`;
        link.click();

        this.showNotification('历史记录已导出');
    }

    saveHistory() {
        const historyData = this.history.map(entry => entry.toObject());
        localStorage.setItem('baziCipherHistory', JSON.stringify(historyData));
    }

    loadHistory() {
        const historyData = localStorage.getItem('baziCipherHistory');
        if (historyData) {
            try {
                const parsedData = JSON.parse(historyData);
                this.history = parsedData.map(data => HistoryEntry.fromObject(data));
                this.refreshHistoryTree();
            } catch (e) {
                console.error('加载历史记录失败:', e);
                this.history = [];
            }
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', function () {
    const app = new BaziCipherApp();
});