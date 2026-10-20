/**
 * ============================================================================
 * TỆP XỬ LÝ LOGIC & ENGINE ĐA GIÁC QUAN (js/main.js)
 * Bao gồm:
 *  1. Smart Asset Fallback (Tự vẽ ảnh Canvas nếu thiếu memory-1..6.jpg)
 *  2. Layered Soundscape & Web Audio Synthesizer (Music Box, Piano, Sóng biển, Mưa)
 *  3. Canvas Engine: Hạt Bokeh, Vườn hoa 3D, Cánh hoa đào 3 lớp, Ngân hà & Vô cực
 *  4. Tương tác 5 Giai đoạn: Lau kính sương mù, Kintsugi, Nhấn giữ Haptic,
 *     Cảm biến thổi Mic, Máy chữ cảm xúc, Mực tàng hình, Polaroid 3D & Xuất PNG
 * ============================================================================
 */

(function () {
    "use strict";

    const CFG = window.PROJECT_CONFIG;

    // Trạng thái toàn cục của ứng dụng
    const STATE = {
        stage: 1,
        weatherModes: ["twilight", "morning", "starlight", "rain"],
        weatherLabels: ["🌸 Sương Mù Hồng", "🌅 Sương Sớm Mai", "🌌 Đêm Sao Phát Quang", "🌧️ Mưa Rào Dịu Êm"],
        weatherIndex: 0,
        audioEnabled: true,
        enteredPin: "",
        wrongAttempts: 0,
        holdProgress: 0,
        holdCompleted: false,
        pointerX: window.innerWidth / 2,
        pointerY: window.innerHeight / 2,
        tiltX: 0,
        tiltY: 0,
        orbitAngle: 0,
        targetOrbitAngle: 0,
        isInspectingCard: false,
        activeMemoryIndex: 0,
        keepsakeImgIndex: 0,
        resolvedImages: {} // Lưu URL ảnh thực tế hoặc ảnh Canvas dự phòng
    };

    /* ========================================================================
       1. HỆ THỐNG TỰ ĐỘNG DỰ PHÒNG ẢNH (SMART IMAGE FALLBACK)
       Giúp dự án chạy mượt trên VS Code ngay cả khi chưa chép ảnh vào assets/images/
    ======================================================================== */
    function generateArtisticPlaceholder(memory) {
        const c = document.createElement("canvas");
        c.width = 600;
        c.height = 750;
        const ctx = c.getContext("2d");

        const pal = memory.placeholderPalette || ["#ff9a9e", "#fecfef", "#a18cd1"];
        const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
        grad.addColorStop(0, pal[0]);
        grad.addColorStop(0.5, pal[1]);
        grad.addColorStop(1, pal[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, c.width, c.height);

        // Vẽ các vòng sáng Bokeh nghệ thuật
        for (let i = 0; i < 28; i++) {
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + (i % 5) * 0.04})`;
            const rx = (Math.sin(i * 7.3 + memory.id) * 0.5 + 0.5) * c.width;
            const ry = (Math.cos(i * 4.1 + memory.id) * 0.5 + 0.5) * c.height;
            const rad = 20 + (i % 6) * 22;
            ctx.arc(rx, ry, rad, 0, Math.PI * 2);
            ctx.fill();
        }

        // Vẽ biểu tượng hoa/sao ở tâm
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.font = "bold 78px 'Cormorant Garamond', serif";
        ctx.textAlign = "center";
        ctx.fillText(`✿ Ký Ức #${memory.id}`, c.width / 2, c.height / 2 - 20);

        ctx.font = "italic 28px 'Be Vietnam Pro', sans-serif";
        ctx.fillStyle = "rgba(45, 20, 35, 0.85)";
        ctx.fillText(memory.dateLocation, c.width / 2, c.height / 2 + 40);

        return c.toDataURL("image/jpeg", 0.9);
    }

    function preloadMemories() {
        CFG.memories.forEach((mem, idx) => {
            const img = new Image();
            img.onload = () => {
                STATE.resolvedImages[idx] = mem.src;
                refreshRenderedImages();
            };
            img.onerror = () => {
                // Nếu chưa có file memory-x.jpg trong assets/images/, dùng ảnh nghệ thuật tự tạo
                STATE.resolvedImages[idx] = generateArtisticPlaceholder(mem);
                refreshRenderedImages();
            };
            img.src = mem.src;
        });
    }

    function refreshRenderedImages() {
        const clueImg = document.getElementById("clue-img");
        if (clueImg && STATE.resolvedImages[0]) {
            clueImg.src = STATE.resolvedImages[0];
        }
        const keepsakeImg = document.getElementById("keepsake-featured-img");
        if (keepsakeImg && STATE.resolvedImages[STATE.keepsakeImgIndex]) {
            keepsakeImg.src = STATE.resolvedImages[STATE.keepsakeImgIndex];
        }
        document.querySelectorAll(".orbit-polaroid img").forEach((el, i) => {
            if (STATE.resolvedImages[i]) el.src = STATE.resolvedImages[i];
        });
    }

    /* ========================================================================
       2. THIẾT KẾ ÂM THANH ĐA LỚP (WEB AUDIO API SYNTHESIZER + BGM)
    ======================================================================== */
    const SoundEngine = {
        ctx: null,
        ambientTimer: null,

        init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === "suspended") {
                this.ctx.resume();
            }
        },

        playBgm() {
            if (!STATE.audioEnabled) return;
            this.init();
            const audioEl = document.getElementById("bgm-audio");
            if (audioEl) {
                audioEl.volume = 0.45;
                audioEl.play().catch(() => {
                    // Nếu không có file piano.mp3, khởi chạy Ambient Piano bằng Web Audio
                    this.startProceduralAmbient();
                });
            }
        },

        startProceduralAmbient() {
            if (this.ambientTimer) return;
            const chords = [
                [261.63, 329.63, 392.00, 493.88], // Cmaj7
                [220.00, 261.63, 329.63, 392.00], // Am7
                [174.61, 220.00, 261.63, 349.23], // Fmaj7
                [196.00, 246.94, 293.66, 392.00]  // G6
            ];
            let step = 0;
            this.ambientTimer = setInterval(() => {
                if (!STATE.audioEnabled || !this.ctx) return;
                const chord = chords[step % chords.length];
                chord.forEach((freq, idx) => {
                    setTimeout(() => this.playTone(freq, 2.6, "sine", 0.035), idx * 240);
                });
                step++;
            }, 3600);
        },

        playTone(freq, duration = 0.9, type = "sine", volume = 0.12, pan = 0) {
            if (!STATE.audioEnabled) return;
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.exponentialRampToValueAtTime(volume, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            if (this.ctx.createStereoPanner) {
                const panner = this.ctx.createStereoPanner();
                panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
                osc.connect(gain);
                gain.connect(panner);
                panner.connect(this.ctx.destination);
            } else {
                osc.connect(gain);
                gain.connect(this.ctx.destination);
            }

            osc.start(now);
            osc.stop(now + duration + 0.05);
        },

        // Tiếng Hộp nhạc dây cót (Music Box) ở Giai đoạn 1
        playMusicBoxNote(keyDigit) {
            const scale = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50, 1174.66, 1318.51];
            const freq = scale[Number(keyDigit) % scale.length];
            this.playTone(freq, 1.1, "triangle", 0.16);
            this.playTone(freq * 2, 0.45, "sine", 0.05);
        },

        // Tiếng dây đàn chùng xuống khi nhập sai mật khẩu
        playErrorDetune() {
            this.playTone(195, 0.5, "sawtooth", 0.09);
            setTimeout(() => this.playTone(165, 0.65, "triangle", 0.1), 120);
        },

        // Tiếng giấy sột soạt / tiếng sóng biển / tiếng mưa bối cảnh (Foley SFX)
        playFoley(type) {
            if (!STATE.audioEnabled) return;
            this.init();
            if (!this.ctx) return;

            const badge = document.getElementById("foley-indicator");
            if (type === "ocean" && badge) badge.textContent = "🌊 Âm thanh bối cảnh: Sóng biển rì rào";
            if (type === "rain" && badge) badge.textContent = "🌧️ Âm thanh bối cảnh: Mưa chiều dịu êm";
            if (type === "chime" && badge) badge.textContent = "✨ Âm thanh bối cảnh: Chuông gió lấp lánh";

            if (type === "chime" || type === "chord") {
                [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
                    setTimeout(() => this.playTone(f, 1.2, "sine", 0.08), i * 90);
                });
                return;
            }

            // Tạo White Noise lọc tần số cho tiếng giấy, tiếng sóng biển hoặc tiếng mưa
            const dur = type === "paper" ? 0.45 : 2.2;
            const bufferSize = this.ctx.sampleRate * dur;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = type === "paper" ? "bandpass" : "lowpass";
            filter.frequency.value = type === "paper" ? 1200 : 480;

            const gain = this.ctx.createGain();
            const now = this.ctx.currentTime;
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(type === "paper" ? 0.12 : 0.07, now + dur * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            noise.start(now);
        }
    };

    /* ========================================================================
       3. ENGINE ĐỒ HỌA CANVAS ĐA TẦNG & VỆT BỤI SAO (STARDUST TRAIL)
    ======================================================================== */
    const bgCanvas = document.getElementById("bg-world-canvas");
    const bgCtx = bgCanvas.getContext("2d");
    const trailCanvas = document.getElementById("stardust-trail-canvas");
    const trailCtx = trailCanvas.getContext("2d");

    const particles = [];
    const trailParticles = [];
    const edenFlowers = [];
    const rootFilaments = [];

    function resizeCanvases() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
        trailCanvas.width = window.innerWidth;
        trailCanvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resizeCanvases);
    resizeCanvases();

    // Khởi tạo hạt Bokeh, Cánh hoa đào 3 lớp chiều sâu & Sao ngân hà
    for (let i = 0; i < 85; i++) {
        particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            z: Math.random(), // 0: Xa (nhỏ, nét), 1: Gần (to, mờ)
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.35 - Math.random() * 0.7,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.02,
            hue: 330 + Math.random() * 45
        });
    }

    // Khởi tạo hoa 3D trong Vườn Địa Đàng (Giai đoạn 2)
    for (let i = 0; i < 42; i++) {
        edenFlowers.push({
            x: (Math.random() - 0.5) * 1600,
            y: (Math.random() - 0.2) * 900,
            z: 100 + Math.random() * 900,
            petals: 5 + (i % 3),
            bloom: 0,
            color: i % 2 === 0 ? "#ff9ebb" : "#ffd166"
        });
    }

    // Bắt sự kiện di chuột / vuốt cảm ứng để tạo Vệt Bụi Sao (Magical Touch Trail)
    function addStardust(x, y) {
        STATE.pointerX = x;
        STATE.pointerY = y;
        STATE.tiltX = (x / window.innerWidth - 0.5) * 2;
        STATE.tiltY = (y / window.innerHeight - 0.5) * 2;

        for (let i = 0; i < 3; i++) {
            trailParticles.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 1.4,
                vy: (Math.random() - 0.5) * 1.4 - 0.4,
                size: 2 + Math.random() * 3.5,
                life: 1.0,
                color: Math.random() > 0.4 ? "#ffd166" : "#ffb3c6"
            });
        }
    }

    window.addEventListener("mousemove", (e) => addStardust(e.clientX, e.clientY));
    window.addEventListener("touchmove", (e) => {
        if (e.touches[0]) addStardust(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    // Vòng lặp Render 60FPS cho toàn bộ thế giới 3D & Hạt
    function renderWorldLoop() {
        const w = bgCanvas.width;
        const h = bgCanvas.height;
        bgCtx.clearRect(0, 0, w, h);

        // 1. Vẽ hiệu ứng theo từng Giai đoạn
        if (STATE.stage === 1) {
            // Hạt Bokeh cánh hoa mờ ảo với Độ sâu trường ảnh (DOF)
            particles.forEach((p) => {
                p.x += p.vx + STATE.tiltX * 0.4;
                p.y += p.vy;
                p.angle += p.spin;
                if (p.y < -30) p.y = h + 30;
                if (p.x < -30) p.x = w + 30;
                if (p.x > w + 30) p.x = -30;

                const radius = 4 + p.z * 16;
                bgCtx.save();
                bgCtx.translate(p.x, p.y);
                bgCtx.rotate(p.angle);
                bgCtx.fillStyle = `hsla(${p.hue}, 85%, 82%, ${0.15 + (1 - p.z) * 0.35})`;
                bgCtx.beginPath();
                bgCtx.ellipse(0, 0, radius, radius * 0.65, 0, 0, Math.PI * 2);
                bgCtx.fill();
                bgCtx.restore();
            });
        } else if (STATE.stage === 2) {
            // Vẽ các tia sáng rễ cây lan tỏa khi đang nhấn giữ Giọt sương
            if (STATE.holdProgress > 0 && !STATE.holdCompleted) {
                const cx = w / 2;
                const cy = h / 2 - 40;
                const branches = 14;
                const maxLen = (STATE.holdProgress / 100) * Math.max(w, h) * 0.55;
                bgCtx.strokeStyle = "rgba(255, 215, 120, 0.55)";
                bgCtx.lineWidth = 2;
                for (let b = 0; b < branches; b++) {
                    const ang = (b / branches) * Math.PI * 2 + STATE.holdProgress * 0.02;
                    bgCtx.beginPath();
                    bgCtx.moveTo(cx, cy);
                    bgCtx.quadraticCurveTo(
                        cx + Math.cos(ang + 0.3) * maxLen * 0.5,
                        cy + Math.sin(ang + 0.3) * maxLen * 0.5,
                        cx + Math.cos(ang) * maxLen,
                        cy + Math.sin(ang) * maxLen
                    );
                    bgCtx.stroke();
                }
            }

            // Vẽ Thung lũng hoa 3D nở Time-lapse & Parallax
            if (STATE.holdCompleted) {
                const fov = 420;
                edenFlowers.forEach((fl) => {
                    fl.z -= 3.2;
                    if (fl.z < 40) {
                        fl.z = 950;
                        fl.bloom = 0.1;
                    }
                    fl.bloom = Math.min(1, fl.bloom + 0.015);

                    const scale = fov / (fov + fl.z);
                    const sx = w / 2 + (fl.x - STATE.tiltX * 180) * scale;
                    const sy = h / 2 + (fl.y - STATE.tiltY * 120) * scale;
                    const r = 26 * scale * fl.bloom;

                    bgCtx.save();
                    bgCtx.translate(sx, sy);
                    bgCtx.fillStyle = fl.color;
                    bgCtx.globalAlpha = Math.min(0.9, scale * 1.3);
                    for (let k = 0; k < fl.petals; k++) {
                        bgCtx.rotate((Math.PI * 2) / fl.petals);
                        bgCtx.beginPath();
                        bgCtx.ellipse(0, r * 0.65, r * 0.42, r * 0.8, 0, 0, Math.PI * 2);
                        bgCtx.fill();
                    }
                    bgCtx.beginPath();
                    bgCtx.fillStyle = "#fff8d6";
                    bgCtx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
                    bgCtx.fill();
                    bgCtx.restore();
                });
            }
        } else if (STATE.stage === 3) {
            // Cánh hoa đào rơi 3 lớp chiều sâu (Foreground, Midground, Background)
            particles.forEach((p) => {
                p.y += (0.6 + p.z * 1.4);
                p.x += Math.sin(p.y * 0.015 + p.z * 5) * 0.9 + STATE.tiltX * 0.5;
                p.angle += p.spin * 1.5;
                if (p.y > h + 30) {
                    p.y = -25;
                    p.x = Math.random() * w;
                }

                const size = p.z > 0.8 ? 16 : p.z > 0.35 ? 9 : 5;
                bgCtx.save();
                bgCtx.translate(p.x, p.y);
                bgCtx.rotate(p.angle);
                bgCtx.fillStyle = `rgba(255, 185, 205, ${p.z > 0.8 ? 0.32 : 0.72})`;
                bgCtx.beginPath();
                bgCtx.moveTo(0, -size);
                bgCtx.bezierCurveTo(size, -size * 0.5, size, size * 0.8, 0, size);
                bgCtx.bezierCurveTo(-size, size * 0.8, -size, -size * 0.5, 0, -size);
                bgCtx.fill();
                bgCtx.restore();
            });
        } else if (STATE.stage === 4 || STATE.stage === 5) {
            // Bầu trời đêm ngân hà & Biểu tượng Vô cực (Infinity Constellation) ở Giai đoạn 5
            particles.forEach((p, idx) => {
                if (STATE.stage === 5) {
                    // Hội tụ các hạt sao thành đường cong Vô cực (Lemniscate of Bernoulli)
                    const t = (idx / particles.length) * Math.PI * 2 + performance.now() * 0.0005;
                    const a = Math.min(w, h) * 0.34;
                    const denom = 1 + Math.sin(t) * Math.sin(t);
                    const tx = w / 2 + (a * Math.cos(t)) / denom;
                    const ty = h * 0.24 + (a * Math.sin(t) * Math.cos(t)) / denom;
                    p.x += (tx - p.x) * 0.04;
                    p.y += (ty - p.y) * 0.04;
                } else {
                    p.x += p.vx * 0.25;
                    p.y += p.vy * 0.15;
                    if (p.y < 0) p.y = h;
                    if (p.x < 0) p.x = w;
                    if (p.x > w) p.x = 0;
                }

                bgCtx.beginPath();
                bgCtx.fillStyle = idx % 3 === 0 ? "#ffd166" : "#a8dadc";
                bgCtx.arc(p.x, p.y, 1.2 + p.z * 2.2, 0, Math.PI * 2);
                bgCtx.fill();
            });
        }

        // Hiệu ứng hạt mưa nếu người dùng bật chế độ Khí quyển Mưa Rào
        if (STATE.weatherModes[STATE.weatherIndex] === "rain") {
            bgCtx.strokeStyle = "rgba(200, 225, 255, 0.28)";
            bgCtx.lineWidth = 1;
            particles.forEach((p) => {
                bgCtx.beginPath();
                bgCtx.moveTo(p.x, p.y);
                bgCtx.lineTo(p.x - 4, p.y + 18);
                bgCtx.stroke();
            });
        }

        // 2. Vẽ vệt bụi sao tan biến sau 0.5 giây (Stardust Trail)
        trailCtx.clearRect(0, 0, w, h);
        for (let i = trailParticles.length - 1; i >= 0; i--) {
            const tp = trailParticles[i];
            tp.x += tp.vx;
            tp.y += tp.vy;
            tp.life -= 0.032; // ~0.5 giây ở 60fps
            if (tp.life <= 0) {
                trailParticles.splice(i, 1);
                continue;
            }
            trailCtx.beginPath();
            trailCtx.fillStyle = tp.color;
            trailCtx.globalAlpha = tp.life;
            trailCtx.arc(tp.x, tp.y, tp.size * tp.life, 0, Math.PI * 2);
            trailCtx.fill();
        }
        trailCtx.globalAlpha = 1;

        requestAnimationFrame(renderWorldLoop);
    }

    /* ========================================================================
       4. CHUYỂN CẢNH ĐIỆN ẢNH & ĐIỀU HƯỚNG GIAI ĐOẠN (STAGE TRANSITIONS)
    ======================================================================== */
    function transitionToStage(nextStage, options = {}) {
        const layer = document.getElementById("cinematic-transition");
        const whisper = document.getElementById("transition-whisper");
        const badge = document.getElementById("hud-stage-indicator");

        const stageTitles = {
            1: "Giai đoạn 1/5 • Cánh Cửa Ký Ức",
            2: "Giai đoạn 2/5 • Vườn Địa Đàng 3D",
            3: "Giai đoạn 3/5 • Bức Thư Tay Sống Động",
            4: "Giai đoạn 4/5 • Vũ Trụ Ký Ức Đa Chiều",
            5: "Giai đoạn 5/5 • Chòm Sao Vĩnh Cửu"
        };

        if (options.negativeSpacePause) {
            // Khoảng lặng cảm xúc 2 giây trước khi bùng sáng dải ngân hà
            whisper.textContent = options.whisperText || "“Có những khoảnh khắc hóa thành vĩnh cửu giữa ngân hà...”";
            layer.classList.add("dark-pause");
            setTimeout(() => {
                activateStageDOM(nextStage, stageTitles[nextStage], badge);
                SoundEngine.playFoley("chord");
                layer.classList.remove("dark-pause");
            }, 2100);
        } else {
            layer.classList.add("flash-active");
            setTimeout(() => {
                activateStageDOM(nextStage, stageTitles[nextStage], badge);
            }, 420);
            setTimeout(() => {
                layer.classList.remove("flash-active");
            }, 1050);
        }
    }

    function activateStageDOM(stageNum, label, badgeEl) {
        STATE.stage = stageNum;
        document.body.setAttribute("data-stage", String(stageNum));
        if (badgeEl) badgeEl.textContent = label;

        document.querySelectorAll(".stage-screen").forEach((sec) => {
            sec.classList.remove("active");
        });
        const target = document.getElementById(`stage-${stageNum}`);
        if (target) target.classList.add("active");
    }

    /* ========================================================================
       5. LOGIC GIAI ĐOẠN 1: LAU KÍNH SƯƠNG MÙ, HỘP NHẠC PIN & KINTSUGI
    ======================================================================== */
    function initStage1() {
        const fogCanvas = document.getElementById("fog-canvas");
        const fogWrapper = document.getElementById("fog-overlay-wrapper");
        const fCtx = fogCanvas.getContext("2d");
        let wipedCount = 0;

        function fillFog() {
            fogCanvas.width = window.innerWidth;
            fogCanvas.height = window.innerHeight;
            fCtx.globalCompositeOperation = "source-over";
            const grad = fCtx.createLinearGradient(0, 0, fogCanvas.width, fogCanvas.height);
            grad.addColorStop(0, "rgba(235, 215, 225, 0.92)");
            grad.addColorStop(1, "rgba(195, 165, 185, 0.92)");
            fCtx.fillStyle = grad;
            fCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
        }
        fillFog();

        function wipeAt(x, y) {
            fCtx.globalCompositeOperation = "destination-out";
            const radGrad = fCtx.createRadialGradient(x, y, 10, x, y, 65);
            radGrad.addColorStop(0, "rgba(0,0,0,1)");
            radGrad.addColorStop(1, "rgba(0,0,0,0)");
            fCtx.fillStyle = radGrad;
            fCtx.beginPath();
            fCtx.arc(x, y, 65, 0, Math.PI * 2);
            fCtx.fill();

            wipedCount++;
            if (wipedCount === 5) SoundEngine.playBgm();
            if (wipedCount > 42) {
                fogWrapper.classList.add("cleared");
            }
        }

        fogCanvas.addEventListener("mousemove", (e) => wipeAt(e.clientX, e.clientY));
        fogCanvas.addEventListener("touchmove", (e) => {
            if (e.touches[0]) wipeAt(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });

        document.getElementById("btn-skip-fog").addEventListener("click", () => {
            SoundEngine.playBgm();
            fogWrapper.classList.add("cleared");
        });

        // Xử lý bàn phím Hộp nhạc
        const buds = document.querySelectorAll(".pin-bud");
        const hintEl = document.getElementById("lock-hint-text");
        const lockCard = document.getElementById("lock-card");
        const clueBox = document.getElementById("visual-clue-box");

        function updateBudsUI() {
            buds.forEach((bud, idx) => {
                bud.classList.toggle("bloomed", idx < STATE.enteredPin.length);
            });
        }

        document.querySelectorAll(".key-btn[data-key]").forEach((btn) => {
            btn.addEventListener("click", () => {
                SoundEngine.playBgm();
                if (STATE.enteredPin.length >= 4) return;

                const digit = btn.getAttribute("data-key");
                STATE.enteredPin += digit;
                SoundEngine.playMusicBoxNote(digit);
                updateBudsUI();

                if (STATE.enteredPin.length === 4) {
                    if (STATE.enteredPin === CFG.security.pinCode) {
                        // Nhập đúng mã PIN 2010
                        CFG.security.musicBoxNotes.forEach((f, i) => {
                            setTimeout(() => SoundEngine.playTone(f, 0.9, "triangle", 0.18), i * 110);
                        });
                        setTimeout(() => transitionToStage(2), 650);
                    } else {
                        // Nhập sai: Kích hoạt Gợi ý cấp tiến & Kintsugi
                        STATE.wrongAttempts++;
                        SoundEngine.playErrorDetune();
                        lockCard.classList.add("shake");
                        setTimeout(() => lockCard.classList.remove("shake"), 500);

                        if (STATE.wrongAttempts === 1) {
                            hintEl.textContent = CFG.security.hints[1];
                        } else if (STATE.wrongAttempts === 2) {
                            hintEl.textContent = CFG.security.hints[2];
                            clueBox.classList.remove("hidden");
                        } else {
                            // Lần 3: Hiệu ứng Vỡ kính hàn gắn bằng vàng Kintsugi tự mở khóa
                            hintEl.textContent = CFG.security.hints[3];
                            document.getElementById("kintsugi-svg").classList.add("active");
                            SoundEngine.playFoley("chime");
                            setTimeout(() => transitionToStage(2), 2400);
                        }
                        STATE.enteredPin = "";
                        setTimeout(updateBudsUI, 420);
                    }
                }
            });
        });

        document.getElementById("btn-key-clear").addEventListener("click", () => {
            STATE.enteredPin = STATE.enteredPin.slice(0, -1);
            updateBudsUI();
        });

        document.getElementById("btn-key-hint").addEventListener("click", () => {
            hintEl.textContent = CFG.security.hints[2];
            clueBox.classList.remove("hidden");
        });
    }

    /* ========================================================================
       6. LOGIC GIAI ĐOẠN 2: NHẤN GIỮ 3 GIÂY HAPTIC & VƯỜN ĐỊA ĐÀNG 3D
    ======================================================================== */
    function initStage2() {
        const holdBtn = document.getElementById("btn-dewdrop-hold");
        const circle = document.getElementById("hold-progress-circle");
        const statusEl = document.getElementById("awakening-status");
        const subEl = document.getElementById("awakening-sub");
        let holdInterval = null;

        const circumference = 603;

        function setCircleProgress(pct) {
            const offset = circumference - (pct / 100) * circumference;
            circle.style.strokeDashoffset = String(offset);
        }

        function startHolding(e) {
            if (e.cancelable) e.preventDefault();
            if (STATE.holdCompleted) return;
            holdBtn.classList.add("holding");

            clearInterval(holdInterval);
            holdInterval = setInterval(() => {
                STATE.holdProgress = Math.min(100, STATE.holdProgress + 2);
                setCircleProgress(STATE.holdProgress);

               if (STATE.holdProgress === 2) {
                    statusEl.textContent = "3";
                    statusEl.style.fontSize = "3.8rem";
                    SoundEngine.playTone(440, 0.7, "sine", 0.1);
                } else if (STATE.holdProgress === 36) {
                    statusEl.textContent = "2";
                    if (navigator.vibrate) navigator.vibrate([50, 80, 50]);
                    SoundEngine.playTone(554.37, 0.7, "sine", 0.12);
                } else if (STATE.holdProgress === 70) {
                    statusEl.textContent = "1";
                    SoundEngine.playTone(659.25, 0.9, "sine", 0.15);
                }

                if (STATE.holdProgress >= 100) {
                    clearInterval(holdInterval);
                    STATE.holdCompleted = true;
                    SoundEngine.playFoley("chord");
                    document.getElementById("awakening-container").classList.add("hidden");
                    document.getElementById("eden-overlay").classList.remove("hidden");
                }
            }, 60); // 50 bước x 60ms = 3.0 giây
        }

        function stopHolding() {
            if (STATE.holdCompleted) return;
            holdBtn.classList.remove("holding");
            clearInterval(holdInterval);
            if (STATE.holdProgress > 0 && STATE.holdProgress < 100) {
                statusEl.textContent = "Chỉ một chút nữa thôi... Hãy giữ đủ 3 giây nhé!";
                subEl.textContent = "Ánh sáng đang chờ hơi ấm của bạn";
            }
            STATE.holdProgress = 0;
            setCircleProgress(0);
        }

        holdBtn.addEventListener("mousedown", startHolding);
        holdBtn.addEventListener("touchstart", startHolding, { passive: false });
        window.addEventListener("mouseup", stopHolding);
        window.addEventListener("touchend", stopHolding);

        // Chạm vào phong bì bay lượn để sang Giai đoạn 3
        document.getElementById("btn-open-envelope-stage").addEventListener("click", () => {
            transitionToStage(3);
        });
    }

    /* ========================================================================
       7. LOGIC GIAI ĐOẠN 3: THỔI MICROPHONE, MÁY CHỮ CẢM XÚC & MỰC TÀNG HÌNH
    ======================================================================== */
    let typingTimer = null;

    function initStage3() {
        document.getElementById("mini-seal-initial").textContent = CFG.recipientInitial;
        document.getElementById("wax-seal-letter").textContent = CFG.recipientInitial;
        document.getElementById("letter-date-place").textContent = CFG.eventDate;
        document.getElementById("letter-salutation").textContent = CFG.letter.salutation;
        document.getElementById("thermal-secret-text").textContent = CFG.letter.invisibleInkSecret;
        document.getElementById("signature-name").textContent = CFG.senderSignature;

        const envelopeEl = document.getElementById("vintage-envelope");
        let sealOpened = false;

        function openWaxSeal() {
            if (sealOpened) return;
            sealOpened = true;
            SoundEngine.playFoley("paper");
            SoundEngine.playFoley("chime");
            envelopeEl.classList.add("unfolding");

            // Tạo hiệu ứng bụi vàng bay tung từ dấu sáp
            for (let i = 0; i < 35; i++) {
                addStardust(window.innerWidth / 2, window.innerHeight / 2);
            }

            setTimeout(() => {
                document.getElementById("envelope-ritual").classList.add("hidden");
                document.getElementById("letter-paper-wrapper").classList.remove("hidden");
                startHumanizedTypewriter();
            }, 680);
        }

        document.getElementById("btn-wax-seal").addEventListener("click", openWaxSeal);

        // Tương tác "Hơi Thở" qua Microphone API để thổi bay dấu sáp
        document.getElementById("btn-enable-mic").addEventListener("click", async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const meterWrap = document.getElementById("mic-meter-wrap");
                const meterBar = document.getElementById("mic-meter-bar");
                meterWrap.classList.remove("hidden");

                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 256;
                source.connect(analyser);
                const data = new Uint8Array(analyser.frequencyBinCount);

                function checkBlow() {
                    if (sealOpened) {
                        stream.getTracks().forEach((t) => t.stop());
                        return;
                    }
                    analyser.getByteFrequencyData(data);
                    let sum = 0;
                    for (let i = 0; i < 30; i++) sum += data[i];
                    const avg = sum / 30;
                    const pct = Math.min(100, (avg / 95) * 100);
                    meterBar.style.width = `${pct}%`;

                    if (pct > 68) {
                        stream.getTracks().forEach((t) => t.stop());
                        openWaxSeal();
                        return;
                    }
                    requestAnimationFrame(checkBlow);
                }
                checkBlow();
            } catch (err) {
                // Nếu máy tính không có Mic hoặc từ chối quyền, mở phong bì trực tiếp
                openWaxSeal();
            }
        });

        // Máy chữ nhịp điệu con người (Humanized Typewriter)
        function startHumanizedTypewriter() {
            const container = document.getElementById("letter-typed-content");
            container.innerHTML = "";
            const fullParagraphs = CFG.letter.paragraphs;
            let pIdx = 0;
            let charIdx = 0;
            let currentP = document.createElement("p");
            container.appendChild(currentP);

            function highlightEasterEggs(htmlText) {
                let result = htmlText;
                CFG.letter.easterEggKeywords.forEach((item) => {
                    const regex = new RegExp(`(${item.word})`, "gi");
                    result = result.replace(regex, `<span class="easter-word">$1</span>`);
                });
                return result;
            }

            function typeNextChar() {
                if (pIdx >= fullParagraphs.length) {
                    finishLetterTyping();
                    return;
                }

                const text = fullParagraphs[pIdx];
                charIdx++;
                const slice = text.slice(0, charIdx);
                currentP.innerHTML = highlightEasterEggs(slice);

                // Kiểm tra từ khóa vừa gõ xong để phát âm thanh bối cảnh (Sóng biển / Mưa / Chuông gió)
                CFG.letter.easterEggKeywords.forEach((kw) => {
                    if (slice.toLowerCase().endsWith(kw.word.toLowerCase())) {
                        SoundEngine.playFoley(kw.soundType);
                    }
                });

                const lastChar = slice[slice.length - 1];
                let delay = 28;
                if (lastChar === ",") delay = 180;
                else if (lastChar === "." || lastChar === "!") delay = 340;

                if (charIdx >= text.length) {
                    pIdx++;
                    charIdx = 0;
                    if (pIdx < fullParagraphs.length) {
                        currentP = document.createElement("p");
                        container.appendChild(currentP);
                    }
                    delay = 420;
                }

                typingTimer = setTimeout(typeNextChar, delay);
            }

            typeNextChar();
        }

        function finishLetterTyping() {
            clearTimeout(typingTimer);
            const container = document.getElementById("letter-typed-content");
            container.innerHTML = CFG.letter.paragraphs.map((p) => {
                let html = p;
                CFG.letter.easterEggKeywords.forEach((item) => {
                    const regex = new RegExp(`(${item.word})`, "gi");
                    html = html.replace(regex, `<span class="easter-word">$1</span>`);
                });
                return `<p>${html}</p>`;
            }).join("");

            document.getElementById("pen-nib-cursor").classList.add("hidden");
            document.getElementById("thermal-ink-box").classList.remove("hidden");

            const footer = document.getElementById("letter-footer");
            footer.classList.remove("hidden");
            setTimeout(() => footer.classList.add("signed"), 100);
        }

        document.getElementById("btn-skip-typing").addEventListener("click", finishLetterTyping);

        // Cơ chế Mực Tàng Hình (Nhấn giữ truyền hơi ấm làm hiện chữ ẩn)
        const thermalBox = document.getElementById("thermal-ink-box");
        let warmTimer = null;
        function startWarming() {
            thermalBox.classList.add("warming");
            SoundEngine.playTone(392, 0.8, "sine", 0.06);
            warmTimer = setTimeout(() => {
                thermalBox.classList.add("revealed");
                SoundEngine.playFoley("chime");
            }, 900);
        }
        function stopWarming() {
            thermalBox.classList.remove("warming");
            clearTimeout(warmTimer);
        }
        thermalBox.addEventListener("mousedown", startWarming);
        thermalBox.addEventListener("touchstart", startWarming, { passive: true });
        thermalBox.addEventListener("mouseup", stopWarming);
        thermalBox.addEventListener("touchend", stopWarming);

        // Nút chuyển sang Giai đoạn 4 kèm Khoảng nghỉ cảm xúc (Negative Space 2 giây)
        document.getElementById("btn-to-stage-4").addEventListener("click", () => {
            transitionToStage(4, {
                negativeSpacePause: true,
                whisperText: "“Những dòng chữ khép lại... và cả một vũ trụ ký ức mở ra...”"
            });
        });
    }

    /* ========================================================================
       8. LOGIC GIAI ĐOẠN 4: VŨ TRỤ ẢNH POLAROID 3D, DÂY CHÒM SAO & LẬT 2 MẶT
    ======================================================================== */
    function initStage4() {
        const carousel = document.getElementById("orbit-carousel");
        const svgLines = document.getElementById("constellation-lines-svg");
        const cards = [];

        CFG.memories.forEach((mem, idx) => {
            const card = document.createElement("div");
            card.className = "orbit-polaroid";
            card.innerHTML = `
                <img src="${STATE.resolvedImages[idx] || mem.src}" alt="${mem.caption}">
                <div class="orbit-polaroid-title">${mem.caption}</div>
            `;
            card.addEventListener("click", () => openPolaroidInspector(idx));
            carousel.appendChild(card);
            cards.push(card);
        });

        // Xoay quỹ đạo 360 độ bằng kéo chuột / vuốt tay
        const stageEl = document.getElementById("constellation-stage");
        let dragging = false;
        let startX = 0;

        stageEl.addEventListener("mousedown", (e) => {
            dragging = true;
            startX = e.clientX;
        });
        window.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            startX = e.clientX;
            STATE.targetOrbitAngle += dx * 0.0065;
        });
        window.addEventListener("mouseup", () => { dragging = false; });

        stageEl.addEventListener("touchstart", (e) => {
            if (e.touches[0]) {
                dragging = true;
                startX = e.touches[0].clientX;
            }
        }, { passive: true });
        stageEl.addEventListener("touchmove", (e) => {
            if (!dragging || !e.touches[0]) return;
            const dx = e.touches[0].clientX - startX;
            startX = e.touches[0].clientX;
            STATE.targetOrbitAngle += dx * 0.0065;
        }, { passive: true });
        stageEl.addEventListener("touchend", () => { dragging = false; });

        document.getElementById("btn-prev-orbit").addEventListener("click", () => {
            STATE.targetOrbitAngle -= Math.PI / 3;
        });
        document.getElementById("btn-next-orbit").addEventListener("click", () => {
            STATE.targetOrbitAngle += Math.PI / 3;
        });

        // Vòng lặp cập nhật tọa độ 3D của 6 bức ảnh & vẽ dây tơ ánh sáng nối Chòm sao
        function updateConstellationOrbit() {
            if (STATE.stage === 4) {
                const speed = STATE.isInspectingCard ? 0.0003 : 0.0025; // Chậm lại 90% khi đang mở ảnh
                STATE.targetOrbitAngle += speed;
                STATE.orbitAngle += (STATE.targetOrbitAngle - STATE.orbitAngle) * 0.08;

                const radiusX = Math.min(window.innerWidth * 0.36, 380);
                const radiusZ = 240;
                const points2D = [];

                cards.forEach((card, idx) => {
                    const theta = STATE.orbitAngle + (idx / cards.length) * Math.PI * 2;
                    const x = Math.sin(theta) * radiusX;
                    const z = Math.cos(theta) * radiusZ;
                    const y = Math.sin(theta * 2) * 32;
                    const scale = (z + 420) / 580;

                    card.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) scale(${scale})`;
                    card.style.zIndex = String(Math.round(z + 300));
                    card.style.opacity = String(0.45 + scale * 0.55);

                    points2D.push({
                        x: 600 + (x / radiusX) * 420,
                        y: 350 + y * 1.5
                    });
                });

                // Vẽ sợi chỉ ánh sáng kết nối các bức ảnh thành Chòm sao
                if (points2D.length > 1) {
                    let pathD = `M ${points2D[0].x} ${points2D[0].y}`;
                    for (let i = 1; i < points2D.length; i++) {
                        pathD += ` L ${points2D[i].x} ${points2D[i].y}`;
                    }
                    pathD += " Z";
                    svgLines.innerHTML = `<path d="${pathD}" fill="none" stroke="rgba(247, 208, 112, 0.35)" stroke-width="1.8" stroke-dasharray="6 6" />`;
                }
            }
            requestAnimationFrame(updateConstellationOrbit);
        }
        updateConstellationOrbit();

        // Mở Modal kiểm tra Polaroid 2 mặt + Spatial Audio
        const modal = document.getElementById("polaroid-modal");
        const inspectorCard = document.getElementById("inspector-card");

        function openPolaroidInspector(index) {
            STATE.isInspectingCard = true;
            STATE.activeMemoryIndex = index;
            const mem = CFG.memories[index];

            document.getElementById("modal-img").src = STATE.resolvedImages[index] || mem.src;
            document.getElementById("modal-date-badge").textContent = mem.dateLocation;
            document.getElementById("modal-caption").textContent = mem.caption;
            document.getElementById("modal-back-title").textContent = mem.backTitle;
            document.getElementById("modal-back-story").textContent = mem.backStory;
            document.getElementById("modal-back-quote").textContent = mem.backQuote;

            inspectorCard.classList.remove("flipped");
            modal.classList.remove("hidden");

            // Phát âm thanh không gian (Spatial Audio Panning) riêng cho từng bức ảnh
            const panPos = ((index % 3) - 1) * 0.6;
            SoundEngine.playTone(mem.audioFreq, 1.4, "sine", 0.14, panPos);
        }

        function toggleFlipCard() {
            inspectorCard.classList.toggle("flipped");
            SoundEngine.playFoley("paper");
        }

        inspectorCard.addEventListener("click", toggleFlipCard);
        document.getElementById("btn-flip-polaroid").addEventListener("click", toggleFlipCard);

        // Hiệu ứng nghiêng thẻ bài Hologram 3D theo chuột
        inspectorCard.addEventListener("mousemove", (e) => {
            const rect = inspectorCard.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width - 0.5;
            const relY = (e.clientY - rect.top) / rect.height - 0.5;
            const rotY = (inspectorCard.classList.contains("flipped") ? 180 : 0) + relX * 18;
            const rotX = -relY * 18;
            inspectorCard.style.transform = `rotateY(${rotY}deg) rotateX(${rotX}deg)`;
        });

        inspectorCard.addEventListener("mouseleave", () => {
            inspectorCard.style.transform = inspectorCard.classList.contains("flipped")
                ? "rotateY(180deg)"
                : "rotateY(0deg)";
        });

        // Nút phát giai điệu Voice Note ở mặt sau Polaroid
        document.getElementById("btn-play-voice").addEventListener("click", (e) => {
            e.stopPropagation();
            const wf = document.getElementById("voice-waveform");
            wf.classList.add("playing");
            const base = CFG.memories[STATE.activeMemoryIndex].audioFreq;
            [base, base * 1.25, base * 1.5, base * 2].forEach((f, i) => {
                setTimeout(() => SoundEngine.playTone(f, 0.65, "triangle", 0.14), i * 220);
            });
            setTimeout(() => wf.classList.remove("playing"), 1400);
        });

        function closeInspector() {
            STATE.isInspectingCard = false;
            modal.classList.add("hidden");
        }
        document.getElementById("btn-close-modal").addEventListener("click", closeInspector);
        document.getElementById("modal-backdrop").addEventListener("click", closeInspector);

        document.getElementById("btn-to-stage-5").addEventListener("click", () => {
            transitionToStage(5);
        });
    }

    /* ========================================================================
       9. LOGIC GIAI ĐOẠN 5: XUẤT THIỆP LƯU NIỆM (.PNG) & CHẾ ĐỘ AR PHYGITAL
    ======================================================================== */
    function initStage5() {
        document.getElementById("keepsake-recipient").textContent = `Gửi ${CFG.recipientName}`;
        document.getElementById("keepsake-quote").textContent = CFG.keepsake.summaryQuote;
        document.getElementById("ar-riddle-text").textContent = CFG.keepsake.arGiftRiddle;

        // Đổi ảnh đại diện trên tấm thiệp lưu niệm
        document.getElementById("btn-switch-keepsake-img").addEventListener("click", () => {
            STATE.keepsakeImgIndex = (STATE.keepsakeImgIndex + 1) % CFG.memories.length;
            refreshRenderedImages();
            SoundEngine.playTone(659.25, 0.4, "sine", 0.1);
        });

        // Kết xuất Tấm Thiệp Kỷ Niệm ra file ảnh .PNG chất lượng cao tải về máy
        document.getElementById("btn-download-keepsake").addEventListener("click", () => {
            const outCanvas = document.createElement("canvas");
            outCanvas.width = 900;
            outCanvas.height = 1200;
            const ctx = outCanvas.getContext("2d");

            // Nền Gradient sang trọng
            const g = ctx.createLinearGradient(0, 0, 900, 1200);
            g.addColorStop(0, "#19102c");
            g.addColorStop(0.5, "#381c46");
            g.addColorStop(1, "#5c2751");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 900, 1200);

            // Khung viền vàng kim
            ctx.strokeStyle = "#f7d070";
            ctx.lineWidth = 4;
            ctx.strokeRect(45, 45, 810, 1110);

            ctx.fillStyle = "#f7d070";
            ctx.font = "600 22px 'Be Vietnam Pro', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("HAPPY VIETNAMESE WOMEN'S DAY • 20.10.2026", 450, 110);

            // Vẽ ảnh kỷ niệm đã chọn
            const imgEl = document.getElementById("keepsake-featured-img");
            try {
                ctx.drawImage(imgEl, 120, 150, 660, 560);
            } catch (e) {
                ctx.fillStyle = "#ff9ebb";
                ctx.fillRect(120, 150, 660, 560);
            }
            ctx.strokeRect(120, 150, 660, 560);

            // Tên & Trích dẫn
            ctx.fillStyle = "#ffd166";
            ctx.font = "bold 56px 'Dancing Script', cursive";
            ctx.fillText(`Gửi ${CFG.recipientName}`, 450, 800);

            ctx.fillStyle = "#fff8fa";
            ctx.font = "italic 30px 'Cormorant Garamond', serif";
            const words = CFG.keepsake.summaryQuote.split(" ");
            let line = "";
            let y = 875;
            words.forEach((w) => {
                const test = line + w + " ";
                if (ctx.measureText(test).width > 680) {
                    ctx.fillText(line, 450, y);
                    line = w + " ";
                    y += 44;
                } else {
                    line = test;
                }
            });
            ctx.fillText(line, 450, y);

            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "22px 'Be Vietnam Pro', sans-serif";
            ctx.fillText(`✨ ${CFG.senderSignature} • 20/10/2026 ✨`, 450, 1095);

            const link = document.createElement("a");
            link.download = "Thiep-Ky-Niem-20-10.png";
            link.href = outCanvas.toDataURL("image/png");
            link.click();
            SoundEngine.playFoley("chime");
        });

        // Chế độ AR Đặt Đóa Hoa Ánh Sáng 3D Lên Bàn
        const arModal = document.getElementById("ar-modal");
        const arVideo = document.getElementById("ar-camera-video");
        const arCanvas = document.getElementById("ar-flower-canvas");
        let arStream = null;
        let arAnimId = null;

        document.getElementById("btn-open-ar").addEventListener("click", async () => {
            arModal.classList.remove("hidden");
            try {
                arStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment" },
                    audio: false
                });
                arVideo.srcObject = arStream;
            } catch (e) {
                // Nếu không có camera, hiển thị nền bàn gỗ ảo lung linh
                arVideo.style.background = "radial-gradient(circle, #3d2622, #120d16)";
            }

            const aCtx = arCanvas.getContext("2d");
            arCanvas.width = 520;
            arCanvas.height = 440;
            let angle = 0;

            function drawARFlower() {
                aCtx.clearRect(0, 0, arCanvas.width, arCanvas.height);
                angle += 0.025;
                const cx = arCanvas.width / 2;
                const cy = arCanvas.height / 2 - 40;

                aCtx.save();
                aCtx.translate(cx, cy);
                for (let i = 0; i < 12; i++) {
                    aCtx.rotate((Math.PI * 2) / 12);
                    aCtx.fillStyle = i % 2 === 0 ? "rgba(255, 160, 200, 0.78)" : "rgba(255, 215, 112, 0.78)";
                    aCtx.beginPath();
                    const r = 55 + Math.sin(angle + i) * 8;
                    aCtx.ellipse(0, r * 0.5, 18, r * 0.65, 0, 0, Math.PI * 2);
                    aCtx.fill();
                }
                aCtx.beginPath();
                aCtx.fillStyle = "#fff8d6";
                aCtx.arc(0, 0, 22, 0, Math.PI * 2);
                aCtx.fill();
                aCtx.restore();

                arAnimId = requestAnimationFrame(drawARFlower);
            }
            drawARFlower();
        });

        document.getElementById("btn-close-ar").addEventListener("click", () => {
            arModal.classList.add("hidden");
            cancelAnimationFrame(arAnimId);
            if (arStream) arStream.getTracks().forEach((t) => t.stop());
        });

        // Nút Trải nghiệm lại từ đầu
        document.getElementById("btn-restart-journey").addEventListener("click", () => {
            STATE.enteredPin = "";
            STATE.holdProgress = 0;
            STATE.holdCompleted = false;
            document.querySelectorAll(".pin-bud").forEach((b) => b.classList.remove("bloomed"));
            document.getElementById("awakening-container").classList.remove("hidden");
            document.getElementById("eden-overlay").classList.add("hidden");
            transitionToStage(1);
        });
    }

    /* ========================================================================
       10. KHỞI CHẠY HỆ THỐNG & HUD ĐIỀU KHIỂN THỜI TIẾT / ÂM THANH
    ======================================================================== */
    function initHUD() {
        // Tự động nhận diện giờ thực tế để chọn chế độ Khí quyển ban đầu
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) STATE.weatherIndex = 1; // Buổi sáng
        else if (hour >= 19 || hour < 5) STATE.weatherIndex = 2; // Đêm sao

        const applyWeather = () => {
            document.body.setAttribute("data-weather", STATE.weatherModes[STATE.weatherIndex]);
            document.getElementById("hud-weather-label").textContent = STATE.weatherLabels[STATE.weatherIndex];
        };
        applyWeather();

        document.getElementById("btn-weather-mode").addEventListener("click", () => {
            STATE.weatherIndex = (STATE.weatherIndex + 1) % STATE.weatherModes.length;
            applyWeather();
            SoundEngine.playTone(587.33, 0.4, "sine", 0.08);
        });

        const audioBtn = document.getElementById("btn-audio-toggle");
        audioBtn.addEventListener("click", () => {
            STATE.audioEnabled = !STATE.audioEnabled;
            audioBtn.classList.toggle("active", STATE.audioEnabled);
            document.getElementById("audio-icon").textContent = STATE.audioEnabled ? "🔊" : "🔇";
            document.getElementById("audio-text").textContent = STATE.audioEnabled ? "Âm thanh: Bật" : "Âm thanh: Tắt";

            const audioEl = document.getElementById("bgm-audio");
            if (!STATE.audioEnabled && audioEl) audioEl.pause();
            else if (STATE.audioEnabled) SoundEngine.playBgm();
        });
    }

    window.addEventListener("DOMContentLoaded", () => {
        preloadMemories();
        initHUD();
        initStage1();
        initStage2();
        initStage3();
        initStage4();
        initStage5();
        renderWorldLoop();
    });
})();
/**
 * ============================================================================
 * MODULE MỞ RỘNG CAO CẤP:
 * 1. BỘ TẠO PHÁO HOA 3D WEBGL (CUSTOM GLSL SHADERS + 3D PERSPECTIVE + AUDIO)
 * 2. BỘ CHỈNH SỬA LỜI CHÚC TRỰC TIẾP TRÊN GIAO DIỆN (LIVE STUDIO EDITOR)
 * ============================================================================
 */

(function () {
    "use strict";

    const CFG = window.PROJECT_CONFIG;

    /* ========================================================================
       PHẦN A: KHỞI TẠO ÂM THANH PHÁO HOA 3D (SYNTHETIC FIREWORK AUDIO)
    ======================================================================== */
    const FireworkAudio = {
        ctx: null,

        ensureContext() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) this.ctx = new AudioCtx();
            }
            if (this.ctx && this.ctx.state === "suspended") {
                this.ctx.resume();
            }
        },

        isMuted() {
            const btn = document.getElementById("btn-audio-toggle");
            return btn && !btn.classList.contains("active");
        },

        // Tiếng rít pháo bay lên bầu trời (Rocket Whistle)
        playLaunchWhistle(pan = 0) {
            if (this.isMuted()) return;
            this.ensureContext();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(340, now);
            osc.frequency.exponentialRampToValueAtTime(1180, now + 0.55);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.035, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

            if (this.ctx.createStereoPanner) {
                const panner = this.ctx.createStereoPanner();
                panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
                osc.connect(gain);
                gain.connect(panner);
                panner.connect(this.ctx.destination);
            } else {
                osc.connect(gain);
                gain.connect(this.ctx.destination);
            }

            osc.start(now);
            osc.stop(now + 0.6);
        },

        // Tiếng nổ trầm (Deep Bass Boom) + Tiếng lách tách kim tuyến (Sparkle Crackle)
        playExplosionBoom(pan = 0, scale = 1.0) {
            if (this.isMuted()) return;
            this.ensureContext();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const dur = 1.45 * scale;
            const bufferSize = Math.floor(this.ctx.sampleRate * dur);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                const env = Math.pow(1 - i / bufferSize, 1.8);
                data[i] = (Math.random() * 2 - 1) * env;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(260, now);
            filter.frequency.exponentialRampToValueAtTime(55, now + dur);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.24 * scale, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

            if (this.ctx.createStereoPanner) {
                const panner = this.ctx.createStereoPanner();
                panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), now);
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(panner);
                panner.connect(this.ctx.destination);
            } else {
                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.ctx.destination);
            }

            noise.start(now);

            // Âm thanh chuông ngân nhẹ hòa quyện cùng pháo hoa
            const bellFreqs = [523.25, 659.25, 783.99, 1046.5, 1318.5];
            const pick = bellFreqs[Math.floor(Math.random() * bellFreqs.length)];
            const osc = this.ctx.createOscillator();
            const bellGain = this.ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(pick, now);
            bellGain.gain.setValueAtTime(0.04, now);
            bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
            osc.connect(bellGain);
            bellGain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 1.15);
        }
    };

    /* ========================================================================
       PHẦN B: ENGINE PHÁO HOA 3D WEBGL (CUSTOM SHADERS + FALLBACK 2D)
    ======================================================================== */
    class WebGLFireworks3DEngine {
        constructor() {
            this.canvas = document.createElement("canvas");
            this.canvas.id = "webgl-fireworks-canvas";
            document.body.appendChild(this.canvas);

            this.gl = this.canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false }) ||
                      this.canvas.getContext("experimental-webgl", { alpha: true });

            this.useWebGL = Boolean(this.gl);
            this.ctx2d = !this.useWebGL ? this.canvas.getContext("2d") : null;

            this.rockets = [];
            this.sparks = [];
            this.maxSparks = 6000;

            this.autoFire = true;
            this.patternMode = "auto"; // auto | heart | sphere | ring | willow
            this.interactiveClick = false;
            this.cameraYaw = 0;
            this.cameraPitch = 0;
            this.autoTimer = 0;

            this.palettes = [
                [[1.0, 0.62, 0.76], [1.0, 0.85, 0.45], [1.0, 0.92, 0.96]], // Hồng Vàng Hoàng Gia
                [[0.55, 0.88, 1.0], [0.75, 0.62, 1.0], [1.0, 0.95, 1.0]],  // Ngân Hà Xanh Tím
                [[1.0, 0.82, 0.35], [1.0, 0.52, 0.28], [1.0, 0.96, 0.80]], // Kim Tuyến Hổ Phách
                [[0.52, 0.98, 0.72], [0.45, 0.85, 0.98], [1.0, 0.84, 0.45]] // Lục Bảo Tinh Tú
            ];

            if (this.useWebGL) {
                this.initWebGLShaders();
            }

            this.resize();
            window.addEventListener("resize", () => this.resize());
            this.bindPointerEvents();
            this.startLoop();
        }

        initWebGLShaders() {
            const gl = this.gl;

            const vsSource = `
                attribute vec3 aPosition;
                attribute vec4 aColor;
                attribute float aSize;

                uniform mat4 uProjectionMatrix;
                uniform mat4 uViewMatrix;

                varying vec4 vColor;

                void main(void) {
                    vec4 viewPos = uViewMatrix * vec4(aPosition, 1.0);
                    gl_Position = uProjectionMatrix * viewPos;
                    float dist = max(1.0, -viewPos.z);
                    gl_PointSize = clamp(aSize * (520.0 / dist), 1.5, 48.0);
                    vColor = aColor;
                }
            `;

            const fsSource = `
                precision mediump float;
                varying vec4 vColor;

                void main(void) {
                    vec2 uv = gl_PointCoord - vec2(0.5);
                    float d = length(uv) * 2.0;
                    if (d > 1.0) discard;
                    float core = pow(max(0.0, 1.0 - d), 2.2);
                    float halo = pow(max(0.0, 1.0 - d), 0.7) * 0.45;
                    gl_FragColor = vec4(vColor.rgb, vColor.a * (core + halo));
                }
            `;

            const compileShader = (type, src) => {
                const shader = gl.createShader(type);
                gl.shaderSource(shader, src);
                gl.compileShader(shader);
                if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                    gl.deleteShader(shader);
                    return null;
                }
                return shader;
            };

            const vs = compileShader(gl.VERTEX_SHADER, vsSource);
            const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);

            this.program = gl.createProgram();
            gl.attachShader(this.program, vs);
            gl.attachShader(this.program, fs);
            gl.linkProgram(this.program);

            this.attribLocations = {
                position: gl.getAttribLocation(this.program, "aPosition"),
                color: gl.getAttribLocation(this.program, "aColor"),
                size: gl.getAttribLocation(this.program, "aSize")
            };

            this.uniformLocations = {
                projection: gl.getUniformLocation(this.program, "uProjectionMatrix"),
                view: gl.getUniformLocation(this.program, "uViewMatrix")
            };

            // 8 floats mỗi hạt: x, y, z, r, g, b, a, size
            this.stride = 8 * Float32Array.BYTES_PER_ELEMENT;
            this.vertexData = new Float32Array(this.maxSparks * 8);
            this.vbo = gl.createBuffer();
        }

        resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = Math.floor(window.innerWidth * dpr);
            this.canvas.height = Math.floor(window.innerHeight * dpr);
            if (this.useWebGL) {
                this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        bindPointerEvents() {
            window.addEventListener("mousemove", (e) => {
                const nx = (e.clientX / window.innerWidth) - 0.5;
                const ny = (e.clientY / window.innerHeight) - 0.5;
                this.cameraYaw += (nx * 0.45 - this.cameraYaw) * 0.08;
                this.cameraPitch += (-ny * 0.28 - this.cameraPitch) * 0.08;
            });

            window.addEventListener("pointerdown", (e) => {
                if (!this.interactiveClick) return;
                // Tránh bắn pháo hoa khi người dùng đang bấm vào nút giao diện hoặc hộp thoại
                if (e.target.closest("button, input, textarea, select, .studio-window, .fireworks-dock, .lock-card, .letter-sheet, .polaroid-3d-card, .keepsake-card")) {
                    return;
                }
                const worldX = ((e.clientX / window.innerWidth) - 0.5) * 440;
                const worldY = (0.5 - (e.clientY / window.innerHeight)) * 280 + 40;
                const worldZ = (Math.random() - 0.5) * 140;
                this.launchRocket(worldX, worldY, worldZ, this.patternMode);
            });
        }

        launchRocket(targetX, targetY, targetZ, pattern = "auto") {
            const startX = targetX + (Math.random() - 0.5) * 60;
            const startY = -220;
            const startZ = targetZ + (Math.random() - 0.5) * 40;

            const flightFrames = 48 + Math.random() * 14;
            this.rockets.push({
                x: startX,
                y: startY,
                z: startZ,
                vx: (targetX - startX) / flightFrames,
                vy: (targetY - startY) / flightFrames,
                vz: (targetZ - startZ) / flightFrames,
                remainingFrames: flightFrames,
                pattern: pattern === "auto"
                    ? ["sphere", "heart", "ring", "willow"][Math.floor(Math.random() * 4)]
                    : pattern,
                palette: this.palettes[Math.floor(Math.random() * this.palettes.length)]
            });

            FireworkAudio.playLaunchWhistle(Math.max(-1, Math.min(1, targetX / 240)));
        }

        launchSalvo(count = 5) {
            const patterns = ["heart", "sphere", "ring", "willow", "heart"];
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const tx = (i - (count - 1) / 2) * 85 + (Math.random() - 0.5) * 25;
                    const ty = 45 + Math.random() * 95;
                    const tz = (Math.random() - 0.5) * 160;
                    const pat = this.patternMode === "auto" ? patterns[i % patterns.length] : this.patternMode;
                    this.launchRocket(tx, ty, tz, pat);
                }, i * 210);
            }
        }

        explode3D(rocket) {
            const { x, y, z, pattern, palette } = rocket;
            const count = pattern === "willow" ? 260 : 220;

            FireworkAudio.playExplosionBoom(Math.max(-1, Math.min(1, x / 240)), pattern === "willow" ? 1.2 : 1.0);

            for (let i = 0; i < count; i++) {
                if (this.sparks.length >= this.maxSparks) {
                    this.sparks.shift();
                }

                let vx = 0, vy = 0, vz = 0;
                const speed = 2.6 + Math.random() * 2.2;
                const col = palette[i % palette.length];

                if (pattern === "heart") {
                    // Công thức Toán học Trái Tim 3D (3D Parametric Heart)
                    const t = (i / count) * Math.PI * 2;
                    const hx = 16 * Math.pow(Math.sin(t), 3);
                    const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
                    const hz = (Math.random() - 0.5) * 6;
                    const scale = 0.24;
                    vx = hx * scale;
                    vy = hy * scale;
                    vz = hz * scale;
                } else if (pattern === "ring") {
                    // Vòng Xoắn Sao Thổ & Quỹ Đạo Đôi
                    const theta = (i / count) * Math.PI * 2;
                    if (i % 3 === 0) {
                        const u = Math.random() * 2 - 1;
                        const phi = Math.random() * Math.PI * 2;
                        const r = Math.sqrt(1 - u * u) * speed * 0.65;
                        vx = Math.cos(phi) * r;
                        vy = u * speed * 0.65;
                        vz = Math.sin(phi) * r;
                    } else {
                        const ringR = speed * 1.25;
                        vx = Math.cos(theta) * ringR;
                        vz = Math.sin(theta) * ringR;
                        vy = Math.sin(theta * 2) * 0.7;
                    }
                } else {
                    // Quả cầu Cúc Đại Đóa 3D (Fibonacci / Uniform Sphere) & Liễu Rủ (Willow)
                    const u = Math.random() * 2 - 1;
                    const theta = Math.random() * Math.PI * 2;
                    const r = Math.sqrt(1 - u * u);
                    const s = pattern === "willow" ? speed * (0.6 + Math.random() * 0.8) : speed;
                    vx = r * Math.cos(theta) * s;
                    vy = u * s;
                    vz = r * Math.sin(theta) * s;
                }

                this.sparks.push({
                    x, y, z,
                    vx, vy, vz,
                    r: col[0],
                    g: col[1],
                    b: col[2],
                    alpha: 1.0,
                    decay: pattern === "willow" ? (0.007 + Math.random() * 0.006) : (0.012 + Math.random() * 0.01),
                    gravity: pattern === "willow" ? 0.042 : 0.026,
                    drag: pattern === "willow" ? 0.985 : 0.976,
                    size: pattern === "willow" ? (10 + Math.random() * 8) : (12 + Math.random() * 10),
                    twinkle: Math.random() * Math.PI * 2
                });
            }
        }

        buildPerspectiveMatrix(fovRad, aspect, near, far) {
            const f = 1.0 / Math.tan(fovRad / 2);
            const nf = 1 / (near - far);
            return new Float32Array([
                f / aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (far + near) * nf, -1,
                0, 0, (2 * far * near) * nf, 0
            ]);
        }

        buildViewMatrix(yaw, pitch, distance) {
            const cy = Math.cos(yaw), sy = Math.sin(yaw);
            const cp = Math.cos(pitch), sp = Math.sin(pitch);

            return new Float32Array([
                cy, sp * sy, -cp * sy, 0,
                0, cp, sp, 0,
                sy, -sp * cy, cp * cy, 0,
                0, 0, -distance, 1
            ]);
        }

        updatePhysics() {
            const currentStage = Number(document.body.getAttribute("data-stage") || 1);

            // Tự động bắn pháo hoa nghệ thuật ở Giai đoạn 2 (Vườn hoa), 4 (Ngân hà) và rực rỡ nhất ở Giai đoạn 5 (Grand Finale)
            if (this.autoFire && (currentStage === 2 || currentStage === 4 || currentStage === 5)) {
                this.autoTimer++;
                const interval = currentStage === 5 ? 52 : 115;
                if (this.autoTimer >= interval) {
                    this.autoTimer = 0;
                    const tx = (Math.random() - 0.5) * 340;
                    const ty = 35 + Math.random() * 115;
                    const tz = (Math.random() - 0.5) * 160;
                    this.launchRocket(tx, ty, tz, this.patternMode);
                }
            }

            // Cập nhật tên lửa đang bay lên
            for (let i = this.rockets.length - 1; i >= 0; i--) {
                const rk = this.rockets[i];
                rk.x += rk.vx;
                rk.y += rk.vy;
                rk.z += rk.vz;
                rk.remainingFrames--;

                // Đuôi lửa lấp lánh của tên lửa
                if (this.sparks.length < this.maxSparks) {
                    this.sparks.push({
                        x: rk.x + (Math.random() - 0.5) * 2,
                        y: rk.y + (Math.random() - 0.5) * 2,
                        z: rk.z,
                        vx: (Math.random() - 0.5) * 0.4,
                        vy: -0.8 - Math.random() * 0.5,
                        vz: (Math.random() - 0.5) * 0.4,
                        r: 1.0, g: 0.86, b: 0.52,
                        alpha: 0.85,
                        decay: 0.055,
                        gravity: 0.01,
                        drag: 0.96,
                        size: 9,
                        twinkle: 0
                    });
                }

                if (rk.remainingFrames <= 0) {
                    this.explode3D(rk);
                    this.rockets.splice(i, 1);
                }
            }

            // Cập nhật các hạt pháo hoa 3D
            for (let i = this.sparks.length - 1; i >= 0; i--) {
                const sp = this.sparks[i];
                sp.vx *= sp.drag;
                sp.vy = sp.vy * sp.drag - sp.gravity;
                sp.vz *= sp.drag;

                sp.x += sp.vx;
                sp.y += sp.vy;
                sp.z += sp.vz;

                sp.twinkle += 0.22;
                sp.alpha -= sp.decay;

                if (sp.alpha <= 0.01) {
                    this.sparks.splice(i, 1);
                }
            }
        }

        renderWebGL() {
            const gl = this.gl;
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            const count = this.sparks.length;
            if (count === 0) return;

            let offset = 0;
            for (let i = 0; i < count; i++) {
                const sp = this.sparks[i];
                const flicker = 0.78 + 0.22 * Math.sin(sp.twinkle);
                this.vertexData[offset++] = sp.x;
                this.vertexData[offset++] = sp.y;
                this.vertexData[offset++] = sp.z;
                this.vertexData[offset++] = sp.r;
                this.vertexData[offset++] = sp.g;
                this.vertexData[offset++] = sp.b;
                this.vertexData[offset++] = Math.max(0, sp.alpha * flicker);
                this.vertexData[offset++] = sp.size;
            }

            gl.useProgram(this.program);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // Additive Blending phát sáng rực rỡ

            const aspect = this.canvas.width / Math.max(1, this.canvas.height);
            const projMatrix = this.buildPerspectiveMatrix(Math.PI / 3.2, aspect, 1.0, 2000.0);
            const viewMatrix = this.buildViewMatrix(this.cameraYaw, this.cameraPitch, 460.0);

            gl.uniformMatrix4fv(this.uniformLocations.projection, false, projMatrix);
            gl.uniformMatrix4fv(this.uniformLocations.view, false, viewMatrix);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.subarray(0, count * 8), gl.DYNAMIC_DRAW);

            gl.enableVertexAttribArray(this.attribLocations.position);
            gl.vertexAttribPointer(this.attribLocations.position, 3, gl.FLOAT, false, this.stride, 0);

            gl.enableVertexAttribArray(this.attribLocations.color);
            gl.vertexAttribPointer(this.attribLocations.color, 4, gl.FLOAT, false, this.stride, 3 * 4);

            gl.enableVertexAttribArray(this.attribLocations.size);
            gl.vertexAttribPointer(this.attribLocations.size, 1, gl.FLOAT, false, this.stride, 7 * 4);

            gl.drawArrays(gl.POINTS, 0, count);
        }

        renderFallback2D() {
            const ctx = this.ctx2d;
            const w = this.canvas.width;
            const h = this.canvas.height;
            ctx.clearRect(0, 0, w, h);

            const fov = 440;
            for (let i = 0; i < this.sparks.length; i++) {
                const sp = this.sparks[i];
                const scale = fov / Math.max(40, fov + 460 - sp.z);
                const sx = w / 2 + sp.x * scale;
                const sy = h / 2 - sp.y * scale;
                ctx.beginPath();
                ctx.fillStyle = `rgba(${Math.round(sp.r * 255)}, ${Math.round(sp.g * 255)}, ${Math.round(sp.b * 255)}, ${sp.alpha})`;
                ctx.arc(sx, sy, Math.max(1.5, sp.size * scale * 0.35), 0, Math.PI * 2);
                ctx.fill();
            }
        }

        startLoop() {
            const tick = () => {
                this.updatePhysics();
                if (this.useWebGL) this.renderWebGL();
                else if (this.ctx2d) this.renderFallback2D();
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }
    }

    /* ========================================================================
       PHẦN C: THANH ĐIỀU KHIỂN PHÁO HOA 3D (FIREWORKS CONTROL DOCK)
    ======================================================================== */
    function mountFireworksDock(fwEngine) {
        const dock = document.createElement("div");
        dock.className = "fireworks-dock";
        dock.innerHTML = `
            <span class="fw-dock-label">🎆 Pháo Hoa 3D WebGL:</span>
            <select id="fw-pattern-select" class="fw-select" title="Chọn kiểu nổ pháo hoa 3D">
                <option value="auto">✨ Ngẫu nhiên đa tầng</option>
                <option value="heart">💖 Trái Tim 3D</option>
                <option value="sphere">🌸 Cúc Đại Đóa 3D</option>
                <option value="ring">🪐 Vòng Xoắn Ngân Hà</option>
                <option value="willow">🌟 Mưa Sao Băng Vàng</option>
            </select>
            <button type="button" id="btn-fw-salvo" class="fw-btn active">🚀 Bắn Đại Lễ (Salvo)</button>
            <button type="button" id="btn-fw-click-mode" class="fw-btn" title="Chạm bất kỳ đâu trên bầu trời để bắn pháo hoa">👆 Chạm để bắn: Tắt</button>
            <button type="button" id="btn-fw-auto" class="fw-btn active">🔄 Tự động: Bật</button>
        `;
        document.body.appendChild(dock);

        document.getElementById("fw-pattern-select").addEventListener("change", (e) => {
            fwEngine.patternMode = e.target.value;
            fwEngine.launchSalvo(3);
        });

        document.getElementById("btn-fw-salvo").addEventListener("click", () => {
            fwEngine.launchSalvo(6);
        });

        const clickBtn = document.getElementById("btn-fw-click-mode");
        clickBtn.addEventListener("click", () => {
            fwEngine.interactiveClick = !fwEngine.interactiveClick;
            clickBtn.classList.toggle("active", fwEngine.interactiveClick);
            clickBtn.textContent = fwEngine.interactiveClick ? "👆 Chạm để bắn: Bật" : "👆 Chạm để bắn: Tắt";
        });

        const autoBtn = document.getElementById("btn-fw-auto");
        autoBtn.addEventListener("click", () => {
            fwEngine.autoFire = !fwEngine.autoFire;
            autoBtn.classList.toggle("active", fwEngine.autoFire);
            autoBtn.textContent = fwEngine.autoFire ? "🔄 Tự động: Bật" : "🔄 Tự động: Tắt";
        });
    }

    /* ========================================================================
       PHẦN D: BỘ CHỈNH SỬA LỜI CHÚC TRỰC TIẾP TRÊN GIAO DIỆN (LIVE STUDIO EDITOR)
    ======================================================================== */
    const STORAGE_KEY = "PROJECT_20_10_CUSTOM_CONFIG_V1";

    function loadSavedConfig() {
        // 1. Ưu tiên đọc từ URL Hash nếu người nhận mở từ Link chia sẻ
        if (window.location.hash && window.location.hash.startsWith("#gift=")) {
            try {
                const encoded = window.location.hash.replace("#gift=", "");
                const jsonStr = decodeURIComponent(escape(atob(encoded)));
                const parsed = JSON.parse(jsonStr);
                Object.assign(CFG, parsed);
                return;
            } catch (e) {
                console.warn("Không thể giải mã cấu hình từ URL Hash:", e);
            }
        }

        // 2. Đọc từ localStorage nếu đã từng chỉnh sửa trên trình duyệt
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                Object.assign(CFG, parsed);
            }
        } catch (e) {
            console.warn("Không thể đọc localStorage:", e);
        }
    }

    function applyLiveConfigToDOM() {
        // Cập nhật Giai đoạn 1
        const hintEl = document.getElementById("lock-hint-text");
        if (hintEl && CFG.security && CFG.security.hints[0]) {
            hintEl.textContent = CFG.security.hints[0];
        }

        // Cập nhật Giai đoạn 2 & 3
        const miniSeal = document.getElementById("mini-seal-initial");
        if (miniSeal) miniSeal.textContent = CFG.recipientInitial;
        const waxSeal = document.getElementById("wax-seal-letter");
        if (waxSeal) waxSeal.textContent = CFG.recipientInitial;
        const dateEl = document.getElementById("letter-date-place");
        if (dateEl) dateEl.textContent = CFG.eventDate;
        const salutationEl = document.getElementById("letter-salutation");
        if (salutationEl) salutationEl.textContent = CFG.letter.salutation;
        const secretEl = document.getElementById("thermal-secret-text");
        if (secretEl) secretEl.textContent = CFG.letter.invisibleInkSecret;
        const sigEl = document.getElementById("signature-name");
        if (sigEl) sigEl.textContent = CFG.senderSignature;

        // Cập nhật nội dung thư nếu thư đã được mở
        const typedContainer = document.getElementById("letter-typed-content");
        if (typedContainer && typedContainer.children.length > 0) {
            typedContainer.innerHTML = CFG.letter.paragraphs.map((p) => {
                let html = p;
                CFG.letter.easterEggKeywords.forEach((item) => {
                    const regex = new RegExp(`(${item.word})`, "gi");
                    html = html.replace(regex, `<span class="easter-word">$1</span>`);
                });
                return `<p>${html}</p>`;
            }).join("");
        }

        // Cập nhật 6 thẻ Polaroid ở Giai đoạn 4
        const orbitCards = document.querySelectorAll(".orbit-polaroid");
        orbitCards.forEach((card, idx) => {
            const mem = CFG.memories[idx];
            if (!mem) return;
            const img = card.querySelector("img");
            const title = card.querySelector(".orbit-polaroid-title");
            if (img && mem.customDataUrl) img.src = mem.customDataUrl;
            if (title) title.textContent = mem.caption;
        });

        // Cập nhật Giai đoạn 5
        const recEl = document.getElementById("keepsake-recipient");
        if (recEl) recEl.textContent = `Gửi ${CFG.recipientName}`;
        const quoteEl = document.getElementById("keepsake-quote");
        if (quoteEl) quoteEl.textContent = CFG.keepsake.summaryQuote;
        const arRiddleEl = document.getElementById("ar-riddle-text");
        if (arRiddleEl) arRiddleEl.textContent = CFG.keepsake.arGiftRiddle;
        const keepsakeImg = document.getElementById("keepsake-featured-img");
        if (keepsakeImg && CFG.memories[0] && CFG.memories[0].customDataUrl) {
            keepsakeImg.src = CFG.memories[0].customDataUrl;
        }
    }

    function generateConfigJSContent() {
        const cleanCopy = JSON.parse(JSON.stringify(CFG));
        return `/**\n * TỆP CẤU HÌNH ĐÃ ĐƯỢC XUẤT TỪ LIVE STUDIO EDITOR (js/config.js)\n */\n\nwindow.PROJECT_CONFIG = ${JSON.stringify(cleanCopy, null, 4)};\n`;
    }

    function mountLiveStudioEditor(fwEngine) {
        // 1. Thêm nút mở trình chỉnh sửa lên thanh HUD góc phải
        const hudRight = document.querySelector(".hud-right");
        const openStudioBtn = document.createElement("button");
        openStudioBtn.type = "button";
        openStudioBtn.className = "hud-btn active";
        openStudioBtn.id = "btn-open-studio";
        openStudioBtn.title = "Tuỳ chỉnh trực tiếp lời chúc, mã PIN, tâm thư và 6 ảnh kỷ niệm (Phím tắt: Ctrl + E)";
        openStudioBtn.innerHTML = `<span>🎨</span> <span class="hide-mobile">Tuỳ chỉnh lời chúc</span>`;
        if (hudRight) hudRight.prepend(openStudioBtn);

        // 2. Khởi tạo cửa sổ Modal Studio 4 Tab
        const overlay = document.createElement("div");
        overlay.className = "studio-modal-overlay";
        overlay.id = "studio-modal-overlay";

        overlay.innerHTML = `
            <div class="studio-window" role="dialog" aria-modal="true" aria-label="Bộ chỉnh sửa lời chúc trực tiếp">
                <header class="studio-header">
                    <div class="studio-brand">
                        <h3>✨ Studio Tuỳ Chỉnh Lời Chúc 20/10 Trực Tiếp</h3>
                        <span>Live Hot-Reload</span>
                    </div>
                    <button type="button" id="btn-close-studio" class="btn-secondary">Đóng ✕</button>
                </header>

                <nav class="studio-tabs">
                    <button type="button" class="studio-tab-btn active" data-tab="tab-general">1. Người Nhận & Mã PIN</button>
                    <button type="button" class="studio-tab-btn" data-tab="tab-letter">2. Bức Thư & Mực Tàng Hình</button>
                    <button type="button" class="studio-tab-btn" data-tab="tab-memories">3. 6 Bức Ảnh Polaroid</button>
                    <button type="button" class="studio-tab-btn" data-tab="tab-export">4. Xuất File config.js & Link</button>
                </nav>

                <div class="studio-body">
                    <!-- TAB 1: THÔNG TIN CHUNG & MÃ PIN -->
                    <div id="tab-general" class="studio-pane active">
                        <div class="studio-grid-2">
                            <div class="studio-field">
                                <label>Tên người nhận (Hiển thị trên thiệp & lời chúc)</label>
                                <input type="text" id="st-recipient-name" class="studio-input">
                            </div>
                            <div class="studio-field">
                                <label>Chữ cái in trên dấu sáp niêm phong (1 ký tự)</label>
                                <input type="text" id="st-recipient-initial" class="studio-input" maxlength="2">
                            </div>
                            <div class="studio-field">
                                <label>Chữ ký người gửi (Cuối bức thư)</label>
                                <input type="text" id="st-sender-sig" class="studio-input">
                            </div>
                            <div class="studio-field">
                                <label>Ngày tháng hiển thị đầu bức thư</label>
                                <input type="text" id="st-event-date" class="studio-input">
                            </div>
                            <div class="studio-field">
                                <label>Mã PIN 4 chữ số mở khóa Giai đoạn 1</label>
                                <input type="text" id="st-pin-code" class="studio-input" maxlength="4">
                            </div>
                            <div class="studio-field">
                                <label>Gợi ý mặc định ở màn hình khóa</label>
                                <input type="text" id="st-hint-0" class="studio-input">
                            </div>
                        </div>
                        <div class="studio-field">
                            <label>Gợi ý khi nhập sai lần 1</label>
                            <input type="text" id="st-hint-1" class="studio-input">
                        </div>
                        <div class="studio-field">
                            <label>Câu trích dẫn tóm tắt trên Tấm Thiệp Kỷ Niệm (Giai đoạn 5)</label>
                            <textarea id="st-keepsake-quote" class="studio-textarea"></textarea>
                        </div>
                        <div class="studio-field">
                            <label>Mật mã chỉ chỗ giấu quà thật ngoài đời (Chế độ AR Giai đoạn 5)</label>
                            <textarea id="st-ar-riddle" class="studio-textarea"></textarea>
                        </div>
                    </div>

                    <!-- TAB 2: BỨC THƯ TAY SỐNG ĐỘNG & MỰC TÀNG HÌNH -->
                    <div id="tab-letter" class="studio-pane">
                        <div class="studio-field">
                            <label>Lời chào mở đầu bức thư</label>
                            <input type="text" id="st-letter-salutation" class="studio-input">
                        </div>
                        <div class="studio-field">
                            <label>Nội dung các đoạn văn trong thư (Mỗi đoạn cách nhau bằng 1 dòng trống)</label>
                            <textarea id="st-letter-paragraphs" class="studio-textarea" style="min-height: 180px;"></textarea>
                        </div>
                        <div class="studio-field">
                            <label>Thông điệp Mực Tàng Hình (Hiện lên khi nhấn giữ làm ấm giấy)</label>
                            <textarea id="st-invisible-ink" class="studio-textarea"></textarea>
                        </div>
                    </div>

                    <!-- TAB 3: CHỈNH SỬA 6 BỨC ẢNH KỶ NIỆM & HẬU TRƯỜNG POLAROID -->
                    <div id="tab-memories" class="studio-pane">
                        <div class="studio-field">
                            <label>Chọn bức ảnh Polaroid muốn chỉnh sửa (Từ 1 đến 6)</label>
                            <select id="st-memory-selector" class="studio-select">
                                <option value="0">Bức ảnh #1 (memory-1.jpg)</option>
                                <option value="1">Bức ảnh #2 (memory-2.jpg)</option>
                                <option value="2">Bức ảnh #3 (memory-3.jpg)</option>
                                <option value="3">Bức ảnh #4 (memory-4.jpg)</option>
                                <option value="4">Bức ảnh #5 (memory-5.jpg)</option>
                                <option value="5">Bức ảnh #6 (memory-6.jpg)</option>
                            </select>
                        </div>

                        <div class="studio-memory-preview-row">
                            <img id="st-mem-preview-img" class="studio-memory-thumb" src="assets/images/memory-1.jpg" alt="Preview">
                            <div style="flex:1;">
                                <label style="display:block; font-size:0.8rem; color:#ffd166; margin-bottom:6px;">
                                    Tải ảnh trực tiếp từ máy tính lên để xem ngay (Hoặc giữ nguyên đường dẫn trong assets/images/)
                                </label>
                                <input type="file" id="st-mem-file-input" accept="image/*" class="studio-input">
                            </div>
                        </div>

                        <div class="studio-grid-2">
                            <div class="studio-field">
                                <label>Tiêu đề ngắn mặt trước Polaroid (Caption)</label>
                                <input type="text" id="st-mem-caption" class="studio-input">
                            </div>
                            <div class="studio-field">
                                <label>Nhãn thời gian & địa điểm</label>
                                <input type="text" id="st-mem-date" class="studio-input">
                            </div>
                            <div class="studio-field">
                                <label>Tiêu đề mặt sau Polaroid</label>
                                <input type="text" id="st-mem-back-title" class="studio-input">
                            </div>
                            <div class="studio-field">
                                <label>Câu nói đáng nhớ ngày hôm ấy (Trích dẫn mặt sau)</label>
                                <input type="text" id="st-mem-back-quote" class="studio-input">
                            </div>
                        </div>
                        <div class="studio-field">
                            <label>Câu chuyện hậu trường hài hước / kỷ niệm mặt sau Polaroid</label>
                            <textarea id="st-mem-back-story" class="studio-textarea"></textarea>
                        </div>
                    </div>

                    <!-- TAB 4: XUẤT FILE CONFIG.JS & TẠO LINK CHIA SẺ -->
                    <div id="tab-export" class="studio-pane">
                        <p style="font-size:0.86rem; color:var(--text-muted); margin-bottom:12px;">
                            Sau khi chỉnh sửa xong, bạn có thể <strong>Tải tệp <code>config.js</code> mới</strong> về máy để chép đè vào thư mục <code>js/config.js</code> trong VS Code, hoặc tạo <strong>Link chia sẻ nhanh</strong>:
                        </p>
                        <div style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
                            <button type="button" id="btn-export-config-file" class="btn-golden-ticket">📥 Tải xuống tệp config.js</button>
                            <button type="button" id="btn-copy-share-link" class="btn-primary-glass">🔗 Sao chép Link Chia Sẻ Nhanh</button>
                            <button type="button" id="btn-reset-default-config" class="btn-secondary">↺ Khôi phục mặc định</button>
                        </div>
                        <div class="studio-field">
                            <label>Mã nguồn <code>js/config.js</code> tự động sinh theo nội dung bạn vừa sửa:</label>
                            <pre id="st-generated-code" class="studio-code-box"></pre>
                        </div>
                    </div>
                </div>

                <footer class="studio-footer">
                    <span id="studio-status-msg" class="studio-status-toast"></span>
                    <div style="display:flex; gap:10px;">
                        <button type="button" id="btn-studio-firework-test" class="btn-primary-glass">🎆 Bắn thử Pháo Hoa 3D</button>
                        <button type="button" id="btn-studio-save-apply" class="btn-golden-ticket">💾 Lưu & Áp dụng ngay lên giao diện</button>
                    </div>
                </footer>
            </div>
        `;

        document.body.appendChild(overlay);

        // Quản lý chuyển đổi giữa 4 Tab
        overlay.querySelectorAll(".studio-tab-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                overlay.querySelectorAll(".studio-tab-btn").forEach((b) => b.classList.remove("active"));
                overlay.querySelectorAll(".studio-pane").forEach((p) => p.classList.remove("active"));
                btn.classList.add("active");
                const pane = document.getElementById(btn.getAttribute("data-tab"));
                if (pane) pane.classList.add("active");
                if (btn.getAttribute("data-tab") === "tab-export") {
                    document.getElementById("st-generated-code").textContent = generateConfigJSContent();
                }
            });
        });

        let currentMemIdx = 0;

        function populateMemoryFields(idx) {
            currentMemIdx = idx;
            const mem = CFG.memories[idx];
            if (!mem) return;
            document.getElementById("st-mem-caption").value = mem.caption || "";
            document.getElementById("st-mem-date").value = mem.dateLocation || "";
            document.getElementById("st-mem-back-title").value = mem.backTitle || "";
            document.getElementById("st-mem-back-quote").value = mem.backQuote || "";
            document.getElementById("st-mem-back-story").value = mem.backStory || "";
            document.getElementById("st-mem-preview-img").src = mem.customDataUrl || mem.src;
        }

        function saveCurrentMemoryFields() {
            const mem = CFG.memories[currentMemIdx];
            if (!mem) return;
            mem.caption = document.getElementById("st-mem-caption").value.trim();
            mem.dateLocation = document.getElementById("st-mem-date").value.trim();
            mem.backTitle = document.getElementById("st-mem-back-title").value.trim();
            mem.backQuote = document.getElementById("st-mem-back-quote").value.trim();
            mem.backStory = document.getElementById("st-mem-back-story").value.trim();
        }

        function populateAllFormFields() {
            document.getElementById("st-recipient-name").value = CFG.recipientName || "";
            document.getElementById("st-recipient-initial").value = CFG.recipientInitial || "T";
            document.getElementById("st-sender-sig").value = CFG.senderSignature || "";
            document.getElementById("st-event-date").value = CFG.eventDate || "";
            document.getElementById("st-pin-code").value = (CFG.security && CFG.security.pinCode) || "2010";
            document.getElementById("st-hint-0").value = (CFG.security && CFG.security.hints[0]) || "";
            document.getElementById("st-hint-1").value = (CFG.security && CFG.security.hints[1]) || "";
            document.getElementById("st-keepsake-quote").value = (CFG.keepsake && CFG.keepsake.summaryQuote) || "";
            document.getElementById("st-ar-riddle").value = (CFG.keepsake && CFG.keepsake.arGiftRiddle) || "";

            document.getElementById("st-letter-salutation").value = (CFG.letter && CFG.letter.salutation) || "";
            document.getElementById("st-letter-paragraphs").value = (CFG.letter && CFG.letter.paragraphs)
                ? CFG.letter.paragraphs.join("\n\n")
                : "";
            document.getElementById("st-invisible-ink").value = (CFG.letter && CFG.letter.invisibleInkSecret) || "";

            populateMemoryFields(Number(document.getElementById("st-memory-selector").value || 0));
            document.getElementById("st-generated-code").textContent = generateConfigJSContent();
        }

        document.getElementById("st-memory-selector").addEventListener("change", (e) => {
            saveCurrentMemoryFields();
            populateMemoryFields(Number(e.target.value));
        });

        // Cho phép chọn ảnh trực tiếp từ máy tính để xem trước trên Polaroid
        document.getElementById("st-mem-file-input").addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                CFG.memories[currentMemIdx].customDataUrl = reader.result;
                document.getElementById("st-mem-preview-img").src = reader.result;
                showToast("📸 Đã nạp ảnh mới cho Polaroid #" + (currentMemIdx + 1));
            };
            reader.readAsDataURL(file);
        });

        function collectAndSaveConfig() {
            CFG.recipientName = document.getElementById("st-recipient-name").value.trim() || "Cô Gái Tháng Mười";
            CFG.recipientInitial = (document.getElementById("st-recipient-initial").value.trim() || "T").toUpperCase();
            CFG.senderSignature = document.getElementById("st-sender-sig").value.trim();
            CFG.eventDate = document.getElementById("st-event-date").value.trim();

            CFG.security.pinCode = document.getElementById("st-pin-code").value.trim() || "2010";
            CFG.security.hints[0] = document.getElementById("st-hint-0").value.trim();
            CFG.security.hints[1] = document.getElementById("st-hint-1").value.trim();

            CFG.keepsake.summaryQuote = document.getElementById("st-keepsake-quote").value.trim();
            CFG.keepsake.arGiftRiddle = document.getElementById("st-ar-riddle").value.trim();

            CFG.letter.salutation = document.getElementById("st-letter-salutation").value.trim();
            const rawParas = document.getElementById("st-letter-paragraphs").value
                .split(/\n\s*\n/)
                .map((s) => s.trim())
                .filter(Boolean);
            if (rawParas.length > 0) CFG.letter.paragraphs = rawParas;
            CFG.letter.invisibleInkSecret = document.getElementById("st-invisible-ink").value.trim();

            saveCurrentMemoryFields();

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(CFG));
            } catch (e) {
                console.warn("Dung lượng ảnh vượt bộ nhớ localStorage, dữ liệu vẫn hoạt động trực tiếp trên phiên hiện tại.");
            }

            applyLiveConfigToDOM();
            document.getElementById("st-generated-code").textContent = generateConfigJSContent();
            showToast("✅ Đã áp dụng toàn bộ lời chúc mới lên trang web!");
        }

        function showToast(msg) {
            const el = document.getElementById("studio-status-msg");
            if (!el) return;
            el.textContent = msg;
            setTimeout(() => {
                if (el.textContent === msg) el.textContent = "";
            }, 3800);
        }

        // Mở / Đóng Studio
        function openStudio() {
            populateAllFormFields();
            overlay.classList.add("open");
        }
        function closeStudio() {
            overlay.classList.remove("open");
        }

        openStudioBtn.addEventListener("click", openStudio);
        document.getElementById("btn-close-studio").addEventListener("click", closeStudio);
        window.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
                e.preventDefault();
                if (overlay.classList.contains("open")) closeStudio();
                else openStudio();
            }
        });

        document.getElementById("btn-studio-save-apply").addEventListener("click", () => {
            collectAndSaveConfig();
            fwEngine.launchSalvo(4);
        });

        document.getElementById("btn-studio-firework-test").addEventListener("click", () => {
            fwEngine.launchSalvo(6);
            showToast("🎆 Đã phóng loạt pháo hoa 3D WebGL trên bầu trời!");
        });

        // Xuất tệp config.js tải về máy
        document.getElementById("btn-export-config-file").addEventListener("click", () => {
            collectAndSaveConfig();
            const blob = new Blob([generateConfigJSContent()], { type: "application/javascript;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "config.js";
            a.click();
            URL.revokeObjectURL(url);
            showToast("📥 Đã tải tệp config.js mới về máy!");
        });

        // Tạo Link chia sẻ mã hóa Base64
        document.getElementById("btn-copy-share-link").addEventListener("click", () => {
            collectAndSaveConfig();
            const lightConfig = JSON.parse(JSON.stringify(CFG));
            // Loại bỏ ảnh base64 nặng để link gọn nhẹ
            lightConfig.memories.forEach((m) => delete m.customDataUrl);
            const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(lightConfig))));
            const shareUrl = `${window.location.origin}${window.location.pathname}#gift=${encoded}`;
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast("🔗 Đã sao chép Link chia sẻ cá nhân hóa vào Clipboard!");
            });
        });

        // Khôi phục mặc định
        document.getElementById("btn-reset-default-config").addEventListener("click", () => {
            localStorage.removeItem(STORAGE_KEY);
            window.location.hash = "";
            window.location.reload();
        });
    }

    /* ========================================================================
       KHỞI CHẠY TỰ ĐỘNG KHI TRANG TẢI XONG
    ======================================================================== */
    
})();