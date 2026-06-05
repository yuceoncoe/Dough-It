export const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
};

export const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  let start = startAngle % 360;
  let end = endAngle % 360;

  if (end <= start) {
    end += 360;
  }
  if (end - start >= 360) {
    end = start + 359.99;
  }

  const startPoint = polarToCartesian(x, y, radius, start);
  const endPoint = polarToCartesian(x, y, radius, end);
  const largeArcFlag = end - start <= 180 ? '0' : '1';

  return [
    'M', startPoint.x, startPoint.y,
    'A', radius, radius, 0, largeArcFlag, 1, endPoint.x, endPoint.y,
    'L', x, y,
    'L', startPoint.x, startPoint.y,
  ].join(' ');
};

export const describeOpenArc = (
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  let start = startAngle % 360;
  let end = endAngle % 360;

  if (end <= start) {
    end += 360;
  }
  if (end - start >= 360) {
    end = start + 359.99;
  }

  const startPoint = polarToCartesian(x, y, radius, start);
  const endPoint = polarToCartesian(x, y, radius, end);
  const largeArcFlag = end - start <= 180 ? '0' : '1';

  return [
    'M', startPoint.x, startPoint.y,
    'A', radius, radius, 0, largeArcFlag, 1, endPoint.x, endPoint.y,
  ].join(' ');
};
