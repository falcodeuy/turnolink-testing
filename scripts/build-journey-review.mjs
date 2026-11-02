import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const reviewRoot = path.resolve(
  process.argv[2] ?? 'artifacts/journey-review',
);
const videos = await collectVideos(reviewRoot);

if (videos.length === 0) {
  throw new Error(`No journey videos found in ${reviewRoot}`);
}

const groups = groupVideos(videos);
await fs.writeFile(
  path.join(reviewRoot, 'index.html'),
  renderIndex(groups, videos.length),
);
await fs.writeFile(
  path.join(reviewRoot, 'README.md'),
  renderReadme(groups, videos.length),
);

console.log(`Journey review: ${videos.length} videos`);
console.log(path.join(reviewRoot, 'index.html'));

async function collectVideos(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectVideos(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.webm')) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function groupVideos(files) {
  const groups = new Map();

  for (const file of files) {
    const relativePath = path.relative(reviewRoot, file);
    const [device, category, journey, video] = relativePath.split(path.sep);
    const deviceGroups = groups.get(device) ?? new Map();
    const categoryGroups = deviceGroups.get(category) ?? new Map();
    const journeyVideos = categoryGroups.get(journey) ?? [];
    journeyVideos.push({ relativePath, video });
    categoryGroups.set(journey, journeyVideos);
    deviceGroups.set(category, categoryGroups);
    groups.set(device, deviceGroups);
  }

  return groups;
}

function renderIndex(groups, videoCount) {
  const devices = [...groups.entries()]
    .map(
      ([device, categories]) => `
        <section>
          <h2>${escapeHtml(humanize(device))}</h2>
          ${[...categories.entries()]
            .map(
              ([category, journeys]) => `
                <details open>
                  <summary>${escapeHtml(humanize(category))} · ${countVideos(journeys)} videos</summary>
                  <div class="journeys">
                    ${[...journeys.entries()]
                      .map(
                        ([journey, journeyVideos]) => `
                          <article>
                            <h3>${escapeHtml(humanizeJourney(journey))}</h3>
                            ${journeyVideos
                              .map(
                                ({ relativePath, video }) => `
                                  <div class="video-part">
                                    <p>${escapeHtml(humanize(video.replace(/\.webm$/, '')))}</p>
                                    <video controls preload="metadata" src="${encodePath(relativePath)}"></video>
                                  </div>`,
                              )
                              .join('')}
                          </article>`,
                      )
                      .join('')}
                  </div>
                </details>`,
            )
            .join('')}
        </section>`,
    )
    .join('');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Revisión visual de journeys</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 0 auto; max-width: 1500px; padding: 24px; }
      header { margin-bottom: 32px; }
      h1, h2, h3, p { margin-top: 0; }
      details { border: 1px solid #8886; border-radius: 12px; margin: 16px 0; padding: 12px; }
      summary { cursor: pointer; font-size: 1.1rem; font-weight: 700; }
      .journeys { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); margin-top: 16px; }
      article { border: 1px solid #8884; border-radius: 10px; padding: 12px; }
      .video-part + .video-part { margin-top: 16px; }
      .video-part p { color: #777; font-size: .85rem; margin-bottom: 6px; }
      video { background: #111; border-radius: 8px; display: block; max-height: 720px; width: 100%; }
    </style>
  </head>
  <body>
    <header>
      <h1>Revisión visual de journeys</h1>
      <p>${videoCount} videos de ejecuciones correctas, ordenados por dispositivo y área funcional.</p>
    </header>
    ${devices}
  </body>
</html>
`;
}

function renderReadme(groups, videoCount) {
  const lines = [
    '# Revisión visual de journeys',
    '',
    `${videoCount} videos de ejecuciones correctas.`,
    '',
    'Abrir `index.html` para revisarlos con controles de reproducción.',
    '',
  ];

  for (const [device, categories] of groups) {
    lines.push(`## ${humanize(device)}`, '');
    for (const [category, journeys] of categories) {
      lines.push(`### ${humanize(category)}`);
      for (const [journey, journeyVideos] of journeys) {
        lines.push(
          `- ${humanizeJourney(journey)} (${journeyVideos.length} video${journeyVideos.length === 1 ? '' : 's'})`,
        );
      }
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

function countVideos(journeys) {
  return [...journeys.values()].reduce(
    (total, journeyVideos) => total + journeyVideos.length,
    0,
  );
}

function humanize(value) {
  return value
    .replace(/^\d+-/, '')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function humanizeJourney(value) {
  const [, spec = value, title = ''] =
    value.match(/^\d+-(.+?)--(.+)$/) ?? [];
  return title ? `${humanize(spec)} — ${humanize(title)}` : humanize(value);
}

function encodePath(value) {
  return value
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
