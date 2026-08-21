'use client';

import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { cn } from '@/lib/utils';

interface EChartProps {
  option: echarts.EChartsCoreOption;
  className?: string;
  style?: React.CSSProperties;
}

export function EChart({ option, className, style }: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    chartInstance.current = echarts.init(chartRef.current);
    chartInstance.current.setOption(option);

    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [option]);

  return <div ref={chartRef} className={cn('w-full', className)} style={style} />;
}
