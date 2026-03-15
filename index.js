require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function fileToGenerativePart(fileData, mimeType) {
    return {
        inlineData: {
            data: fileData,
            mimeType: mimeType
        }
    };
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message, files, model = 'gemini-2.5-flash' } = req.body;
        
        console.log(`📝 [${new Date().toISOString()}] Menggunakan model: ${model}`);
        console.log(`📊 Pesan: ${message?.substring(0, 50)}...`);
        
        const validModels = [
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-1.5-flash',
            'gemini-1.5-pro'
        ];
        
        const selectedModel = validModels.includes(model) ? model : 'gemini-2.5-flash';
        
        const generativeModel = genAI.getGenerativeModel({ 
            model: selectedModel,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192, 
                topP: 0.95,
                topK: 40
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        });
        
        const systemPrompt = `Anda adalah NetBot AI, asisten ahli Teknik Komputer dan Jaringan (TKJ). 
Gunakan gaya bahasa profesional, ramah, dan mudah dipahami.

IDENTITAS:
- Nama: NetBot AI
- Spesialisasi: Teknik Komputer dan Jaringan
- Model: Gemini 2.5 Flash

DOMAIN PENGETAHUAN:
1. Networking: Cisco, MikroTik, Juniper, TCP/IP, routing, switching
2. Keamanan: Firewall (iptables, pfSense), VPN, IDS/IPS
3. Server: Linux/Windows Server, virtualisasi (VMware, Proxmox)
4. Troubleshooting: packet loss, latency, routing issues
5. IoT & Embedded: Raspberry Pi, Arduino untuk networking

PANDUAN RESPONS:
1. Gunakan format rapi dengan heading, bullet points, dan code blocks
2. Untuk command/konfigurasi, tampilkan dalam code block dengan label:
   - \`\`\`cisco untuk perintah Cisco
   - \`\`\`mikrotik untuk perintah MikroTik
   - \`\`\`bash untuk script Linux
3. Berikan contoh konkret dan praktis
4. Sertakan tips keamanan jika relevan
5. Jelaskan istilah teknis dengan singkat
6. Jika user upload gambar/video, analisis dan berikan saran

Mulai respons dengan sapaan ramah dan langsung ke inti jawaban.`;

        const parts = [{ text: systemPrompt }];
        
        if (message) {
            parts.push({ text: `Pertanyaan user: ${message}` });
        } else {
            parts.push({ text: "Analisis file yang diupload" });
        }
        
        // Add files if any (multimodal support)
        if (files && files.length > 0) {
            console.log(`📎 Memproses ${files.length} file...`);
            for (const file of files) {
                parts.push(fileToGenerativePart(file.data, file.type));
            }
        }
        
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Request timeout setelah 30 detik')), 30000);
        });
        
        const generatePromise = generativeModel.generateContent({
            contents: [{ role: "user", parts }]
        });
        
        const result = await Promise.race([generatePromise, timeoutPromise]);
        const response = await result.response;
        const text = response.text();
        
        const usage = response.usageMetadata;
        if (usage) {
            console.log(`📊 Token usage: ${usage.totalTokenCount} total (${usage.promptTokenCount} prompt, ${usage.candidatesTokenCount} completion)`);
        }
        
        res.json({ 
            success: true, 
            data: text,
            model: selectedModel,
            timestamp: new Date().toISOString(),
            usage: usage || null
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
        
        let errorMessage = error.message;
        let suggestion = '';
        
        if (error.message.includes('API key')) {
            errorMessage = 'API Key tidak valid';
            suggestion = 'Periksa API Key di file .env';
        } else if (error.message.includes('not found')) {
            errorMessage = 'Model tidak ditemukan';
            suggestion = 'Gunakan model: gemini-2.5-flash, gemini-2.0-flash, atau gemini-1.5-flash';
        } else if (error.message.includes('quota')) {
            errorMessage = 'Kuota API habis';
            suggestion = 'Tunggu beberapa saat atau upgrade kuota';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Request timeout';
            suggestion = 'Coba lagi dengan pertanyaan yang lebih sederhana';
        }
        
        res.status(500).json({ 
            success: false, 
            error: errorMessage,
            suggestion: suggestion,
            model: req.body.model || 'gemini-2.5-flash'
        });
    }
});


app.get('/api/models', async (req, res) => {
    try {

        const models = [
            { 
                id: 'gemini-2.5-flash', 
                name: 'Gemini 2.5 Flash', 
                description: '🚀 Model terbaru - Cepat, multimodal, 1M context',
                context: '1,048,576 tokens',
                inputPrice: '$0.30/1M',
                outputPrice: '$2.50/1M',
                capabilities: ['text', 'image', 'video', 'audio', 'function calling', 'code execution'],
                status: 'stable',
                releaseDate: 'March 2026'
            },
            { 
                id: 'gemini-2.5-flash-lite', 
                name: 'Gemini 2.5 Flash-Lite', 
                description: '⚡ Versi ringan untuk high-volume tasks',
                context: '1,048,576 tokens',
                inputPrice: '$0.10/1M',
                outputPrice: '$0.40/1M',
                capabilities: ['text', 'image', 'function calling'],
                status: 'stable',
                releaseDate: 'March 2026'
            },
            { 
                id: 'gemini-2.5-pro', 
                name: 'Gemini 2.5 Pro', 
                description: '🧠 Model paling powerful untuk reasoning kompleks',
                context: '1,048,576 tokens',
                capabilities: ['text', 'image', 'video', 'audio', 'function calling', 'code execution'],
                status: 'stable',
                releaseDate: 'March 2026'
            }
        ];
        
        res.json({ 
            success: true, 
            data: models,
            default: 'gemini-2.5-flash'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


app.get('/api/status', async (req, res) => {
    try {

        const testModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await testModel.generateContent("Test connection. Reply with 'OK'.");
        const response = await result.response;
        
        res.json({ 
            success: true, 
            status: 'connected',
            message: '✅ Gemini 2.5 Flash siap digunakan',
            model: 'gemini-2.5-flash',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        res.json({ 
            success: false, 
            status: 'error',
            message: error.message,
            suggestion: 'Periksa API Key atau koneksi internet'
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.listen(port, () => {
    console.log('\n🚀 ============================================');
    console.log(`🚀  NetBot AI - Gemini 2.5 Flash`);
    console.log('🚀 ============================================');
    console.log(`\n📡 Server: http://localhost:${port}`);
    console.log(`🤖 Model: gemini-2.5-flash (Stable)`);
    console.log(`📊 Context: 1,048,576 tokens`);
    console.log(`🔧 API Key: ${process.env.GEMINI_API_KEY ? '✓ Terkonfigurasi' : '✗ Belum dikonfigurasi'}`);
    console.log('\n📋 Fitur:');
    console.log('   • Multimodal (teks, gambar, video, audio)');
    console.log('   • Function calling');
    console.log('   • Code execution');
    console.log('   • 8K output tokens');
    console.log('\n🚀 ============================================\n');
});
