import * as fs from 'fs';
import * as path from 'path';

const FIGMA_TOKEN = process.env.FIGMA_TOKEN!;
const FILE_ID = '9ZmfDu5ZbIUS8rO3YlrIEu';
const ICONS_OUTPUT_DIR = './public/icons';

if (!FIGMA_TOKEN) {
  throw new Error('❌ FIGMA_TOKEN is not defined in environment variables');
}

interface FigmaComponent {
  node_id: string;
  name: string;
}

interface FigmaComponentsResponse {
  meta: {
    components: FigmaComponent[];
  };
}

interface FigmaImagesResponse {
  images: Record<string, string>;
}

async function fetchFigmaComponents(): Promise<FigmaComponent[]> {
  const res = await fetch(`https://api.figma.com/v1/files/${FILE_ID}/components`, {
    headers: {
      'X-Figma-Token': FIGMA_TOKEN,
    },
  });

  if (!res.ok) {
    throw new Error(`❌ Failed to fetch components: ${res.statusText}`);
  }

  const data: FigmaComponentsResponse = await res.json();
  return data.meta.components;
}

async function fetchSvgUrls(nodeIds: string[]): Promise<Record<string, string>> {
  const res = await fetch(`https://api.figma.com/v1/images/${FILE_ID}?ids=${nodeIds.join(',')}&format=svg`, {
    headers: {
      'X-Figma-Token': FIGMA_TOKEN,
    },
  });

  if (!res.ok) {
    throw new Error(`❌ Failed to fetch SVG URLs: ${res.statusText}`);
  }

  const data: FigmaImagesResponse = await res.json();
  return data.images;
}

async function downloadSvg(name: string, url: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`❌ Failed to download ${name}: ${res.statusText}`);
  }

  const svg = await res.text();
  const outputPath = path.join(ICONS_OUTPUT_DIR, `${name}.svg`);
  fs.writeFileSync(outputPath, svg);
  console.log(`✅ Downloaded ${name}.svg`);
}

async function main(): Promise<void> {
  if (!fs.existsSync(ICONS_OUTPUT_DIR)) {
    fs.mkdirSync(ICONS_OUTPUT_DIR, { recursive: true });
  }

  console.log('📥 Fetching Figma components...');
  const components = await fetchFigmaComponents();
  const nodeIds = components.map((c) => c.node_id);
  const nameMap = Object.fromEntries(components.map((c) => [c.node_id, c.name]));

  console.log('🔗 Fetching SVG URLs...');
  const svgUrls = await fetchSvgUrls(nodeIds);

  console.log('💾 Downloading icons...');
  for (const [nodeId, url] of Object.entries(svgUrls)) {
    const name = nameMap[nodeId] ?? `icon-${nodeId}`;
    await downloadSvg(name, url);
  }

  console.log('✅ All icons downloaded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
