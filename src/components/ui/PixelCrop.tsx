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

    // Crisp pixel rendering settings
    ctx.imageSmoothingEnabled = false;

    let localFrame = 0;

    const draw = () => {
      localFrame++;
      ctx.clearRect(0, 0, 60, 60);

      const { evolutionStage, month, health } = cropState;

      // Base coordinates (60x60 grid) - anchored lower to give more room for tall plants
      const baseCenterX = 30;
      const baseCenterY = 53;

      // Wind sway effect: slightly larger sway for taller plants
      const swayOffset = Math.sin(localFrame * 0.04) * 2.0 * (health / 100);

      // Dim color if crop is low health
      if (health < 40) {
        ctx.filter = 'saturate(0.55) brightness(0.85)';
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

      // 2. Draw Soil Mound (Thicker and wider)
      const soilDark = '#433022';
      const soilLight = '#5c4033';
      drawPixelRect(baseCenterX - 18, baseCenterY - 2, 36, 5, soilDark);
      drawPixelRect(baseCenterX - 14, baseCenterY - 4, 28, 2, soilLight);
      drawPixelRect(baseCenterX - 8, baseCenterY - 5, 16, 1, soilLight);
      drawPixel(baseCenterX - 11, baseCenterY - 5, soilLight);
      drawPixel(baseCenterX + 10, baseCenterY - 5, soilLight);

      // Colors
      const stemColor = '#4caf50';
      const stemOutline = '#1b5e20';
      const leafColor = '#81c784';

      // 3. Draw Crop by Stage
      if (evolutionStage === 1) {
        // --- SEED STAGE (Much larger) ---
        const seedColor = '#a87c53';
        const seedOutline = '#2b1c11';
        // Draw 6x6 seed in the middle of soil
        drawPixelRect(baseCenterX - 3, baseCenterY - 9, 6, 6, seedOutline);
        drawPixelRect(baseCenterX - 2, baseCenterY - 8, 4, 4, seedColor);
        drawPixelRect(baseCenterX - 1, baseCenterY - 9, 2, 1, '#d7ccc8'); // Highlight on seed
      } else if (evolutionStage === 2) {
        // --- SPROUT STAGE (Thicker shoot, bigger leaves) ---
        const swayX = Math.round(swayOffset * 0.4);

        // Thicker stem (3px wide)
        drawPixelRect(baseCenterX - 2 + swayX, baseCenterY - 11, 4, 8, stemOutline);
        drawPixelRect(baseCenterX - 1 + swayX, baseCenterY - 11, 2, 8, stemColor);

        // Big Left Leaf
        drawPixelRect(baseCenterX - 7 + swayX, baseCenterY - 14, 5, 3, stemOutline);
        drawPixelRect(baseCenterX - 6 + swayX, baseCenterY - 13, 4, 2, leafColor);

        // Big Right Leaf
        drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 15, 6, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 14, 5, 2, leafColor);
      } else if (evolutionStage === 3) {
        // --- GROWING STAGE (Taller, branching leaves) ---
        const swayX = Math.round(swayOffset * 0.7);

        // Main Stem (Y from 30 to 50, height 20px)
        drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5), baseCenterY - 21, 4, 18, stemOutline);
        drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5), baseCenterY - 21, 2, 18, stemColor);

        // Lower Left leaf
        drawPixelRect(baseCenterX - 8 + Math.round(swayX * 0.2), baseCenterY - 12, 6, 3, stemOutline);
        drawPixelRect(baseCenterX - 7 + Math.round(swayX * 0.2), baseCenterY - 11, 5, 2, leafColor);

        // Mid Right leaf
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.6), baseCenterY - 17, 7, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.6), baseCenterY - 16, 6, 2, leafColor);

        // Upper Left leaf
        drawPixelRect(baseCenterX - 7 + swayX, baseCenterY - 22, 5, 3, stemOutline);
        drawPixelRect(baseCenterX - 6 + swayX, baseCenterY - 21, 4, 2, leafColor);
      } else if (evolutionStage === 4) {
        // --- BLOOMING STAGE (Tall stem with a large budding flower) ---
        const swayX = Math.round(swayOffset);

        // Main Stem (Y from 20 to 50, height 30px)
        drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5), baseCenterY - 31, 4, 28, stemOutline);
        drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5), baseCenterY - 30, 2, 27, stemColor);

        // Big Leaves
        drawPixelRect(baseCenterX - 9 + Math.round(swayX * 0.3), baseCenterY - 15, 7, 3, stemOutline);
        drawPixelRect(baseCenterX - 8 + Math.round(swayX * 0.3), baseCenterY - 14, 6, 2, leafColor);

        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 22, 8, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.7), baseCenterY - 21, 7, 2, leafColor);

        // Bud / Flower on top
        let budColor = '#f48fb1';
        let budCore = '#fff59d';
        if (month === 5 || month === 12) {
          budColor = '#ef5350'; // Red
        } else if (month === 8 || month === 9) {
          budColor = '#fdd835'; // Yellow
        } else if (month === 2 || month === 10) {
          budColor = '#ffb74d'; // Orange
        }

        // Flower Bud head (Y: 14 to 22, 8x8 pixels)
        const headY = baseCenterY - 39;
        drawPixelRect(baseCenterX - 5 + swayX, headY, 10, 9, stemOutline);
        drawPixelRect(baseCenterX - 4 + swayX, headY + 1, 8, 7, budColor);
        drawPixelRect(baseCenterX - 2 + swayX, headY + 3, 4, 3, budCore);
      } else {
        // --- MATURE / HARVEST STAGE (Stage 5) ---
        // Double-sized, detailed monthly crops
        const swayX = Math.round(swayOffset * 1.2);
        const stemTopY = baseCenterY - 34; // Y: 19

        // Tall Sturdy Stem
        drawPixelRect(baseCenterX - 2 + Math.round(swayX * 0.5), baseCenterY - 34, 4, 31, stemOutline);
        drawPixelRect(baseCenterX - 1 + Math.round(swayX * 0.5), baseCenterY - 33, 2, 30, stemColor);

        // Leaves
        drawPixelRect(baseCenterX - 9 + Math.round(swayX * 0.4), baseCenterY - 16, 7, 3, stemOutline);
        drawPixelRect(baseCenterX - 8 + Math.round(swayX * 0.4), baseCenterY - 15, 6, 2, leafColor);

        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 24, 8, 3, stemOutline);
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.8), baseCenterY - 23, 7, 2, leafColor);

        switch (month) {
          case 1: {
            // 🍓 STRAWBERRY (Large hanging strawberry fruit)
            const red = '#d32f2f';
            const redLight = '#f44336';
            const seed = '#ffeb3b';
            const greenCalyx = '#388e3c';

            const fruitX = baseCenterX - 6 + swayX;
            const fruitY = stemTopY - 2;

            // Green Calyx cap
            drawPixelRect(fruitX, fruitY, 12, 3, greenCalyx);
            // Strawberry body (14x13)
            drawPixelRect(fruitX - 1, fruitY + 3, 14, 7, '#2b0c0c'); // Outline
            drawPixelRect(fruitX, fruitY + 3, 12, 7, red);
            drawPixelRect(fruitX + 2, fruitY + 10, 8, 3, red);
            drawPixelRect(fruitX + 4, fruitY + 13, 4, 2, red);
            // Light red highlight
            drawPixelRect(fruitX + 1, fruitY + 4, 3, 2, redLight);
            // Yellow seeds
            drawPixel(fruitX + 2, fruitY + 7, seed);
            drawPixel(fruitX + 6, fruitY + 5, seed);
            drawPixel(fruitX + 9, fruitY + 7, seed);
            drawPixel(fruitX + 4, fruitY + 9, seed);
            drawPixel(fruitX + 7, fruitY + 11, seed);
            break;
          }
          case 2: {
            // 🍊 TANGERINE (Large orange fruit with leaf)
            const orange = '#ef6c00';
            const orangeLight = '#ffb74d';
            const leaf = '#2e7d32';

            const fruitX = baseCenterX + swayX;
            const fruitY = stemTopY + 2;

            // Little stem leaf
            drawPixelRect(fruitX - 1, fruitY - 4, 3, 2, leaf);
            drawPixelRect(fruitX - 3, fruitY - 3, 3, 1, leaf);
            // Round Fruit (14x13)
            drawPixelRect(fruitX - 7, fruitY - 1, 14, 13, '#3e2723'); // Outline
            drawPixelRect(fruitX - 6, fruitY, 12, 11, orange);
            // Highlights & shadows
            drawPixelRect(fruitX - 4, fruitY + 2, 4, 3, orangeLight);
            drawPixelRect(fruitX + 2, fruitY + 8, 3, 2, '#d84315');
            break;
          }
          case 3: {
            // 🌱 SPROUT VEGETABLES (Large bushy cluster of baby greens)
            const greenDeep = '#2e7d32';
            const greenMid = '#4caf50';
            const greenLight = '#a5d6a7';

            const fx = baseCenterX + swayX;
            const fy = stemTopY + 2;

            drawPixelRect(fx - 10, fy - 6, 20, 14, greenDeep);
            drawPixelRect(fx - 8, fy - 5, 16, 12, greenMid);
            drawPixelRect(fx - 5, fy - 3, 10, 8, greenLight);
            break;
          }
          case 4: {
            // 🌸 CHERRY BLOSSOM TREE (Pink cherry blossoms canopy)
            const pinkDark = '#c2185b';
            const pinkMid = '#e91e63';
            const pinkLight = '#f8bbd0';

            const fx = baseCenterX + swayX;
            const fy = stemTopY - 4;

            // Blossom cloud
            drawPixelRect(fx - 13, fy - 8, 26, 17, pinkDark);
            drawPixelRect(fx - 11, fy - 7, 22, 15, pinkMid);
            drawPixelRect(fx - 8, fy - 5, 16, 11, pinkLight);
            // White highlight dots
            drawPixel(fx - 4, fy - 2, '#fff');
            drawPixel(fx + 3, fy - 4, '#fff');
            break;
          }
          case 5: {
            // 🌹 ROSE (Huge red rose flower head)
            const darkRed = '#880e4f';
            const midRed = '#d32f2f';
            const brightRed = '#ff5252';

            const fx = baseCenterX + swayX;
            const fy = stemTopY - 3;

            // Outer rose shape
            drawPixelRect(fx - 9, fy - 6, 18, 14, darkRed);
            drawPixelRect(fx - 8, fy - 5, 16, 12, midRed);
            // Petal patterns inside
            drawPixelRect(fx - 4, fy - 2, 8, 6, brightRed);
            drawPixelRect(fx - 2, fy - 1, 4, 3, '#ff8a80');
            drawPixel(fx, fy, darkRed);
            break;
          }
          case 6: {
            // 🟢 PLUM (Dual green plums hanging)
            const greenDark = '#1b5e20';
            const greenMid = '#4caf50';
            const yellowGreen = '#c0ca33';

            const fx = baseCenterX + swayX;
            const fy = stemTopY;

            // Left Plum
            drawPixelRect(fx - 9, fy - 1, 8, 8, greenDark);
            drawPixelRect(fx - 8, fy, 6, 6, greenMid);
            drawPixelRect(fx - 7, fy + 1, 3, 3, yellowGreen);

            // Right Plum
            drawPixelRect(fx + 1, fy + 3, 8, 8, greenDark);
            drawPixelRect(fx + 2, fy + 4, 6, 6, greenMid);
            drawPixelRect(fx + 3, fy + 5, 3, 3, yellowGreen);
            break;
          }
          case 7: {
            // 🍉 WATERMELON (Huge striped watermelon lying on the soil)
            const greenDark = '#1b5e20';
            const greenMid = '#388e3c';
            const greenLight = '#a5d6a7';

            const melonX = baseCenterX + swayX;
            const melonY = baseCenterY - 8;

            // Giant watermelon lying on the ground (22x13 pixels)
            drawPixelRect(melonX - 11, melonY, 22, 13, greenDark);
            drawPixelRect(melonX - 10, melonY + 1, 20, 11, greenMid);

            // Light green vertical stripes
            for (let offset = -8; offset <= 8; offset += 4) {
              drawPixelRect(melonX + offset, melonY + 1, 2, 11, greenLight);
            }
            break;
          }
          case 8: {
            // 🌽 CORN (Huge yellow ear with husks)
            const husk = '#2e7d32';
            const huskLight = '#558b2f';
            const yellow = '#fbc02d';
            const yellowLight = '#fff176';

            const fx = baseCenterX + swayX;
            const fy = stemTopY - 4;

            // Green husks on sides
            drawPixelRect(fx - 6, fy, 12, 16, husk);
            drawPixelRect(fx - 5, fy + 2, 10, 14, huskLight);
            // Yellow ear
            drawPixelRect(fx - 3, fy - 2, 6, 15, '#f57f17'); // outline
            drawPixelRect(fx - 2, fy - 2, 4, 15, yellow);
            // Kernel highlights
            drawPixelRect(fx - 1, fy - 1, 2, 12, yellowLight);
            // Silk
            drawPixelRect(fx - 1, fy - 5, 2, 3, '#d1c4e9');
            break;
          }
          case 9: {
            // 🌻 SUNFLOWER (Huge yellow petals with brown face)
            const gold = '#f57f17';
            const yellow = '#ffeb3b';
            const brown = '#3e2723';
            const orange = '#ffb300';

            const fx = baseCenterX + swayX;
            const fy = stemTopY - 7;

            // Petals (22x21)
            drawPixelRect(fx - 11, fy, 22, 21, gold);
            drawPixelRect(fx - 10, fy + 1, 20, 19, yellow);
            // Center brown disk
            drawPixelRect(fx - 5, fy + 5, 10, 10, '#5d4037');
            drawPixelRect(fx - 4, fy + 6, 8, 8, brown);
            drawPixelRect(fx - 2, fy + 8, 4, 4, orange);
            break;
          }
          case 10: {
            // 🍅 PERSIMMON (Large bright orange persimmon)
            const orange = '#e65100';
            const orangeLight = '#ff9100';
            const blackCalyx = '#263238';

            const fx = baseCenterX + swayX;
            const fy = stemTopY + 2;

            // Fruit
            drawPixelRect(fx - 7, fy - 1, 14, 12, '#3e2723'); // outline
            drawPixelRect(fx - 6, fy, 12, 10, orange);
            drawPixelRect(fx - 4, fy + 1, 8, 5, orangeLight);
            // Calyx
            drawPixelRect(fx - 3, fy - 3, 6, 2, blackCalyx);
            break;
          }
          case 11: {
            // 🍠 SWEET POTATO (Huge purple tubers embedded in soil)
            const purple = '#4a148c';
            const purpleLight = '#7b1fa2';
            const purpleSoft = '#ba68c8';

            const fx = baseCenterX + swayX;
            const fy = baseCenterY - 4;

            // Purple tubers showing partly above/in soil
            drawPixelRect(fx - 11, fy, 22, 9, purple);
            drawPixelRect(fx - 10, fy + 1, 20, 7, purpleLight);
            drawPixelRect(fx - 6, fy + 3, 12, 3, purpleSoft);
            break;
          }
          case 12: {
            // 🌺 WINTER CAMELLIA (Snowy soil and huge blooming red winter flowers)
            const snow = '#eceff1';
            const red = '#880e4f';
            const pink = '#c2185b';
            const gold = '#ffca28';

            const fx = baseCenterX + swayX;
            const fy = stemTopY - 2;

            // Thick snow on soil
            drawPixelRect(baseCenterX - 16, baseCenterY - 5, 32, 2, '#ffffff');
            drawPixelRect(baseCenterX - 12, baseCenterY - 6, 24, 1, snow);

            // Large Camellia flower
            drawPixelRect(fx - 7, fy - 4, 14, 11, red);
            drawPixelRect(fx - 6, fy - 3, 12, 9, pink);
            drawPixelRect(fx - 2, fy - 1, 4, 3, gold); // golden core
            break;
          }
          default:
            // Generic giant star leaf
            drawPixelRect(baseCenterX - 8 + swayX, stemTopY - 4, 16, 16, '#2e7d32');
            drawPixelRect(baseCenterX - 6 + swayX, stemTopY - 2, 12, 12, '#4caf50');
        }
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

  return (
    <div
      className={`flex items-center justify-center ${interactive ? 'cursor-pointer transition-transform active:scale-95' : ''}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        width={60}
        height={60}
        className="h-full w-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default PixelCrop;
