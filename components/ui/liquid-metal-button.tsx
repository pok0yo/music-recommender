'use client';

import { useEffect, useRef, useState, type ComponentPropsWithRef } from 'react';
import type { ShaderMount } from '@paper-design/shaders';
import { GlassEffect } from './liquid-glass';

// Adapted from the supplied LiquidMetalButton; native props preserve form and focus behavior.
export function LiquidMetalButton({ children, className = '', type = 'button', disabled,
  onPointerEnter, onPointerLeave, onPointerCancel, onClick, ...props }: ComponentPropsWithRef<'button'>) {
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [materialMounted, setMaterialMounted] = useState(false);
  const [ripple, setRipple] = useState<{ x: number; y: number; size: number; id: number } | null>(null);
  const rippleID = useRef(0);
  const material = useRef<HTMLSpanElement>(null);
  const shader = useRef<ShaderMount | null>(null);
  const active = motionAllowed && !disabled && (hovered || !!ripple);

  useEffect(() => {
    if (active) { setMaterialMounted(true); return; }
    if (!motionAllowed || disabled) { setMaterialMounted(false); return; }
    // Retain the canvas through the 180ms CSS exit fade; re-entry cancels disposal.
    const timer = window.setTimeout(() => setMaterialMounted(false), 180);
    return () => window.clearTimeout(timer);
  }, [active, motionAllowed, disabled]);

  useEffect(() => {
    const preferences = ['(prefers-reduced-motion: reduce)', '(forced-colors: active)', '(prefers-reduced-transparency: reduce)']
      .map(query => window.matchMedia(query));
    const update = () => {
      const allowed = !preferences.some(query => query.matches);
      setMotionAllowed(allowed);
      if (!allowed) { setHovered(false); setRipple(null); }
    };
    update();
    preferences.forEach(query => query.addEventListener('change', update));
    return () => preferences.forEach(query => query.removeEventListener('change', update));
  }, []);

  useEffect(() => {
    if (!materialMounted || !material.current) return;
    const host = material.current;
    let cancelled = false;
    let mount: ShaderMount | undefined;
    void import('@paper-design/shaders').then(({ ShaderMount, liquidMetalFragmentShader }) => {
      if (cancelled) return;
      try {
        mount = new ShaderMount(host, liquidMetalFragmentShader, {
          u_repetition: 4, u_softness: .5, u_shiftRed: .12, u_shiftBlue: .3,
          u_distortion: .1, u_contour: 0, u_angle: 45, u_shape: 1, u_isImage: false,
          u_colorBack: [0, 0, 0, 0], u_colorTint: [.8, .9, 1, 1],
          u_scale: 8, u_fit: 2, u_rotation: 0, u_originX: .5, u_originY: .5,
          u_offsetX: .1, u_offsetY: -.1, u_worldWidth: 0, u_worldHeight: 0,
        }, undefined, .8, 0, 1, 160_000);
        shader.current = mount;
        host.dataset.ready = '';
      } catch {
        // WebGL is optional decoration; the CSS material remains a complete button.
        host.replaceChildren();
      }
    }).catch(() => { /* A failed optional chunk leaves the CSS material intact. */ });
    return () => {
      cancelled = true;
      mount?.dispose();
      shader.current = null;
      delete host.dataset.ready;
      host.replaceChildren();
    };
  }, [materialMounted]);

  return <button {...props} type={type} disabled={disabled} className={`liquid-metal-button ${className}`} data-liquid-active={active || undefined}
    onPointerEnter={event => {
      if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) setHovered(true);
      onPointerEnter?.(event);
    }}
    onPointerLeave={event => { setHovered(false); onPointerLeave?.(event); }}
    onPointerCancel={event => { setHovered(false); setRipple(null); onPointerCancel?.(event); }}
    onClick={event => {
      if (motionAllowed && !disabled && event.detail > 0) {
        const rect = event.currentTarget.getBoundingClientRect();
        setRipple({ x: event.clientX - rect.left, y: event.clientY - rect.top,
          size: Math.hypot(rect.width, rect.height) * 2, id: rippleID.current++ });
        shader.current?.setSpeed(2.4);
      }
      onClick?.(event);
    }}>
    <span ref={material} className="liquid-material" aria-hidden="true" />
    <span className="liquid-shimmer" aria-hidden="true"><span className="liquid-shimmer-spark" /></span>
    <GlassEffect />
    {children}
    {motionAllowed && !disabled && ripple && <span key={ripple.id} className="liquid-ripple" aria-hidden="true"
      style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
      onAnimationEnd={() => { setRipple(null); shader.current?.setSpeed(.8); }} />}
  </button>;
}
