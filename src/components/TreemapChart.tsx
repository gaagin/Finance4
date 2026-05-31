import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Category, formatCategoryDisplayName } from '../types';

interface TreemapItem {
  category: Category;
  amount: number;
  percentage: number;
}

interface TreemapChartProps {
  items: TreemapItem[];
  type: 'income' | 'expense';
  total: number;
  onCategoryClick?: (category: Category) => void;
  showSubcategories: boolean;
  onToggleSubcategories: () => void;
  theme: 'dark' | 'light';
  height?: number;
}

interface TreemapNode {
  name: string;
  amount: number;
  percentage: number;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  category: Category;
}

// Bruls' Squarified Treemap Layout Algorithm
function getWorstRatio(row: any[], rwidth: number, rheight: number): number {
  if (row.length === 0) return Infinity;
  const rowArea = row.reduce((acc, d) => acc + d.area, 0);
  const minSide = Math.min(rwidth, rheight);
  if (minSide === 0 || rowArea === 0) return Infinity;

  let maxArea = -Infinity;
  let minArea = Infinity;
  for (const elem of row) {
    if (elem.area > maxArea) maxArea = elem.area;
    if (elem.area < minArea) minArea = elem.area;
  }

  const s = minSide * minSide;
  const r1 = (s * maxArea) / (rowArea * rowArea);
  const r2 = (rowArea * rowArea) / (s * minArea);
  return Math.max(r1, r2);
}

function computeTreemap(
  items: TreemapItem[],
  width: number,
  height: number
): TreemapNode[] {
  if (items.length === 0 || width <= 0 || height <= 0) return [];

  // Sort items descending by amount
  const sorted = [...items].sort((a, b) => b.amount - a.amount);
  const sum = sorted.reduce((acc, d) => acc + d.amount, 0);
  if (sum === 0) return [];

  const totalArea = width * height;
  const elements = sorted.map(item => ({
    ...item,
    area: (item.amount / sum) * totalArea,
  }));

  const nodes: TreemapNode[] = [];

  let rx = 0;
  let ry = 0;
  let rwidth = width;
  let rheight = height;

  let i = 0;
  while (i < elements.length) {
    const row: typeof elements = [];
    let worstRatio = Infinity;

    while (i < elements.length) {
      const nextElem = elements[i];
      const newRow = [...row, nextElem];
      const newWorst = getWorstRatio(newRow, rwidth, rheight);

      if (newWorst <= worstRatio) {
        row.push(nextElem);
        worstRatio = newWorst;
        i++;
      } else {
        break;
      }
    }

    const rowArea = row.reduce((acc, d) => acc + d.area, 0);
    const isVertical = rwidth >= rheight;

    let offset = 0;
    for (const elem of row) {
      let x = rx;
      let y = ry;
      let w = 0;
      let h = 0;

      if (isVertical) {
        w = rowArea / rheight;
        h = elem.area / w;
        y = ry + offset;
        offset += h;
      } else {
        h = rowArea / rwidth;
        w = elem.area / h;
        x = rx + offset;
        offset += w;
      }

      nodes.push({
        name: elem.category.name,
        amount: elem.amount,
        percentage: elem.percentage,
        color: elem.category.color,
        x,
        y,
        width: w,
        height: h,
        category: elem.category,
      });
    }

    if (isVertical) {
      rx += rowArea / rheight;
      rwidth -= rowArea / rheight;
    } else {
      ry += rowArea / rwidth;
      rheight -= rowArea / rwidth;
    }
  }

  return nodes;
}

