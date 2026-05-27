import React, { useEffect, useRef } from 'react';

interface PixelActionProps {
  actionType: 'pruning' | 'watering' | 'fertilizing' | 'tilling';
  size?: number; // size in px
}

export const PixelAction = ({
  actionType,
  size = 52,
}: PixelActionProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let frame = 0;
    const baseCenterY = 50;

    // Helper functions for drawing
    const drawPixel = (x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    };

    const drawPixelRect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
    };

    // Animation state variables
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      life: number;
      maxLife: number;
    }

    let particles: Particle[] = [];
    
    // Snipped leaf state (for pruning)
    let cutLeaf = {
      active: false,
      x: 0,
      y: 0,
      rotation: 0,
      vx: 0,
      vy: 0,
    };

    // Sprout pulse scale (for fertilizing)
    let sproutPulse = 0;

    const draw = () => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      try {
        frame++;
        ctx.clearRect(0, 0, 60, 60);

        // Soil and Grass Base
        const soilDark = '#3e2723';
        const soilLight = '#5d4037';
        const grassGreen = '#4caf50';
        const grassDark = '#2e7d32';

        // Draw background ground line
        drawPixelRect(0, 52, 60, 8, soilDark);
        drawPixelRect(0, 51, 60, 1, soilLight);

        if (actionType === 'watering') {
          // --- 1. WATERING CAN SCENE ---
          drawPixelRect(0, 50, 60, 1, grassGreen);
          drawPixelRect(0, 51, 60, 1, grassDark);

          // Tilt angle oscillates
          const canAngle = 0.2 + Math.sin(frame * 0.06) * 0.28 + 0.28;
          const isPouring = canAngle > 0.4;

          // Water particles from nozzle area
          if (isPouring && frame % 2 === 0) {
            particles.push({
              x: 10 + Math.random() * 3,
              y: 28,
              vx: -0.3 - Math.random() * 0.5,
              vy: 1.5 + Math.random() * 1.0,
              color: Math.random() < 0.4 ? '#e0f7fa' : '#29b6f6',
              life: 1,
              maxLife: 30,
            });
          }
          particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.y >= 50) {
              p.life = 0;
              drawPixel(p.x - 1, 50, '#e0f7fa');
              drawPixel(p.x, 50, '#80deea');
              drawPixel(p.x + 1, 50, '#e0f7fa');
            } else {
              drawPixelRect(p.x, p.y, 1, 2, p.color);
            }
          });
          particles = particles.filter((p) => p.life > 0);

          // === Gray Steel Watering Can — absolute coords on 60x60 canvas ===
          // Gentle bob animation
          const bob = Math.round(Math.sin(frame * 0.06) * 2);
          const cx = 32; // horizontal center of body
          const cy = 22 + bob;

          // -- Main body (wide rectangle) --
          drawPixelRect(cx - 11, cy - 6, 22, 14, '#4a4a4a');   // dark border
          drawPixelRect(cx - 10, cy - 5, 20, 12, '#787878');   // base gray
          drawPixelRect(cx - 9,  cy - 4, 12,  6, '#9e9e9e');   // upper highlight
          drawPixelRect(cx - 10, cy + 4, 20,  3, '#363636');   // bottom shadow
          drawPixelRect(cx - 10, cy - 5, 20,  1, '#aaaaaa');   // top rim line

          // -- Top arch handle --
          drawPixelRect(cx - 6, cy - 10, 12, 2, '#363636');    // top bar
          drawPixelRect(cx - 7, cy -  9,  1, 4, '#363636');    // left leg
          drawPixelRect(cx + 6, cy -  9,  1, 4, '#363636');    // right leg
          drawPixelRect(cx - 6, cy - 10, 12, 1, '#888888');    // highlight on bar

          // -- Right side handle (C-shape) --
          drawPixelRect(cx + 11, cy - 4,  1, 9, '#363636');    // right bar
          drawPixelRect(cx + 11, cy - 5,  5, 2, '#363636');    // top hook
          drawPixelRect(cx + 11, cy + 4,  5, 2, '#363636');    // bottom hook
          drawPixelRect(cx + 15, cy - 3,  1, 7, '#363636');    // far right edge

          // -- Spout (angled left from body) --
          // Rotate spout based on pour angle
          ctx.save();
          ctx.translate(cx - 11, cy);
          ctx.rotate(canAngle * 0.4);
          drawPixelRect(-13,  0, 14, 3, '#666666');  // shaft
          drawPixelRect(-13,  2, 14, 1, '#2a2a2a');  // shadow
          drawPixelRect(-12, -1, 12, 1, '#909090');  // highlight
          // Nozzle head
          drawPixelRect(-17, -4,  5, 7, '#4a4a4a');  // outer
          drawPixelRect(-16, -3,  3, 5, '#747474');  // inner
          drawPixel(-16, -2, '#222222');
          drawPixel(-14, -2, '#222222');
          drawPixel(-15, -1, '#222222');
          drawPixel(-16,  0, '#222222');
          drawPixel(-14,  0, '#222222');
          ctx.restore();

          // Growing sprout on the left
          const sproutX = 8;
          drawPixelRect(sproutX, 44, 2, 6, '#2e7d32');
          drawPixelRect(sproutX, 44, 1, 6, '#4caf50');
          drawPixelRect(sproutX - 2, 42, 2, 2, '#81c784');
          drawPixelRect(sproutX + 1, 42, 2, 2, '#81c784');
          if (isPouring && frame % 8 === 0) {
            drawPixel(sproutX + (frame % 3 - 1) * 3, 39, '#fff176');
          }

        } else if (actionType === 'pruning') {
          // --- 2. PRUNING SHEARS SCENE (Classic Red Shears) ---
          drawPixelRect(0, 50, 60, 1, grassGreen);

          // Stalk on the left
          const stalkX = 14;
          drawPixelRect(stalkX - 1, 20, 3, 31, '#1b5e20');
          drawPixelRect(stalkX, 20, 1, 31, '#4caf50');
          
          // Leaves
          drawPixelRect(stalkX - 4, 38, 3, 2, '#81c784');
          drawPixel(stalkX - 1, 39, '#4caf50');
          
          drawPixelRect(stalkX + 2, 31, 3, 2, '#81c784');
          drawPixel(stalkX + 1, 32, '#4caf50');

          if (!cutLeaf.active && frame % 110 === 0) {
            cutLeaf = {
              active: false,
              x: stalkX + 2,
              y: 24,
              rotation: 0,
              vx: 0,
              vy: 0,
            };
          }

          // Scissors cycle
          const loopFrame = frame % 110;
          let shearsX = 42;
          let shearsY = 25;
          let shearsAngle = 0.45;

          if (loopFrame < 35) {
            const t = loopFrame / 35;
            shearsX = 42 - t * 22; // 42 -> 20
            shearsAngle = 0.45;
          } else if (loopFrame >= 35 && loopFrame < 45) {
            shearsX = 20;
            const t = (loopFrame - 35) / 10;
            shearsAngle = 0.45 * (1 - t);
            if (loopFrame === 40) {
              cutLeaf.active = true;
              cutLeaf.vx = -0.5;
              cutLeaf.vy = 0.3;
              for (let k = 0; k < 6; k++) {
                particles.push({
                  x: 18 + (Math.random() * 6 - 3),
                  y: 24 + (Math.random() * 6 - 3),
                  vx: (Math.random() - 0.5) * 1.8,
                  vy: (Math.random() - 0.5) * 1.8,
                  color: '#ffffff',
                  life: 1,
                  maxLife: 12,
                });
              }
            }
          } else if (loopFrame >= 45 && loopFrame < 55) {
            shearsX = 20;
            shearsAngle = 0;
          } else {
            const t = (loopFrame - 55) / 55;
            shearsX = 20 + t * 22;
            shearsAngle = 0.45 * t;
          }

          // Cut leaf falling
          if (cutLeaf.active) {
            cutLeaf.x += cutLeaf.vx;
            cutLeaf.y += cutLeaf.vy;
            cutLeaf.vy += 0.08;
            cutLeaf.rotation += 0.15;
            cutLeaf.vx = Math.sin(frame * 0.12) * 0.6;

            if (cutLeaf.y < 50) {
              ctx.save();
              ctx.translate(cutLeaf.x, cutLeaf.y);
              ctx.rotate(cutLeaf.rotation);
              drawPixelRect(-2, -1, 4, 2, '#81c784');
              drawPixelRect(-1, -1, 2, 2, '#66bb6a');
              ctx.restore();
            } else {
              drawPixelRect(cutLeaf.x - 2, 50, 4, 1, '#81c784');
            }
          } else {
            drawPixelRect(stalkX + 2, 24, 4, 2, '#81c784');
            drawPixel(stalkX + 1, 25, '#4caf50');
          }

          particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            drawPixel(p.x, p.y, p.color);
          });
          particles = particles.filter((p) => p.life < p.maxLife);

          // Render Stardew-Style Shears (UPSCALED)
          // Upper Blade/Handle
          ctx.save();
          ctx.translate(shearsX, shearsY);
          ctx.rotate(shearsAngle);

          // Blade (Larger steel)
          drawPixelRect(-14, -1, 14, 1, '#cfd8dc');
          drawPixelRect(-13, -2, 7, 1, '#b0bec5');
          // Handle (Larger red handles)
          drawPixelRect(0, 1, 13, 3, '#ef5350');
          drawPixelRect(9, 4, 5, 1, '#ef5350');
          drawPixelRect(13, 0, 1, 5, '#b71c1c');
          drawPixelRect(0, 0, 4, 1, '#b71c1c');
          ctx.restore();

          // Lower Blade/Handle
          ctx.save();
          ctx.translate(shearsX, shearsY);
          ctx.rotate(-shearsAngle);

          // Blade
          drawPixelRect(-14, 0, 14, 1, '#90a4ae');
          drawPixelRect(-13, 1, 7, 1, '#78909c');
          // Handle
          drawPixelRect(0, -4, 13, 3, '#b71c1c');
          drawPixelRect(9, -5, 5, 1, '#b71c1c');
          drawPixelRect(13, -5, 1, 5, '#7f0000');
          drawPixelRect(0, -1, 4, 1, '#7f0000');
          ctx.restore();

          // Brass screw
          drawPixel(shearsX, shearsY, '#ffd54f');
          drawPixelRect(shearsX - 1, shearsY - 1, 2, 2, '#ffb300');

        } else if (actionType === 'fertilizing') {
          // --- 3. POTION BOTTLE SCENE (Magical Elixir/Fertilizer Bottle) ---
          drawPixelRect(0, 50, 60, 1, grassGreen);

          // Seedling in center
          const sproutX = 18;
          const stemHeight = 17;
          sproutPulse = Math.max(0, sproutPulse - 0.06);

          const currentScale = 1.0 + sproutPulse * 0.18;
          const scaledHeight = Math.round(stemHeight * currentScale);
          
          // Draw Plant
          drawPixelRect(sproutX - 1, baseCenterY - 1 - scaledHeight, 3, scaledHeight, '#2e7d32');
          drawPixelRect(sproutX, baseCenterY - 1 - scaledHeight, 1, scaledHeight, '#66bb6a');
          
          const topY = baseCenterY - 1 - scaledHeight;
          drawPixelRect(sproutX - 4, topY - 1, 4, 2, '#81c784');
          drawPixel(sproutX - 1, topY, '#4caf50');
          drawPixelRect(sproutX + 1, topY - 2, 4, 2, '#81c784');
          drawPixel(sproutX + 1, topY - 1, '#4caf50');

          // Potion bottle movement
          const loopFrame = frame % 90;
          let bottleX = 38;
          let bottleY = 16;
          let bottleAngle = -0.45;

          const isPouring = loopFrame >= 25 && loopFrame <= 65;

          if (isPouring) {
            if (frame % 2 === 0) {
              particles.push({
                x: bottleX - 15 + (Math.random() * 4 - 2),
                y: bottleY + 5,
                vx: -1.3 - Math.random() * 0.8,
                vy: 0.9 + Math.random() * 0.8,
                color: Math.random() < 0.5 ? '#e1bee7' : '#ab47bc',
                life: 1,
                maxLife: 26,
              });
            }
            if (frame % 4 === 0) {
              particles.push({
                x: bottleX - 15,
                y: bottleY + 5,
                vx: -1.1 - Math.random() * 0.6,
                vy: 1.1 + Math.random() * 0.6,
                color: '#ffd54f',
                life: 1,
                maxLife: 22,
              });
            }
          }

          // Draw potion particles & detect collision
          particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life++;

            if (Math.abs(p.x - sproutX) < 6 && p.y >= topY && p.y <= baseCenterY) {
              sproutPulse = 1.0;
              p.color = '#ffffff';
            }
            drawPixel(p.x, p.y, p.color);
          });
          particles = particles.filter((p) => p.life < p.maxLife);

          // Render Stardew-Style Glass Potion Bottle (UPSCALED: 14x11 main body)
          ctx.save();
          ctx.translate(bottleX, bottleY);
          ctx.rotate(bottleAngle);

          // Glass outline (deep violet-black)
          drawPixelRect(-7, -3, 14, 11, '#4a148c');
          drawPixelRect(-5, -7, 10, 4, '#4a148c');
          drawPixelRect(-3, -9, 6, 2, '#4a148c'); // neck

          // Glowing liquid inside
          drawPixelRect(-6, -2, 12, 9, '#7b1fa2');
          drawPixelRect(-5, -1, 10, 7, '#ab47bc');
          drawPixelRect(-3, -1, 3, 5, '#e1bee7'); // shiny highlight

          // Cork stopper
          drawPixelRect(-2, -11, 4, 2, '#8d6e63');

          ctx.restore();

        } else if (actionType === 'tilling') {
          // --- 4. HOE TILLING SCENE (Stardew Iron Hoe) ---
          // Soil mound (Larger mound)
          const moundX = 16;
          const moundY = 46;
          
          drawPixelRect(moundX - 12, moundY, 24, 6, '#271000');
          drawPixelRect(moundX - 10, moundY + 1, 20, 5, '#5d4037');
          drawPixelRect(moundX - 6, moundY + 2, 12, 4, '#8d6e63');

          // Swing hoe loop
          const loopFrame = frame % 55;
          let hoeAngle = -0.5;
          let isHitting = false;

          if (loopFrame < 22) {
            const t = loopFrame / 22;
            hoeAngle = -0.5 - t * 0.45;
          } else if (loopFrame >= 22 && loopFrame < 29) {
            const t = (loopFrame - 22) / 7;
            hoeAngle = -0.95 + t * 2.15;
            if (loopFrame === 27) {
              isHitting = true;
            }
          } else if (loopFrame >= 29 && loopFrame < 38) {
            hoeAngle = 1.2;
          } else {
            const t = (loopFrame - 38) / 17;
            hoeAngle = 1.2 - t * 1.7;
          }

          if (isHitting) {
            for (let k = 0; k < 8; k++) {
              particles.push({
                x: moundX + Math.random() * 8 - 4,
                y: moundY + 1,
                vx: (Math.random() - 0.5) * 2.5,
                vy: -1.4 - Math.random() * 1.5,
                color: Math.random() < 0.6 ? '#5d4037' : '#8d6e63',
                life: 1,
                maxLife: 24,
              });
            }
          }

          // Draw soil particles
          particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.life++;
            drawPixel(p.x, p.y, p.color);
          });
          particles = particles.filter((p) => p.life < p.maxLife && p.y < 52);

          // === Korean Homi (호미) ===
          // pivot at (moundX+4, 20). At hit angle +1.2 rad:
          //   head center (24, 8) → canvas y ≈ 45 (moundY=46) ✓
          //   grip end (-10, -4) → canvas (upper area) ✓
          const pivotX = moundX + 4;  // = 20
          const pivotY = 20;

          ctx.save();
          ctx.translate(pivotX, pivotY);
          ctx.rotate(hoeAngle);

          // -- Wooden Handle: grip is upper-left (-10,-4), head end is lower-right (19,7) --
          ctx.strokeStyle = '#5c2d0a';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-10, -4);
          ctx.lineTo(19, 7);
          ctx.stroke();
          ctx.strokeStyle = '#a0522d';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, -4);
          ctx.lineTo(19, 7);
          ctx.stroke();
          ctx.strokeStyle = '#d4845a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-11, -5);
          ctx.lineTo(18, 6);
          ctx.stroke();

          // -- Metal Socket (where handle meets head) --
          drawPixelRect(17, 3, 8, 8, '#555555');
          drawPixelRect(18, 2, 6, 3, '#888888');

          // -- Round Metal Head (center ~(24,8), hits soil at hoeAngle=+1.2) --
          drawPixelRect(17,  3, 14, 14, '#3a3a3a');  // dark border
          drawPixelRect(18,  4, 12, 12, '#7a7a7a');  // main gray
          drawPixelRect(19,  4,  8,  6, '#b0b0b0');  // highlight
          drawPixelRect(19,  4, 11,  1, '#c0c0c0');  // top rim
          drawPixelRect(18, 11, 12,  3, '#2e2e2e');  // lower shadow
          drawPixelRect(17, 13, 14,  1, '#d0d0d0');  // blade edge
          drawPixelRect(22,  7,  4,  4, '#505050');  // rivet outer
          drawPixelRect(23,  8,  2,  2, '#282828');  // rivet inner

          ctx.restore();
        }
      } catch (error) {
        console.error('Canvas drawing error:', error);
      }

      animationIdRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [actionType]);

  return (
    <div
      className="flex items-center justify-center animate-[fade-in_250ms_ease-out]"
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        width={60}
        height={60}
        className="h-full w-full"
        style={{
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};

export default PixelAction;
