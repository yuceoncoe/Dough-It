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
    // Particles for quality, health, aura, heart, dust, fallingLeaf, risingBeam
    let cropParticles: Array<{
      x: number;
      y: number;
      alpha: number;
      size: number;
      color: string;
      vx: number;
      vy: number;
      type: 'star' | 'sparkle' | 'energy' | 'heart' | 'dust' | 'fallingLeaf' | 'risingBeam';
      frameOffset?: number;
    }> = [];

    const draw = () => {
      localFrame++;
      ctx.clearRect(0, 0, 60, 60);

      const { evolutionStage, month, health, yieldCount, quality, stats } = cropState;

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

      // 2. Draw Soil Mound (Q4: healthQ4 <= 2 - Cracked, healthQ4 >= 7 - Clovers)
      const soilDark = '#433022';
      const soilLight = '#5c4033';
      const soilWithered = '#6d5c50'; // Dull soil for low health

      const currentSoilLight = health < 30 ? soilWithered : soilLight;

      // Draw base soil
      drawPixelRect(baseCenterX - 18, baseCenterY - 2, 36, 5, soilDark);
      drawPixelRect(baseCenterX - 14, baseCenterY - 4, 28, 2, currentSoilLight);
      drawPixelRect(baseCenterX - 8, baseCenterY - 5, 16, 1, currentSoilLight);
      drawPixel(baseCenterX - 11, baseCenterY - 5, currentSoilLight);
      drawPixel(baseCenterX + 10, baseCenterY - 5, currentSoilLight);

      // Q4 Effect: Soil Cracks (healthQ4 <= 2)
      if (stats.healthQ4 <= 2) {
        drawPixel(baseCenterX - 6, baseCenterY - 3, '#1d120a');
        drawPixel(baseCenterX - 5, baseCenterY - 2, '#1d120a');
        drawPixel(baseCenterX + 4, baseCenterY - 3, '#1d120a');
        drawPixel(baseCenterX + 5, baseCenterY - 4, '#1d120a');
      }

      // Q4 Effect: Clovers (healthQ4 >= 7)
      if (stats.healthQ4 >= 7) {
        const cloverColor = '#81c784';
        const cloverStem = '#2e7d32';
        // Left Clover
        drawPixel(baseCenterX - 12, baseCenterY - 6, cloverColor);
        drawPixelRect(baseCenterX - 13, baseCenterY - 5, 3, 1, cloverColor);
        drawPixel(baseCenterX - 12, baseCenterY - 4, cloverStem);
        // Right Clover
        drawPixel(baseCenterX + 12, baseCenterY - 6, cloverColor);
        drawPixelRect(baseCenterX + 11, baseCenterY - 5, 3, 1, cloverColor);
        drawPixel(baseCenterX + 12, baseCenterY - 4, cloverStem);
      }

      // Plant styling by month
      const isWoody = month === 2 || month === 4 || month === 6 || month === 10 || month === 12;
      const isVine = month === 7 || month === 11;
      const isGroup = month === 3;
      const isRose = month === 5;
      const isStrawberry = month === 1;

      // Base colors
      let stemColor = health < 45 ? '#689f38' : '#4caf50'; // Dull green vs vibrant green
      let stemOutline = health < 45 ? '#33691e' : '#1b5e20';
      let leafColor = health < 45 ? '#9ccc65' : '#81c784';

      // Customize colors by plant type
      if (isWoody) {
        if (month === 2) { // Tangerine
          stemColor = '#8d6e63'; // Brown stem
          stemOutline = '#4e342e';
          leafColor = health < 45 ? '#689f38' : '#2e7d32'; // Glossy dark green leaves
        } else if (month === 4) { // Cherry Blossom
          stemColor = '#5d4037'; // Bark brown
          stemOutline = '#3e2723';
          leafColor = health < 45 ? '#9ccc65' : '#a5d6a7'; // Soft light green leaves
        } else if (month === 6) { // Plum
          stemColor = '#4e342e'; // Antique woody brown
          stemOutline = '#271c19';
          leafColor = health < 45 ? '#8d9b4c' : '#8bc34a';
        } else if (month === 10) { // Persimmon
          stemColor = '#5d4037';
          stemOutline = '#3e2723';
          leafColor = health < 45 ? '#d84315' : '#ffb74d'; // Autumn foliage colors (orange-yellow)
        } else if (month === 12) { // Camellia
          stemColor = '#3e2723'; // Very dark woody brown
          stemOutline = '#1a0c02';
          leafColor = health < 45 ? '#1b5e20' : '#0d533a'; // Glossy dark hunter green
        }
      } else if (month === 11) { // Sweet Potato
        stemColor = '#7b1fa2'; // Purple vine
        stemOutline = '#4a148c';
        leafColor = health < 45 ? '#8d6e63' : '#66bb6a'; // Green leaves with purple veins
      }

      // Q1 Effect: Crooked stem if growthQ1 <= 2 (For stages >= 2)
      const isCrooked = stats.growthQ1 <= 2 && evolutionStage > 1;

      // Q2 Effect: Shrunken leaves size modifier if yieldQ2 <= 2
      const isLowYieldQ2 = stats.yieldQ2 <= 2;
      const leafSizeModifier = isLowYieldQ2 ? -1 : 0;

      // Q3 Effect: Dark Spots color helper if qualityQ3 <= 2
      const isLowQualityQ3 = stats.qualityQ3 <= 2;

      // 3. Draw Crop by Stage
      if (evolutionStage === 1) {
        // --- 1. SEED STAGE ---
        const seedColor = health < 40 ? '#8d6e63' : '#a87c53';
        const seedOutline = '#2b1c11';
        drawPixelRect(baseCenterX - 3, baseCenterY - 9, 6, 6, seedOutline);
        drawPixelRect(baseCenterX - 2, baseCenterY - 8, 4, 4, seedColor);
        drawPixelRect(baseCenterX - 1, baseCenterY - 9, 2, 1, '#d7ccc8'); // shine
      } else if (evolutionStage === 2) {
        // --- 2. GERMINATION STAGE (Seed + Tiny Sprout) ---
        const swayX = Math.round(swayOffset * 0.25);
        const seedColor = health < 40 ? '#8d6e63' : '#a87c53';
        const seedOutline = '#2b1c11';

        // Draw Seed
        drawPixelRect(baseCenterX - 3, baseCenterY - 9, 6, 6, seedOutline);
        drawPixelRect(baseCenterX - 2, baseCenterY - 8, 4, 4, seedColor);
        drawPixelRect(baseCenterX - 1, baseCenterY - 9, 2, 1, '#d7ccc8'); // shine

        // Draw tiny emerging green sprout
        if (isGroup) {
          drawPixel(baseCenterX - 4 + swayX, baseCenterY - 10, stemOutline);
          drawPixel(baseCenterX - 3 + swayX, baseCenterY - 10, leafColor);
          drawPixel(baseCenterX - 1 + swayX, baseCenterY - 10, stemOutline);
          drawPixel(baseCenterX + swayX, baseCenterY - 11, leafColor);
          drawPixel(baseCenterX + 2 + swayX, baseCenterY - 10, stemOutline);
          drawPixel(baseCenterX + 3 + swayX, baseCenterY - 10, leafColor);
        } else {
          drawPixel(baseCenterX - 1 + swayX, baseCenterY - 10, stemOutline);
          drawPixel(baseCenterX + swayX, baseCenterY - 11, stemOutline);
          drawPixel(baseCenterX + swayX, baseCenterY - 10, stemColor);
          drawPixel(baseCenterX - 1 + swayX, baseCenterY - 11, leafColor);
        }
      } else if (evolutionStage >= 3 && evolutionStage <= 7) {
        if (isVine) {
          // --- VINE DRAWING SYSTEM (수박, 고구마) ---
          let vineLength = 12;
          let amplitude = 1.5;
          if (evolutionStage === 3) { vineLength = 12; amplitude = 1.5; }
          else if (evolutionStage === 4) { vineLength = 16; amplitude = 2.5; }
          else if (evolutionStage === 5) { vineLength = 22; amplitude = 3.5; }
          else if (evolutionStage === 6) { vineLength = 28; amplitude = 4.2; }
          else if (evolutionStage === 7) { vineLength = 34; amplitude = 4.8; }

          const startX = baseCenterX - Math.round(vineLength / 2);
          const endX = baseCenterX + Math.round(vineLength / 2);

          // Draw crawling vine stem
          for (let vx = startX; vx <= endX; vx++) {
            const dx = vx - baseCenterX;
            const wave = Math.sin(dx * 0.3 + swayOffset * 0.08) * amplitude;
            const vy = baseCenterY - 4 - Math.round(wave);

            drawPixel(vx, vy, stemOutline);
            drawPixel(vx, vy + 1, stemColor);
          }

          // Draw vine leaves
          const leafStep = 5;
          for (let vx = startX + 2; vx <= endX - 2; vx += leafStep) {
            const dx = vx - baseCenterX;
            const wave = Math.sin(dx * 0.3 + swayOffset * 0.08) * amplitude;
            const vy = baseCenterY - 4 - Math.round(wave);

            const isUp = (vx % 2 === 0);
            const ly = isUp ? vy - 2 : vy + 2;
            drawPixelRect(vx - 1, ly, 3, 2, stemOutline);
            drawPixel(vx, ly + (isUp ? 1 : 0), leafColor);
          }

          // Stage 6 and 7 Buds / Fruits
          if (evolutionStage === 6) {
            const fColor = month === 7 ? '#a5d6a7' : '#90caf9';
            const fOutline = month === 7 ? '#2e7d32' : '#5e35b1';
            const fx = baseCenterX + Math.round(vineLength * 0.2);
            const wave = Math.sin(Math.round(vineLength * 0.2) * 0.3 + swayOffset * 0.08) * amplitude;
            const fy = baseCenterY - 4 - Math.round(wave) - 2;
            
            drawPixelRect(fx - 1, fy - 1, 3, 3, fOutline);
            drawPixel(fx, fy, fColor);
          } else if (evolutionStage === 7) {
            const fx = baseCenterX + Math.round(vineLength * 0.2);
            const wave = Math.sin(Math.round(vineLength * 0.2) * 0.3 + swayOffset * 0.08) * amplitude;
            const fy = baseCenterY - 4 - Math.round(wave) - 3;

            if (month === 7) { // Watermelon
              drawPixelRect(fx - 4, fy - 3, 9, 7, '#1b5e20');
              drawPixelRect(fx - 3, fy - 2, 7, 5, '#a5d6a7');
              drawPixel(fx - 1, fy - 1, '#388e3c');
              drawPixel(fx + 1, fy - 1, '#388e3c');
            } else { // Sweet potato
              drawPixelRect(fx - 4, fy - 2, 9, 5, '#5d4037');
              drawPixelRect(fx - 3, fy - 1, 7, 3, '#7b1fa2');
            }
          }
        } else if (isStrawberry) {
          // --- 1월 딸기: 포복형 짧은 수풀 스타일 ---
          let bushHeight = 6;
          let bushWidth = 10;
          if (evolutionStage === 3) { bushHeight = 7; bushWidth = 12; }
          else if (evolutionStage === 4) { bushHeight = 10; bushWidth = 16; }
          else if (evolutionStage === 5) { bushHeight = 14; bushWidth = 20; }
          else if (evolutionStage === 6) { bushHeight = 17; bushWidth = 24; }
          else if (evolutionStage === 7) { bushHeight = 19; bushWidth = 26; }

          const swayX = Math.round(swayOffset * 0.45);
          const leafYOffset = health < 40 ? 2 : 0;

          const stems = [
            { tx: -Math.round(bushWidth * 0.35), ty: -Math.round(bushHeight * 0.6) },
            { tx: 0, ty: -bushHeight },
            { tx: Math.round(bushWidth * 0.35), ty: -Math.round(bushHeight * 0.6) }
          ];

          stems.forEach((stem) => {
            const endX = baseCenterX + stem.tx + swayX;
            const endY = baseCenterY - 4 + stem.ty + leafYOffset;
            
            ctx.strokeStyle = stemOutline;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(baseCenterX, baseCenterY - 4);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            drawPixelRect(endX - 2, endY - 2, 5, 4, stemOutline);
            drawPixelRect(endX - 1, endY - 1, 3, 2, leafColor);
          });

          if (evolutionStage === 6) {
            drawPixelRect(baseCenterX + swayX - 1, baseCenterY - 4 - Math.round(bushHeight * 0.5) - 1, 3, 3, '#fff');
            drawPixel(baseCenterX + swayX, baseCenterY - 4 - Math.round(bushHeight * 0.5), '#ffd54f');
          } else if (evolutionStage === 7) {
            const fx = baseCenterX + swayX;
            const fy = baseCenterY - 4 - Math.round(bushHeight * 0.4);
            drawPixelRect(fx - 2, fy, 5, 2, '#2e7d32');
            drawPixelRect(fx - 3, fy + 2, 7, 5, '#7b2e1a');
            drawPixelRect(fx - 2, fy + 2, 5, 5, '#ff8a80');
            drawPixel(fx, fy + 3, '#fff');
          }
        } else if (isGroup) {
          // --- 3월 새싹채소: 3개 줄기 군락 스타일 ---
          let stemH = 8;
          if (evolutionStage === 3) stemH = 8;
          else if (evolutionStage === 4) stemH = 12;
          else if (evolutionStage === 5) stemH = 16;
          else if (evolutionStage === 6) stemH = 20;
          else if (evolutionStage === 7) stemH = 24;

          const offsets = [
            { dx: -4, h: Math.round(stemH * 0.8), swayF: 0.3 },
            { dx: 0, h: stemH, swayF: 0.5 },
            { dx: 4, h: Math.round(stemH * 0.9), swayF: 0.4 }
          ];

          offsets.forEach((group) => {
            const swayX = Math.round(swayOffset * group.swayF);
            const curBaseX = baseCenterX + group.dx;
            const leafYOffset = health < 40 ? 2 : 0;

            for (let i = 0; i < group.h; i++) {
              const currY = baseCenterY - 4 - group.h + i;
              const tX = isCrooked ? Math.round(Math.sin(i * 0.3) * 1.5) : 0;
              drawPixelRect(curBaseX - 1 + swayX + tX, currY, 3, 1, stemOutline);
              drawPixel(curBaseX + swayX + tX, currY, stemColor);
            }

            const topY = baseCenterY - 4 - group.h + leafYOffset;
            const tX = isCrooked ? Math.round(Math.sin(0) * 1.5) : 0;
            drawPixelRect(curBaseX - 3 + swayX + tX, topY - 2, 7, 3, stemOutline);
            drawPixelRect(curBaseX - 2 + swayX + tX, topY - 1, 2, 2, leafColor);
            drawPixelRect(curBaseX + 1 + swayX + tX, topY - 1, 2, 2, leafColor);
          });

          if (evolutionStage === 6) {
            const topY = baseCenterY - 4 - stemH;
            drawPixelRect(baseCenterX + Math.round(swayOffset * 0.5) - 2, topY - 4, 5, 4, '#2e7d32');
            drawPixelRect(baseCenterX + Math.round(swayOffset * 0.5) - 1, topY - 3, 3, 2, '#a5d6a7');
          } else if (evolutionStage === 7) {
            const topY = baseCenterY - 4 - stemH;
            drawPixelRect(baseCenterX + Math.round(swayOffset * 0.5) - 3, topY - 5, 7, 5, '#2e7d32');
            drawPixelRect(baseCenterX + Math.round(swayOffset * 0.5) - 2, topY - 4, 5, 3, '#a5d6a7');
            drawPixelRect(baseCenterX + Math.round(swayOffset * 0.5) - 1, topY - 3, 3, 1, '#fff');
          }
        } else {
          // --- STANDARD VERTICAL CROP (기타 모든 곧은 식물들) ---
          let stemH = 8;
          let swayF = 0.4;
          if (evolutionStage === 3) { stemH = 8; swayF = 0.4; }
          else if (evolutionStage === 4) { stemH = 13; swayF = 0.55; }
          else if (evolutionStage === 5) { stemH = 18; swayF = 0.7; }
          else if (evolutionStage === 6) { stemH = 23; swayF = 0.85; }
          else if (evolutionStage === 7) { stemH = 28; swayF = 1.0; }

          if (month === 8 || month === 9) {
            stemH = Math.round(stemH * 1.25);
          }

          const swayX = Math.round(swayOffset * swayF);
          const leafYOffset = health < 40 ? (evolutionStage >= 5 ? 3 : 2) : 0;

          const isCorn = month === 8;
          const stemW = isCorn ? 6 : 4;
          const fillW = isCorn ? 4 : 2;
          const offsetDiff = isCorn ? -3 : -2;
          const fillDiff = isCorn ? -2 : -1;

          for (let i = 0; i < stemH; i++) {
            const currY = baseCenterY - 4 - stemH + i;
            const tX = isCrooked ? Math.round(Math.sin(i * (0.5 - evolutionStage * 0.04)) * (1.2 + evolutionStage * 0.2)) : 0;
            
            drawPixelRect(baseCenterX + offsetDiff + swayX + tX, currY, stemW, 1, stemOutline);
            drawPixelRect(baseCenterX + fillDiff + swayX + tX, currY, fillW, 1, stemColor);

            if (isRose) {
              if (i % 6 === 3) drawPixel(baseCenterX - 3 + swayX + tX, currY, '#e53935');
              if (i % 6 === 0) drawPixel(baseCenterX + 2 + swayX + tX, currY, '#e53935');
            }
          }

          if (evolutionStage === 3) {
            const leftLeafW = Math.max(1, 5 + leafSizeModifier);
            drawPixelRect(baseCenterX - 2 - leftLeafW + swayX, baseCenterY - 4 - stemH - 3 + leafYOffset, leftLeafW, 3, stemOutline);
            drawPixelRect(baseCenterX - 1 - leftLeafW + swayX, baseCenterY - 4 - stemH - 2 + leafYOffset, leftLeafW - 1, 2, leafColor);

            const rightLeafW = Math.max(1, 6 + leafSizeModifier);
            drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 4 - stemH - 4 + leafYOffset, rightLeafW, 3, stemOutline);
            drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 4 - stemH - 3 + leafYOffset, rightLeafW - 1, 2, leafColor);
            
            if (isLowQualityQ3) {
              drawPixel(baseCenterX - 4 + swayX, baseCenterY - 4 - stemH - 2 + leafYOffset, '#3e2723');
              drawPixel(baseCenterX + 4 + swayX, baseCenterY - 4 - stemH - 3 + leafYOffset, '#3e2723');
            }
          } else if (evolutionStage === 4) {
            const leftLeafW = Math.max(1, 5 + leafSizeModifier);
            drawPixelRect(baseCenterX - 2 - leftLeafW + Math.round(swayX * 0.3), baseCenterY - 4 - stemH + 4 + leafYOffset, leftLeafW, 3, stemOutline);
            drawPixelRect(baseCenterX - 1 - leftLeafW + Math.round(swayX * 0.3), baseCenterY - 4 - stemH + 5 + leafYOffset, leftLeafW - 1, 2, leafColor);

            const rightLeafW = Math.max(1, 6 + leafSizeModifier);
            drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 4 - stemH + 1 + leafYOffset, rightLeafW, 3, stemOutline);
            drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 4 - stemH + 2 + leafYOffset, rightLeafW - 1, 2, leafColor);

            drawPixelRect(baseCenterX - 1 + swayX, baseCenterY - 4 - stemH - 3 + leafYOffset, 3, 3, stemOutline);
            drawPixelRect(baseCenterX + swayX, baseCenterY - 4 - stemH - 2 + leafYOffset, 2, 2, leafColor);
          } else if (evolutionStage === 5) {
            const lowLeftW = Math.max(1, 6 + leafSizeModifier);
            drawPixelRect(baseCenterX - 2 - lowLeftW + Math.round(swayX * 0.2), baseCenterY - 4 - stemH + 9 + leafYOffset, lowLeftW, 3, stemOutline);
            drawPixelRect(baseCenterX - 1 - lowLeftW + Math.round(swayX * 0.2), baseCenterY - 4 - stemH + 10 + leafYOffset, lowLeftW - 1, 2, leafColor);

            const midRightW = Math.max(1, 7 + leafSizeModifier);
            drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.6), baseCenterY - 4 - stemH + 4 + leafYOffset, midRightW, 3, stemOutline);
            drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.6), baseCenterY - 4 - stemH + 5 + leafYOffset, midRightW - 1, 2, leafColor);

            const upLeftW = Math.max(1, 5 + leafSizeModifier);
            drawPixelRect(baseCenterX - 2 - upLeftW + swayX, baseCenterY - 4 - stemH - 1 + leafYOffset, upLeftW, 3, stemOutline);
            drawPixelRect(baseCenterX - 1 - upLeftW + swayX, baseCenterY - 4 - stemH + leafYOffset, upLeftW - 1, 2, leafColor);

            if (stats.yieldQ2 >= 7) {
              drawPixel(baseCenterX - 6 + Math.round(swayX * 0.2), baseCenterY - 4 - stemH + 8 + leafYOffset, '#ef5350');
              drawPixel(baseCenterX + 5 + Math.round(swayX * 0.6), baseCenterY - 4 - stemH + 3 + leafYOffset, '#ef5350');
            }
          } else if (evolutionStage === 6) {
            const l1W = Math.max(1, 7 + leafSizeModifier);
            drawPixelRect(baseCenterX - 2 - l1W + Math.round(swayX * 0.3), baseCenterY - 4 - stemH + 12 + leafYOffset, l1W, 3, stemOutline);
            drawPixelRect(baseCenterX - 1 - l1W + Math.round(swayX * 0.3), baseCenterY - 4 - stemH + 13 + leafYOffset, l1W - 1, 2, leafColor);

            const l2W = Math.max(1, 7 + leafSizeModifier);
            drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 4 - stemH + 7 + leafYOffset, l2W, 3, stemOutline);
            drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 4 - stemH + 8 + leafYOffset, l2W - 1, 2, leafColor);

            const stemHeadX = isCrooked ? Math.round(Math.sin(0 * 0.22) * 2.5) : 0;
            const budY = baseCenterY - 4 - stemH - 6;

            const isFlowerType = month === 4 || month === 5 || month === 9 || month === 12;

            if (isFlowerType) {
              let budColor = '#f48fb1';
              if (month === 5 || month === 12) budColor = '#ef5350';
              else if (month === 9) budColor = '#fdd835';
              if (health < 40) budColor = '#bcaaa4';

              if (month === 9) {
                drawPixelRect(baseCenterX - 3 + swayX + stemHeadX, budY + 1, 6, 5, stemOutline);
                drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, budY + 2, 4, 3, budColor);
              } else {
                drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, budY + 3, 4, 1, stemOutline);
                drawPixel(baseCenterX - 1 + swayX + stemHeadX, budY + 4, stemOutline);
                drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, budY, 4, 3, stemOutline);
                drawPixelRect(baseCenterX - 1 + swayX + stemHeadX, budY + 1, 2, 2, budColor);
              }
            } else {
              const unripeColor = '#a5d6a7';
              const unripeOutline = '#2e7d32';
              drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, budY + 1, 4, 3, unripeOutline);
              drawPixelRect(baseCenterX - 1 + swayX + stemHeadX, budY + 2, 2, 2, unripeColor);
              drawPixel(baseCenterX + swayX + stemHeadX, budY, unripeOutline);
            }
          } else if (evolutionStage === 7) {
            const leaf1W = Math.max(1, 7 + leafSizeModifier);
            drawPixelRect(baseCenterX - 2 - leaf1W + Math.round(swayX * 0.3), baseCenterY - 4 - stemH + 16 + leafYOffset, leaf1W, 3, stemOutline);
            drawPixelRect(baseCenterX - 1 - leaf1W + Math.round(swayX * 0.3), baseCenterY - 4 - stemH + 17 + leafYOffset, leaf1W - 1, 2, leafColor);

            const leaf2W = Math.max(1, 8 + leafSizeModifier);
            drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 4 - stemH + 9 + leafYOffset, leaf2W, 3, stemOutline);
            drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 4 - stemH + 10 + leafYOffset, leaf2W - 1, 2, leafColor);

            if (stats.yieldQ2 >= 7) {
              drawPixel(baseCenterX - 6 + Math.round(swayX * 0.3), baseCenterY - 4 - stemH + 15 + leafYOffset, '#ef5350');
              drawPixel(baseCenterX + 6 + Math.round(swayX * 0.7), baseCenterY - 4 - stemH + 8 + leafYOffset, '#ef5350');
            }

            const stemHeadX = isCrooked ? Math.round(Math.sin(0 * 0.18) * 2.8) : 0;
            const isFlowerType = month === 4 || month === 5 || month === 9 || month === 12;

            if (isFlowerType) {
              let budColor = '#f48fb1';
              let budCore = '#fff59d';
              if (month === 5 || month === 12) {
                budColor = '#ef5350';
              } else if (month === 8 || month === 9) {
                budColor = '#fdd835';
              } else if (month === 2 || month === 10) {
                budColor = '#ffb74d';
              }

              if (health < 40) {
                budColor = '#bcaaa4';
                budCore = '#d7ccc8';
              }

              if (month === 9) {
                const headY = baseCenterY - 4 - stemH - 9;
                drawPixelRect(baseCenterX - 7 + swayX + stemHeadX, headY, 14, 10, stemOutline);
                drawPixelRect(baseCenterX - 6 + swayX + stemHeadX, headY + 1, 12, 8, '#f57f17');
                drawPixelRect(baseCenterX - 5 + swayX + stemHeadX, headY + 2, 10, 6, '#ffeb3b');
                drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, headY + 3, 4, 4, '#3e2723');
              } else {
                const headY = baseCenterY - 4 - stemH - 9;
                drawPixelRect(baseCenterX - 5 + swayX + stemHeadX, headY, 10, 9, stemOutline);
                drawPixelRect(baseCenterX - 4 + swayX + stemHeadX, headY + 1, 8, 7, budColor);
                drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, headY + 3, 4, 3, budCore);
              }
            } else {
              const headY = baseCenterY - 4 - stemH - 7;
              const fx = baseCenterX + swayX + stemHeadX;
              const fy = headY;
              
              if (month === 1) { // Strawberry
                drawPixelRect(fx - 4, fy, 8, 2, '#2e7d32');
                drawPixelRect(fx - 4, fy + 2, 8, 7, '#7b2e1a');
                drawPixelRect(fx - 3, fy + 2, 6, 7, '#ff8a80');
                drawPixelRect(fx - 1, fy + 2, 2, 2, '#c8e6c9');
              } else if (month === 2) { // Tangerine
                drawPixelRect(fx - 4, fy + 1, 8, 8, '#5d4037');
                drawPixelRect(fx - 3, fy + 2, 6, 6, '#ffd54f');
                drawPixelRect(fx - 2, fy + 2, 3, 3, '#a5d6a7');
              } else if (month === 3) { // Sprout cluster
                drawPixelRect(fx - 5, fy + 2, 10, 6, '#2e7d32');
                drawPixelRect(fx - 4, fy + 3, 8, 4, '#81c784');
              } else if (month === 6) { // Plum
                drawPixelRect(fx - 3, fy + 2, 6, 6, '#1b5e20');
                drawPixelRect(fx - 2, fy + 3, 4, 4, '#9ccc65');
              } else if (month === 7) { // Watermelon
                drawPixelRect(fx - 6, fy + 1, 12, 7, '#1b5e20');
                drawPixelRect(fx - 5, fy + 2, 10, 5, '#a5d6a7');
                drawPixel(fx - 2, fy + 3, '#388e3c');
                drawPixel(fx + 2, fy + 3, '#388e3c');
              } else if (month === 8) { // Corn
                drawPixelRect(fx - 2, fy + 1, 4, 9, '#5d4037');
                drawPixelRect(fx - 1, fy + 1, 2, 9, '#c0ca33');
              } else if (month === 10) { // Persimmon
                drawPixelRect(fx - 4, fy + 2, 8, 6, '#5d4037');
                drawPixelRect(fx - 3, fy + 3, 6, 4, '#ffb74d');
                drawPixel(fx - 1, fy + 1, '#2e7d32');
              } else { // Sweet potato or fallback
                drawPixelRect(fx - 5, fy + 2, 10, 5, '#5d4037');
                drawPixelRect(fx - 4, fy + 3, 8, 3, '#8d6e63');
              }
            }
          }
        }
      } else {
        // --- MATURE / HARVEST STAGE (Stage 8) ---
        const swayX = Math.round(swayOffset * 1.2);
        const stemTopY = baseCenterY - 34;

        // Stem
        for (let i = 0; i < 31; i++) {
          const currY = baseCenterY - 34 + i;
          const tX = isCrooked ? Math.round(Math.sin(i * 0.16) * 3.0) : 0;
          drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5) + tX, currY, 4, 1, stemOutline);
          drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5) + tX, currY, 2, 1, stemColor);
        }

        // Leaves (droop if low health)
        const leafYOffset = health < 40 ? 3 : 0;
        const l1W = Math.max(1, 7 + leafSizeModifier);
        drawPixelRect(baseCenterX - 2 - l1W + Math.round(swayX * 0.4), baseCenterY - 16 + leafYOffset, l1W, 3, stemOutline);
        drawPixelRect(baseCenterX - 1 - l1W + Math.round(swayX * 0.4), baseCenterY - 15 + leafYOffset, l1W - 1, 2, leafColor);

        const l2W = Math.max(1, 8 + leafSizeModifier);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 24 + leafYOffset, l2W, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 23 + leafYOffset, l2W - 1, 2, leafColor);

        // Q3 Dark Spots
        if (isLowQualityQ3) {
          drawPixel(baseCenterX - 6 + Math.round(swayX * 0.4), baseCenterY - 15 + leafYOffset, '#3e2723');
          drawPixel(baseCenterX + 6 + Math.round(swayX * 0.8), baseCenterY - 23 + leafYOffset, '#3e2723');
        }

        const isLowYield = yieldCount <= 3;
        const isMedYield = yieldCount > 3 && yieldCount <= 7;

        // Colors
        let fruitColor = '#d32f2f'; // default red
        let fruitLight = '#f44336';
        let fruitAccent = '#ffeb3b';

        // Quality modifier
        if (quality === '최상급') {
          fruitAccent = '#ffd700'; // Golden highlight
        } else if (quality === '하급') {
          fruitColor = '#8d6e63'; // Brownish/unripe/rotten
          fruitLight = '#bcaaa4';
          fruitAccent = '#795548';
        }

        const drawFruitItem = (fx: number, fy: number, scale = 1.0) => {
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

        const headX = isCrooked ? Math.round(Math.sin(0 * 0.16) * 3.0) : 0;

        // Render quantity based on Yield Bucket
        if (isLowYield) {
          drawFruitItem(baseCenterX + swayX + headX, stemTopY, 1.15);
        } else if (isMedYield) {
          drawFruitItem(baseCenterX - 7 + Math.round(swayX * 0.7) + headX, stemTopY - 2, 0.9);
          drawFruitItem(baseCenterX + 7 + Math.round(swayX * 1.1) + headX, stemTopY + 2, 0.9);
        } else {
          drawFruitItem(baseCenterX - 8 + Math.round(swayX * 0.6) + headX, stemTopY - 3, 0.85);
          drawFruitItem(baseCenterX + 8 + Math.round(swayX * 1.2) + headX, stemTopY + 3, 0.85);
          drawFruitItem(baseCenterX + swayX + headX, stemTopY - 7, 1.0);
        }
      }

      // --- 4. Sparkles and particles engine (Quality & Health indicators) ---
      // A. Generate particles
      
      // Global Health: Falling leaves if health is low
      if (health < 30 && Math.random() < 0.035 && evolutionStage >= 3) {
        cropParticles.push({
          x: baseCenterX + swayOffset + (Math.random() * 20 - 10),
          y: baseCenterY - 15 - Math.random() * 15,
          alpha: 1.0,
          size: 1.5,
          color: '#9e9d24', // dull olive/brown leaf color
          vx: (Math.random() - 0.5) * 0.15,
          vy: 0.25,
          type: 'fallingLeaf',
          frameOffset: Math.random() * 100
        });
      }

      // Q1 Effect: Rising Aura beams if growthQ1 is high (growthQ1 >= 7)
      if (stats.growthQ1 >= 7 && Math.random() < 0.16) {
        cropParticles.push({
          x: baseCenterX + Math.round(swayOffset * 0.5) + (Math.random() * 8 - 4),
          y: baseCenterY - 4 - Math.random() * 10,
          alpha: 0.9,
          size: 1,
          color: '#80deea', // cyan aura glow
          vx: 0,
          vy: -0.65,
          type: 'risingBeam'
        });
      }

      // Q3 Effect: Pink Heart particles if qualityQ3 is high (qualityQ3 >= 7)
      if (stats.qualityQ3 >= 7 && Math.random() < 0.08) {
        cropParticles.push({
          x: baseCenterX + swayOffset + (Math.random() * 24 - 12),
          y: baseCenterY - 12 - Math.random() * 20,
          alpha: 1.0,
          size: 3,
          color: '#f48fb1', // Pastel Pink Heart
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.35,
          type: 'heart'
        });
      }

      // Q4 Effect: Dry dust particles if healthQ4 is low (healthQ4 <= 2)
      if (stats.healthQ4 <= 2 && Math.random() < 0.12) {
        cropParticles.push({
          x: baseCenterX + (Math.random() * 20 - 10),
          y: baseCenterY - 4,
          alpha: 0.8,
          size: 1,
          color: Math.random() < 0.5 ? '#8d6e63' : '#6d5c50',
          vx: (Math.random() - 0.5) * 0.25,
          vy: -Math.random() * 0.35 - 0.1,
          type: 'dust'
        });
      }

      // Classic quality sparkles
      if (quality === '최상급' && Math.random() < 0.20) {
        cropParticles.push({
          x: baseCenterX + swayOffset + (Math.random() * 26 - 13),
          y: baseCenterY - 12 - (Math.random() * 24),
          alpha: 1.0,
          size: Math.random() * 2 + 1.8,
          color: '#ffca28', // Golden Yellow
          vx: (Math.random() - 0.5) * 0.4,
          vy: -Math.random() * 0.4 - 0.2,
          type: 'star'
        });
      } else if (quality === '상급' && Math.random() < 0.15) {
        cropParticles.push({
          x: baseCenterX + swayOffset + (Math.random() * 22 - 11),
          y: baseCenterY - 12 - (Math.random() * 22),
          alpha: 1.0,
          size: Math.random() * 1.5 + 1.5,
          color: '#fff',
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.3 - 0.1,
          type: 'sparkle'
        });
      }

      // High Health energy dot sparkles
      if (health >= 80 && Math.random() < 0.18) {
        cropParticles.push({
          x: baseCenterX + swayOffset + (Math.random() * 32 - 16),
          y: baseCenterY - 5 - (Math.random() * 35),
          alpha: 1.0,
          size: Math.random() * 1.0 + 1.2,
          color: '#a5d6a7',
          vx: (Math.random() - 0.5) * 0.2,
          vy: -Math.random() * 0.3 - 0.15,
          type: 'energy'
        });
      }

      // B. Update and draw particles
      cropParticles.forEach((p) => {
        if (p.type === 'fallingLeaf') {
          // Leaf swaying down gently
          p.x += Math.sin(localFrame * 0.15 + (p.frameOffset || 0)) * 0.28;
          p.y += p.vy;
          p.alpha -= 0.007;
        } else if (p.type === 'risingBeam') {
          p.y += p.vy;
          p.alpha -= 0.015;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= 0.008;
        }

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = p.alpha;

          if (p.type === 'heart') {
            // Mini heart 3x3 pixel draw
            drawPixel(p.x - 1, p.y - 1, p.color);
            drawPixel(p.x + 1, p.y - 1, p.color);
            drawPixelRect(p.x - 1, p.y, 3, 1, p.color);
            drawPixel(p.x, p.y + 1, p.color);
          } else if (p.type === 'risingBeam') {
            // vertical line glow
            drawPixelRect(p.x, p.y, 1, 3, p.color);
          } else {
            drawPixelRect(p.x, p.y, p.size, p.size, p.color);
          }
          ctx.restore();
        }
      });
      cropParticles = cropParticles.filter((p) => p.alpha > 0);

      // C. Draw Rainbow Arc on top if health is high (health >= 85)
      if (health >= 85) {
        ctx.save();
        const arcAlpha = 0.20 + Math.sin(localFrame * 0.05) * 0.06;
        ctx.globalAlpha = arcAlpha;

        // Colors from bottom (Purple) to top (Red)
        const colors = ['#b39ddb', '#90caf9', '#a5d6a7', '#ffe082', '#ff8a80'];
        // Symmetric rainbow offsets for a perfect 29px-wide pixel-art curve
        const rainbowOffsets = [
          -1, 0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 6, 5, 5, 5, 4, 4, 3, 3, 2, 2, 1, 0, -1
        ];

        for (let dx = -14; dx <= 14; dx++) {
          const x = baseCenterX + dx;
          const dy = rainbowOffsets[dx + 14];
          const y = baseCenterY - 32 - dy;

          colors.forEach((col, idx) => {
            // Draw stacked pastel pixel arcs
            ctx.fillStyle = col;
            ctx.fillRect(Math.floor(x), Math.floor(y - idx), 1, 1);
          });
        }
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
  }, [cropState]);

  const getCenterOffsetPercent = (stage: number) => {
    if (stage === 1) return -38;
    if (stage === 2) return -34;
    if (stage === 3) return -30;
    if (stage === 4) return -26;
    if (stage === 5) return -22;
    if (stage === 6) return -18;
    if (stage === 7) return -14;
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
          transform: `translateY(${Math.round(size * getCenterOffsetPercent(cropState.evolutionStage) / 100)}px)`,
        }}
      />
    </div>
  );
};

export default PixelCrop;