export const TreemapChart: React.FC<TreemapChartProps> = ({
  items,
  type,
  total,
  onCategoryClick,
  showSubcategories,
  onToggleSubcategories,
  theme,
  height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: height || 320 });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setDimensions({
            width: rect.width,
            height: height || (rect.width < 500 ? 250 : 320), // adaptive height for small mobile views
          });
        }
      }
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [height]);

  const nodes = useMemo(() => {
    // Show top 15 categories for clean visuals
    const displayItems = items.slice(0, 15);
    return computeTreemap(displayItems, dimensions.width, dimensions.height);
  }, [items, dimensions.width, dimensions.height]);

  const panelThemeBorder = type === 'expense' 
    ? 'border-rose-950/40 bg-rose-500/5' 
    : 'border-emerald-950/40 bg-emerald-500/5';

  const defaultBorderColor = type === 'expense'
    ? 'border-rose-800/20'
    : 'border-emerald-800/20';

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs italic">
        Нет данных для построения графика
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full text-slate-200 select-none">
      {/* Outer border structured container wrapping the treemap grid */}
      <div 
        ref={containerRef}
        className={`w-full rounded-xl overflow-hidden relative border border-white/5 bg-slate-950/20`}
        style={{ height: `${dimensions.height}px` }}
      >
        {nodes.map((node, idx) => {
          const area = node.width * node.height;
          
          // Determine font sizes based on cell width and height
          let nameSize = 'text-[11px] sm:text-xs';
          let amountSize = 'text-[10px] sm:text-xs';
          if (node.width < 110 || node.height < 60) {
            nameSize = 'text-[10px]';
            amountSize = 'text-[9px]';
          }
          if (node.width < 80 || node.height < 45) {
            nameSize = 'text-[9px]';
            amountSize = 'text-[8px]';
          }
          if (node.width < 50 || node.height < 30) {
            nameSize = 'text-[8px]';
            amountSize = 'text-[7px]';
          }

          const catColor = node.color || '#64748b';
          
          // Compute thematic backgrounds with much higher opacity (vibrant color-wash)
          const baseBgColor = theme === 'dark'
            ? `${catColor}3b` // ~23% opacity for rich glowing blocks in dark mode
            : `${catColor}4d`; // ~30% opacity for clear pastel blocks in light mode

          // Draw strong, distinct border frames similar to HoneyMoney
          const baseBorderColor = theme === 'dark'
            ? `${catColor}aa` // high contrast border
            : `${catColor}bb`; // strong bordered grids

          const isHovered = hoveredIndex === idx;

          // Highly visible text styling per theme
          const textNameColor = theme === 'dark'
            ? 'text-white'
            : 'text-slate-950';

          const textAmountColor = theme === 'dark'
            ? (type === 'expense' ? 'text-rose-200' : 'text-emerald-250')
            : (type === 'expense' ? 'text-rose-900' : 'text-emerald-900');

          return (
            <div
              key={idx}
              onClick={() => onCategoryClick && onCategoryClick(node.category)}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="absolute transition-all duration-200 cursor-pointer overflow-hidden border flex flex-col justify-between p-2"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                height: `${node.height}px`,
                boxSizing: 'border-box',
                backgroundColor: isHovered 
                  ? (theme === 'dark' ? `${catColor}66` : `${catColor}77`) // much brighter on hover
                  : baseBgColor,
                borderColor: isHovered 
                  ? (type === 'expense' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)') 
                  : baseBorderColor,
                transform: isHovered ? 'scale(1.002)' : 'none',
                zIndex: isHovered ? 20 : 10,
                boxShadow: isHovered 
                  ? (type === 'expense' ? '0 0 12px rgba(239, 68, 68, 0.25)' : '0 0 12px rgba(16, 185, 129, 0.25)')
                  : 'none',
              }}
              title={`${formatCategoryDisplayName(node.name)}: ${Math.round(node.amount).toLocaleString('ru-RU')} ₼ (${(node.percentage || 0).toFixed(1)}%)`}
            >
              {/* Internal contents structured vertically */}
              <div className="flex flex-col h-full w-full justify-between items-start pointer-events-none">
                {node.width > 35 && node.height > 20 && (
                  <span className={`${nameSize} font-display font-extrabold ${textNameColor} uppercase tracking-tight truncate w-full`}>
                    {formatCategoryDisplayName(node.name)}
                  </span>
                )}
                {node.width > 55 && node.height > 38 && (
                  <span className={`${amountSize} font-mono font-extrabold leading-none ${textAmountColor} whitespace-nowrap mt-auto`}>
                    {type === 'expense' ? '-' : '+'}{Math.round(node.amount).toLocaleString('ru-RU')} ₼
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
