/**
 * Utility to create a Leaflet legend control for heatmap intensity
 */

export interface LegendItem {
  color: string;
  label: string;
  intensity: string;
}

export const HEATMAP_LEGEND_ITEMS: LegendItem[] = [
  { color: '#0000ff', label: 'Very Low', intensity: '0-20%' },
  { color: '#00ff00', label: 'Low', intensity: '20-40%' },
  { color: '#ffff00', label: 'Medium', intensity: '40-60%' },
  { color: '#ff7f00', label: 'High', intensity: '60-80%' },
  { color: '#ff0000', label: 'Very High', intensity: '80-100%' },
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
    div.style.padding = '10px';
    div.style.borderRadius = '5px';
    div.style.boxShadow = '0 0 15px rgba(0,0,0,0.2)';
    div.style.fontSize = '12px';
    div.style.fontFamily = 'Arial, sans-serif';
    div.style.zIndex = '1000';

    // Add title
    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.style.borderBottom = '1px solid #ccc';
    title.style.paddingBottom = '5px';
    title.textContent = 'Delivery Intensity';
    div.appendChild(title);

    // Add legend items
    HEATMAP_LEGEND_ITEMS.forEach((item) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.marginBottom = '5px';

      // Color box
      const colorBox = document.createElement('div');
      colorBox.style.width = '20px';
      colorBox.style.height = '20px';
      colorBox.style.backgroundColor = item.color;
      colorBox.style.marginRight = '8px';
      colorBox.style.borderRadius = '3px';
      colorBox.style.border = '1px solid #999';

      // Label
      const label = document.createElement('span');
      label.textContent = `${item.label} (${item.intensity})`;
      label.style.flex = '1';

      row.appendChild(colorBox);
      row.appendChild(label);
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
  const width = 200;
  const height = 30;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="heatmapGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#0000ff;stop-opacity:1" />
          <stop offset="25%" style="stop-color:#00ff00;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#ffff00;stop-opacity:1" />
          <stop offset="75%" style="stop-color:#ff7f00;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ff0000;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#heatmapGradient)" />
      <text x="0" y="${height + 15}" font-size="10" fill="#333">Low</text>
      <text x="${width - 30}" y="${height + 15}" font-size="10" fill="#333">High</text>
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
