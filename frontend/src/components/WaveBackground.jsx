import { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * WaveBackground — Canvas Ocean Animation
 *
 * Dark (Submerged): Deep ocean currents + marine snow + shifting light beams.
 * Light (Shore):    Crisp bright sky with slow translucent waves at the bottom.
 * Surfacing (transition): Directional bubble surge.
 *   • Dark → Light (isSurfacing=true, isDarkMode=true):  bubbles rush UPWARD
 *   • Light → Dark (isSurfacing=true, isDarkMode=false): bubbles rush DOWNWARD
 */
export default function WaveBackground() {
    const canvasRef = useRef(null);
    const { isDarkMode, isSurfacing, transitionDirection } = useTheme();

    // Stable ref for particles so we don't recreate on every render
    const state = useRef({
        time: 0,
        particles: [],
        // Pre-generated bubble data for consistent positions during surge
        bubbles: Array.from({ length: 60 }, (_, i) => ({
            x: Math.random(),        // 0-1 fraction of width
            size: Math.random() * 28 + 8,
            speed: Math.random() * 0.4 + 0.6,
            wobble: Math.random() * 2 - 1,
            delay: Math.random(),    // 0-1, stagger start
        })),
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const count = isDarkMode ? 70 : 0; // Only particles in dark mode
            state.current.particles = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.8 + 0.4,
                speed: Math.random() * 0.35 + 0.06,
                drift: Math.random() * 2 - 1,
                opacity: Math.random() * 0.4 + 0.06,
            }));
        };

        resize();
        window.addEventListener('resize', resize);

        // ───────────────────────────────────────────────────
        // DARK MODE — Deep ocean with richer light shifts
        // ───────────────────────────────────────────────────
        const drawSubmerged = (W, H, t) => {
            // Semi-transparent base — CSS gradient bleeds through
            ctx.fillStyle = 'rgba(2, 13, 30, 0.52)';
            ctx.fillRect(0, 0, W, H);

            // Ocean current layers — slightly enhanced with more variety
            const layers = [
                { amp: 58, freq: 0.0018, speed: 0.35, color: 'rgba(13, 141, 232, 0.11)' },
                { amp: 78, freq: 0.0010, speed: 0.18, color: 'rgba(0, 96, 199, 0.08)' },
                { amp: 38, freq: 0.0028, speed: 0.55, color: 'rgba(16, 185, 129, 0.06)' },
                { amp: 95, freq: 0.0007, speed: 0.12, color: 'rgba(56, 168, 245, 0.06)' },
                { amp: 45, freq: 0.0022, speed: 0.28, color: 'rgba(99, 102, 241, 0.05)' }, // subtle purple
            ];

            layers.forEach(l => {
                for (let i = -3; i <= 3; i++) {
                    ctx.beginPath();
                    ctx.strokeStyle = l.color;
                    ctx.lineWidth = 1.5;
                    const yBase = H * 0.5 + i * (H / 7);
                    for (let x = 0; x <= W; x += 8) {
                        const y = yBase
                            + Math.sin(x * l.freq + t * l.speed) * l.amp
                            + Math.cos(x * 0.0008 - t * 0.08) * 18;
                        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
            });

            // Drifting "god rays" / bioluminescent light shafts
            for (let r = 0; r < 3; r++) {
                const rayX = W * (0.2 + r * 0.3 + Math.sin(t * 0.03 + r) * 0.08);
                const grad = ctx.createLinearGradient(rayX, 0, rayX + 60, H * 0.75);
                grad.addColorStop(0, 'rgba(56, 168, 245, 0.07)');
                grad.addColorStop(0.5, 'rgba(56, 168, 245, 0.04)');
                grad.addColorStop(1, 'rgba(56, 168, 245, 0)');
                ctx.beginPath();
                ctx.moveTo(rayX - 15, 0);
                ctx.lineTo(rayX + 75, 0);
                ctx.lineTo(rayX + 40, H * 0.75);
                ctx.lineTo(rayX - 5, H * 0.75);
                ctx.closePath();
                ctx.fillStyle = grad;
                ctx.fill();
            }

            // Marine snow particles (drift upward)
            state.current.particles.forEach(p => {
                p.y -= p.speed;
                p.x += Math.sin(state.current.time * 0.5 + p.y * 0.01) * 0.3;
                if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(126, 200, 246, ${p.opacity})`;
                ctx.fill();
            });
        };

        // ───────────────────────────────────────────────────
        // LIGHT MODE — Crisp sky, 4 translucent ocean waves at bottom
        // ───────────────────────────────────────────────────
        const drawShore = (W, H, t) => {
            // Allow the sunny CSS gradient to be the background — only draw waves
            // at the bottom third of the screen so they look like ocean waves

            const waterlineY = H * 0.62; // waves live in bottom 38%

            // ── SOLID FLOOR: opaque base so dark body never bleeds through ──────
            const floorGrad = ctx.createLinearGradient(0, waterlineY - 30, 0, H);
            floorGrad.addColorStop(0,    'rgba(125, 211, 252, 0)');
            floorGrad.addColorStop(0.15, 'rgba(56, 189, 248, 0.72)');
            floorGrad.addColorStop(1,    'rgba(14, 116, 144, 0.92)');
            ctx.fillStyle = floorGrad;
            ctx.fillRect(0, waterlineY - 30, W, H - waterlineY + 30);

            // 4 overlapping wave layers, each with a distinct cyan/aqua tint
            const waveLayers = [
                { speed: 0.18, freq: 0.0025, amp: 18, yOffset: 0.00, fillA: 'rgba(14, 165, 233, 0.22)', strokeA: 'rgba(255,255,255, 0.55)' },
                { speed: 0.22, freq: 0.0018, amp: 14, yOffset: 0.05, fillA: 'rgba(6, 182, 212, 0.28)',  strokeA: 'rgba(255,255,255, 0.50)' },
                { speed: 0.14, freq: 0.0030, amp: 10, yOffset: 0.10, fillA: 'rgba(56, 189, 248, 0.32)', strokeA: 'rgba(255,255,255, 0.60)' },
                { speed: 0.26, freq: 0.0020, amp: 8,  yOffset: 0.14, fillA: 'rgba(186, 230, 253, 0.40)', strokeA: 'rgba(255,255,255, 0.65)' },
            ];

            waveLayers.forEach((wl, idx) => {
                const baseY = waterlineY + H * wl.yOffset;
                ctx.beginPath();
                ctx.moveTo(0, H);
                for (let x = 0; x <= W; x += 12) {
                    const y = baseY
                        + Math.sin(x * wl.freq + t * wl.speed) * wl.amp
                        + Math.cos(x * wl.freq * 1.7 - t * wl.speed * 0.6) * (wl.amp * 0.4);
                    ctx.lineTo(x, y);
                }
                ctx.lineTo(W, H);
                ctx.closePath();
                ctx.fillStyle = wl.fillA;
                ctx.fill();

                // Foam / crest line
                ctx.beginPath();
                for (let x = 0; x <= W; x += 12) {
                    const y = baseY
                        + Math.sin(x * wl.freq + t * wl.speed) * wl.amp
                        + Math.cos(x * wl.freq * 1.7 - t * wl.speed * 0.6) * (wl.amp * 0.4);
                    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.strokeStyle = wl.strokeA;
                ctx.lineWidth = idx === 3 ? 3 : 1.5;
                ctx.stroke();
            });
        };

        // ───────────────────────────────────────────────────
        // SURFACING — Directional bubble surge
        // Dark→Light (isDarkMode=true while surfacing): bubbles go UP
        // Light→Dark (isDarkMode=false while surfacing): bubbles go DOWN
        // ───────────────────────────────────────────────────
        const drawSurfacing = (W, H, t) => {
            // Going dark→light: teal surge. Going light→dark: deep navy surge.
            const goingToLight = transitionDirection === 'to-light';
            ctx.fillStyle = goingToLight ? 'rgba(6, 182, 212, 0.96)' : 'rgba(2, 13, 30, 0.97)';
            ctx.fillRect(0, 0, W, H);

            const { bubbles } = state.current;
            bubbles.forEach((b, i) => {
                // progress 0→1 based on time, staggered by delay
                const raw = ((t * 0.9 + b.delay) % 1.4) / 1.4;
                const progress = Math.min(raw, 1);

                let y;
                if (goingToLight) {
                    // rush downward: start at top, end at bottom
                    y = -b.size + progress * (H + b.size * 2);
                } else {
                    // rush upward: start at bottom, end at top
                    y = H - progress * (H + b.size * 2);
                }

                // horizontal wobble
                const x = b.x * W + Math.sin(t * 2 + i) * 20 * b.wobble;
                const opacity = Math.min(progress * 3, 1 - progress * 0.5) * 0.55;
                if (opacity <= 0) return;

                ctx.beginPath();
                ctx.arc(x, y, b.size, 0, Math.PI * 2);
                const bubbleFill = goingToLight
                    ? `rgba(255, 255, 255, ${opacity})`
                    : `rgba(13, 141, 232, ${opacity})`;
                const bubbleStroke = goingToLight
                    ? `rgba(186, 230, 253, ${opacity * 1.2})`
                    : `rgba(56, 168, 245, ${opacity * 1.2})`;
                ctx.fillStyle = bubbleFill;
                ctx.fill();
                ctx.strokeStyle = bubbleStroke;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        };

        // ───────────────────────────────────────────────────
        // MAIN DRAW LOOP
        // ───────────────────────────────────────────────────
        const draw = () => {
            const W = canvas.width;
            const H = canvas.height;
            const t = state.current.time;

            ctx.clearRect(0, 0, W, H);

            if (isSurfacing) {
                drawSurfacing(W, H, t);
            } else if (isDarkMode) {
                drawSubmerged(W, H, t);
            } else {
                drawShore(W, H, t);
            }

            state.current.time += 0.010; // nice and slow
            raf = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [isDarkMode, isSurfacing, transitionDirection]);

    return (
        <div className="wave-bg" aria-hidden="true">
            <canvas
                ref={canvasRef}
                style={{
                    position: 'fixed',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 0,
                }}
            />
        </div>
    );
}
