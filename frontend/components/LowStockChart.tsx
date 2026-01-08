import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface LowStockChartProps {
    items: any[];
}

export default function LowStockChart({ items }: LowStockChartProps) {
    if (!items || items.length === 0) return null;

    const categories = items.map(item => item.name);
    const stockData = items.map(item => item.stock_level);
    const thresholdData = items.map(item => item.reorder_threshold);

    const options = {
        chart: {
            type: 'bar', // Horizontal bar is often better for lists of items
            backgroundColor: 'transparent',
            height: 200,
            style: {
                fontFamily: 'Inter, sans-serif'
            }
        },
        title: {
            text: null
        },
        xAxis: {
            categories: categories,
            labels: { style: { color: '#94a3b8', fontSize: '10px' } },
            lineWidth: 0,
            gridLineWidth: 0
        },
        yAxis: {
            title: { text: null },
            gridLineColor: '#334155',
            labels: { enabled: false }
        },
        tooltip: {
            backgroundColor: '#1e293b',
            style: { color: '#f8fafc' },
            shared: true
        },
        plotOptions: {
            bar: {
                borderRadius: 4,
                borderWidth: 0,
                // groupPadding: 0.1
            }
        },
        legend: {
            enabled: false
        },
        series: [
            {
                name: 'Stock Level',
                data: stockData,
                color: '#ef4444' // Error color for low stock
            },
            // Optional: Threshold line logic could be added here, 
            // but for simplicity and "visual" alert, just the bars are fine for now.
            // A simple line series could represent the threshold.
            {
                name: 'Reorder Level',
                type: 'scatter',
                data: thresholdData,
                marker: {
                    symbol: 'diamond',
                    fillColor: '#fbbf24' // Warning color
                },
                tooltip: {
                    pointFormat: 'Reorder at: <b>{point.y}</b>'
                }
            }
        ],
        credits: { enabled: false }
    };

    return (
        <div className="mt-2">
            <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
    );
}
