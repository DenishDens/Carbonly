
import { ChartOptions } from 'chart.js';

// Modern Chart.js configuration (v3+)
export const defaultChartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        drawBorder: false,
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
};
