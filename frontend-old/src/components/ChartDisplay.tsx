import React from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import classNames from 'classnames';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

interface ChartData {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: any;
  options?: any;
  description?: string;
}

interface ChartDisplayProps {
  charts: ChartData[];
  className?: string;
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({ charts, className }) => {
  if (!charts || charts.length === 0) return null;

  const getChartComponent = (chart: ChartData) => {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 16,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#374151',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                // Format as currency if the value looks like money
                if (typeof context.parsed.y === 'number' && context.parsed.y > 1000) {
                  label += '$' + context.parsed.y.toLocaleString();
                } else {
                  label += context.parsed.y.toLocaleString();
                }
              }
              return label;
            },
          },
        },
      },
      ...chart.options,
    };

    // Enhanced styling for different chart types
    const enhancedData = {
      ...chart.data,
      datasets: chart.data.datasets?.map((dataset: any, index: number) => ({
        ...dataset,
        borderWidth: 2,
        pointRadius: chart.type === 'line' ? 4 : 0,
        pointHoverRadius: chart.type === 'line' ? 6 : 0,
        borderColor: dataset.borderColor || getColorPalette()[index % getColorPalette().length],
        backgroundColor: dataset.backgroundColor || 
          (chart.type === 'line' ? 
            `${getColorPalette()[index % getColorPalette().length]}33` : 
            getColorPalette()[index % getColorPalette().length]
          ),
        ...(chart.type === 'bar' && {
          borderRadius: 4,
          borderSkipped: false,
        }),
      })),
    };

    const props = {
      data: enhancedData,
      options: commonOptions,
    };

    switch (chart.type) {
      case 'line':
        return <Line {...props} />;
      case 'bar':
        return <Bar {...props} />;
      case 'pie':
        return <Pie {...props} />;
      case 'doughnut':
        return <Doughnut {...props} />;
      default:
        return <Bar {...props} />;
    }
  };

  return (
    <div className={classNames('space-y-6', className)}>
      {charts.map((chart, index) => (
        <motion.div
          key={`${chart.title}-${index}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.2 }}
          className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
        >
          {/* Chart Header */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {chart.title}
            </h3>
            {chart.description && (
              <p className="text-sm text-gray-600 mt-1">
                {chart.description}
              </p>
            )}
          </div>

          {/* Chart Container */}
          <div className="relative h-80">
            {getChartComponent(chart)}
          </div>

          {/* Chart Footer - Data Summary */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {chart.data.datasets?.map((dataset: any, datasetIndex: number) => {
                const values = dataset.data || [];
                const total = values.reduce((sum: number, val: number) => sum + (val || 0), 0);
                const average = values.length > 0 ? total / values.length : 0;
                const max = Math.max(...values.filter((v: number) => !isNaN(v)));
                const min = Math.min(...values.filter((v: number) => !isNaN(v)));

                return (
                  <div key={datasetIndex} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">
                      {dataset.label || `Dataset ${datasetIndex + 1}`}
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="text-xs text-gray-400">Total:</span>
                        <div className="font-medium text-gray-900">
                          {total > 1000 ? `$${total.toLocaleString()}` : total.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Avg:</span>
                        <div className="font-medium text-gray-700">
                          {average > 1000 ? `$${Math.round(average).toLocaleString()}` : Math.round(average).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const getColorPalette = () => [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

export default ChartDisplay;