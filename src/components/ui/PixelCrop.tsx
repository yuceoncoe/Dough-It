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

      // Plant color schemes
      const stemColor = health < 45 ? '#689f38' : '#4caf50'; // Dull green vs vibrant green
      const stemOutline = health < 45 ? '#33691e' : '#1b5e20';
      const leafColor = health < 45 ? '#9ccc65' : '#81c784';

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
        drawPixel(baseCenterX - 1 + swayX, baseCenterY - 10, stemOutline);
        drawPixel(baseCenterX + swayX, baseCenterY - 11, stemOutline);
        drawPixel(baseCenterX + swayX, baseCenterY - 10, stemColor);
        drawPixel(baseCenterX - 1 + swayX, baseCenterY - 11, leafColor);
      } else if (evolutionStage === 3) {
        // --- 3. SPROUT STAGE ---
        const swayX = Math.round(swayOffset * 0.4);
        
        // Stem
        for (let i = 0; i < 8; i++) {
          const currY = baseCenterY - 11 + i;
          const tX = isCrooked ? Math.round(Math.sin(i * 0.4) * 1.5) : 0;
          drawPixelRect(baseCenterX - 2 + swayX + tX, currY, 4, 1, stemOutline);
          drawPixelRect(baseCenterX - 1 + swayX + tX, currY, 2, 1, stemColor);
        }

        // Leaves - Drooping if health is low
        const leafYOffset = health < 40 ? 2 : 0;

        // Left Leaf
        const leftLeafW = Math.max(1, 5 + leafSizeModifier);
        drawPixelRect(baseCenterX - 2 - leftLeafW + swayX, baseCenterY - 14 + leafYOffset, leftLeafW, 3, stemOutline);
        drawPixelRect(baseCenterX - 1 - leftLeafW + swayX, baseCenterY - 13 + leafYOffset, leftLeafW - 1, 2, leafColor);

        // Right Leaf
        const rightLeafW = Math.max(1, 6 + leafSizeModifier);
        drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 15 + leafYOffset, rightLeafW, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 14 + leafYOffset, rightLeafW - 1, 2, leafColor);

        // Q3 Dark Spots
        if (isLowQualityQ3) {
          drawPixel(baseCenterX - 4 + swayX, baseCenterY - 13 + leafYOffset, '#3e2723');
          drawPixel(baseCenterX + 4 + swayX, baseCenterY - 14 + leafYOffset, '#3e2723');
        }
      } else if (evolutionStage === 4) {
        // --- 4. SEEDLING STAGE (묘목) ---
        const swayX = Math.round(swayOffset * 0.55);
        
        // Stem (13px tall)
        for (let i = 0; i < 13; i++) {
          const currY = baseCenterY - 16 + i;
          const tX = isCrooked ? Math.round(Math.sin(i * 0.35) * 1.8) : 0;
          drawPixelRect(baseCenterX - 2 + swayX + tX, currY, 4, 1, stemOutline);
          drawPixelRect(baseCenterX - 1 + swayX + tX, currY, 2, 1, stemColor);
        }

        const leafYOffset = health < 40 ? 2 : 0;

        // Left Leaf
        const leftLeafW = Math.max(1, 5 + leafSizeModifier);
        drawPixelRect(baseCenterX - 2 - leftLeafW + Math.round(swayX * 0.3), baseCenterY - 12 + leafYOffset, leftLeafW, 3, stemOutline);
        drawPixelRect(baseCenterX - 1 - leftLeafW + Math.round(swayX * 0.3), baseCenterY - 11 + leafYOffset, leftLeafW - 1, 2, leafColor);

        // Right Leaf
        const rightLeafW = Math.max(1, 6 + leafSizeModifier);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 15 + leafYOffset, rightLeafW, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 14 + leafYOffset, rightLeafW - 1, 2, leafColor);

        // Third Top Leaf
        drawPixelRect(baseCenterX - 1 + swayX, baseCenterY - 19 + leafYOffset, 3, 3, stemOutline);
        drawPixelRect(baseCenterX + swayX, baseCenterY - 18 + leafYOffset, 2, 2, leafColor);

        // Q3 Dark Spots
        if (isLowQualityQ3) {
          drawPixel(baseCenterX - 4 + Math.round(swayX * 0.3), baseCenterY - 11 + leafYOffset, '#3e2723');
          drawPixel(baseCenterX + 4 + Math.round(swayX * 0.7), baseCenterY - 14 + leafYOffset, '#3e2723');
        }
      } else if (evolutionStage === 5) {
        // --- 5. GROWING STAGE ---
        const swayX = Math.round(swayOffset * 0.7);
        const leafYOffset = health < 40 ? 3 : 0;

        // Main Stem
        for (let i = 0; i < 18; i++) {
          const currY = baseCenterY - 21 + i;
          const tX = isCrooked ? Math.round(Math.sin(i * 0.25) * 2.2) : 0;
          drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5) + tX, currY, 4, 1, stemOutline);
          drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5) + tX, currY, 2, 1, stemColor);
        }

        // Lower Left leaf
        const lowLeftW = Math.max(1, 6 + leafSizeModifier);
        drawPixelRect(baseCenterX - 2 - lowLeftW + Math.round(swayX * 0.2), baseCenterY - 12 + leafYOffset, lowLeftW, 3, stemOutline);
        drawPixelRect(baseCenterX - 1 - lowLeftW + Math.round(swayX * 0.2), baseCenterY - 11 + leafYOffset, lowLeftW - 1, 2, leafColor);

        // Mid Right leaf
        const midRightW = Math.max(1, 7 + leafSizeModifier);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.6), baseCenterY - 17 + leafYOffset, midRightW, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.6), baseCenterY - 16 + leafYOffset, midRightW - 1, 2, leafColor);

        // Upper Left leaf
        const upLeftW = Math.max(1, 5 + leafSizeModifier);
        drawPixelRect(baseCenterX - 2 - upLeftW + swayX, baseCenterY - 22 + leafYOffset, upLeftW, 3, stemOutline);
        drawPixelRect(baseCenterX - 1 - upLeftW + swayX, baseCenterY - 21 + leafYOffset, upLeftW - 1, 2, leafColor);

        // Q2 Effect: Baby Buds (yieldQ2 >= 7)
        if (stats.yieldQ2 >= 7) {
          drawPixel(baseCenterX - 6 + Math.round(swayX * 0.2), baseCenterY - 13 + leafYOffset, '#ef5350');
          drawPixel(baseCenterX + 5 + Math.round(swayX * 0.6), baseCenterY - 18 + leafYOffset, '#ef5350');
        }

        // Q3 Dark Spots
        if (isLowQualityQ3) {
          drawPixel(baseCenterX - 5 + Math.round(swayX * 0.2), baseCenterY - 11 + leafYOffset, '#3e2723');
          drawPixel(baseCenterX + 4 + Math.round(swayX * 0.6), baseCenterY - 16 + leafYOffset, '#3e2723');
        }
      } else if (evolutionStage === 6) {
        // --- 6. BUDDING / FRUIT SET STAGE (꽃봉오리 / 아기 열매) ---
        const swayX = Math.round(swayOffset * 0.85);
        const leafYOffset = health < 40 ? 3 : 0;

        // Stem (23px tall)
        for (let i = 0; i < 23; i++) {
          const currY = baseCenterY - 26 + i;
          const tX = isCrooked ? Math.round(Math.sin(i * 0.22) * 2.5) : 0;
          drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5) + tX, currY, 4, 1, stemOutline);
          drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5) + tX, currY, 2, 1, stemColor);
        }

        // Leaves
        const l1W = Math.max(1, 7 + leafSizeModifier);
        drawPixelRect(baseCenterX - 2 - l1W + Math.round(swayX * 0.3), baseCenterY - 14 + leafYOffset, l1W, 3, stemOutline);
        drawPixelRect(baseCenterX - 1 - l1W + Math.round(swayX * 0.3), baseCenterY - 13 + leafYOffset, l1W - 1, 2, leafColor);

        const l2W = Math.max(1, 7 + leafSizeModifier);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 19 + leafYOffset, l2W, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 18 + leafYOffset, l2W - 1, 2, leafColor);

        // Q3 Dark Spots
        if (isLowQualityQ3) {
          drawPixel(baseCenterX - 5 + Math.round(swayX * 0.3), baseCenterY - 13 + leafYOffset, '#3e2723');
          drawPixel(baseCenterX + 5 + Math.round(swayX * 0.7), baseCenterY - 18 + leafYOffset, '#3e2723');
        }

        const stemHeadX = isCrooked ? Math.round(Math.sin(0 * 0.22) * 2.5) : 0;
        const budY = baseCenterY - 30;

        const isFlowerType = month === 4 || month === 5 || month === 9 || month === 12;

        if (isFlowerType) {
          // Draw small closed flower bud
          let budColor = '#f48fb1'; // pink
          if (month === 5 || month === 12) budColor = '#ef5350'; // red
          else if (month === 9) budColor = '#fdd835'; // yellow/orange
          if (health < 40) budColor = '#bcaaa4'; // withered

          // Draw Sepals (green cup)
          drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, budY + 3, 4, 1, stemOutline);
          drawPixel(baseCenterX - 1 + swayX + stemHeadX, budY + 4, stemOutline);
          // Draw Bud
          drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, budY, 4, 3, stemOutline);
          drawPixelRect(baseCenterX - 1 + swayX + stemHeadX, budY + 1, 2, 2, budColor);
        } else {
          // Draw tiny unripe green fruit (아기 열매)
          const unripeColor = '#a5d6a7'; // light green
          const unripeOutline = '#2e7d32'; // dark green

          drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, budY + 1, 4, 3, unripeOutline);
          drawPixelRect(baseCenterX - 1 + swayX + stemHeadX, budY + 2, 2, 2, unripeColor);
          drawPixel(baseCenterX + swayX + stemHeadX, budY, unripeOutline); // connector
        }
      } else if (evolutionStage === 7) {
        // --- 7. BLOOMING / RIPENING STAGE (개화 / 설익은 열매) ---
        const swayX = Math.round(swayOffset);
        const leafYOffset = health < 40 ? 3 : 0;

        // Stem
        for (let i = 0; i < 28; i++) {
          const currY = baseCenterY - 31 + i;
          const tX = isCrooked ? Math.round(Math.sin(i * 0.18) * 2.8) : 0;
          drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5) + tX, currY, 4, 1, stemOutline);
          drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5) + tX, currY, 2, 1, stemColor);
        }

        // Leaves
        const leaf1W = Math.max(1, 7 + leafSizeModifier);
        drawPixelRect(baseCenterX - 2 - leaf1W + Math.round(swayX * 0.3), baseCenterY - 15 + leafYOffset, leaf1W, 3, stemOutline);
        drawPixelRect(baseCenterX - 1 - leaf1W + Math.round(swayX * 0.3), baseCenterY - 14 + leafYOffset, leaf1W - 1, 2, leafColor);

        const leaf2W = Math.max(1, 8 + leafSizeModifier);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 22 + leafYOffset, leaf2W, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 21 + leafYOffset, leaf2W - 1, 2, leafColor);

        // Q2 Effect: Baby Buds (yieldQ2 >= 7)
        if (stats.yieldQ2 >= 7) {
          drawPixel(baseCenterX - 6 + Math.round(swayX * 0.3), baseCenterY - 16 + leafYOffset, '#ef5350');
          drawPixel(baseCenterX + 6 + Math.round(swayX * 0.7), baseCenterY - 23 + leafYOffset, '#ef5350');
        }

        // Q3 Dark Spots
        if (isLowQualityQ3) {
          drawPixel(baseCenterX - 5 + Math.round(swayX * 0.3), baseCenterY - 14 + leafYOffset, '#3e2723');
          drawPixel(baseCenterX + 5 + Math.round(swayX * 0.7), baseCenterY - 21 + leafYOffset, '#3e2723');
        }

        const stemHeadX = isCrooked ? Math.round(Math.sin(0 * 0.18) * 2.8) : 0;
        const isFlowerType = month === 4 || month === 5 || month === 9 || month === 12;

        if (isFlowerType) {
          // Draw fully open flower
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

          const headY = baseCenterY - 39;
          drawPixelRect(baseCenterX - 5 + swayX + stemHeadX, headY, 10, 9, stemOutline);
          drawPixelRect(baseCenterX - 4 + swayX + stemHeadX, headY + 1, 8, 7, budColor);
          drawPixelRect(baseCenterX - 2 + swayX + stemHeadX, headY + 3, 4, 3, budCore);
        } else {
          // Draw ripening semi-ripe fruit
          const headY = baseCenterY - 37;
          const fx = baseCenterX + swayX + stemHeadX;
          const fy = headY;
          
          if (month === 1) { // Strawberry
            drawPixelRect(fx - 4, fy, 8, 2, '#2e7d32');
            drawPixelRect(fx - 4, fy + 2, 8, 7, '#7b2e1a');
            drawPixelRect(fx - 3, fy + 2, 6, 7, '#ff8a80'); // light pink
            drawPixelRect(fx - 1, fy + 2, 2, 2, '#c8e6c9'); // unripe spot
          } else if (month === 2) { // Tangerine
            drawPixelRect(fx - 4, fy + 1, 8, 8, '#5d4037');
            drawPixelRect(fx - 3, fy + 2, 6, 6, '#ffd54f'); // light orange-yellow
            drawPixelRect(fx - 2, fy + 2, 3, 3, '#a5d6a7'); // green hint
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
      } else {
        // --- MATURE / HARVEST STAGE (Stage 5) ---
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
        const rainbowOffsets = [
          -1, 0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 4, 4, 3, 3, 2, 2, 1, 0, -1
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
          transform: `translateY(${getCenterOffsetPercent(cropState.evolutionStage)}%)`,
        }}
      />
    </div>
  );
};

export default PixelCrop;
