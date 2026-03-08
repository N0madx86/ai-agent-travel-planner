import anime from 'animejs/lib/anime.es.js';
import { useEffect, useRef } from 'react';

export { anime };

// ─── Hero text stagger entrance ─────────────────────────────
export function heroEntranceAnimation(containerRef) {
    if (!containerRef?.current) return;
    const el = containerRef.current;

    // Badge chip slides down
    anime({
        targets: el.querySelector('.hero-chip'),
        opacity: [0, 1],
        translateY: [-16, 0],
        duration: 700,
        easing: 'easeOutExpo',
        delay: 100,
    });

    // Headline lines stagger up
    anime({
        targets: el.querySelectorAll('.hero-line'),
        opacity: [0, 1],
        translateY: [40, 0],
        duration: 800,
        easing: 'easeOutExpo',
        delay: anime.stagger(120, { start: 250 }),
    });

    // Subline
    anime({
        targets: el.querySelector('.hero-sub'),
        opacity: [0, 1],
        translateY: [24, 0],
        duration: 700,
        easing: 'easeOutExpo',
        delay: 600,
    });

    // CTA buttons
    anime({
        targets: el.querySelectorAll('.hero-cta'),
        opacity: [0, 1],
        translateY: [20, 0],
        scale: [0.95, 1],
        duration: 600,
        easing: 'easeOutBack',
        delay: anime.stagger(80, { start: 750 }),
    });
}

// ─── Particle system setup ───────────────────────────────────
export function createParticleField(containerEl, count = 30) {
    if (!containerEl) return () => { };
    const particles = [];
    const animations = [];

    for (let i = 0; i < count; i++) {
        const dot = document.createElement('div');
        const size = Math.random() * 3 + 1.5;
        dot.className = 'particle';
        dot.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      opacity:${Math.random() * 0.5 + 0.1};
    `;
        containerEl.appendChild(dot);
        particles.push(dot);

        const anim = anime({
            targets: dot,
            translateX: () => anime.random(-120, 120),
            translateY: () => anime.random(-120, 120),
            opacity: [
                { value: Math.random() * 0.5 + 0.1 },
                { value: Math.random() * 0.15 + 0.05 },
                { value: Math.random() * 0.5 + 0.1 },
            ],
            duration: () => anime.random(6000, 18000),
            easing: 'easeInOutSine',
            loop: true,
            direction: 'alternate',
            delay: () => anime.random(0, 4000),
        });
        animations.push(anim);
    }

    return () => {
        animations.forEach(a => a.pause());
        particles.forEach(p => p.remove());
    };
}

// ─── Card stagger reveal ─────────────────────────────────────
export function animateCards(selector, delay = 0) {
    const targets = document.querySelectorAll(selector);
    if (!targets.length) return;
    anime({
        targets,
        opacity: [0, 1],
        translateY: [28, 0],
        duration: 650,
        easing: 'easeOutExpo',
        delay: anime.stagger(90, { start: delay }),
    });
}

// ─── Counter number count-up ────────────────────────────────
export function countUp(el, end, suffix = '') {
    if (!el) return;
    anime({
        targets: { val: 0 },
        val: [0, end],
        duration: 1800,
        easing: 'easeOutExpo',
        round: 1,
        update(anim) {
            el.textContent = Math.round(anim.animations[0]?.currentValue) + suffix;
        },
    });
}

// ─── Button ripple (used alongside Anime.js-powered bounce) ──
export function useRipple() {
    const rippleRef = useRef(null);

    const createRipple = (e) => {
        const btn = rippleRef.current;
        if (!btn) return;
        const existing = btn.querySelector('.ripple-wave');
        if (existing) existing.remove();

        const circle = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        circle.style.width = circle.style.height = `${size}px`;
        circle.style.left = `${e.clientX - rect.left - size / 2}px`;
        circle.style.top = `${e.clientY - rect.top - size / 2}px`;
        circle.classList.add('ripple-wave');
        btn.appendChild(circle);

        // Anime.js bounce on the button itself
        anime({
            targets: btn,
            scale: [1, 0.96, 1],
            duration: 250,
            easing: 'easeOutBack',
        });

        circle.addEventListener('animationend', () => circle.remove());
    };

    return { rippleRef, createRipple };
}

// ─── Scroll reveal (IntersectionObserver) ───────────────────
export function useScrollReveal(deps = []) {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        anime({
                            targets: entry.target,
                            opacity: [0, 1],
                            translateY: [30, 0],
                            duration: 700,
                            easing: 'easeOutExpo',
                        });
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
        );

        const timer = setTimeout(() => {
            document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach((el) => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    el.classList.add('visible');
                } else {
                    observer.observe(el);
                }
            });
        }, 80);

        return () => { clearTimeout(timer); observer.disconnect(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
