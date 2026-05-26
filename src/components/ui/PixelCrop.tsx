import React, { useEffect, useRef } from 'react';
import { CropState } from '../../utils/crop';

interface PixelCropProps {
  cropState: CropState;
  size?: number; // Visual size in px
  interactive?: boolean;
}

export const PixelCrop = ({
  cropState,
  size = 120,
  interactive = false,
}: PixelCropProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let localFrame = 0;
    // Particles for quality (stars) & health (vital sparkles)
    let cropParticles: Array<{
      x: number;
      y: number;
      alpha: number;
      size: number;
      color: string;
      vx: number;
      vy: number;
    }> = [];

    const draw = () => {
      localFrame++;
      ctx.clearRect(0, 0, 60, 60);

      const { evolutionStage, month, health, yieldCount, quality } = cropState;

      // Base Y coordinates
      const baseCenterX = 30;
      const baseCenterY = 53;

      // Wind sway effect
      const swayOffset = Math.sin(localFrame * 0.04) * 2.0 * (health / 100);

      // Low health gray/dim filter
      if (health < 40) {
        ctx.filter = 'saturate(0.5) brightness(0.8)';
      } else {
        ctx.filter = 'none';
      }

      // Drawing helpers
      const drawPixel = (x: number, y: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      };

      const drawPixelRect = (x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
      };

      // 1. Draw Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.ellipse(baseCenterX, baseCenterY + 3, 22, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Soil Mound
      const soilDark = '#433022';
      const soilLight = '#5c4033';
      const soilWithered = '#6d5c50'; // Dull soil for low health

      const currentSoilLight = health < 30 ? soilWithered : soilLight;

      drawPixelRect(baseCenterX - 18, baseCenterY - 2, 36, 5, soilDark);
      drawPixelRect(baseCenterX - 14, baseCenterY - 4, 28, 2, currentSoilLight);
      drawPixelRect(baseCenterX - 8, baseCenterY - 5, 16, 1, currentSoilLight);
      drawPixel(baseCenterX - 11, baseCenterY - 5, currentSoilLight);
      drawPixel(baseCenterX + 10, baseCenterY - 5, currentSoilLight);

      // Color scheme for plant
      const stemColor = health < 45 ? '#689f38' : '#4caf50'; // Dull green vs vibrant green
      const stemOutline = health < 45 ? '#33691e' : '#1b5e20';
      const leafColor = health < 45 ? '#9ccc65' : '#81c784';

      // 3. Draw Crop by Stage
      if (evolutionStage === 1) {
        // --- SEED STAGE ---
        const seedColor = health < 40 ? '#8d6e63' : '#a87c53';
        const seedOutline = '#2b1c11';
        drawPixelRect(baseCenterX - 3, baseCenterY - 9, 6, 6, seedOutline);
        drawPixelRect(baseCenterX - 2, baseCenterY - 8, 4, 4, seedColor);
        drawPixelRect(baseCenterX - 1, baseCenterY - 9, 2, 1, '#d7ccc8'); // shine
      } else if (evolutionStage === 2) {
        // --- SPROUT STAGE ---
        const swayX = Math.round(swayOffset * 0.4);
        
        // Stem
        drawPixelRect(baseCenterX - 2 + swayX, baseCenterY - 11, 4, 8, stemOutline);
        drawPixelRect(baseCenterX - 1 + swayX, baseCenterY - 11, 2, 8, stemColor);

        // Leaves - Drooping if health is low
        const leafYOffset = health < 40 ? 2 : 0;

        // Left Leaf
        drawPixelRect(baseCenterX - 7 + swayX, baseCenterY - 14 + leafYOffset, 5, 3, stemOutline);
        drawPixelRect(baseCenterX - 6 + swayX, baseCenterY - 13 + leafYOffset, 4, 2, leafColor);

        // Right Leaf
        drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 15 + leafYOffset, 6, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 14 + leafYOffset, 5, 2, leafColor);
      } else if (evolutionStage === 3) {
        // --- GROWING STAGE ---
        const swayX = Math.round(swayOffset * 0.7);
        const leafYOffset = health < 40 ? 3 : 0;

        // Main Stem
        drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5), baseCenterY - 21, 4, 18, stemOutline);
        drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5), baseCenterY - 20, 2, 17, stemColor);

        // Lower Left leaf
        drawPixelRect(baseCenterX - 8 + Math.round(swayX * 0.2), baseCenterY - 12 + leafYOffset, 6, 3, stemOutline);
        drawPixelRect(baseCenterX - 7 + Math.round(swayX * 0.2), baseCenterY - 11 + leafYOffset, 5, 2, leafColor);

        // Mid Right leaf
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.6), baseCenterY - 17 + leafYOffset, 7, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.6), baseCenterY - 16 + leafYOffset, 6, 2, leafColor);

        // Upper Left leaf
        drawPixelRect(baseCenterX - 7 + swayX, baseCenterY - 22 + leafYOffset, 5, 3, stemOutline);
        drawPixelRect(baseCenterX - 6 + swayX, baseCenterY - 21 + leafYOffset, 4, 2, leafColor);
      } else if (evolutionStage === 4) {
        // --- BLOOMING STAGE ---
        const swayX = Math.round(swayOffset);
        const leafYOffset = health < 40 ? 3 : 0;

        // Stem
        drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5), baseCenterY - 31, 4, 28, stemOutline);
        drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5), baseCenterY - 30, 2, 27, stemColor);

        // Leaves
        drawPixelRect(baseCenterX - 9 + Math.round(swayX * 0.3), baseCenterY - 15 + leafYOffset, 7, 3, stemOutline);
        drawPixelRect(baseCenterX - 8 + Math.round(swayX * 0.3), baseCenterY - 14 + leafYOffset, 6, 2, leafColor);

        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 22 + leafYOffset, 8, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 21 + leafYOffset, 7, 2, leafColor);

        // Bud Color
        let budColor = '#f48fb1';
        let budCore = '#fff59d';
        if (month === 5 || month === 12) {
          budColor = '#ef5350';
        } else if (month === 8 || month === 9) {
          budColor = '#fdd835';
        } else if (month === 2 || month === 10) {
          budColor = '#ffb74d';
        }

        // Low health bud color (withering)
        if (health < 40) {
          budColor = '#bcaaa4'; // brownish bud
          budCore = '#d7ccc8';
        }

        const headY = baseCenterY - 39;
        drawPixelRect(baseCenterX - 5 + swayX, headY, 10, 9, stemOutline);
        drawPixelRect(baseCenterX - 4 + swayX, headY + 1, 8, 7, budColor);
        drawPixelRect(baseCenterX - 2 + swayX, headY + 3, 4, 3, budCore);
      } else {
        // --- MATURE / HARVEST STAGE (Stage 5) ---
        // Dynamically renders count & layout of fruits based on YIELDCOUNT (Q2)
        // yieldCount: 1~3 (Low - 1 fruit), 4~7 (Med - 2 fruits), 8~10 (High - 3 fruits)
        const swayX = Math.round(swayOffset * 1.2);
        const stemTopY = baseCenterY - 34;

        // Stem
        drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5), baseCenterY - 34, 4, 31, stemOutline);
        drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5), baseCenterY - 33, 2, 30, stemColor);

        // Leaves (droop if low health)
        const leafYOffset = health < 40 ? 3 : 0;
        drawPixelRect(baseCenterX - 9 + Math.round(swayX * 0.4), baseCenterY - 16 + leafYOffset, 7, 3, stemOutline);
        drawPixelRect(baseCenterX - 8 + Math.round(swayX * 0.4), baseCenterY - 15 + leafYOffset, 6, 2, leafColor);

        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 24 + leafYOffset, 8, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 23 + leafYOffset, 7, 2, leafColor);

        const isLowYield = yieldCount <= 3;
        const isMedYield = yieldCount > 3 && yieldCount <= 7;
        const isHighYield = yieldCount > 7;

        // Colors
        let fruitColor = '#d32f2f'; // default red
        let fruitLight = '#f44336';
        let fruitAccent = '#ffeb3b';

        // Quality (Q3) modifier: '최상급' has golden highlight, '하급' is unripe/unhealthy
        if (quality === '최상급') {
          fruitAccent = '#ffd700'; // Golden highlight
        } else if (quality === '하급') {
          fruitColor = '#8d6e63'; // Brownish/unripe/rotten
          fruitLight = '#bcaaa4';
          fruitAccent = '#795548';
        }

        const drawFruitItem = (fx: number, fy: number, scale = 1.0) => {
          // Inner drawing per crop type (scaled slightly if needed)
          switch (month) {
            case 1: {
              // Strawberry 🍓
              const w = Math.round(12 * scale);
              const h = Math.round(11 * scale);
              drawPixelRect(fx - w / 2, fy, w, 2, '#388e3c'); // Calyx
              drawPixelRect(fx - w / 2 - 1, fy + 2, w + 2, h, '#2b0c0c'); // Outline
              drawPixelRect(fx - w / 2, fy + 2, w, h, fruitColor);
              drawPixelRect(fx - w / 2 + 2, fy + 3, Math.round(3 * scale), 2, fruitLight); // shine
              drawPixel(fx - 2, fy + 5, fruitAccent); // seeds
              drawPixel(fx + 2, fy + 5, fruitAccent);
              drawPixel(fx, fy + 8, fruitAccent);
              break;
            }
            case 2: {
              // Tangerine 🍊
              const r = Math.round(6 * scale);
              drawPixelRect(fx - r, fy - r, r * 2, r * 2, '#3e2723'); // outline
              drawPixelRect(fx - r + 1, fy - r + 1, r * 2 - 2, r * 2 - 2, '#ef6c00');
              drawPixelRect(fx - 2, fy - 3, 2, 2, '#fff176'); // shine
              break;
            }
            case 3: {
              // Sprout Cluster 🌱
              drawPixelRect(fx - 7, fy - 4, 14, 9, '#2e7d32');
              drawPixelRect(fx - 6, fy - 3, 12, 7, '#4caf50');
              drawPixelRect(fx - 3, fy - 2, 6, 5, '#a5d6a7');
              break;
            }
            case 4: {
              // Cherry Blossom 🌸
              drawPixelRect(fx - 8, fy - 5, 16, 10, '#c2185b');
              drawPixelRect(fx - 7, fy - 4, 14, 8, '#e91e63');
              drawPixelRect(fx - 4, fy - 3, 8, 6, '#f8bbd0');
              break;
            }
            case 5: {
              // Rose 🌹
              drawPixelRect(fx - 7, fy - 5, 14, 10, '#880e4f');
              drawPixelRect(fx - 6, fy - 4, 12, 8, '#d32f2f');
              drawPixelRect(fx - 3, fy - 2, 6, 4, '#ff8a80');
              break;
            }
            case 6: {
              // Plum 🟢
              const r = Math.round(4 * scale);
              drawPixelRect(fx - r, fy - r, r * 2, r * 2, '#1b5e20');
              drawPixelRect(fx - r + 1, fy - r + 1, r * 2 - 2, r * 2 - 2, '#4caf50');
              break;
            }
            case 7: {
              // Watermelon 🍉
              drawPixelRect(fx - 9, fy, 18, 10, '#1b5e20');
              drawPixelRect(fx - 8, fy + 1, 16, 8, '#388e3c');
              drawPixelRect(fx - 6, fy + 1, 2, 8, '#a5d6a7'); // stripes
              drawPixelRect(fx + 2, fy + 1, 2, 8, '#a5d6a7');
              break;
            }
            case 8: {
              // Corn 🌽
              drawPixelRect(fx - 3, fy, 6, 12, '#f57f17');
              drawPixelRect(fx - 2, fy, 4, 12, '#fbc02d');
              drawPixelRect(fx - 1, fy + 2, 2, 8, '#fff176');
              break;
            }
            case 9: {
              // Sunflower 🌻
              drawPixelRect(fx - 8, fy - 8, 16, 16, '#f57f17');
              drawPixelRect(fx - 7, fy - 7, 14, 14, '#ffeb3b');
              drawPixelRect(fx - 3, fy - 3, 6, 6, '#3e2723'); // core
              break;
            }
            case 10: {
              // Persimmon 🍅
              drawPixelRect(fx - 5, fy - 4, 10, 8, '#3e2723');
              drawPixelRect(fx - 4, fy - 3, 8, 6, '#e65100');
              drawPixel(fx - 1, fy - 4, '#263238'); // stem
              break;
            }
            case 11: {
              // Sweet Potato 🍠
              drawPixelRect(fx - 7, fy, 14, 6, '#4a148c');
              drawPixelRect(fx - 6, fy + 1, 12, 4, '#7b1fa2');
              break;
            }
            case 12: {
              // Camellia 🌺
              drawPixelRect(fx - 6, fy - 4, 12, 8, '#880e4f');
              drawPixelRect(fx - 5, fy - 3, 10, 6, '#c2185b');
              drawPixel(fx, fy - 1, '#ffca28'); // gold core
              break;
            }
          }
        };

        // Render quantity based on Yield Bucket
        if (isLowYield) {
          // 1 central large fruit
          drawFruitItem(baseCenterX + swayX, stemTopY, 1.15);
        } else if (isMedYield) {
          // 2 medium fruits (left & right)
          drawFruitItem(baseCenterX - 7 + Math.round(swayX * 0.7), stemTopY - 2, 0.9);
          drawFruitItem(baseCenterX + 7 + Math.round(swayX * 1.1), stemTopY + 2, 0.9);
        } else {
          // 3 fruits (left, right, and top center)
          drawFruitItem(baseCenterX - 8 + Math.round(swayX * 0.6), stemTopY - 3, 0.85);
          drawFruitItem(baseCenterX + 8 + Math.round(swayX * 1.2), stemTopY + 3, 0.85);
          drawFruitItem(baseCenterX + swayX, stemTopY - 7, 1.0);
        }
      }

      // --- 4. Sparkles and particles engine (Quality & Health indicators) ---
      // A. Generate particles
      if (quality === '최상급' && Math.random() < 0.20) {
        // Gold Star for Legendary Quality
        cropParticles.push({
          x: baseCenterX + swayOffset + (Math.random() * 26 - 13),
          y: baseCenterY - 12 - (Math.random() * 24),
          alpha: 1.0,
          size: Math.random() * 2 + 1.8,
          color: '#ffca28', // Golden Yellow
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.4 - 0.2,
        });
      } else if (quality === '상급' && Math.random() < 0.15) {
        // Silver Sparkle for Rare Quality
        cropParticles.push({
          x: baseCenterX + swayOffset + (Math.random() * 22 - 11),
          y: baseCenterY - 12 - (Math.random() * 22),
          alpha: 1.0,
          size: Math.random() * 1.5 + 1.5,
          color: '#fff', // White shiny
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.3 - 0.1,
        });
      }

      // Vital green sparks for High Health (>= 80)
      if (health >= 80 && Math.random() < 0.18) {
        cropParticles.push({
          x: baseCenterX + swayOffset + (Math.random() * 32 - 16),
          y: baseCenterY - 5 - (Math.random() * 35),
          alpha: 1.0,
          size: Math.random() * 1.0 + 1.2,
          color: '#a5d6a7', // Light green energy dot
          vx: (Math.random() - 0.5) * 0.2,
          vy: -Math.random() * 0.3 - 0.15,
        });
      }

      // B. Update and draw particles
      cropParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.008;

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          drawPixelRect(p.x, p.y, p.size, p.size, p.color);
          ctx.restore();
        }
      });
      cropParticles = cropParticles.filter((p) => p.alpha > 0);

      animationIdRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [cropState]);

  const getCenterOffsetPercent = (stage: number) => {
    if (stage === 1) return -38;
    if (stage === 2) return -30;
    if (stage === 3) return -22;
    if (stage === 4) return -14;
    return -6;
  };

  return (
    <div
      className={`flex items-center justify-center ${interactive ? 'cursor-pointer' : ''}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        width={60}
        height={60}
        className="h-full w-full"
        style={{
          imageRendering: 'pixelated',
          transform: `translateY(${getCenterOffsetPercent(cropState.evolutionStage)}%)`,
        }}
      />
    </div>
  );
};

export default PixelCrop;
