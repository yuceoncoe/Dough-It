import React, { useEffect, useRef, useState } from 'react';
import { PetMood, PetState } from '../../utils/pet';

interface PixelPetProps {
  petState: PetState;
  size?: number; // Visual size in px
  interactive?: boolean;
}

export const PixelPet = ({
  petState,
  size = 120,
  interactive = false,
}: PixelPetProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [jumpOffset, setJumpOffset] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const frameRef = useRef<number>(0);
  const animationIdRef = useRef<number | null>(null);

  // Jump animation trigger
  const handlePetClick = () => {
    if (!interactive || isJumping) {
      return;
    }
    setIsJumping(true);
    let frame = 0;
    const jumpFrames = 15;
    const animateJump = () => {
      frame++;
      if (frame <= jumpFrames) {
        // Parabole curve: h = -a * (t - half)^2 + max_height
        const half = jumpFrames / 2;
        const offset = Math.max(0, -1.2 * Math.pow(frame - half, 2) + 1.2 * Math.pow(half, 2));
        setJumpOffset(offset);
        animationIdRef.current = requestAnimationFrame(animateJump);
      } else {
        setJumpOffset(0);
        setIsJumping(false);
      }
    };
    animateJump();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    // Crisp pixel rendering settings
    ctx.imageSmoothingEnabled = false;

    let localFrame = 0;
    let zzzParticles: Array<{ x: number; y: number; alpha: number; scale: number }> = [];

    const draw = () => {
      localFrame++;
      frameRef.current = localFrame;
      ctx.clearRect(0, 0, 60, 60);

      const { evolutionStage, dominantStat, mood } = petState;

      // Base coordinate setup
      const baseCenterX = 30;
      const baseCenterY = 40 - jumpOffset;

      // squash and stretch breathing animation
      const breathing = Math.sin(localFrame * 0.1) * 0.5;
      let squashX = 0;
      let squashY = 0;

      if (!isJumping) {
        squashX = breathing;
        squashY = -breathing;
      }

      // Mood colors and stat themes
      let petColor = '#e9ecef'; // Default baby white
      let accessoryColor = '#f5b041';

      if (evolutionStage >= 4) {
        // Stat colors
        switch (dominantStat) {
          case 'strength':
            petColor = '#ff6b6b'; // Red
            accessoryColor = '#c92a2a';
            break;
          case 'intelligence':
            petColor = '#4dabf7'; // Blue
            accessoryColor = '#1864ab';
            break;
          case 'agility':
            petColor = '#ffd43b'; // Yellow
            accessoryColor = '#f59f00';
            break;
          case 'emotion':
            petColor = '#f783ac'; // Pink
            accessoryColor = '#d6336c';
            break;
          default:
            petColor = '#b2f2bb'; // Green (balanced)
            accessoryColor = '#37b24d';
        }
      } else if (evolutionStage === 3) {
        petColor = '#c3fae8'; // Mint for child
      } else if (evolutionStage === 2) {
        petColor = '#f1f3f5'; // Light gray for baby
      }

      // Dim color if reflective (sad)
      if (mood === 'reflective') {
        ctx.filter = 'saturate(0.5) brightness(0.9)';
      } else {
        ctx.filter = 'none';
      }

      // Helper drawing functions (drawing in 60x60 grid)
      const drawPixel = (x: number, y: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      };

      const drawPixelRect = (x: number, y: number, w: number, h: number, color: string) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
      };

      // 1. Draw Shadow
      if (evolutionStage > 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        const shadowWidth = evolutionStage === 2 ? 8 : evolutionStage === 3 ? 14 : 20;
        ctx.beginPath();
        ctx.ellipse(baseCenterX, 49, shadowWidth, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Draw Character Body based on stage
      if (evolutionStage === 1) {
        // EGG: Egg shape (oval width=16, height=20)
        const eggShake = Math.sin(localFrame * 0.15) * 1.5;
        const eggY = 38 + (isJumping ? -jumpOffset : Math.abs(eggShake) * 0.3);
        const eggX = baseCenterX + (isJumping ? 0 : eggShake);

        // Body outline & fill
        // Left & Right bounds
        drawPixelRect(eggX - 6, eggY - 7, 12, 16, '#292524'); // Outline box
        drawPixelRect(eggX - 7, eggY - 4, 14, 11, '#292524');
        drawPixelRect(eggX - 4, eggY - 9, 8, 19, '#292524');

        // Fill
        drawPixelRect(eggX - 5, eggY - 7, 10, 15, '#fff2e6');
        drawPixelRect(eggX - 6, eggY - 4, 12, 10, '#fff2e6');
        drawPixelRect(eggX - 3, eggY - 8, 6, 17, '#fff2e6');

        // Spots on Egg
        drawPixelRect(eggX - 3, eggY - 2, 2, 2, '#f5b041');
        drawPixelRect(eggX + 2, eggY + 3, 2, 2, '#f5b041');
        drawPixelRect(eggX + 1, eggY - 5, 2, 1, '#f5b041');

      } else {
        // SLIME/BLOB (Baby, Child, Teen, Adult)
        const rW = (evolutionStage === 2 ? 6 : evolutionStage === 3 ? 12 : 17) + squashX;
        const rH = (evolutionStage === 2 ? 6 : evolutionStage === 3 ? 10 : 14) + squashY;

        // Outline
        drawPixelRect(baseCenterX - rW - 1, baseCenterY - rH, rW * 2 + 2, rH * 2, '#292524');
        drawPixelRect(baseCenterX - rW, baseCenterY - rH - 1, rW * 2, rH * 2 + 2, '#292524');

        // Inner Fill
        drawPixelRect(baseCenterX - rW, baseCenterY - rH, rW * 2, rH * 2, petColor);

        // Highlight shininess
        drawPixelRect(baseCenterX - rW + 2, baseCenterY - rH + 2, 2, 2, '#ffffff');

        // Accessories & Stat features (Teenager & Adult)
        if (evolutionStage >= 4) {
          if (dominantStat === 'strength') {
            // Draw Horns
            drawPixelRect(baseCenterX - rW, baseCenterY - rH - 3, 2, 4, accessoryColor);
            drawPixelRect(baseCenterX + rW - 2, baseCenterY - rH - 3, 2, 4, accessoryColor);
            drawPixelRect(baseCenterX - rW - 1, baseCenterY - rH - 2, 1, 2, '#292524');
            drawPixelRect(baseCenterX + rW, baseCenterY - rH - 2, 1, 2, '#292524');
            // Little angry eyebrows
            drawPixel(baseCenterX - 3, baseCenterY - 3, '#292524');
            drawPixel(baseCenterX + 2, baseCenterY - 3, '#292524');
          } else if (dominantStat === 'intelligence') {
            // Wizard Hat
            const hatY = baseCenterY - rH - 4;
            drawPixelRect(baseCenterX - 4, hatY, 8, 2, accessoryColor);
            drawPixelRect(baseCenterX - 2, hatY - 3, 4, 3, accessoryColor);
            drawPixelRect(baseCenterX - 1, hatY - 5, 2, 2, '#ffd43b'); // Yellow star on tip
            // Glasses
            drawPixelRect(baseCenterX - 4, baseCenterY - 2, 3, 3, '#292524');
            drawPixelRect(baseCenterX + 1, baseCenterY - 2, 3, 3, '#292524');
            drawPixel(baseCenterX - 1, baseCenterY - 1, '#292524');
            drawPixelRect(baseCenterX - 3, baseCenterY - 1, 1, 1, '#ffffff');
            drawPixelRect(baseCenterX + 2, baseCenterY - 1, 1, 1, '#ffffff');
          } else if (dominantStat === 'agility') {
            // Tiny Wings on the sides
            const wingOffset = Math.sin(localFrame * 0.25) > 0 ? 1 : -1;
            drawPixelRect(baseCenterX - rW - 3, baseCenterY - 2 + wingOffset, 3, 2, accessoryColor);
            drawPixelRect(baseCenterX + rW, baseCenterY - 2 + wingOffset, 3, 2, accessoryColor);
            // Wing outlines
            drawPixel(baseCenterX - rW - 4, baseCenterY - 1 + wingOffset, '#292524');
            drawPixel(baseCenterX + rW + 3, baseCenterY - 1 + wingOffset, '#292524');
          } else if (dominantStat === 'emotion') {
            // Heart/Flower on head
            drawPixelRect(baseCenterX - 2, baseCenterY - rH - 3, 4, 2, '#e64980'); // Pink petals
            drawPixelRect(baseCenterX - 1, baseCenterY - rH - 2, 2, 1, '#ffd43b'); // yellow core
            drawPixel(baseCenterX, baseCenterY - rH - 1, '#292524'); // Stem
            // Blushing Cheeks
            drawPixelRect(baseCenterX - rW + 1, baseCenterY + 1, 2, 1, '#ff8787');
            drawPixelRect(baseCenterX + rW - 3, baseCenterY + 1, 2, 1, '#ff8787');
          }

          // Adult crowns / glow for level 10+
          if (evolutionStage === 5) {
            // Crown
            drawPixel(baseCenterX - 2, baseCenterY - rH - 5, '#f59f00');
            drawPixel(baseCenterX, baseCenterY - rH - 6, '#ffd43b');
            drawPixel(baseCenterX + 2, baseCenterY - rH - 5, '#f59f00');
            drawPixelRect(baseCenterX - 1, baseCenterY - rH - 4, 3, 1, '#f59f00');
          }
        }

        // 3. Draw Eyes based on Mood
        const eyeY = baseCenterY - (evolutionStage === 2 ? 1 : 2);
        const eyeOffset = evolutionStage === 2 ? 2 : evolutionStage === 3 ? 4 : 5;

        if (mood === 'sleepy') {
          // Closed eyes ( -   - )
          drawPixelRect(baseCenterX - eyeOffset, eyeY, 2, 1, '#292524');
          drawPixelRect(baseCenterX + eyeOffset - 1, eyeY, 2, 1, '#292524');

          // Sleep bubbles / Zzz floating
          if (localFrame % 45 === 0) {
            zzzParticles.push({
              x: baseCenterX + 8,
              y: baseCenterY - rH - 2,
              alpha: 1.0,
              scale: 0.8,
            });
          }
        } else if (mood === 'excited') {
          // Large circle eyes
          drawPixelRect(baseCenterX - eyeOffset, eyeY - 1, 2, 2, '#292524');
          drawPixelRect(baseCenterX + eyeOffset - 1, eyeY - 1, 2, 2, '#292524');
          // Open mouth
          drawPixelRect(baseCenterX - 1, baseCenterY + 1, 2, 2, '#c92a2a');
        } else if (mood === 'reflective') {
          // Downcast eyes ( .   . )
          drawPixel(baseCenterX - eyeOffset, eyeY, '#292524');
          drawPixel(baseCenterX + eyeOffset - 1, eyeY, '#292524');
          // Drooping mouth / flat line
          drawPixelRect(baseCenterX - 1, baseCenterY + 1, 2, 1, '#292524');
        } else {
          // Happy / curves ( ^   ^ )
          drawPixel(baseCenterX - eyeOffset, eyeY, '#292524');
          drawPixel(baseCenterX - eyeOffset + 1, eyeY - 1, '#292524');
          drawPixel(baseCenterX + eyeOffset - 1, eyeY - 1, '#292524');
          drawPixel(baseCenterX + eyeOffset, eyeY, '#292524');

          // Smiling mouth ( v )
          drawPixel(baseCenterX, baseCenterY + 1, '#292524');
          drawPixel(baseCenterX - 1, baseCenterY, '#292524');
          drawPixel(baseCenterX + 1, baseCenterY, '#292524');
        }
      }

      // 4. Update and Draw floating Zzz particles
      zzzParticles.forEach((p, idx) => {
        p.y -= 0.15;
        p.x += Math.sin(localFrame * 0.05 + idx) * 0.08;
        p.alpha -= 0.006;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = '#228be6';
        ctx.font = 'bold 8px Courier New';
        ctx.fillText('Z', p.x, p.y);
        ctx.restore();
      });
      zzzParticles = zzzParticles.filter((p) => p.alpha > 0);

      animationIdRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [petState, jumpOffset, isJumping]);

  return (
    <div
      onClick={handlePetClick}
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

export default PixelPet;
