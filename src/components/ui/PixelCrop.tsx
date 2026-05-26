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

      // Base coordinates (60x60 grid)
      const baseCenterX = 30;
      const baseCenterY = 46;

      // Wind sway effect: subtle angle based on frame and plant health
      const swayOffset = Math.sin(localFrame * 0.05) * 1.5 * (health / 100);

      // Dim color if crop is low health
      if (health < 40) {
        ctx.filter = 'saturate(0.5) brightness(0.85)';
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
      ctx.ellipse(baseCenterX, baseCenterY + 2, 16, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Soil Mound
      const soilDark = '#4a3728';
      const soilLight = '#70533e';
      drawPixelRect(baseCenterX - 10, baseCenterY - 1, 20, 3, soilDark);
      drawPixelRect(baseCenterX - 8, baseCenterY - 2, 16, 1, soilLight);
      drawPixel(baseCenterX - 4, baseCenterY - 3, soilLight);
      drawPixel(baseCenterX + 3, baseCenterY - 3, soilLight);

      // 3. Draw Crop by Stage
      if (evolutionStage === 1) {
        // --- SEED STAGE ---
        const seedColor = '#a87c53';
        const seedOutline = '#2b1c11';
        // Draw small seed emerging from soil
        drawPixelRect(baseCenterX - 2, baseCenterY - 4, 3, 3, seedOutline);
        drawPixelRect(baseCenterX - 1, baseCenterY - 4, 2, 2, seedColor);
        drawPixel(baseCenterX, baseCenterY - 5, seedColor); // Sprout point hint
      } else if (evolutionStage === 2) {
        // --- SPROUT STAGE ---
        const stemColor = '#7cb342';
        const leafColor = '#9ccc65';
        const stemOutline = '#33691e';

        // Stem
        drawPixelRect(baseCenterX - 1, baseCenterY - 5, 2, 4, stemOutline);
        drawPixelRect(baseCenterX - 1, baseCenterY - 5, 1, 4, stemColor);

        // Leaves swaying
        const swayX = Math.round(swayOffset * 0.5);
        // Left leaf
        drawPixel(baseCenterX - 2 + swayX, baseCenterY - 6, stemOutline);
        drawPixel(baseCenterX - 3 + swayX, baseCenterY - 6, leafColor);
        drawPixel(baseCenterX - 4 + swayX, baseCenterY - 5, leafColor);
        // Right leaf
        drawPixel(baseCenterX + 1 + swayX, baseCenterY - 7, stemOutline);
        drawPixel(baseCenterX + 2 + swayX, baseCenterY - 7, leafColor);
        drawPixel(baseCenterX + 3 + swayX, baseCenterY - 6, leafColor);
      } else if (evolutionStage === 3) {
        // --- GROWING STAGE ---
        const stemColor = '#558b2f';
        const leafColor = '#7cb342';
        const stemOutline = '#2e7d32';

        const swayX = Math.round(swayOffset * 0.8);

        // Stem
        drawPixelRect(baseCenterX - 1, baseCenterY - 8, 2, 7, stemOutline);
        drawPixelRect(baseCenterX - 1, baseCenterY - 8, 1, 7, stemColor);

        // Left Branch/Leaf
        drawPixelRect(baseCenterX - 4 + swayX, baseCenterY - 7, 3, 2, leafColor);
        drawPixel(baseCenterX - 5 + swayX, baseCenterY - 6, stemOutline);

        // Right Branch/Leaf
        drawPixelRect(baseCenterX + 2 + swayX, baseCenterY - 9, 3, 2, leafColor);
        drawPixel(baseCenterX + 5 + swayX, baseCenterY - 8, stemOutline);

        // Top budding leaves
        drawPixelRect(baseCenterX - 2 + swayX, baseCenterY - 10, 3, 2, leafColor);
      } else if (evolutionStage === 4) {
        // --- BLOOMING STAGE ---
        const stemColor = '#33691e';
        const stemOutline = '#1b5e20';
        const swayX = Math.round(swayOffset);

        // Stem
        drawPixelRect(baseCenterX - 1, baseCenterY - 11, 2, 10, stemOutline);
        drawPixelRect(baseCenterX - 1, baseCenterY - 10, 1, 9, stemColor);

        // Side leaves
        drawPixelRect(baseCenterX - 4 + Math.round(swayX * 0.5), baseCenterY - 7, 3, 2, '#558b2f');
        drawPixelRect(baseCenterX + 2 + Math.round(swayX * 0.5), baseCenterY - 9, 3, 2, '#558b2f');

        // Flower Bud on Top (colors vary slightly by month type)
        let budColor = '#ff80ab'; // pink default
        let budCore = '#ffeb3b'; // yellow core
        if (month === 5 || month === 12) {
          budColor = '#d50000'; // Rose/Camellia red
        } else if (month === 8 || month === 9) {
          budColor = '#ffc107'; // Corn/Sunflower yellow
        } else if (month === 2 || month === 10) {
          budColor = '#ff9800'; // Tangerine/Persimmon orange
        }

        drawPixelRect(baseCenterX - 2 + swayX, baseCenterY - 14, 4, 3, budColor);
        drawPixelRect(baseCenterX - 1 + swayX, baseCenterY - 13, 2, 1, budCore);
        drawPixel(baseCenterX - 2 + swayX, baseCenterY - 12, stemOutline);
        drawPixel(baseCenterX + 1 + swayX, baseCenterY - 12, stemOutline);
      } else {
        // --- MATURE / HARVEST STAGE (Stage 5) ---
        // Render unique visual depending on month
        const swayX = Math.round(swayOffset * 1.2);
        const stemColor = '#33691e';
        const leafColor = '#558b2f';

        // Base Stem
        drawPixelRect(baseCenterX - 1, baseCenterY - 13, 2, 12, '#1b5e20');
        drawPixelRect(baseCenterX - 1, baseCenterY - 12, 1, 11, stemColor);

        // Leaves
        drawPixelRect(baseCenterX - 5 + Math.round(swayX * 0.6), baseCenterY - 7, 4, 2, leafColor);
        drawPixelRect(baseCenterX + 1 + Math.round(swayX * 0.6), baseCenterY - 9, 4, 2, leafColor);

        const cropTopY = baseCenterY - 13;

        switch (month) {
          case 1: {
            // 🍓 STRAWBERRY (Red berry hanging down)
            const red = '#e53935';
            const yellow = '#ffeb3b';
            const calyx = '#7cb342';
            // Calyx
            drawPixelRect(baseCenterX - 3 + swayX, cropTopY - 2, 6, 2, calyx);
            // Red Berry body
            drawPixelRect(baseCenterX - 4 + swayX, cropTopY, 8, 4, red);
            drawPixelRect(baseCenterX - 3 + swayX, cropTopY + 4, 6, 2, red);
            drawPixelRect(baseCenterX - 1 + swayX, cropTopY + 6, 2, 1, red);
            // Yellow seeds
            drawPixel(baseCenterX - 2 + swayX, cropTopY + 1, yellow);
            drawPixel(baseCenterX + 1 + swayX, cropTopY + 1, yellow);
            drawPixel(baseCenterX - 1 + swayX, cropTopY + 3, yellow);
            drawPixel(baseCenterX + 2 + swayX, cropTopY + 3, yellow);
            break;
          }
          case 2: {
            // 🍊 TANGERINE (Orange circular fruit)
            const orange = '#ff9800';
            const deepOrange = '#f57c00';
            const greenLeaf = '#2e7d32';
            // Branch connection
            drawPixel(baseCenterX + swayX, cropTopY - 1, greenLeaf);
            // Fruit
            drawPixelRect(baseCenterX - 4 + swayX, cropTopY, 8, 7, deepOrange);
            drawPixelRect(baseCenterX - 3 + swayX, cropTopY + 1, 6, 5, orange);
            // Highlight
            drawPixel(baseCenterX - 2 + swayX, cropTopY + 2, '#fff');
            break;
          }
          case 3: {
            // 🌱 SPROUT VEGETABLES (Thick multi-foliage bush)
            const mint = '#80cbc4';
            const lime = '#c0ca33';
            const green = '#4caf50';
            // Bushy leafy head
            drawPixelRect(baseCenterX - 7 + swayX, cropTopY - 4, 14, 8, green);
            drawPixelRect(baseCenterX - 6 + swayX, cropTopY - 3, 12, 6, lime);
            drawPixelRect(baseCenterX - 3 + swayX, cropTopY - 2, 6, 4, mint);
            break;
          }
          case 4: {
            // 🌸 CHERRY BLOSSOM TREE (Pink cherry blossoms canopy)
            const pinkLight = '#f8bbd0';
            const pinkDark = '#f48fb1';
            const branch = '#4e342e';
            // Brown trunk overlay
            drawPixelRect(baseCenterX - 2, baseCenterY - 14, 3, 10, branch);
            // Pink blossom cloud
            drawPixelRect(baseCenterX - 8 + swayX, cropTopY - 7, 16, 9, pinkDark);
            drawPixelRect(baseCenterX - 6 + swayX, cropTopY - 6, 12, 7, pinkLight);
            // Floating petals
            drawPixel(baseCenterX - 10 + swayX, cropTopY - 2, pinkLight);
            drawPixel(baseCenterX + 9 + swayX, cropTopY - 4, pinkLight);
            break;
          }
          case 5: {
            // 🌹 ROSE (Large beautiful red rose head)
            const redDark = '#b71c1c';
            const redLight = '#e53935';
            const pink = '#ff8a80';
            // Rose Petals
            drawPixelRect(baseCenterX - 5 + swayX, cropTopY - 5, 10, 8, redDark);
            drawPixelRect(baseCenterX - 4 + swayX, cropTopY - 4, 8, 6, redLight);
            // Swirl inside
            drawPixelRect(baseCenterX - 2 + swayX, cropTopY - 2, 4, 3, pink);
            drawPixel(baseCenterX + swayX, cropTopY - 1, redDark);
            break;
          }
          case 6: {
            // 🟢 PLUM (Round green-yellow plums hanging)
            const plumGreen = '#81c784';
            const plumDark = '#388e3c';
            // Left Plum
            drawPixelRect(baseCenterX - 5 + swayX, cropTopY, 4, 4, plumDark);
            drawPixelRect(baseCenterX - 4 + swayX, cropTopY, 3, 3, plumGreen);
            // Right Plum
            drawPixelRect(baseCenterX + 1 + swayX, cropTopY + 2, 4, 4, plumDark);
            drawPixelRect(baseCenterX + 2 + swayX, cropTopY + 2, 3, 3, plumGreen);
            break;
          }
          case 7: {
            // 🍉 WATERMELON (Big striped watermelon lying on bottom)
            const greenDark = '#1b5e20';
            const greenLight = '#4caf50';
            const stem = '#33691e';
            // Lying on the ground
            const melonX = baseCenterX + swayX;
            const melonY = baseCenterY - 4;
            drawPixelRect(melonX - 7, melonY, 14, 7, greenDark);
            // Light green stripes
            drawPixelRect(melonX - 5, melonY + 1, 1, 5, greenLight);
            drawPixelRect(melonX - 2, melonY + 1, 1, 5, greenLight);
            drawPixelRect(melonX + 1, melonY + 1, 1, 5, greenLight);
            drawPixelRect(melonX + 4, melonY + 1, 1, 5, greenLight);
            // Curly stem connecting back
            drawPixel(melonX, melonY - 1, stem);
            drawPixel(melonX + 1, melonY - 2, stem);
            break;
          }
          case 8: {
            // 🌽 CORN (Yellow ear with green husks)
            const yellow = '#fdd835';
            const yellowDark = '#f57f17';
            const husk = '#7cb342';
            // Green husk backing
            drawPixelRect(baseCenterX - 3 + swayX, cropTopY - 2, 6, 9, husk);
            // Yellow kernels
            drawPixelRect(baseCenterX - 2 + swayX, cropTopY - 3, 4, 8, yellowDark);
            drawPixelRect(baseCenterX - 1 + swayX, cropTopY - 3, 2, 7, yellow);
            // Top silk
            drawPixelRect(baseCenterX - 1 + swayX, cropTopY - 5, 2, 2, '#a78bfa');
            break;
          }
          case 9: {
            // 🌻 SUNFLOWER (Big yellow face with brown core)
            const yellow = '#ffeb3b';
            const gold = '#fbc02d';
            const brown = '#3e2723';
            // Yellow petals
            drawPixelRect(baseCenterX - 6 + swayX, cropTopY - 6, 12, 11, gold);
            drawPixelRect(baseCenterX - 5 + swayX, cropTopY - 5, 10, 9, yellow);
            // Brown core
            drawPixelRect(baseCenterX - 2 + swayX, cropTopY - 2, 4, 3, brown);
            break;
          }
          case 10: {
            // 🍅 PERSIMMON (Deep orange persimmons hanging)
            const orange = '#ff6d00';
            const blackCalyx = '#37474f';
            // Hanging persimmon
            drawPixelRect(baseCenterX - 4 + swayX, cropTopY, 8, 6, orange);
            drawPixelRect(baseCenterX - 3 + swayX, cropTopY + 1, 6, 4, '#ffab40');
            // Black calyx leaf on top
            drawPixelRect(baseCenterX - 2 + swayX, cropTopY - 1, 4, 1, blackCalyx);
            break;
          }
          case 11: {
            // 🍠 SWEET POTATO (Purple tuber showing under the soil)
            const purple = '#7b1fa2';
            const purpleLight = '#ba68c8';
            // Show under the soil mound
            drawPixelRect(baseCenterX - 5 + swayX, baseCenterY - 1, 10, 5, purple);
            drawPixelRect(baseCenterX - 4 + swayX, baseCenterY, 8, 3, purpleLight);
            // Stem connection
            drawPixel(baseCenterX - 1 + swayX, baseCenterY - 2, stemColor);
            break;
          }
          case 12: {
            // 🌺 WINTER CAMELLIA (Red flowers in snow)
            const camelliaRed = '#c2185b';
            const camelliaGold = '#ffd54f';
            // White snow on soil
            drawPixelRect(baseCenterX - 9, baseCenterY - 3, 18, 1, '#ffffff');
            drawPixel(baseCenterX - 5, baseCenterY - 4, '#ffffff');
            drawPixel(baseCenterX + 4, baseCenterY - 4, '#ffffff');
            // Flower heads
            drawPixelRect(baseCenterX - 5 + swayX, cropTopY - 3, 5, 5, camelliaRed);
            drawPixel(baseCenterX - 3 + swayX, cropTopY - 1, camelliaGold); // Center yellow
            drawPixelRect(baseCenterX + 1 + swayX, cropTopY - 1, 4, 4, camelliaRed);
            break;
          }
          default:
            // Fallback: green leaf star
            drawPixelRect(baseCenterX - 3 + swayX, cropTopY - 3, 6, 6, '#4caf50');
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
