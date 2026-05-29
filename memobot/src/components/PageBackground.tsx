import React, { useEffect, useRef } from "react";
import { useTheme, themes } from "../contexts/ThemeContext";
import { useLayout } from "../contexts/LayoutContext";

export function PageBackground() {
  const { theme } = useTheme();
  const { settings } = useLayout();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // For matrix mode – each column has a "drop" Y position and some metadata
    let matrixDrops: number[] = [];
    let matrixIsNameColumn: boolean[] = [];
    let matrixNameValue: string[] = [];   // which name is assigned to a name column

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const primaryStr = themes[theme].primary;
    const hexToRgb = (hex: string) => {
      let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 170, 255';
    };
    const primaryRgb = hexToRgb(primaryStr);

    // Space mode classes (unchanged)
    const spaceDrops: SpaceDrop[] = [];
    const stormClouds: StormCloud[] = [];
    const asteroids: Asteroid[] = [];

    const MAX_DEPTH = 4000;

    class SpaceDrop {
      x: number; y: number; z: number; speed: number; length: number; colorVar: string; angleOffset: number;
      constructor(z?: number) {
        this.x = (Math.random() - 0.5) * 8000;
        this.y = (Math.random() - 0.5) * 8000;
        this.z = z ?? (Math.random() * MAX_DEPTH);
        this.speed = Math.random() * 80 + 40;
        this.length = Math.random() * 600 + 150;
        this.angleOffset = (Math.random() - 0.5) * 0.05;
        const hueShift = Math.random() * 40 - 20;
        this.colorVar = `hsl(${210 + hueShift}, 100%, 70%)`;
      }
      update() {
        this.z -= this.speed;
        const cx = this.x, cy = this.y;
        this.x = cx * Math.cos(this.angleOffset) - cy * Math.sin(this.angleOffset);
        this.y = cx * Math.sin(this.angleOffset) + cy * Math.cos(this.angleOffset);
        if (this.z < 10) {
          this.z = MAX_DEPTH;
          this.x = (Math.random() - 0.5) * 8000;
          this.y = (Math.random() - 0.5) * 8000;
          this.speed = Math.random() * 80 + 40;
        }
      }
      draw() {
        if (!ctx) return;
        const fov = width * 1.2;
        let sx = (this.x / this.z) * fov + width / 2;
        let sy = (this.y / this.z) * fov + height / 2;
        let tz = this.z + this.length;
        let px = (this.x / tz) * fov + width / 2;
        let py = (this.y / tz) * fov + height / 2;
        const opacity = Math.min(1, Math.max(0.05, 1 - (this.z / MAX_DEPTH)));
        const thickness = Math.max(0.5, (1 - (this.z / MAX_DEPTH)) * 4.5);
        const gradient = ctx.createLinearGradient(px, py, sx, sy);
        gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
        gradient.addColorStop(0.5, `rgba(${primaryRgb}, ${opacity * 0.4})`);
        gradient.addColorStop(0.9, this.colorVar);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity + 0.2})`);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        if (this.z < 500) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = this.colorVar;
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    let lightningFlash = 0;
    class StormCloud {
      x: number; y: number; radius: number; rgb: string; baseOpacity: number; speedX: number; isTop: boolean;
      constructor(isTop: boolean) {
        this.isTop = isTop;
        this.x = Math.random() * window.innerWidth;
        this.y = isTop ? window.innerHeight * 0.05 : window.innerHeight * 0.95;
        this.radius = Math.random() * 800 + 400;
        this.rgb = '255, 255, 255';
        this.baseOpacity = Math.random() * 0.15 + 0.05;
        this.speedX = (Math.random() - 0.5) * 1.5;
      }
      update() {
        this.x += this.speedX;
        if (this.x < -this.radius) this.x = width + this.radius;
        if (this.x > width + this.radius) this.x = -this.radius;
        this.y = this.isTop ? height * 0.05 : height * 0.95;
      }
      draw() {
        if (!ctx) return;
        const flashBoost = lightningFlash * (Math.random() * 0.15 + 0.05);
        const currentOpacity = this.baseOpacity + flashBoost;
        const isFlickering = lightningFlash > 0.5 && Math.random() < 0.3;
        const color = isFlickering ? `rgba(255, 255, 255, ${currentOpacity * 1.5})` : `rgba(${this.rgb}, ${currentOpacity})`;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(5, 0.05);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
    }

    class Asteroid {
      x: number; y: number; z: number; size: number; points: {x: number, y: number}[];
      rotX: number; rotY: number; rotZ: number; speedZ: number; rotSpeedX: number; rotSpeedY: number;
      constructor(z?: number) {
        this.x = (Math.random() - 0.5) * 6000;
        this.y = (Math.random() - 0.5) * 6000;
        this.z = z ?? Math.random() * MAX_DEPTH;
        this.size = Math.random() * 80 + 20;
        this.speedZ = Math.random() * 30 + 10;
        this.rotX = Math.random() * Math.PI * 2;
        this.rotY = Math.random() * Math.PI * 2;
        this.rotZ = Math.random() * Math.PI * 2;
        this.rotSpeedX = (Math.random() - 0.5) * 0.05;
        this.rotSpeedY = (Math.random() - 0.5) * 0.05;
        this.points = [];
        const numPoints = Math.floor(Math.random() * 4) + 6;
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const r = this.size * (0.5 + Math.random() * 0.5);
          this.points.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }
      }
      update() {
        this.z -= this.speedZ;
        this.rotX += this.rotSpeedX;
        this.rotY += this.rotSpeedY;
        if (this.z < 10) {
          this.z = MAX_DEPTH;
          this.x = (Math.random() - 0.5) * 6000;
          this.y = (Math.random() - 0.5) * 6000;
        }
      }
      draw() {
        if (!ctx) return;
        const fov = width;
        let scale = fov / this.z;
        let sx = this.x * scale + width / 2;
        let sy = this.y * scale + height / 2;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(scale, scale);
        ctx.rotate(this.rotX);
        ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
          const pt = this.points[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(180, 180, 190, ${Math.min(1, 1 - (this.z / MAX_DEPTH))})`;
        ctx.lineWidth = 1.5;
        ctx.fillStyle = `rgba(10, 10, 15, ${Math.min(0.9, 1 - (this.z / MAX_DEPTH))})`;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    for (let i = 0; i < 800; i++) spaceDrops.push(new SpaceDrop());
    for (let i = 0; i < 20; i++) stormClouds.push(new StormCloud(i % 2 === 0));
    for (let i = 0; i < 30; i++) asteroids.push(new Asteroid());

    let animationFrameId: number;

    interface Bolt { x: number; y: number; life: number; points: {x: number, y: number}[]; }
    const lightningBolts: Bolt[] = [];

    const spawnLightning = (startX: number, startY: number) => {
      const points = [{ x: startX, y: startY }];
      let cx = startX, cy = startY;
      let angle = Math.random() * Math.PI * 2;
      const numSegments = Math.floor(Math.random() * 8) + 5;
      for (let i = 0; i < numSegments; i++) {
        const length = Math.random() * 60 + 30;
        angle += (Math.random() * 1.5 - 0.75);
        cx += Math.cos(angle) * length;
        cy += Math.sin(angle) * length;
        points.push({ x: cx, y: cy });
      }
      lightningBolts.push({ x: startX, y: startY, life: 1.0, points });
    };

    const animate = () => {
      const mode = settings.backgroundMode || 'space';

      if (mode === 'elegant') {
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, width, height);
        const time = Date.now() * 0.0005;
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, `rgba(${primaryRgb}, 0.15)`);
        gradient.addColorStop(1, '#050510');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 4; i++) {
          const cx = width / 2 + Math.cos(time + i * 1.5) * width * 0.4;
          const cy = height / 2 + Math.sin(time * 0.7 + i * 2) * height * 0.4;
          const rad = width * 0.6;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
          g.addColorStop(0, `rgba(${primaryRgb}, 0.2)`);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, width, height);
        }
        ctx.globalCompositeOperation = 'source-over';
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      if (mode === 'minimal') {
        const time = Date.now() * 0.002;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        const spacing = 60;
        const offsetX = -((time * 10) % spacing);
        const offsetY = -((time * 5) % spacing);
        for (let x = -spacing; x < width + spacing; x += spacing) {
          for (let y = -spacing; y < height + spacing; y += spacing) {
            const pulse = (Math.sin(time * 2 + x * 0.05 + y * 0.05) + 1) / 2;
            ctx.fillStyle = `rgba(${primaryRgb}, ${0.1 + pulse * 0.4})`;
            const cx = x + offsetX;
            const cy = y + offsetY;
            ctx.beginPath();
            ctx.fillRect(cx - 1, cy - 5, 2, 10);
            ctx.fillRect(cx - 5, cy - 1, 10, 2);
          }
        }
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      // -------------------- MATRIX MODE (with names & pulsing) --------------------
      if (mode === 'matrix') {
        // Configuration
        const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+=";
        const names = ["Hala", "Malak", "Lamar"];  // your 6 names
        const NAME_COLUMN_PROBABILITY = 0.1;   // 10% of columns will show vertical names
        const PULSE_SPEED = 0.008;             // how fast the pulse oscillates
        const fontSize = 14;
        const charWidth = fontSize * 0.8;
        const columnWidth = charWidth + 2;     // tight spacing for vertical letters

        // Update number of columns based on current width
        let columns = Math.ceil(width / columnWidth);
        
        // Resize arrays if needed
        if (matrixDrops.length !== columns) {
          const newDrops = new Array(columns);
          const newIsName = new Array(columns);
          const newNameValue = new Array(columns);
          for (let i = 0; i < columns; i++) {
            if (i < matrixDrops.length) {
              newDrops[i] = matrixDrops[i];
              newIsName[i] = matrixIsNameColumn[i];
              newNameValue[i] = matrixNameValue[i];
            } else {
              newDrops[i] = Math.random() * -100;
              // randomly decide if this new column is a name column
              const isName = Math.random() < NAME_COLUMN_PROBABILITY;
              newIsName[i] = isName;
              if (isName) {
                newNameValue[i] = names[Math.floor(Math.random() * names.length)];
              } else {
                newNameValue[i] = '';
              }
            }
          }
          matrixDrops = newDrops;
          matrixIsNameColumn = newIsName;
          matrixNameValue = newNameValue;
        }

        // Semi-transparent black to create trailing effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);
        ctx.font = `${fontSize}px monospace`;

        const time = Date.now() * PULSE_SPEED;
        const pulseFactor = (Math.sin(time) + 1) / 2;  // 0..1

        for (let i = 0; i < matrixDrops.length; i++) {
          const dropYBase = matrixDrops[i] * fontSize;
          const dropX = i * columnWidth;

          if (matrixIsNameColumn[i]) {
            // ----- VERTICAL NAME COLUMN with PULSING -----
            const name = matrixNameValue[i];
            // Pulsing intensity: brighter when pulseFactor is high
            const intensity = 0.6 + pulseFactor * 0.5; // range 0.6..1.1
            const shadowIntensity = 0.5 + pulseFactor * 1.0;
            
            for (let j = 0; j < name.length; j++) {
              const letter = name[j];
              const yPos = dropYBase + (j * fontSize);
              if (yPos > 0 && yPos < height) {
                // Head of the name column (first letter) gets extra brightness
                if (j === 0) {
                  ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + pulseFactor * 0.3})`;
                  ctx.shadowColor = `rgba(255, 255, 255, ${shadowIntensity * 0.8})`;
                  ctx.shadowBlur = 10 + pulseFactor * 10;
                } else {
                  const r = parseInt(primaryRgb.split(',')[0]);
                  const g = parseInt(primaryRgb.split(',')[1]);
                  const b = parseInt(primaryRgb.split(',')[2]);
                  ctx.fillStyle = `rgba(${r * intensity}, ${g * intensity}, ${b * intensity}, 0.9)`;
                  ctx.shadowColor = `rgba(${primaryRgb}, ${shadowIntensity * 0.7})`;
                  ctx.shadowBlur = 8 + pulseFactor * 8;
                }
                ctx.fillText(letter, dropX, yPos);
              }
            }
            // Reset shadow after drawing the column
            ctx.shadowBlur = 0;
            
            // Move the whole name block down
            const blockHeight = name.length * fontSize;
            if (dropYBase + blockHeight > height && Math.random() > 0.975) {
              matrixDrops[i] = 0;
              // Optionally pick a new name when resetting
              matrixNameValue[i] = names[Math.floor(Math.random() * names.length)];
            } else {
              matrixDrops[i] += 0.5; // reduced speed
            }
          } else {
            // ----- NORMAL MATRIX COLUMN (single random character) -----
            const text = charSet.charAt(Math.floor(Math.random() * charSet.length));
            const dropY = dropYBase;
            
            if (Math.random() > 0.8) {
              ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
              ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
              ctx.shadowBlur = 5;
            } else {
              ctx.fillStyle = `rgba(${primaryRgb}, 0.8)`;
              ctx.shadowColor = `rgba(${primaryRgb}, 0.8)`;
              ctx.shadowBlur = 10;
            }
            
            if (dropY > 0 && dropY < height) {
              ctx.fillText(text, dropX, dropY);
            }
            ctx.shadowBlur = 0;
            
            if (dropY > height && Math.random() > 0.975) {
              matrixDrops[i] = 0;
            } else {
              matrixDrops[i] += 0.5;
            }
          }
        }
        
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      // -------------------- DEFAULT SPACE MODE --------------------
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      
      if (settings.spaceStorms && Math.random() < 0.01) {
        lightningFlash = 1;
        const numBolts = Math.floor(Math.random() * 2) + 1;
        for (let b = 0; b < numBolts; b++) spawnLightning(Math.random() * width, Math.random() * height);
      }

      if (settings.spaceStorms) {
        for (let i = 0; i < stormClouds.length; i++) stormClouds[i].update();
        for (let i = 0; i < stormClouds.length; i++) stormClouds[i].draw();
        if (lightningFlash > 0) {
          ctx.fillStyle = `rgba(${primaryRgb}, ${lightningFlash * 0.15})`;
          ctx.fillRect(0, 0, width, height);
          lightningFlash -= 0.05;
        }
        for (let i = lightningBolts.length - 1; i >= 0; i--) {
          const bolt = lightningBolts[i];
          if (bolt.life <= 0) { lightningBolts.splice(i, 1); continue; }
          ctx.beginPath();
          for (let j = 0; j < bolt.points.length; j++) {
            const p = bolt.points[j];
            if (j === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          ctx.strokeStyle = `rgba(220, 240, 255, ${Math.min(1, bolt.life * 1.5)})`;
          ctx.lineWidth = 3 + (Math.random() * 2);
          ctx.shadowBlur = 15;
          ctx.shadowColor = `rgba(${primaryRgb}, ${Math.min(1, bolt.life)})`;
          ctx.stroke();
          ctx.shadowBlur = 0;
          bolt.life -= 0.1;
        }
      }

      if (settings.spaceRocks) {
        for (let i = 0; i < asteroids.length; i++) asteroids[i].update();
        for (let i = 0; i < asteroids.length; i++) asteroids[i].draw();
      }

      for (let i = 0; i < spaceDrops.length; i++) spaceDrops[i].update();
      for (let i = 0; i < spaceDrops.length; i++) spaceDrops[i].draw();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, settings.spaceRocks, settings.spaceStorms, settings.backgroundMode]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.1)_10%,rgba(0,0,0,1)_100%)] mix-blend-multiply" />
      <div className="absolute inset-0 m-4 sm:m-6 border-t border-white/[0.05] rounded-[2.5rem] pointer-events-none shadow-[inset_0_40px_100px_rgba(255,255,255,0.02)]" />
      <div className="absolute inset-0 m-4 sm:m-6 border-b border-black rounded-[2.5rem] pointer-events-none shadow-[inset_0_-40px_100px_rgba(0,0,0,0.5)]" />
      <div 
        className="absolute bottom-0 left-0 right-0 h-48 opacity-20 pointer-events-none mix-blend-screen"
        style={{ backgroundImage: `linear-gradient(to top, ${themes[theme].primary}, transparent)` }}
      />
    </div>
  );
}