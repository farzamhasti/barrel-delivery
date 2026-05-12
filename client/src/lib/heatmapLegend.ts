/**
 * Utility to create a Leaflet legend control for heatmap intensity
 */

export interface LegendItem {
  color: string;
  label: string;
  intensity: string;
}

export const HEATMAP_LEGEND_ITEMS: LegendItem[] = [
  { color: '#0000ff', label: 'Very Low', intensity: '0-16.7%' },
  { color: '#00bfff', label: 'Low', intensity: '16.7-33.3%' },
  { color: '#00ff00', label: 'Medium', intensity: '33.3-50%' },
  { color: '#ffff00', label: 'High', intensity: '50-66.7%' },
  { color: '#ff7f00', label: 'Very High', intensity: '66.7-83.3%' },
  { color: '#ff0000', label: 'Critical', intensity: '83.3-100%' },
];

/**
 * Create a Leaflet legend control for the heatmap
 */
export function createHeatmapLegend(): any {
  if (!window.L) return null;

  const legend = window.L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = window.L.DomUtil.create('div', 'heatmap-legend');
    div.style.backgroundColor = 'white';
    div.style.padding = '12px';
    div.style.borderRadius = '6px';
    div.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    div.style.fontSize = '12px';
    div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    div.style.zIndex = '1000';
    div.style.maxWidth = '220px';

    // Add title
    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.borderBottom = '2px solid #e5e7eb';
    title.style.paddingBottom = '8px';
    title.style.fontSize = '13px';
    title.style.color = '#1f2937';
    title.textContent = 'Delivery Intensity';
    div.appendChild(title);

    // Add legend items with improved styling
    HEATMAP_LEGEND_ITEMS.forEach((item, index) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.marginBottom = '7px';
      row.style.padding = '4px 0';

      // Color box with gradient effect
      const colorBox = document.createElement('div');
      colorBox.style.width = '24px';
      colorBox.style.height = '24px';
      colorBox.style.backgroundColor = item.color;
      colorBox.style.marginRight = '10px';
      colorBox.style.borderRadius = '4px';
      colorBox.style.border = '1px solid rgba(0,0,0,0.2)';
      colorBox.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      colorBox.style.flexShrink = '0';

      // Label with intensity
      const label = document.createElement('span');
      label.textContent = item.label;
      label.style.flex = '1';
      label.style.fontWeight = index === 0 || index === HEATMAP_LEGEND_ITEMS.length - 1 ? '600' : '500';
      label.style.color = '#374151';

      // Intensity percentage
      const intensity = document.createElement('span');
      intensity.textContent = item.intensity;
      intensity.style.fontSize = '11px';
      intensity.style.color = '#6b7280';
      intensity.style.marginLeft = '8px';
      intensity.style.whiteSpace = 'nowrap';

      row.appendChild(colorBox);
      row.appendChild(label);
      row.appendChild(intensity);
      div.appendChild(row);
    });

    return div;
  };

  return legend;
}

/**
 * Create a simple gradient legend as SVG
 */
export function createGradientLegendSVG(): string {
  const width = 300;
  const height = 30;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="heatmapGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#0000ff;stop-opacity:1" />
          <stop offset="16.7%" style="stop-color:#00bfff;stop-opacity:1" />
          <stop offset="33.3%" style="stop-color:#00ff00;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ffff00;stop-opacity:1" />
          <stop offset="66.7%" style="stop-color:#ff7f00;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff0000;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#heatmapGradient)" />
      <text x="5" y="${height + 15}" font-size="10" fill="#333" font-weight="bold">Very Low</text>
      <text x="${width - 60}" y="${height + 15}" font-size="10" fill="#333" font-weight="bold">Critical</text>
    </svg>
  `;

  return svg;
}

/**
 * Add legend to map
 */
export function addLegendToMap(map: any): void {
  if (!map || !window.L) return;

  const legend = createHeatmapLegend();
  if (legend) {
    legend.addTo(map);
  }
}
