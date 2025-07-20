// script.js
// 加密器接口
class EncryptionAlgorithm {
    encrypt(text) {
        throw new Error("子类必须实现encrypt方法");
    }
    
    decrypt(text) {
        throw new Error("子类必须实现decrypt方法");
    }
    
    getName() {
        throw new Error("子类必须实现getName方法");
    }
}

// 点字加密算法
class DotCipher extends EncryptionAlgorithm {
    constructor() {
        super();
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
    
    getName() {
        return "点字加密";
    }
}

// 反转加密算法
class ReverseCipher extends EncryptionAlgorithm {
    encrypt(text) {
        return text.split('').reverse().join('');
    }
    
    decrypt(text) {
        return this.encrypt(text); // 反转加密的解密就是再次反转
    }
    
    getName() {
        return "反转加密";
    }
}

// 凯撒密码算法
class CaesarCipher extends EncryptionAlgorithm {
    constructor(shift = 3) {
        super();
        this.shift = shift;
    }
    
    setShift(shift) {
        this.shift = shift;
    }
    
    encrypt(text) {
        return text.replace(/[a-zA-Z]/g, char => {
            const code = char.charCodeAt(0);
            const base = code >= 65 && code <= 90 ? 65 : 97;
            return String.fromCharCode(((code - base + this.shift) % 26) + base);
        });
    }
    
    decrypt(text) {
        return text.replace(/[a-zA-Z]/g, char => {
            const code = char.charCodeAt(0);
            const base = code >= 65 && code <= 90 ? 65 : 97;
            return String.fromCharCode(((code - base - this.shift + 26) % 26) + base);
        });
    }
    
    getName() {
        return `凯撒密码(位移:${this.shift})`;
    }
}

// 历史记录类
class HistoryEntry {
    constructor(operation, algorithm, original, result) {
        this.timestamp = new Date();
        this.operation = operation;
        this.algorithm = algorithm;
        this.original = original;
        this.result = result;
        this.id = Math.random().toString(36).substr(2, 9); // 生成唯一ID
    }

    toObject() {
        return {
            id: this.id,
            timestamp: this.timestamp.toISOString(),
            operation: this.operation,
            algorithm: this.algorithm,
            original: this.original,
            result: this.result
        };
    }

    static fromObject(data) {
        const entry = new HistoryEntry(data.operation, data.algorithm, data.original, data.result);
        entry.timestamp = new Date(data.timestamp);
        entry.id = data.id;
        return entry;
    }
}

// 应用类
class BaziCipherApp {
    constructor() {
        this.algorithms = {
            dot: new DotCipher(),
            reverse: new ReverseCipher(),
            caesar: new CaesarCipher()
        };
        
        this.currentAlgorithm = 'dot';
        this.history = [];
        this.selectedHistoryId = null;
        this.historyVisible = true;
        this.version = 'v9.1';

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
            detailAlgorithm: document.getElementById('detail-algorithm'),
            detailOriginal: document.getElementById('detail-original'),
            detailResult: document.getElementById('detail-result'),
            notification: document.getElementById('notification'),
            historyPanel: document.getElementById('history-panel'),
            toggleHistoryBtn: document.getElementById('toggle-history-btn'),
            algorithmSelect: document.getElementById('algorithm-select'),
            caesarShift: document.getElementById('caesar-shift'),
            shiftValue: document.getElementById('shift-value'),
            resultLoading: document.getElementById('result-loading')
        };

        // 初始化事件监听器
        this.initEventListeners();

        // 加载历史记录
        this.loadHistory();

        // 检查屏幕高度，决定是否默认显示历史面板
        if (window.innerHeight <= 600) {
            this.toggleHistoryPanel(); // 小屏幕默认隐藏历史
        }

        // 初始化算法选择器
        this.initAlgorithmSelector();
    }

