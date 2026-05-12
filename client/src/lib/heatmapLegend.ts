/**
 * Utility to create a Leaflet legend control for heatmap intensity
 */

export interface LegendItem {
  color: string;
  label: string;
  intensity: string;
  description: string;
}

export const HEATMAP_LEGEND_ITEMS: LegendItem[] = [
  {
    color: '#0000ff',
    label: 'Blue',
    intensity: '0-16.7%',
    description: 'Very low delivery density - minimal orders in this area',
  },
  {
    color: '#00bfff',
    label: 'Cyan',
    intensity: '16.7-33.3%',
    description: 'Low density - occasional delivery clusters',
  },
  {
    color: '#00ff00',
    label: 'Green',
    intensity: '33.3-50%',
    description: 'Medium density - moderate delivery activity',
  },
  {
    color: '#ffff00',
    label: 'Yellow',
    intensity: '50-66.7%',
    description: 'High density - significant delivery concentration',
  },
  {
    color: '#ff7f00',
    label: 'Orange',
    intensity: '66.7-83.3%',
    description: 'Very high density - major delivery hotspots',
  },
  {
    color: '#ff0000',
    label: 'Red',
    intensity: '83.3-100%',
    description: 'Critical density - your peak delivery zones',
  },
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
    div.style.padding = '14px';
    div.style.borderRadius = '6px';
    div.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
    div.style.fontSize = '12px';
    div.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    div.style.zIndex = '1000';
    div.style.maxWidth = '360px';
    div.style.overflowY = 'visible';
    div.style.minHeight = 'auto';

    // Add title
    const title = document.createElement('div');
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    title.style.borderBottom = '2px solid #e5e7eb';
    title.style.paddingBottom = '6px';
    title.style.fontSize = '13px';
    title.style.color = '#1f2937';
    title.textContent = 'How to Interpret the Colors';
    div.appendChild(title);

    // Add legend items with descriptions
    HEATMAP_LEGEND_ITEMS.forEach((item, index) => {
      const itemContainer = document.createElement('div');
      itemContainer.style.marginBottom = '6px';
      itemContainer.style.paddingBottom = '6px';
      if (index < HEATMAP_LEGEND_ITEMS.length - 1) {
        itemContainer.style.borderBottom = '1px solid #f0f0f0';
      }

      // Row with color box and label
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'flex-start';
      row.style.gap = '8px';

      // Color box
      const colorBox = document.createElement('div');
      colorBox.style.width = '18px';
      colorBox.style.height = '18px';
      colorBox.style.backgroundColor = item.color;
      colorBox.style.borderRadius = '3px';
      colorBox.style.border = '1px solid rgba(0,0,0,0.15)';
      colorBox.style.flexShrink = '0';
      colorBox.style.marginTop = '1px';

      // Label container
      const labelContainer = document.createElement('div');
      labelContainer.style.flex = '1';
      labelContainer.style.wordWrap = 'break-word';
      labelContainer.style.overflow = 'visible';

      // Main label: "Color (intensity%): Description"
      const mainLabel = document.createElement('div');
      mainLabel.style.fontWeight = '600';
      mainLabel.style.color = '#1f2937';
      mainLabel.style.fontSize = '11px';
      mainLabel.style.lineHeight = '1.35';
      mainLabel.style.wordWrap = 'break-word';
      mainLabel.textContent = `${item.label} (${item.intensity}): ${item.description}`;

      labelContainer.appendChild(mainLabel);
      row.appendChild(colorBox);
      row.appendChild(labelContainer);
      itemContainer.appendChild(row);
      div.appendChild(itemContainer);
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
