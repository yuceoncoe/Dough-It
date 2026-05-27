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
      frame++;
      ctx.clearRect(0, 0, 60, 60);

      // 1. Draw base ground/soil background for action scenes
      const soilDark = '#433022';
      const soilLight = '#5c4033';
      const grassGreen = '#388e3c';

      // Background ground line (common for all scenes except maybe watering which splashes on it)
      drawPixelRect(0, 52, 60, 8, soilDark);
      drawPixelRect(0, 51, 60, 1, soilLight);

      if (actionType === 'watering') {
        // --- 1. WATERING SCENE ---
        // Draw grass layer on top of soil
        drawPixelRect(0, 50, 60, 1, grassGreen);

        // Can rotation oscillation
        // Can tilts to pour water, then returns
        const canAngle = 0.2 + Math.sin(frame * 0.05) * 0.25 + 0.25; // 0.2 to 0.7 rad (approx 11 to 40 deg)
        const canCenterX = 40;
        const canCenterY = 22;

        // Sprinkler rose position (local: (12, 1) relative to pivot)
        const rad = canAngle;
        const roseX = canCenterX - Math.round(12 * Math.cos(rad)) + Math.round(1 * Math.sin(rad));
        const roseY = canCenterY + Math.round(12 * Math.sin(rad)) + Math.round(1 * Math.cos(rad));

        // Emit water particles if can is tilted enough
        const isPouring = canAngle > 0.45;
        if (isPouring && frame % 2 === 0) {
          particles.push({
            x: roseX - 2 + Math.random() * 4,
            y: roseY + 2,
            vx: -0.6 - Math.random() * 0.8,
            vy: 1.5 + Math.random() * 1.0,
            color: Math.random() < 0.3 ? '#e0f7fa' : '#29b6f6', // bright light blue
            life: 1,
            maxLife: 30,
          });
        }

        // Draw active water drops and splashes
        particles.forEach((p, idx) => {
          p.x += p.vx;
          p.y += p.vy;

          if (p.y >= 50) {
            // Splash at ground level!
            p.life = 0; // kill particle
            // Spawn splash ripples
            for (let r = 0; r < 3; r++) {
              drawPixel(p.x - 1 + r, 50, '#e0f7fa');
            }
          } else {
            // Draw falling water droplet
            drawPixelRect(p.x, p.y, 1, 2, p.color);
          }
        });

        // Draw Watering Can
        ctx.save();
        ctx.translate(canCenterX, canCenterY);
        ctx.rotate(-canAngle); // Tilted leftwards to pour

        // Body
        drawPixelRect(-7, -5, 14, 10, '#90a4ae'); // Main metal body (blue gray)
        drawPixelRect(-7, -6, 14, 1, '#b0bec5');  // Top rim
        drawPixelRect(-5, -3, 10, 6, '#78909c');  // Inner shading
        
        // Handle (back)
        drawPixelRect(-11, -3, 4, 1, '#37474f');
        drawPixelRect(-11, -2, 1, 6, '#37474f');
        drawPixelRect(-11, 4, 4, 1, '#37474f');

        // Spout (front)
        drawPixelRect(-14, 0, 7, 2, '#78909c');
        drawPixelRect(-17, -1, 3, 2, '#607d8b');

        // Sprinkler rose (head)
        drawPixelRect(-19, -3, 2, 6, '#cfd8dc');

        ctx.restore();

        // Draw a small growing sprout being watered
        const sproutX = 15;
        drawPixelRect(sproutX, 46, 1, 4, '#4caf50'); // stem
        drawPixel(sproutX - 1, 45, '#81c784'); // leaf
        drawPixel(sproutX + 1, 45, '#81c784');
        if (isPouring) {
          // Draw sparkles around watered sprout
          if (frame % 10 === 0) {
            drawPixel(sproutX + (frame % 3 - 1) * 3, 43 + (frame % 2), '#fff176');
          }
        }

      } else if (actionType === 'pruning') {
        // --- 2. PRUNING SCENE ---
        // Draw grass layer
        drawPixelRect(0, 50, 60, 1, grassGreen);

        // Stalk to cut on the left side
        const stalkX = 18;
        drawPixelRect(stalkX - 1, 26, 3, 25, '#1b5e20'); // stem outline
        drawPixelRect(stalkX, 26, 1, 25, '#4caf50');     // stem inner
        
        // Stationary leaves
        drawPixelRect(stalkX - 4, 42, 3, 2, '#81c784'); // Left low leaf
        drawPixel(stalkX - 1, 43, '#4caf50');
        
        drawPixelRect(stalkX + 2, 34, 3, 2, '#81c784'); // Right mid leaf
        drawPixel(stalkX + 1, 35, '#4caf50');

        // The target leaf to be pruned (at (stalkX + 2, 28))
        if (!cutLeaf.active && frame % 120 === 0) {
          // Reset leaf state
          cutLeaf = {
            active: false,
            x: stalkX + 2,
            y: 28,
            rotation: 0,
            vx: 0,
            vy: 0,
          };
        }

        // Scissors/Shears movement cycle (Phase 0: approach, Phase 1: cut, Phase 2: fallback)
        // Total loop: 120 frames
        const loopFrame = frame % 120;
        let shearsX = 48;
        let shearsY = 29;
        let shearsAngle = 0.35; // open angle in rad

        if (loopFrame < 40) {
          // Phase 0: Approaching target leaf
          const t = loopFrame / 40;
          shearsX = 48 - t * 24; // moves from 48 to 24
          shearsAngle = 0.35;
        } else if (loopFrame >= 40 && loopFrame < 50) {
          // Phase 1: Closing/cutting
          shearsX = 24;
          const t = (loopFrame - 40) / 10;
          shearsAngle = 0.35 * (1 - t); // closes to 0
          if (loopFrame === 45) {
            // Cut happens! Trigger falling leaf
            cutLeaf.active = true;
            cutLeaf.vx = -0.5 - Math.random() * 0.5;
            cutLeaf.vy = 0.5;
            // Snip sparkle particles
            for (let k = 0; k < 6; k++) {
              particles.push({
                x: 22 + (Math.random() * 6 - 3),
                y: 28 + (Math.random() * 6 - 3),
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                color: '#ffffff',
                life: 1,
                maxLife: 15,
              });
            }
          }
        } else if (loopFrame >= 50 && loopFrame < 60) {
          // Phase 2: Stay closed briefly
          shearsX = 24;
          shearsAngle = 0;
        } else {
          // Phase 3: Retreat and open
          const t = (loopFrame - 60) / 60;
          shearsX = 24 + t * 24;
          shearsAngle = 0.35 * t;
        }

        // Draw cut leaf falling down
        if (cutLeaf.active) {
          cutLeaf.x += cutLeaf.vx;
          cutLeaf.y += cutLeaf.vy;
          cutLeaf.vy += 0.08; // gravity
          cutLeaf.rotation += 0.15;
          cutLeaf.vx = Math.sin(frame * 0.15) * 0.6; // sway

          if (cutLeaf.y < 50) {
            // Draw rotating leaf
            ctx.save();
            ctx.translate(cutLeaf.x, cutLeaf.y);
            ctx.rotate(cutLeaf.rotation);
            drawPixelRect(-2, -1, 4, 2, '#81c784');
            drawPixelRect(-1, -1, 2, 2, '#66bb6a');
            ctx.restore();
          } else {
            // Rests on soil mound at bottom
            drawPixelRect(cutLeaf.x - 2, 50, 4, 1, '#81c784');
          }
        } else {
          // Still attached to stalk
          drawPixelRect(stalkX + 2, 28, 4, 2, '#81c784');
          drawPixel(stalkX + 1, 29, '#4caf50');
        }

        // Render sparkles
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life++;
          drawPixel(p.x, p.y, p.color);
        });
        particles = particles.filter((p) => p.life < p.maxLife);

        // Draw shears/scissors
        // Upper part (handles up, blade down)
        ctx.save();
        ctx.translate(shearsX, shearsY);
        ctx.rotate(shearsAngle);
        // Blade (left)
        drawPixelRect(-9, -1, 9, 1, '#cfd8dc'); // metal steel
        drawPixelRect(-8, -2, 4, 1, '#b0bec5');
        // Handle (right)
        drawPixelRect(0, 1, 10, 2, '#e53935'); // red plastic handle
        drawPixelRect(8, 3, 4, 1, '#e53935');
        drawPixelRect(11, 0, 1, 4, '#e53935');
        ctx.restore();

        // Lower part (handles down, blade up)
        ctx.save();
        ctx.translate(shearsX, shearsY);
        ctx.rotate(-shearsAngle);
        // Blade
        drawPixelRect(-9, 0, 9, 1, '#90a4ae'); // darker metal steel
        drawPixelRect(-8, 1, 4, 1, '#78909c');
        // Handle
        drawPixelRect(0, -3, 10, 2, '#c62828'); // darker red handle
        drawPixelRect(8, -4, 4, 1, '#c62828');
        drawPixelRect(11, -4, 1, 4, '#c62828');
        ctx.restore();

        // Joint pin
        drawPixel(shearsX, shearsY, '#37474f');

      } else if (actionType === 'fertilizing') {
        // --- 3. FERTILIZING SCENE ---
        // Draw grass layer
        drawPixelRect(0, 50, 60, 1, grassGreen);

        // Sprout in center
        const sproutX = 22;
        const stemHeight = 16;
        
        // Animate sprout pulsing/growing when hit by spray
        sproutPulse = Math.max(0, sproutPulse - 0.05);

        // Draw Sprout Stem
        const currentScale = 1.0 + sproutPulse * 0.15;
        const scaledHeight = Math.round(stemHeight * currentScale);
        
        drawPixelRect(sproutX - 1, baseCenterY - 4 - scaledHeight, 3, scaledHeight, '#1b5e20');
        drawPixelRect(sproutX, baseCenterY - 4 - scaledHeight, 1, scaledHeight, '#4caf50');
        
        // Sprout Leaves
        const topY = baseCenterY - 4 - scaledHeight;
        drawPixelRect(sproutX - 4, topY - 2, 4, 3, '#1b5e20');
        drawPixelRect(sproutX - 3, topY - 1, 2, 2, '#81c784');

        drawPixelRect(sproutX + 1, topY - 3, 4, 3, '#1b5e20');
        drawPixelRect(sproutX + 1, topY - 2, 3, 2, '#81c784');

        // Spray bottle position and movement (Phase 0: rest, Phase 1: tilt, Phase 2: spray)
        const loopFrame = frame % 100;
        let bottleX = 44;
        let bottleY = 22;
        let bottleAngle = -0.3; // tilt left

        const isSpraying = loopFrame >= 30 && loopFrame <= 65;

        if (isSpraying) {
          // Spray nozzle tip is at approx (28, 26)
          if (frame % 2 === 0) {
            // Spawn sparkly mist particles
            particles.push({
              x: 32,
              y: 24 + (Math.random() * 4 - 2),
              vx: -1.4 - Math.random() * 0.8,
              vy: 0.6 + Math.random() * 0.8,
              color: Math.random() < 0.5 ? '#ffd54f' : '#81c784', // bright yellow or light green
              life: 1,
              maxLife: 24,
            });
          }
        }

        // Draw active fertilizer mist
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life++;

          // Check collision with sprout
          if (Math.abs(p.x - sproutX) < 6 && p.y >= topY && p.y <= topY + 12) {
            sproutPulse = 1.0; // trigger pulse scale
            p.color = '#fff';  // flash white
          }

          drawPixel(p.x, p.y, p.color);
        });
        particles = particles.filter((p) => p.life < p.maxLife);

        // Draw Spray Bottle
        ctx.save();
        ctx.translate(bottleX, bottleY);
        ctx.rotate(bottleAngle);

        // Bottle body
        drawPixelRect(-6, -2, 12, 10, '#00897b'); // Teal body
        drawPixelRect(-5, -1, 10, 8, '#26a69a');
        drawPixelRect(-3, -1, 2, 7, '#80cbc4');  // highlights
        
        // Nozzle collar
        drawPixelRect(-3, -4, 6, 2, '#eceff1');
        
        // Nozzle head (left)
        drawPixelRect(-8, -6, 5, 3, '#eceff1');
        drawPixelRect(-8, -4, 8, 1, '#b0bec5');
        
        // Trigger handle (right)
        drawPixelRect(1, -2, 2, 5, '#cfd8dc');
        if (isSpraying) {
          // Animate trigger pull
          drawPixelRect(1, -2, 1, 5, '#90a4ae');
        }

        ctx.restore();

      } else if (actionType === 'tilling') {
        // --- 4. SOIL TILLING SCENE ---
        // Draw soil mound in the middle-left
        const moundX = 20;
        const moundY = 46;
        
        drawPixelRect(moundX - 10, moundY, 20, 6, '#3e2723'); // Dark soil outline
        drawPixelRect(moundX - 8, moundY + 1, 16, 5, '#5d4037');  // Outer light brown
        drawPixelRect(moundX - 4, moundY + 2, 8, 4, '#8d6e63');   // Inner highlights

        // Swing hoe animation (Cycle: 60 frames)
        const loopFrame = frame % 60;
        let hoeAngle = -0.6; // raised default
        let isHitting = false;

        if (loopFrame < 25) {
          // Raising hoe
          const t = loopFrame / 25;
          hoeAngle = -0.6 - t * 0.3; // pull back further to -0.9 rad
        } else if (loopFrame >= 25 && loopFrame < 33) {
          // Chopping down rapidly
          const t = (loopFrame - 25) / 8;
          hoeAngle = -0.9 + t * 2.0; // swings down to +1.1 rad
          if (loopFrame === 31) {
            isHitting = true;
          }
        } else if (loopFrame >= 33 && loopFrame < 42) {
          // Hoe rests in soil
          hoeAngle = 1.1;
        } else {
          // Recover back to raised
          const t = (loopFrame - 42) / 18;
          hoeAngle = 1.1 - t * 1.7; // goes back to -0.6
        }

        if (isHitting) {
          // Spawn dust particles
          for (let k = 0; k < 8; k++) {
            particles.push({
              x: moundX + Math.random() * 6 - 3,
              y: moundY + 2,
              vx: (Math.random() - 0.5) * 2.0,
              vy: -1.0 - Math.random() * 1.2,
              color: Math.random() < 0.5 ? '#8d6e63' : '#a1887f',
              life: 1,
              maxLife: 20,
            });
          }
        }

        // Draw dust particles
        particles.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08; // gravity
          p.life++;
          drawPixel(p.x, p.y, p.color);
        });
        particles = particles.filter((p) => p.life < p.maxLife && p.y < 52);

        // Draw Hoe
        const pivotX = moundX + 15;
        const pivotY = 24;

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(hoeAngle);

        // Handle (wooden shaft pointing right-up from pivot)
        ctx.strokeStyle = '#a1887f'; // light wood handle
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(24, -12);
        ctx.stroke();

        // Metal connection (at pivot)
        drawPixelRect(-2, -3, 4, 6, '#37474f');
        
        // Hoe metal blade (perpendicular, pointing left/down-left)
        drawPixelRect(-7, 2, 6, 2, '#78909c'); // metal head
        drawPixelRect(-8, 3, 3, 2, '#cfd8dc'); // sharp edge

        ctx.restore();
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
      className="flex items-center justify-center"
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
