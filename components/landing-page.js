"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const tiltSelector = ".js-tilt";

export function LandingPage({ featuredLessonId }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const mediaQueries = {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
      compact: window.matchMedia("(max-width: 900px)"),
      touch: window.matchMedia("(hover: none), (pointer: coarse)")
    };

    const revealElements = [...root.querySelectorAll("[data-reveal]")];
    const tiltElements = [...root.querySelectorAll(tiltSelector)];
    const particleCanvas = root.querySelector("#particle-canvas");
    const state = {
      particles: [],
      rafId: null
    };

    function randomBetween(min, max) {
      return Math.random() * (max - min) + min;
    }

    function createParticle(width, height) {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: randomBetween(-0.18, 0.18),
        vy: randomBetween(0.25, 1.35),
        radius: randomBetween(0.6, 2.2),
        alpha: randomBetween(0.06, 0.3)
      };
    }

    function setupParticles() {
      if (!particleCanvas) {
        return undefined;
      }

      const context = particleCanvas.getContext("2d");
      if (!context) {
        return undefined;
      }

      const resizeCanvas = () => {
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const width = window.innerWidth;
        const height = window.innerHeight;

        particleCanvas.width = Math.floor(width * ratio);
        particleCanvas.height = Math.floor(height * ratio);
        particleCanvas.style.width = `${width}px`;
        particleCanvas.style.height = `${height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        const targetCount = mediaQueries.compact.matches ? 28 : 56;
        state.particles = Array.from({ length: targetCount }, () =>
          createParticle(width, height)
        );
      };

      const render = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        context.clearRect(0, 0, width, height);

        state.particles.forEach((particle) => {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.y > height + 10) {
            particle.y = -10;
            particle.x = Math.random() * width;
          }

          if (particle.x > width + 10) {
            particle.x = -10;
          } else if (particle.x < -10) {
            particle.x = width + 10;
          }

          context.beginPath();
          context.fillStyle = `rgba(244, 240, 232, ${particle.alpha})`;
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context.fill();
        });

        state.rafId = window.requestAnimationFrame(render);
      };

      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);

      if (!mediaQueries.reducedMotion.matches) {
        render();
      }

      return () => {
        window.removeEventListener("resize", resizeCanvas);
        if (state.rafId) {
          window.cancelAnimationFrame(state.rafId);
        }
      };
    }

    function setupTilt() {
      if (mediaQueries.touch.matches || mediaQueries.reducedMotion.matches) {
        return () => {};
      }

      const handlers = tiltElements.map((element) => {
        const inner = element.querySelector(".cutout__inner, .character-panel__content");

        const onMove = (event) => {
          const rect = element.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          const rotateY = (px - 0.5) * 10;
          const rotateX = (0.5 - py) * 10;
          const depth = Number(element.dataset.depth || 0.5);
          element.style.setProperty("--tilt-x", `${rotateX}deg`);
          element.style.setProperty("--tilt-y", `${rotateY}deg`);
          element.style.setProperty("--hover-lift", `${depth * -8}px`);

          if (inner) {
            inner.style.transform = `translateZ(${24 + depth * 36}px)`;
          }
        };

        const onLeave = () => {
          element.style.removeProperty("--tilt-x");
          element.style.removeProperty("--tilt-y");
          element.style.removeProperty("--hover-lift");
          if (inner) {
            inner.style.transform = "";
          }
        };

        element.addEventListener("pointermove", onMove);
        element.addEventListener("pointerleave", onLeave);

        return () => {
          element.removeEventListener("pointermove", onMove);
          element.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => {
        handlers.forEach((dispose) => dispose());
      };
    }

    function setupReveals() {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
            }
          });
        },
        { threshold: 0.18, rootMargin: "0px 0px -10% 0px" }
      );

      revealElements.forEach((element) => observer.observe(element));
      return () => observer.disconnect();
    }

    gsap.registerPlugin(ScrollTrigger);
    const cleanupParticles = setupParticles();
    const cleanupTilt = setupTilt();
    const cleanupReveals = setupReveals();

    if (!mediaQueries.reducedMotion.matches) {
      const context = gsap.context(() => {
        gsap.set(revealElements, { opacity: 0, y: 38 });
        gsap.set(".hero__title span", { yPercent: 120, opacity: 0 });
        gsap.set(".hero__lede, .hero__actions, .hero__glyphs, .scroll-cue", {
          y: 24,
          opacity: 0
        });
        gsap.set(".cutout", { y: 50, opacity: 0, scale: 0.92 });

        const heroTimeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: {
            trigger: "#hero",
            start: "top top",
            end: "+=130%",
            scrub: 0.8,
            pin: true
          }
        });

        heroTimeline
          .to(".hero__title span", {
            yPercent: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 0.85
          })
          .to(
            ".hero__lede, .hero__actions, .hero__glyphs, .scroll-cue",
            {
              y: 0,
              opacity: 1,
              stagger: 0.06,
              duration: 0.5
            },
            "-=0.4"
          )
          .to(
            ".cutout--left",
            { x: 20, y: -18, opacity: 1, scale: 1 },
            "-=0.5"
          )
          .to(".cutout--center", { y: -8, opacity: 1, scale: 1 }, "<")
          .to(".cutout--right", { x: -20, y: 14, opacity: 1, scale: 1 }, "<")
          .to(".hero__backdrop", { scale: 1.08, opacity: 0.55 }, 0);

        revealElements.forEach((element) => {
          gsap.to(element, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              start: "top 86%",
              toggleActions: "play none none reverse"
            }
          });
        });

        gsap.to(".character-panel", {
          yPercent: -8,
          stagger: 0.12,
          ease: "none",
          scrollTrigger: {
            trigger: "#showcase",
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8
          }
        });
      }, root);

      return () => {
        cleanupParticles?.();
        cleanupTilt();
        cleanupReveals();
        context.revert();
      };
    }

    return () => {
      cleanupParticles?.();
      cleanupTilt();
      cleanupReveals();
    };
  }, []);

  return (
    <div ref={rootRef}>
      <canvas id="particle-canvas" aria-hidden="true" />
      <div className="page-grain" aria-hidden="true" />
      <div className="page-vignette" aria-hidden="true" />

      <header className="topbar">
        <Link className="brand" href="#hero">
          <span className="brand__mark">BR</span>
          <span className="brand__text">Black Rain Academy</span>
        </Link>
        <nav className="topbar__nav" aria-label="Primary">
          <a href="#manifesto">Manifesto</a>
          <a href="#showcase">Panels</a>
          <a href="#transition">Ritual</a>
          <Link href="/lessons/new">Create Lesson</Link>
        </nav>
      </header>

      <main>
        <section id="hero" className="scene scene--hero">
          <div className="hero__backdrop" aria-hidden="true" />
          <div className="hero__wash" aria-hidden="true" />

          <div className="scene__inner hero__layout">
            <div className="hero__copy">
              <p className="eyebrow">Source-Grounded Manga Lessons</p>
              <h1 className="hero__title">
                <span>Study.</span>
                <span>Scene.</span>
                <span>Remember.</span>
              </h1>
              <p className="hero__lede">
                Turn textbook chapters into grounded manga-style lessons with facts,
                objectives, panel scripts, image prompts, quizzes, and teacher
                verification built into one cinematic flow.
              </p>
              <div className="hero__actions">
                <Link className="button button--primary" href="/lessons/new">
                  Generate My First Lesson
                </Link>
                {featuredLessonId ? (
                  <Link className="button button--ghost" href={`/lessons/${featuredLessonId}/reader`}>
                    View Demo Lesson
                  </Link>
                ) : (
                  <a className="button button--ghost" href="#manifesto">
                    Read the Manifesto
                  </a>
                )}
              </div>
            </div>

            <div className="hero__composition">
              <div className="orbit orbit--outer" aria-hidden="true" />
              <div className="orbit orbit--inner" aria-hidden="true" />

              <article className="cutout cutout--left js-tilt" data-depth="0.45" style={{ "--bg-pos": "10% 12%" }}>
                <div className="cutout__inner">
                  <div className="cutout__art" />
                  <div className="cutout__edge" />
                </div>
                <p className="cutout__caption">Source facts</p>
              </article>

              <article className="cutout cutout--center js-tilt" data-depth="0.8" style={{ "--bg-pos": "50% 58%" }}>
                <div className="cutout__inner">
                  <div className="cutout__art" />
                  <div className="cutout__edge" />
                </div>
                <p className="cutout__caption">Story panels</p>
              </article>

              <article className="cutout cutout--right js-tilt" data-depth="0.55" style={{ "--bg-pos": "82% 26%" }}>
                <div className="cutout__inner">
                  <div className="cutout__art" />
                  <div className="cutout__edge" />
                </div>
                <p className="cutout__caption">Teacher proof</p>
              </article>
            </div>

            <div className="hero__glyphs" aria-hidden="true">
              <span>FACT</span>
              <span>STORY</span>
              <span>VERIFY</span>
            </div>
          </div>

          <div className="scroll-cue" aria-hidden="true">
            <span className="scroll-cue__line" />
            <span className="scroll-cue__text">Scroll to descend</span>
          </div>
        </section>

        <section id="manifesto" className="scene scene--manifesto">
          <div className="scene__inner manifesto">
            <div className="section-heading" data-reveal>
              <p className="eyebrow">Manifesto // Product Intent</p>
              <h2>Source-grounded learning should feel cinematic without hiding where the truth came from.</h2>
            </div>

            <div className="manifesto__grid">
              <article className="panel-card panel-card--wide" data-reveal>
                <p className="panel-card__index">01</p>
                <h3>Textbook in, lesson out</h3>
                <p>Paste a chapter or upload a readable PDF, then generate chunked source facts, story scenes, panel scripts, and quiz cards in one controlled flow.</p>
              </article>
              <article className="panel-card panel-card--tall" data-reveal>
                <p className="panel-card__index">02</p>
                <h3>No fake manga renderer</h3>
                <p>We do not create final comic art here. The MVP produces polished placeholders, image prompts, and verification-ready scripts for later image workflows.</p>
              </article>
              <article className="editorial-block" data-reveal>
                <p className="editorial-block__lead">Every panel traces back to evidence.</p>
                <p>Panels and quiz cards stay linked to extracted fact IDs and source quotes so a teacher can inspect what supports each teaching moment.</p>
              </article>
              <article className="quote-panel" data-reveal>
                <p>"Pretty is not enough. The lesson has to prove itself."</p>
              </article>
            </div>
          </div>
        </section>

        <section id="showcase" className="scene scene--showcase">
          <div className="scene__inner showcase">
            <div className="section-heading" data-reveal>
              <p className="eyebrow">Feature Panels</p>
              <h2>From chunked source text to grounded comic flow, each phase stays visible to the teacher.</h2>
            </div>
            <div className="showcase__grid">
              <article className="character-panel js-tilt" data-depth="0.65" data-reveal style={{ "--bg-pos": "22% 22%" }}>
                <div className="character-panel__art" />
                <div className="character-panel__shade" />
                <div className="character-panel__content">
                  <p className="character-panel__tag">Create</p>
                  <h3>Lesson intake</h3>
                  <p>Validate title, subject, level, and textbook source before any generation begins.</p>
                </div>
              </article>
              <article className="character-panel character-panel--featured js-tilt" data-depth="0.9" data-reveal style={{ "--bg-pos": "50% 60%" }}>
                <div className="character-panel__art" />
                <div className="character-panel__shade" />
                <div className="character-panel__content">
                  <p className="character-panel__tag">Read</p>
                  <h3>Placeholder comic</h3>
                  <p>Study panels combine narration, speech bubbles, fact IDs, and prompt actions without pretending the art is final.</p>
                </div>
              </article>
              <article className="character-panel js-tilt" data-depth="0.6" data-reveal style={{ "--bg-pos": "82% 28%" }}>
                <div className="character-panel__art" />
                <div className="character-panel__shade" />
                <div className="character-panel__content">
                  <p className="character-panel__tag">Verify</p>
                  <h3>Teacher mode</h3>
                  <p>Inspect source quotes, approve panels, flag weak quiz mappings, and export prompts for later art agents.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="transition" className="scene scene--transition">
          <div className="transition__backdrop" aria-hidden="true" />
          <div className="scene__inner transition">
            <div className="transition__statement" data-reveal>
              <p className="eyebrow">Ritual // Flow</p>
              <h2>The pipeline moves like a chapter reveal: chunk, extract, plan, panel, verify, quiz, export.</h2>
            </div>
            <div className="transition__bands">
              <article className="motion-band" data-reveal>
                <h3>Mock AI first</h3>
                <p>Every service boundary is ready for real model integration later, but the MVP proves the end-to-end product now.</p>
              </article>
              <article className="motion-band" data-reveal>
                <h3>Grounded by design</h3>
                <p>Facts, panels, and quizzes share IDs and verification records so unsupported content gets surfaced immediately.</p>
              </article>
              <article className="motion-band" data-reveal>
                <h3>Export-ready prompts</h3>
                <p>Use prompt JSON or markdown exports to hand off scenes to future external image workflows when you are ready.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="finale" className="scene scene--finale">
          <div className="scene__inner finale">
            <div className="finale__image" aria-hidden="true" />
            <div className="finale__copy" data-reveal>
              <p className="eyebrow">Finale // Start Building</p>
              <h2>Launch the lesson flow without losing the atmosphere.</h2>
              <p>The landing page stays cinematic, but every CTA now leads into a working full-stack lesson engine.</p>
              <div className="hero__actions">
                <Link className="button button--primary" href="/lessons/new">
                  Create Lesson
                </Link>
                {featuredLessonId ? (
                  <Link className="button button--ghost" href={`/lessons/${featuredLessonId}/teacher`}>
                    Open Teacher Mode
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