    initEventListeners() {
        // 绑定按钮事件
        this.dom.encryptBtn.addEventListener('click', () => this.performAction('encrypt'));
        this.dom.decryptBtn.addEventListener('click', () => this.performAction('decrypt'));
        this.dom.clearBtn.addEventListener('click', () => this.clearAction());
        this.dom.copyBtn.addEventListener('click', () => this.copyResult());
        this.dom.viewDetailBtn.addEventListener('click', () => this.viewHistoryDetail());
        this.dom.deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedHistory());
        this.dom.exportBtn.addEventListener('click', () => this.exportHistory());
        this.dom.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
        this.dom.closeDetailBtn.addEventListener('click', () => this.closeDetailModal());
        this.dom.toggleHistoryBtn.addEventListener('click', () => this.toggleHistoryPanel());
        this.dom.sortBtn.addEventListener('click', () => this.sortHistory());

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
                this.performAction('encrypt');
            }
        });

        // 绑定历史记录点击事件（委托）
        this.dom.historyBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (row) {
                // 添加选中动画
                this.animateSelectedRow(row);
                
                // 保存选中ID
                this.selectedHistoryId = row.dataset.id;
            }
        });

        // 移动端触摸反馈
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {
                button.classList.add('active');
            });

            button.addEventListener('touchend', () => {
                button.classList.remove('active');
            });

            button.addEventListener('touchcancel', () => {
                button.classList.remove('active');
            });
        });
    }

    initAlgorithmSelector() {
        // 监听算法选择变化
        this.dom.algorithmSelect.addEventListener('change', (e) => {
            this.currentAlgorithm = e.target.value;
            
            // 显示/隐藏位移量输入框
            if (this.currentAlgorithm === 'caesar') {
                this.dom.caesarShift.style.display = 'inline-block';
            } else {
                this.dom.caesarShift.style.display = 'none';
            }
            
            // 更新状态栏
            this.dom.status.textContent = `已切换到 ${this.algorithms[this.currentAlgorithm].getName()} 算法`;
        });
        
        // 监听位移量变化
        this.dom.shiftValue.addEventListener('change', (e) => {
            this.algorithms.caesar.setShift(parseInt(e.target.value));
            this.dom.status.textContent = `凯撒密码位移量已设置为 ${e.target.value}`;
        });
    }

    showNotification(message, type = 'success') {
        const notification = this.dom.notification;
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        // 显示通知动画
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        notification.classList.add('show');
        
        // 执行动画
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);
        
        // 自动隐藏
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(20px)';
            setTimeout(() => {
                notification.classList.remove('show');
            }, 300);
        }, 3000);
    }

    toggleHistoryPanel() {
        this.historyVisible = !this.historyVisible;
        
        // 添加面板切换动画
        if (this.historyVisible) {
            this.dom.historyPanel.style.display = 'block';
            this.dom.historyPanel.style.maxHeight = '0';
            this.dom.historyPanel.style.opacity = '0';
            
            setTimeout(() => {
                this.dom.historyPanel.style.maxHeight = '300px';
                this.dom.historyPanel.style.opacity = '1';
                this.dom.historyPanel.style.transition = 'max-height 0.5s ease, opacity 0.5s ease';
            }, 10);
            
            this.dom.toggleHistoryBtn.innerHTML = '<span>⇧</span>';
        } else {
            this.dom.historyPanel.style.maxHeight = '0';
            this.dom.historyPanel.style.opacity = '0';
            
            setTimeout(() => {
                this.dom.historyPanel.style.display = 'none';
            }, 500);
            
            this.dom.toggleHistoryBtn.innerHTML = '<span>📜</span>';
        }
    }

    performAction(action) {
        const text = this.dom.inputText.value.trim();
        if (!text) {
            this.showNotification('请输入内容', 'warning');
            return;
        }
        
        // 显示加载动画
        this.showLoading(true);
        
        // 延迟执行，显示动画效果
        setTimeout(() => {
            try {
                const algorithm = this.algorithms[this.currentAlgorithm];
                let result;
                
                if (action === 'encrypt') {
                    result = algorithm.encrypt(text);
                    this.dom.status.textContent = `加密成功 | 算法: ${algorithm.getName()} | 原始长度: ${text.length} 加密长度: ${result.length}`;
                } else {
                    result = algorithm.decrypt(text);
                    this.dom.status.textContent = `解密成功 | 算法: ${algorithm.getName()} | 加密长度: ${text.length} 原始长度: ${result.length}`;
                }
                
                // 添加结果动画
                this.animateResultChange(result);
                
                // 添加到历史记录
                this.addHistory(action === 'encrypt' ? '加密' : '解密', algorithm.getName(), text, result);
                
                this.showNotification(`${action === 'encrypt' ? '加密' : '解密'}成功`, 'success');
            } catch (e) {
                this.dom.status.textContent = `${action === 'encrypt' ? '加密' : '解密'}失败: ${e.message}`;
                this.showNotification(`${action === 'encrypt' ? '加密' : '解密'}失败: ${e.message}`, 'error');
            } finally {
                // 隐藏加载动画
                this.showLoading(false);
            }
        }, 300); // 延迟300ms，确保动画可见
    }

    showLoading(show) {
        if (show) {
            this.dom.resultLoading.style.display = 'flex';
        } else {
            this.dom.resultLoading.style.display = 'none';
        }
    }

    animateResultChange(result) {
        // 淡出效果
        this.dom.resultText.style.opacity = '0';
        this.dom.resultText.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            // 更新内容
            this.dom.resultText.value = result;
            
            // 淡入效果
            this.dom.resultText.style.opacity = '1';
            this.dom.resultText.style.transform = 'translateY(0)';
            this.dom.resultText.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, 150);
    }

    animateSelectedRow(row) {
        // 移除之前选中的样式
        document.querySelectorAll('.history-table tr.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // 添加当前选中样式
        row.classList.add('selected');
        
        // 添加动画效果
        row.style.backgroundColor = '#d1e7fd';
        row.style.transition = 'background-color 0.3s ease';
        
        // 闪烁效果
        row.style.boxShadow = '0 0 0 2px rgba(74, 111, 165, 0.5)';
        setTimeout(() => {
            row.style.boxShadow = 'none';
        }, 300);
    }

    clearAction() {
        // 添加清空动画
        this.dom.inputText.style.opacity = '0';
        this.dom.resultText.style.opacity = '0';
        
        setTimeout(() => {
            this.dom.inputText.value = '';
            this.dom.resultText.value = '';
            
            this.dom.inputText.style.opacity = '1';
            this.dom.resultText.style.opacity = '1';
            this.dom.inputText.style.transition = 'opacity 0.3s ease';
            this.dom.resultText.style.transition = 'opacity 0.3s ease';
            
            this.dom.status.textContent = '已清空输入和结果';
            this.dom.inputText.focus();
        }, 150);
    }

    copyResult() {
        const result = this.dom.resultText.value.trim();
        if (result) {
            navigator.clipboard.writeText(result)
               .then(() => {
                    this.showNotification('结果已复制到剪贴板');
                    this.dom.status.textContent = '结果已复制到剪贴板';
                    
                    // 添加复制成功动画
                    const copyBtn = this.dom.copyBtn;
                    const originalText = copyBtn.querySelector('.btn-text').textContent;
                    
                    copyBtn.querySelector('.btn-text').textContent = '已复制';
                    copyBtn.classList.add('success');
                    
                    setTimeout(() => {
                        copyBtn.querySelector('.btn-text').textContent = originalText;
                        copyBtn.classList.remove('success');
                    }, 1500);
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

    addHistory(operation, algorithm, original, result) {
        const entry = new HistoryEntry(operation, algorithm, original, result);
        this.history.push(entry);
        this.saveHistory();
        this.refreshHistoryTree();
        
        // 添加新历史记录动画
        const rows = this.dom.historyBody.querySelectorAll('tr');
        if (rows.length > 0) {
            const firstRow = rows[0];
            firstRow.style.opacity = '0';
            firstRow.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                firstRow.style.opacity = '1';
                firstRow.style.transform = 'translateY(0)';
                firstRow.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            }, 10);
        }
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
                <td>${entry.algorithm}</td>
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
        this.dom.detailAlgorithm.textContent = entry.algorithm;
        this.dom.detailOriginal.textContent = entry.original;
        this.dom.detailResult.textContent = entry.result;

        // 添加模态框显示动画
        this.dom.detailModal.style.opacity = '0';
        this.dom.detailModal.style.display = 'flex';
        
        setTimeout(() => {
            this.dom.detailModal.style.opacity = '1';
            this.dom.detailModal.style.transition = 'opacity 0.3s ease';
        }, 10);
    }

    closeDetailModal() {
        // 添加模态框隐藏动画
        this.dom.detailModal.style.opacity = '0';
        
        setTimeout(() => {
            this.dom.detailModal.style.display = 'none';
        }, 300);
    }

    deleteSelectedHistory() {
        if (!this.selectedHistoryId) {
            this.showNotification('请先选择要删除的历史记录', 'warning');
            return;
        }

        if (confirm('确定要删除选中的历史记录吗？')) {
            // 查找要删除的行并添加删除动画
            const row = this.dom.historyBody.querySelector(`tr[data-id="${this.selectedHistoryId}"]`);
            if (row) {
                row.style.opacity = '0';
                row.style.height = `${row.offsetHeight}px`;
                row.style.transform = 'translateX(20px)';
                
                setTimeout(() => {
                    row.style.height = '0';
                    row.style.margin = '0';
                    row.style.padding = '0';
                    row.style.overflow = 'hidden';
                    
                    setTimeout(() => {
                        // 从数据中删除
                        this.history = this.history.filter(e => e.id !== this.selectedHistoryId);
                        this.saveHistory();
                        this.refreshHistoryTree();
                        this.selectedHistoryId = null;
                        this.dom.status.textContent = '已删除选中的历史记录';
                        this.showNotification('历史记录已删除');
                    }, 300);
                }, 300);
            }
        }
    }

    clearHistory() {
        if (this.history.length === 0) {
            this.dom.status.textContent = '历史记录已为空';
            return;
        }

        if (confirm('确定要清空所有历史记录吗？')) {
            // 添加清空动画
            const rows = this.dom.historyBody.querySelectorAll('tr');
            rows.forEach((row, index) => {
                setTimeout(() => {
                    row.style.opacity = '0';
                    row.style.transform = `translateX(${20 + index * 5}px)`;
                }, index * 50);
            });
            
            setTimeout(() => {
                this.history = [];
                this.saveHistory();
                this.refreshHistoryTree();
                this.selectedHistoryId = null;
                this.dom.status.textContent = '历史记录已清空';
                this.showNotification('历史记录已清空');
            }, rows.length * 50);
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
            content += `算法: ${entry.algorithm}\n`;
            content += `原始内容: ${entry.original}\n`;
            content += `结果: ${entry.result}\n`;
            content += '-'.repeat(50) + '\n';
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `八字神人加密器历史记录_${new Date().toISOString().slice(0,10)}.txt`;
        
        // 添加导出动画
        const originalText = this.dom.exportBtn.querySelector('.btn-text').textContent;
        this.dom.exportBtn.querySelector('.btn-text').textContent = '导出中...';
        
        setTimeout(() => {
            link.click();
            this.showNotification('历史记录已导出');
            
            setTimeout(() => {
                this.dom.exportBtn.querySelector('.btn-text').textContent = originalText;
            }, 1000);
        }, 500);
    }

    sortHistory() {
        // 切换排序方式
        this.history.reverse();
        this.saveHistory();
        this.refreshHistoryTree();
        
        // 添加排序动画
        const rows = this.dom.historyBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.style.opacity = '0';
            setTimeout(() => {
                row.style.opacity = '1';
                row.style.transition = 'opacity 0.2s ease';
            }, index * 50);
        });
        
        this.showNotification('历史记录已重新排序');
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
