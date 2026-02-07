const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 15007;

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 提供静态文件访问
app.use('/uploads', express.static(uploadDir));

// 配置multer存储
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 创建multer实例
const upload = multer({ storage: storage });

// 处理文件上传的路由
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    
    res.status(200).json({
        message: 'File uploaded successfully',
        file: {
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype
        }
    });
});

// 获取已上传文件列表的路由
app.get('/files', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDir).map(filename => {
            const filePath = path.join(uploadDir, filename);
            const stats = fs.statSync(filePath);
            const ext = path.extname(filename).toLowerCase();
            const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            return {
                filename,
                size: stats.size,
                mtime: stats.mtime,
                url: `/uploads/${filename}`,
                isImage: imageExts.includes(ext)
            };
        });
        res.status(200).json({ files });
    } catch (error) {
        res.status(500).json({ message: 'Error reading files', error: error.message });
    }
});

// 提供一个简单的HTML页面用于测试
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>文件上传测试</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1 {
                    text-align: center;
                }
                form {
                    margin-bottom: 30px;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                input[type="file"] {
                    margin-bottom: 10px;
                }
                button {
                    padding: 8px 16px;
                    background-color: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:hover {
                    background-color: #45a049;
                }
                #fileList {
                    margin-top: 30px;
                }
                .file-item {
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                }
                .file-item:hover {
                    background-color: #f5f5f5;
                }
                .file-info {
                    flex: 1;
                }
                .file-name {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .file-size {
                    font-size: 12px;
                    color: #666;
                }
                .file-preview {
                    margin-left: 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .file-preview img {
                    max-width: 100px;
                    max-height: 100px;
                    cursor: pointer;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                .file-preview img:hover {
                    border-color: #4CAF50;
                }
                .copy-btn {
                    padding: 4px 8px;
                    background-color: #f0f0f0;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .copy-btn:hover {
                    background-color: #e0e0e0;
                }
                .copy-btn.copied {
                    background-color: #d4edda;
                    border-color: #c3e6cb;
                    color: #155724;
                }
                #imageModal {
                    display: none;
                    position: fixed;
                    z-index: 1000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    background-color: rgba(0,0,0,0.9);
                }
                #modalContent {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                }
                #modalImage {
                    max-width: 90%;
                    max-height: 90%;
                }
                #closeModal {
                    position: absolute;
                    top: 20px;
                    right: 30px;
                    color: #f1f1f1;
                    font-size: 40px;
                    font-weight: bold;
                    cursor: pointer;
                }
                #closeModal:hover {
                    color: #bbb;
                }
                .message {
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 4px;
                }
                .success {
                    background-color: #d4edda;
                    color: #155724;
                    border: 1px solid #c3e6cb;
                }
                .error {
                    background-color: #f8d7da;
                    color: #721c24;
                    border: 1px solid #f5c6cb;
                }
            </style>
        </head>
        <body>
            <h1>文件上传测试</h1>
            
            <div id="message" class="message" style="display: none;"></div>
            
            <form id="uploadForm" action="/upload" method="POST" enctype="multipart/form-data">
                <input type="file" name="file" required>
                <button type="submit">上传</button>
            </form>
            
            <div id="fileList">
                <h2>已上传的文件</h2>
                <div id="filesContainer"></div>
            </div>
            
            <!-- 图片预览模态框 -->
            <div id="imageModal">
                <span id="closeModal">&times;</span>
                <div id="modalContent">
                    <img id="modalImage" src="" alt="预览图片">
                </div>
            </div>
            
            <script>
                // 处理表单提交
                document.getElementById('uploadForm').addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    const formData = new FormData(this);
                    
                    fetch('/upload', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        showMessage(data.message, 'success');
                        loadFiles(); // 重新加载文件列表
                    })
                    .catch(error => {
                        showMessage('上传失败: ' + error.message, 'error');
                    });
                });
                
                // 显示消息
                function showMessage(text, type) {
                    const messageDiv = document.getElementById('message');
                    messageDiv.textContent = text;
                    messageDiv.className = 'message ' + type;
                    messageDiv.style.display = 'block';
                    
                    setTimeout(() => {
                        messageDiv.style.display = 'none';
                    }, 3000);
                }
                
                // 加载文件列表
                function loadFiles() {
                    fetch('/files')
                    .then(response => response.json())
                    .then(data => {
                        const filesContainer = document.getElementById('filesContainer');
                        filesContainer.innerHTML = '';
                        
                        if (data.files && data.files.length > 0) {
                            data.files.forEach(file => {
                                const fileItem = document.createElement('div');
                                fileItem.className = 'file-item';
                                
                                const fileInfo = document.createElement('div');
                                fileInfo.className = 'file-info';
                                
                                const fileName = document.createElement('div');
                                fileName.className = 'file-name';
                                fileName.textContent = file.filename;
                                
                                const fileSize = document.createElement('div');
                                fileSize.className = 'file-size';
                                fileSize.textContent = formatFileSize(file.size);
                                
                                fileInfo.appendChild(fileName);
                                fileInfo.appendChild(fileSize);
                                
                                const filePreview = document.createElement('div');
                                filePreview.className = 'file-preview';
                                
                                if (file.isImage) {
                                    const img = document.createElement('img');
                                    img.src = file.url;
                                    img.alt = file.filename;
                                    img.onclick = function() {
                                        openImageModal(file.url);
                                    };
                                    filePreview.appendChild(img);
                                } else {
                                    const link = document.createElement('a');
                                    link.href = file.url;
                                    link.target = '_blank';
                                    link.textContent = '下载';
                                    filePreview.appendChild(link);
                                }
                                
                                // 添加复制URL按钮
                                const copyBtn = document.createElement('button');
                                copyBtn.className = 'copy-btn';
                                copyBtn.textContent = '复制URL';
                                copyBtn.onclick = function() {
                                    const fullUrl = window.location.origin + file.url;
                                    
                                    // 尝试使用现代的Clipboard API
                                    if (navigator.clipboard && window.isSecureContext) {
                                        navigator.clipboard.writeText(fullUrl)
                                            .then(() => {
                                                copyBtn.textContent = '已复制!';
                                                copyBtn.classList.add('copied');
                                                setTimeout(() => {
                                                    copyBtn.textContent = '复制URL';
                                                    copyBtn.classList.remove('copied');
                                                }, 2000);
                                            })
                                            .catch(err => {
                                                console.error('复制失败:', err);
                                                fallbackCopyTextToClipboard(fullUrl, copyBtn);
                                            });
                                    } else {
                                        // 降级方案：使用传统的方法
                                        fallbackCopyTextToClipboard(fullUrl, copyBtn);
                                    }
                                };
                                
                                // 降级复制方法
                                function fallbackCopyTextToClipboard(text, button) {
                                    const textArea = document.createElement('textarea');
                                    textArea.value = text;
                                    
                                    // 确保文本区域不可见
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-999999px';
                                    textArea.style.top = '-999999px';
                                    document.body.appendChild(textArea);
                                    
                                    // 选择并复制文本
                                    textArea.focus();
                                    textArea.select();
                                    
                                    try {
                                        const successful = document.execCommand('copy');
                                        if (successful) {
                                            button.textContent = '已复制!';
                                            button.classList.add('copied');
                                            setTimeout(() => {
                                                button.textContent = '复制URL';
                                                button.classList.remove('copied');
                                            }, 2000);
                                        } else {
                                            showMessage('复制URL失败，请手动复制', 'error');
                                        }
                                    } catch (err) {
                                        console.error('复制失败:', err);
                                        showMessage('复制URL失败，请手动复制', 'error');
                                    } finally {
                                        document.body.removeChild(textArea);
                                    }
                                }
                                filePreview.appendChild(copyBtn);
                                
                                fileItem.appendChild(fileInfo);
                                fileItem.appendChild(filePreview);
                                filesContainer.appendChild(fileItem);
                            });
                        } else {
                            filesContainer.innerHTML = '<p>暂无上传的文件</p>';
                        }
                    })
                    .catch(error => {
                        console.error('Error loading files:', error);
                    });
                }
                
                // 格式化文件大小
                function formatFileSize(bytes) {
                    if (bytes === 0) return '0 Bytes';
                    const k = 1024;
                    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                }
                
                // 打开图片预览模态框
                function openImageModal(imageUrl) {
                    const modal = document.getElementById('imageModal');
                    const modalImage = document.getElementById('modalImage');
                    modalImage.src = imageUrl;
                    modal.style.display = 'block';
                }
                
                // 关闭图片预览模态框
                document.getElementById('closeModal').addEventListener('click', function() {
                    document.getElementById('imageModal').style.display = 'none';
                });
                
                // 点击模态框外部关闭
                window.addEventListener('click', function(e) {
                    const modal = document.getElementById('imageModal');
                    if (e.target === modal) {
                        modal.style.display = 'none';
                    }
                });
                
                // 页面加载时加载文件列表
                window.onload = loadFiles;
            </script>
        </body>
        </html>
    `);
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});