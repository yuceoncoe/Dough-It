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
              const headY = baseCenterY - 4 - stemH - 7;
              const fx = baseCenterX + swayX + stemHeadX;
              const fy = headY;

              if (month === 4) {
                // 4월 벚꽃 - 7단계 (반개화)
                drawPixel(fx, fy - 2, '#2e7d32'); // 꽃받침
                drawPixelRect(fx - 2, fy - 1, 5, 3, '#c2185b'); // 외곽
                drawPixelRect(fx - 1, fy - 1, 3, 2, '#e91e63'); // 잎
                drawPixel(fx, fy, '#f8bbd0'); // 연분홍 코어
              } else if (month === 5) {
                // 5월 장미 - 7단계 (장미 봉오리)
                drawPixelRect(fx - 2, fy - 2, 5, 4, '#880e4f'); // 외곽
                drawPixelRect(fx - 1, fy - 1, 3, 3, '#d32f2f'); // 붉은 겹
                drawPixel(fx, fy - 1, '#ff8a80'); // 하이라이트
                drawPixelRect(fx - 1, fy + 2, 3, 1, '#1b5e20'); // 꽃받침
              } else if (month === 9) {
                // 9월 해바라기 - 7단계 (개화 시작)
                drawPixelRect(fx - 4, fy - 3, 9, 7, '#f57f17'); // 겉잎 외곽
                drawPixelRect(fx - 3, fy - 2, 7, 5, '#fdd835'); // 노란 잎
                drawPixelRect(fx - 2, fy - 1, 5, 3, '#3e2723'); // 씨앗판
                drawPixel(fx, fy, '#271c19');
              } else if (month === 12) {
                // 12월 동백꽃 - 7단계 (반개화)
                drawPixelRect(fx - 3, fy - 2, 7, 5, '#c2185b');
                drawPixelRect(fx - 2, fy - 1, 5, 3, '#d81b60');
                drawPixel(fx, fy, '#ffca28'); // 작은 노란 수술 한 점
              }
            } else {
              const headY = baseCenterY - 4 - stemH - 7;
              const fx = baseCenterX + swayX + stemHeadX;
              const fy = headY;
              
              if (month === 1) {
                // 1월 딸기 - 7단계 (설익은 딸기)
                drawPixelRect(fx - 2, fy - 2, 5, 1, '#2e7d32'); // 초록 꼭지
                drawPixelRect(fx - 3, fy - 1, 7, 5, '#c62828'); // 몸체 외곽
                drawPixelRect(fx - 2, fy - 1, 5, 2, '#c8e6c9'); // 상단 설익은 연두빛
                drawPixelRect(fx - 2, fy + 1, 5, 2, '#ff8a80'); // 하단 핑크빛
                drawPixel(fx, fy + 3, '#ff8a80');
                drawPixel(fx, fy + 4, '#c62828'); // 꼬리 끝
              } else if (month === 2) {
                // 2월 귤 - 7단계 (청귤)
                drawPixel(fx, fy - 3, '#4e372e'); // 꼭지
                drawPixelRect(fx - 2, fy - 2, 5, 5, '#558b2f'); // 청록 외곽
                drawPixelRect(fx - 1, fy - 1, 3, 3, '#8bc34a'); // 내부 연두
                drawPixel(fx + 1, fy - 2, '#9ccc65'); // 하이라이트
              } else if (month === 3) {
                // 3월 새싹채소 - 7단계
                drawPixelRect(fx - 4, fy - 2, 9, 4, '#2e7d32');
                drawPixelRect(fx - 3, fy - 1, 7, 2, '#81c784');
              } else if (month === 6) {
                // 6월 매실 - 7단계 (풋매실)
                drawPixelRect(fx - 2, fy - 2, 5, 4, '#1b5e20');
                drawPixelRect(fx - 1, fy - 1, 3, 2, '#4caf50');
                drawPixel(fx - 1, fy - 1, '#81c784'); // 하이라이트
              } else if (month === 7) {
                // 7월 수박 - 7단계 (설익은 수박)
                drawPixelRect(fx - 4, fy - 2, 9, 6, '#1b5e20');
                drawPixelRect(fx - 3, fy - 1, 7, 4, '#a5d6a7');
                // 줄무늬
                drawPixel(fx - 1, fy - 1, '#1b5e20');
                drawPixel(fx - 1, fy + 1, '#1b5e20');
                drawPixel(fx + 2, fy, '#1b5e20');
                drawPixel(fx + 2, fy + 2, '#1b5e20');
              } else if (month === 8) {
                // 8월 옥수수 - 7단계 (껍질에 싸인 상태)
                drawPixel(fx, fy - 4, '#8d6e63');
                drawPixelRect(fx - 2, fy - 3, 4, 8, '#558b2f');
                drawPixelRect(fx - 1, fy - 2, 2, 6, '#689f38');
                drawPixel(fx, fy - 1, '#fff176');
                drawPixel(fx, fy + 1, '#fff176');
              } else if (month === 10) {
                // 10월 감 - 7단계 (청감)
                drawPixel(fx, fy - 3, '#3e2723'); // 감꼭지
                drawPixelRect(fx - 3, fy - 2, 7, 5, '#689f38'); // 청록 외형
                drawPixelRect(fx - 2, fy - 1, 5, 3, '#9ccc65'); // 연두 내부
              } else {
                // 11월 고구마 - 7단계
                drawPixelRect(fx - 4, fy - 1, 9, 4, '#4a148c');
                drawPixelRect(fx - 3, fy, 7, 2, '#7b1fa2');
              }
            }
          }
        }
      } else {
        // --- MATURE / HARVEST STAGE (Stage 8) ---
        const swayX = Math.round(swayOffset * 1.2);
        const leafYOffset = health < 40 ? 3 : 0;
        const isTall = month === 8 || month === 9;
        
        let stemH = 31;
        let bushHeight = 22;
        let bushWidth = 28;

        if (isVine) {
          // --- VINE DRAWING (수박, 고구마) ---
          const vineLength = 38;
          const amplitude = 5.2;
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

            // Q3 dark spots on vine leaves
            if (isLowQualityQ3 && Math.abs(dx) % 3 === 0) {
              drawPixel(vx, ly + (isUp ? 1 : 0), '#3e2723');
            }
          }
        } else if (isStrawberry) {
          // --- STRAWBERRY BUSH DRAWING (딸기) ---
          const swayXS = Math.round(swayOffset * 0.5);
          const stems = [
            { tx: -Math.round(bushWidth * 0.35), ty: -Math.round(bushHeight * 0.6) },
            { tx: 0, ty: -bushHeight },
            { tx: Math.round(bushWidth * 0.35), ty: -Math.round(bushHeight * 0.6) }
          ];

          stems.forEach((stem) => {
            const endX = baseCenterX + stem.tx + swayXS;
            const endY = baseCenterY - 4 + stem.ty + leafYOffset;
            
            ctx.strokeStyle = stemOutline;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(baseCenterX, baseCenterY - 4);
            ctx.lineTo(endX, endY);
            ctx.stroke();

            drawPixelRect(endX - 2, endY - 2, 5, 4, stemOutline);
            drawPixelRect(endX - 1, endY - 1, 3, 2, leafColor);

            // Q3 dark spot on strawberry leaves
            if (isLowQualityQ3 && Math.random() < 0.3) {
              drawPixel(endX, endY - 1, '#3e2723');
            }
          });
        } else if (isGroup) {
          // --- SPROUT GROUP DRAWING (새싹채소) ---
          stemH = 28;
          const offsets = [
            { dx: -5, h: Math.round(stemH * 0.8), swayF: 0.4 },
            { dx: 0, h: stemH, swayF: 0.6 },
            { dx: 5, h: Math.round(stemH * 0.9), swayF: 0.5 }
          ];

          offsets.forEach((group) => {
            const sX = Math.round(swayOffset * group.swayF);
            const curBaseX = baseCenterX + group.dx;

            // Draw stem
            for (let i = 0; i < group.h; i++) {
              const currY = baseCenterY - 4 - group.h + i;
              const tX = isCrooked ? Math.round(Math.sin(i * 0.3) * 1.5) : 0;
              drawPixelRect(curBaseX - 1 + sX + tX, currY, 3, 1, stemOutline);
              drawPixel(curBaseX + sX + tX, currY, stemColor);
            }

            // Draw leaves at the top of each stem
            const topY = baseCenterY - 4 - group.h + leafYOffset;
            const tX = isCrooked ? Math.round(Math.sin(0) * 1.5) : 0;
            drawPixelRect(curBaseX - 3 + sX + tX, topY - 2, 7, 3, stemOutline);
            drawPixelRect(curBaseX - 2 + sX + tX, topY - 1, 2, 2, leafColor);
            drawPixelRect(curBaseX + 1 + sX + tX, topY - 1, 2, 2, leafColor);

            // Q3 dark spots on group leaves
            if (isLowQualityQ3) {
              drawPixel(curBaseX - 2 + sX + tX, topY - 1, '#3e2723');
              drawPixel(curBaseX + 2 + sX + tX, topY - 1, '#3e2723');
            }
          });
        } else if (isWoody) {
          // --- WOODY TREE DRAWING (귤, 벚꽃, 매실, 감, 동백) ---
          // Draw trunk
          for (let i = 0; i < 13; i++) {
            const currY = baseCenterY - 4 - i;
            drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.2), currY, 4, 1, stemOutline);
            drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.2), currY, 2, 1, stemColor);
          }

          // Left branch
          for (let i = 1; i <= 9; i++) {
            const currX = baseCenterX - 2 - i + Math.round(swayX * 0.3);
            const currY = baseCenterY - 16 - Math.round(i * 1.0);
            drawPixelRect(currX, currY, 2, 2, stemOutline);
            drawPixel(currX + 1, currY + 1, stemColor);
          }

          // Right branch
          for (let i = 1; i <= 9; i++) {
            const currX = baseCenterX + 1 + i + Math.round(swayX * 0.3);
            const currY = baseCenterY - 16 - Math.round(i * 1.2);
            drawPixelRect(currX, currY, 2, 2, stemOutline);
            drawPixel(currX, currY + 1, stemColor);
          }

          // Center branch extension
          for (let i = 0; i < 16; i++) {
            const currY = baseCenterY - 16 - i;
            const currX = baseCenterX + Math.round(swayX * 0.4);
            drawPixelRect(currX - 1, currY, 3, 1, stemOutline);
            drawPixel(currX, currY, stemColor);
          }

          // Foliage blocks (green clouds) at the tips
          const drawFoliage = (cx: number, cy: number, r: number) => {
            for (let y = -r; y <= r; y++) {
              const rowW = Math.round(Math.sqrt(r * r - y * y) * 2.0);
              const lx = cx - Math.floor(rowW / 2);
              drawPixelRect(lx, cy + y + leafYOffset, rowW, 1, stemOutline);
              drawPixelRect(lx + 1, cy + y + leafYOffset, rowW - 2, 1, leafColor);
            }
          };

          // Draw foliages (draw background ones first)
          drawFoliage(baseCenterX - 9 + Math.round(swayX * 0.3), baseCenterY - 26, 5 + leafSizeModifier);
          drawFoliage(baseCenterX + 9 + Math.round(swayX * 0.5), baseCenterY - 28, 6 + leafSizeModifier);
          drawFoliage(baseCenterX + Math.round(swayX * 0.4), baseCenterY - 35, 7 + leafSizeModifier);

          // Q3 spots on foliage
          if (isLowQualityQ3) {
            drawPixel(baseCenterX - 8 + Math.round(swayX * 0.3), baseCenterY - 26, '#3e2723');
            drawPixel(baseCenterX + 8 + Math.round(swayX * 0.5), baseCenterY - 28, '#3e2723');
            drawPixel(baseCenterX + Math.round(swayX * 0.4), baseCenterY - 35, '#3e2723');
          }
        } else if (isTall) {
          // --- TALL CROPS (옥수수, 해바라기) ---
          stemH = 38;
          const isCorn = month === 8;
          const stemW = isCorn ? 6 : 4;
          const fillW = isCorn ? 4 : 2;
          const offsetDiff = isCorn ? -3 : -2;
          const fillDiff = isCorn ? -2 : -1;

          for (let i = 0; i < stemH; i++) {
            const currY = baseCenterY - 4 - stemH + i;
            const tX = isCrooked ? Math.round(Math.sin(i * 0.12) * 3.5) : 0;
            drawPixelRect(baseCenterX + offsetDiff + Math.round(swayX * 0.6) + tX, currY, stemW, 1, stemOutline);
            drawPixelRect(baseCenterX + fillDiff + Math.round(swayX * 0.6) + tX, currY, fillW, 1, stemColor);
          }

          // Leaves (droop if low health)
          const l1W = Math.max(1, 8 + leafSizeModifier);
          drawPixelRect(baseCenterX - 2 - l1W + Math.round(swayX * 0.4), baseCenterY - 20 + leafYOffset, l1W, 3, stemOutline);
          drawPixelRect(baseCenterX - 1 - l1W + Math.round(swayX * 0.4), baseCenterY - 19 + leafYOffset, l1W - 1, 2, leafColor);

          const l2W = Math.max(1, 9 + leafSizeModifier);
          drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 28 + leafYOffset, l2W, 3, stemOutline);
          drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 27 + leafYOffset, l2W - 1, 2, leafColor);

          // Q3 spots
          if (isLowQualityQ3) {
            drawPixel(baseCenterX - 6 + Math.round(swayX * 0.4), baseCenterY - 19 + leafYOffset, '#3e2723');
            drawPixel(baseCenterX + 6 + Math.round(swayX * 0.8), baseCenterY - 27 + leafYOffset, '#3e2723');
          }
        } else {
          // --- STANDARD STANDARD (장미) ---
          stemH = 31;
          for (let i = 0; i < stemH; i++) {
            const currY = baseCenterY - 4 - stemH + i;
            const tX = isCrooked ? Math.round(Math.sin(i * 0.16) * 3.0) : 0;
            drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5) + tX, currY, 4, 1, stemOutline);
            drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5) + tX, currY, 2, 1, stemColor);
            
            // Thorns for rose
            if (isRose) {
              if (i % 6 === 3) drawPixel(baseCenterX - 3 + Math.round(swayX * 0.5) + tX, currY, '#1b5e20');
              if (i % 6 === 0) drawPixel(baseCenterX + 2 + Math.round(swayX * 0.5) + tX, currY, '#1b5e20');
            }
          }

          // Leaves (droop if low health)
          const l1W = Math.max(1, 7 + leafSizeModifier);
          drawPixelRect(baseCenterX - 2 - l1W + Math.round(swayX * 0.4), baseCenterY - 16 + leafYOffset, l1W, 3, stemOutline);
          drawPixelRect(baseCenterX - 1 - l1W + Math.round(swayX * 0.4), baseCenterY - 15 + leafYOffset, l1W - 1, 2, leafColor);

          const l2W = Math.max(1, 8 + leafSizeModifier);
          drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 24 + leafYOffset, l2W, 3, stemOutline);
          drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 23 + leafYOffset, l2W - 1, 2, leafColor);

          if (isLowQualityQ3) {
            drawPixel(baseCenterX - 6 + Math.round(swayX * 0.4), baseCenterY - 15 + leafYOffset, '#3e2723');
            drawPixel(baseCenterX + 6 + Math.round(swayX * 0.8), baseCenterY - 23 + leafYOffset, '#3e2723');
          }
        }

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
          const isSmall = scale < 0.95;
          const isLarge = scale > 1.05;
          const offset = isSmall ? -1 : (isLarge ? 1 : 0);

          // Shared floral color palettes
          const petalColor = '#fdd835';
          const petalOutline = '#f57f17';
          const coreOutline = '#3e2723';
          const coreColor = '#271c19';

          switch (month) {
            case 1: {
              // 딸기 🍓 - 8단계 완숙
              // 꼭지 (Calyx)
              drawPixelRect(fx - 3 - offset, fy - 2, 7 + 2 * offset, 1, '#1b5e20');
              drawPixelRect(fx - 2 - offset, fy - 1, 5 + 2 * offset, 1, '#388e3c');
              drawPixel(fx, fy - 3, '#1b5e20');
              
              // 빨간 몸체 (역삼각형 쉐입)
              drawPixelRect(fx - 3 - offset, fy, 7 + 2 * offset, 1, '#b71c1c');
              drawPixelRect(fx - 2 - offset, fy, 5 + 2 * offset, 1, fruitColor);
              drawPixelRect(fx - 4 - offset, fy + 1, 9 + 2 * offset, 1, '#b71c1c');
              drawPixelRect(fx - 3 - offset, fy + 1, 7 + 2 * offset, 1, fruitColor);
              drawPixel(fx - 1, fy + 1, fruitLight); // 하이라이트
              drawPixelRect(fx - 4 - offset, fy + 2, 9 + 2 * offset, 1, '#b71c1c');
              drawPixelRect(fx - 3 - offset, fy + 2, 7 + 2 * offset, 1, fruitColor);
              drawPixelRect(fx - 3 - offset, fy + 3, 7 + 2 * offset, 1, '#b71c1c');
              drawPixelRect(fx - 2 - offset, fy + 3, 5 + 2 * offset, 1, fruitColor);
              drawPixelRect(fx - 2 - offset, fy + 4, 5 + 2 * offset, 1, '#b71c1c');
              drawPixelRect(fx - 1 - offset, fy + 4, 3 + 2 * offset, 1, fruitColor);
              drawPixelRect(fx - 1 - offset, fy + 5, 3 + 2 * offset, 1, '#b71c1c');
              drawPixel(fx, fy + 5, fruitColor);
              drawPixel(fx, fy + 6, '#b71c1c');

              // 노란 씨앗 (Seeds)
              drawPixel(fx - 2, fy + 2, fruitAccent);
              drawPixel(fx + 2, fy + 2, fruitAccent);
              drawPixel(fx - 1, fy + 4, fruitAccent);
              drawPixel(fx + 1, fy + 4, fruitAccent);
              drawPixel(fx, fy + 1, fruitAccent);
              break;
            }
            case 2: {
              // 귤 🍊 - 8단계 완숙
              const r = Math.round(5 * scale);
              // 잎과 꼭지
              drawPixel(fx, fy - r - 2, '#4e342e'); // 꼭지 갈색
              drawPixelRect(fx + 1, fy - r - 1, 2, 1, '#2e7d32'); // 잎사귀 초록
              
              // 주황색 몸체 (둥글 납작하게)
              for (let y = -r; y <= r; y++) {
                let w = r * 2;
                if (y === -r || y === r) w = r * 2 - 2;
                const leftX = fx - Math.floor(w / 2);
                drawPixelRect(leftX, fy + y, w, 1, '#e65100');
                drawPixelRect(leftX + 1, fy + y, w - 2, 1, '#ff9800');
              }
              // 하이라이트
              drawPixelRect(fx - 1, fy - r + 1, 2, 1, '#ffb74d');
              break;
            }
            case 3: {
              // 새싹채소 🌱 - 8단계 다층 레이어 잎 군락
              const w = isSmall ? 8 : (isLarge ? 12 : 10);
              const h = isSmall ? 5 : (isLarge ? 8 : 7);
              
              // 왼쪽 위 잎
              drawPixelRect(fx - Math.round(w * 0.5), fy - Math.round(h * 0.6), Math.round(w * 0.4), 3, '#2e7d32');
              drawPixelRect(fx - Math.round(w * 0.4), fy - Math.round(h * 0.6) + 1, Math.round(w * 0.3), 1, '#81c784');
              // 오른쪽 위 잎
              drawPixelRect(fx + Math.round(w * 0.1), fy - Math.round(h * 0.7), Math.round(w * 0.4), 3, '#2e7d32');
              drawPixelRect(fx + Math.round(w * 0.2), fy - Math.round(h * 0.7) + 1, Math.round(w * 0.3), 1, '#81c784');
              // 중앙 큰 잎사귀
              drawPixelRect(fx - Math.round(w * 0.3), fy - Math.round(h * 0.3), Math.round(w * 0.7), Math.round(h * 0.8), '#1b5e20');
              drawPixelRect(fx - Math.round(w * 0.2), fy - Math.round(h * 0.3) + 1, Math.round(w * 0.5), Math.round(h * 0.8) - 2, '#4caf50');
              drawPixelRect(fx - 1, fy - Math.round(h * 0.3) + 2, 2, 1, '#a5d6a7'); // 하이라이트
              break;
            }
            case 4: {
              // 벚꽃 🌸 - 8단계 만개
              const w = isSmall ? 7 : (isLarge ? 11 : 9);
              const outline = '#c2185b'; // 짙은 분홍
              const pink = '#e91e63';
              const lightPink = '#f8bbd0';
              const core = '#ff80ab';
              
              // 꽃잎 형태 그리기
              drawPixelRect(fx - Math.floor(w / 2), fy - Math.floor(w / 2), w, w, outline);
              drawPixelRect(fx - Math.floor(w / 2) + 1, fy - Math.floor(w / 2) + 1, w - 2, w - 2, pink);
              drawPixelRect(fx - Math.floor(w / 4), fy - Math.floor(w / 4), Math.floor(w / 2) + 1, Math.floor(w / 2) + 1, lightPink);
              
              // 외곽 톱니 표현
              drawPixel(fx - Math.floor(w / 2), fy, outline);
              drawPixel(fx + Math.floor(w / 2), fy, outline);
              drawPixel(fx, fy - Math.floor(w / 2), '#fff');
              drawPixel(fx, fy + Math.floor(w / 2), '#fff');
              
              // 꽃수술
              drawPixelRect(fx - 1, fy, 3, 1, core);
              drawPixel(fx, fy - 1, core);
              drawPixel(fx, fy + 1, core);
              drawPixel(fx, fy, '#fff176');
              break;
            }
            case 5: {
              // 장미 🌹 - 8단계 만개
              const darkRed = '#880e4f';
              const red = '#d32f2f';
              const brightRed = '#ef5350';
              const rosePink = '#ff8a80';
              const w = isSmall ? 7 : (isLarge ? 11 : 9);
              const h = isSmall ? 6 : (isLarge ? 9 : 8);
              
              // 꽃받침
              drawPixelRect(fx - 2, fy + Math.floor(h / 2) - 1, 5, 1, '#1b5e20');
              drawPixel(fx - 3, fy + Math.floor(h / 2) - 2, '#2e7d32');
              drawPixel(fx + 3, fy + Math.floor(h / 2) - 2, '#2e7d32');
              
              // 장미 나선형 겹꽃
              drawPixelRect(fx - Math.floor(w / 2), fy - Math.floor(h / 2), w, h, darkRed);
              drawPixelRect(fx - Math.floor(w / 2) + 1, fy - Math.floor(h / 2) + 1, w - 2, h - 2, red);
              
              // 꽃잎 주름
              drawPixelRect(fx - 2, fy - 1, 4, 1, brightRed);
              drawPixelRect(fx, fy + 1, 3, 1, brightRed);
              drawPixel(fx - 1, fy - 2, rosePink);
              drawPixel(fx + 1, fy - 2, rosePink);
              drawPixel(fx + 2, fy, rosePink);
              break;
            }
            case 6: {
              // 매실 🟢 - 8단계 완숙
              const r = Math.round(4 * scale);
              drawPixel(fx, fy - r - 1, '#4e342e');
              
              for (let y = -r; y <= r; y++) {
                let w = r * 2;
                if (y === -r || y === r) w = r * 2 - 2;
                const leftX = fx - Math.floor(w / 2);
                drawPixelRect(leftX, fy + y, w, 1, '#1b5e20');
                drawPixelRect(leftX + 1, fy + y, w - 2, 1, '#4caf50');
              }
              // 매실 살구색 홍조
              drawPixel(fx + 1, fy, '#ffc107');
              drawPixel(fx + 1, fy - 1, '#ffeb3b');
              
              // 매실 골선
              drawPixel(fx - 1, fy - r + 1, '#0d533a');
              drawPixel(fx - 1, fy, '#0d533a');
              drawPixel(fx - 1, fy + r - 1, '#0d533a');
              break;
            }
            case 7: {
              // 수박 🍉 - 8단계 완숙
              const w = isSmall ? 9 : (isLarge ? 13 : 11);
              const h = isSmall ? 7 : (isLarge ? 11 : 9);
              
              drawPixel(fx, fy - Math.floor(h / 2) - 2, '#2e7d32');
              drawPixel(fx - 1, fy - Math.floor(h / 2) - 1, '#2e7d32');
              
              for (let y = -Math.floor(h / 2); y <= Math.floor(h / 2); y++) {
                let curW = w;
                if (y === -Math.floor(h / 2) || y === Math.floor(h / 2)) curW = w - 4;
                else if (y === -Math.floor(h / 2) + 1 || y === Math.floor(h / 2) - 1) curW = w - 2;
                
                const leftX = fx - Math.floor(curW / 2);
                drawPixelRect(leftX, fy + y, curW, 1, '#1b5e20');
                drawPixelRect(leftX + 1, fy + y, curW - 2, 1, '#a5d6a7');
                
                const stripeOffset = (y % 2 === 0) ? 0 : 1;
                drawPixel(fx - 3 + stripeOffset, fy + y, '#1b5e20');
                drawPixel(fx + stripeOffset, fy + y, '#1b5e20');
                drawPixel(fx + 3 + stripeOffset, fy + y, '#1b5e20');
              }
              break;
            }
            case 8: {
              // 옥수수 🌽 - 8단계 완숙
              drawPixel(fx, fy - 6, '#5d4037');
              drawPixel(fx - 1, fy - 5, '#8d6e63');
              drawPixel(fx + 1, fy - 5, '#8d6e63');
              
              for (let y = -4; y <= 6; y++) {
                let kw = 4;
                if (y === -4 || y === 6) kw = 2;
                const kx = fx - Math.floor(kw / 2);
                
                for (let x = kx; x < kx + kw; x++) {
                  const isGrid = (x + y) % 2 === 0;
                  drawPixel(x, fy + y, isGrid ? '#fbc02d' : '#fff176');
                }
                
                if (y >= -3 && y <= 4) {
                  drawPixel(fx - 3, fy + y, '#558b2f');
                  drawPixel(fx + 3, fy + y, '#558b2f');
                }
                if (y >= 1) {
                  drawPixel(fx - 4, fy + y, '#689f38');
                  drawPixel(fx + 4, fy + y, '#689f38');
                }
              }
              drawPixelRect(fx - 1, fy + 7, 3, 1, '#33691e');
              break;
            }
            case 9: {
              // 해바라기 🌻 - 8단계 완숙
              drawPixelRect(fx - 1, fy - 6 - offset, 3, 1, petalOutline);
              drawPixel(fx, fy - 7 - offset, petalColor); // 상
              drawPixelRect(fx - 1, fy + 6 + offset, 3, 1, petalOutline);
              drawPixel(fx, fy + 7 + offset, petalColor); // 하
              drawPixelRect(fx - 6 - offset, fy - 1, 1, 3, petalOutline);
              drawPixel(fx - 7 - offset, petalColor); // 좌
              drawPixelRect(fx + 6 + offset, fy - 1, 1, 3, petalOutline);
              drawPixel(fx + 7 + offset, petalColor); // 우
              
              drawPixel(fx - 5 - offset, fy - 5 - offset, petalColor);
              drawPixel(fx + 5 + offset, fy - 5 - offset, petalColor);
              drawPixel(fx - 5 - offset, fy + 5 + offset, petalColor);
              drawPixel(fx + 5 + offset, fy + 5 + offset, petalColor);
              
              drawPixelRect(fx - 5 - offset, fy - 4 - offset, 11 + 2 * offset, 9 + 2 * offset, petalOutline);
              drawPixelRect(fx - 4 - offset, fy - 3 - offset, 9 + 2 * offset, 7 + 2 * offset, petalColor);
              
              drawPixelRect(fx - 3, fy - 2, 7, 5, coreOutline);
              for (let sy = -1; sy <= 1; sy++) {
                for (let sx = -2; sx <= 2; sx++) {
                  const isGrid = (sx + sy) % 2 === 0;
                  drawPixel(fx + sx, fy + sy, isGrid ? coreColor : '#5d4037');
                }
              }
              break;
            }
            case 10: {
              // 감 🍅 - 8단계 완숙
              drawPixel(fx, fy - 4, '#1a0c02');
              drawPixelRect(fx - 3, fy - 3, 7, 1, '#3e2723');
              drawPixel(fx, fy - 2, '#3e2723');
              
              for (let y = -2; y <= 2; y++) {
                let w = 9;
                if (y === -2 || y === 2) w = 7;
                const leftX = fx - Math.floor(w / 2);
                drawPixelRect(leftX, fy + y, w, 1, '#d84315');
                drawPixelRect(leftX + 1, fy + y, w - 2, 1, '#ff6d00');
              }
              drawPixelRect(fx - 2, fy - 1, 2, 1, '#ffb74d');
              break;
            }
            case 11: {
              // 고구마 🍠 - 8단계 완숙
              const shellDark = '#4a148c';
              const shellLight = '#7b1fa2';
              const innerColor = '#ffb74d';
              
              drawPixelRect(fx - 3 - offset, fy - 2, 7 + 2 * offset, 1, shellDark);
              drawPixelRect(fx - 2 - offset, fy - 2, 5 + 2 * offset, 1, shellLight);
              drawPixelRect(fx - 5 - offset, fy - 1, 11 + 2 * offset, 1, shellDark);
              drawPixelRect(fx - 4 - offset, fy - 1, 9 + 2 * offset, 1, shellLight);
              drawPixel(fx - 6 - offset, fy - 1, shellDark);
              drawPixelRect(fx - 5 - offset, fy, 11 + 2 * offset, 1, shellDark);
              drawPixelRect(fx - 4 - offset, fy, 9 + 2 * offset, 1, shellLight);
              drawPixelRect(fx - 1, fy, 3, 1, innerColor);
              drawPixelRect(fx - 4 - offset, fy + 1, 9 + 2 * offset, 1, shellDark);
              drawPixelRect(fx - 3 - offset, fy + 1, 7 + 2 * offset, 1, shellLight);
              drawPixel(fx + 5 + offset, fy + 1, shellDark);
              drawPixelRect(fx - 3 - offset, fy + 2, 7 + 2 * offset, 1, shellDark);
              drawPixelRect(fx - 2 - offset, fy + 2, 5 + 2 * offset, 1, shellLight);
              break;
            }
            case 12: {
              // 동백꽃 🌺 - 8단계 만개
              const petalRed = '#c2185b';
              const petalBright = '#d81b60';
              const goldPistil = '#ffca28';
              const w = isSmall ? 7 : (isLarge ? 11 : 9);
              
              drawPixelRect(fx - Math.floor(w / 2) - 1, fy - 2, 2, 2, '#0d533a');
              drawPixelRect(fx + Math.floor(w / 2), fy + 1, 2, 2, '#0d533a');
              
              drawPixelRect(fx - Math.floor(w / 2), fy - 2, w, 5, petalRed);
              drawPixelRect(fx - Math.floor(w / 2) + 1, fy - 1, w - 2, 3, petalBright);
              
              drawPixelRect(fx - 1, fy - 1, 3, 1, goldPistil);
              drawPixel(fx - 2, fy, goldPistil);
              drawPixel(fx + 2, fy, goldPistil);
              drawPixelRect(fx - 1, fy + 1, 3, 1, goldPistil);
              drawPixel(fx, fy, '#fff');
              break;
            }
          }
        };

        // Draw the fruits/flowers according to yieldCount
        let coords: Array<{ dx: number; dy: number; scale: number }> = [];

        if (isVine) {
          const getVineY = (dx: number) => {
            const wave = Math.sin(dx * 0.3 + swayOffset * 0.08) * 5.2;
            return baseCenterY - 4 - Math.round(wave);
          };
          if (month === 7) {
            // Watermelon coords (staggered & scaled by yield)
            const list = [
              { dx: -12, scale: 0.95 },
              { dx: 12, scale: 0.95 },
              { dx: -6, scale: 0.85 },
              { dx: 6, scale: 0.85 },
              { dx: 0, scale: 1.1 }
            ];
            coords = list.slice(0, Math.min(yieldCount, list.length)).map(c => ({
              dx: c.dx,
              dy: getVineY(c.dx) - baseCenterY - 1, // relative to baseCenterY
              scale: c.scale
            }));
          } else {
            // Sweet Potato coords
            const list = [
              { dx: -10, scale: 0.95 },
              { dx: 10, scale: 0.95 },
              { dx: -5, scale: 0.9 },
              { dx: 5, scale: 0.9 },
              { dx: -15, scale: 0.8 },
              { dx: 15, scale: 0.8 },
              { dx: 0, scale: 1.0 }
            ];
            coords = list.slice(0, Math.min(yieldCount, list.length)).map(c => ({
              dx: c.dx,
              dy: getVineY(c.dx) - baseCenterY - 1,
              scale: c.scale
            }));
          }
        } else if (isStrawberry) {
          const list = [
            { dx: -Math.round(bushWidth * 0.35), dy: -Math.round(bushHeight * 0.6) + leafYOffset + 5, scale: 0.95 },
            { dx: Math.round(bushWidth * 0.35), dy: -Math.round(bushHeight * 0.6) + leafYOffset + 5, scale: 0.95 },
            { dx: 4, dy: -Math.round(bushHeight * 0.5) + leafYOffset + 6, scale: 0.90 },
            { dx: -4, dy: -Math.round(bushHeight * 0.5) + leafYOffset + 6, scale: 0.90 },
            { dx: -Math.round(bushWidth * 0.45), dy: -Math.round(bushHeight * 0.4) + leafYOffset + 4, scale: 0.85 },
            { dx: Math.round(bushWidth * 0.45), dy: -Math.round(bushHeight * 0.4) + leafYOffset + 4, scale: 0.85 },
            { dx: 0, dy: -Math.round(bushHeight * 0.8) + leafYOffset + 5, scale: 0.80 },
            { dx: 0, dy: -bushHeight + leafYOffset + 7, scale: 1.0 }
          ];
          coords = list.slice(0, Math.min(yieldCount, list.length));
        } else if (isGroup) {
          const list = [
            { dx: -5, dy: -Math.round(stemH * 0.8) + leafYOffset, scale: 0.9 },
            { dx: 5, dy: -Math.round(stemH * 0.9) + leafYOffset, scale: 0.95 },
            { dx: -3, dy: -Math.round(stemH * 0.5) + leafYOffset, scale: 0.8 },
            { dx: 3, dy: -Math.round(stemH * 0.6) + leafYOffset, scale: 0.8 },
            { dx: 0, dy: -stemH + leafYOffset, scale: 1.0 }
          ];
          coords = list.slice(0, Math.min(yieldCount, list.length));
        } else if (isWoody) {
          const list = [
            { dx: -9, dy: -26, scale: 0.95 },
            { dx: 9, dy: -28, scale: 0.95 },
            { dx: -4, dy: -29, scale: 0.85 },
            { dx: 4, dy: -31, scale: 0.85 },
            { dx: -12, dy: -23, scale: 0.8 },
            { dx: 12, dy: -24, scale: 0.8 },
            { dx: 0, dy: -40, scale: 0.75 },
            { dx: 0, dy: -35, scale: 1.1 }
          ];
          coords = list.slice(0, Math.min(yieldCount, list.length));
        } else if (isTall) {
          if (month === 9) { // Sunflower
            const list = [
              { dx: -9, dy: -34, scale: 0.85 },
              { dx: 9, dy: -30, scale: 0.85 },
              { dx: -12, dy: -25, scale: 0.7 },
              { dx: 12, dy: -21, scale: 0.7 },
              { dx: -6, dy: -46, scale: 0.75 },
              { dx: 6, dy: -46, scale: 0.75 },
              { dx: 0, dy: -42, scale: 1.25 }
            ];
            coords = list.slice(0, Math.min(yieldCount, list.length));
          } else { // Corn
            const list = [
              { dx: 4, dy: -30, scale: 1.0 },
              { dx: -4, dy: -14, scale: 0.95 },
              { dx: 4, dy: -20, scale: 0.9 },
              { dx: -4, dy: -32, scale: 0.85 },
              { dx: 4, dy: -12, scale: 0.8 },
              { dx: -4, dy: -22, scale: 1.0 }
            ];
            coords = list.slice(0, Math.min(yieldCount, list.length));
          }
        } else { // Standard (Rose)
          const list = [
            { dx: -7, dy: -32, scale: 0.9 },
            { dx: 7, dy: -36, scale: 0.9 },
            { dx: -8, dy: -29, scale: 0.85 },
            { dx: 8, dy: -31, scale: 0.85 },
            { dx: 0, dy: -41, scale: 1.0 },
            { dx: 0, dy: -34, scale: 1.15 }
          ];
          coords = list.slice(0, Math.min(yieldCount, list.length));
        }

        // Sort coordinates so smaller scale (background) items are drawn first
        const sortedCoords = [...coords].sort((a, b) => a.scale - b.scale);

        const headX = isCrooked ? Math.round(Math.sin(0 * 0.16) * 3.0) : 0;
        
        sortedCoords.forEach(coord => {
          const swayFactor = isVine ? 0.2 : (isStrawberry ? 0.5 : (isGroup ? 0.5 : (isWoody ? 0.6 : (isTall ? 0.8 : 1.0))));
          const fx = baseCenterX + coord.dx + Math.round(swayX * swayFactor) + headX;
          const fy = baseCenterY + coord.dy;
          drawFruitItem(fx, fy, coord.scale);
        });
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
    
    // Stage 8: custom translation for low-growing plants to stay centered
    const { month } = cropState;
    const isVine = month === 7 || month === 11;
    const isStrawberry = month === 1;
    if (isVine) return -14;
    if (isStrawberry) return -12;
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
