import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const tourRoot = path.resolve(process.argv[2] ?? 'artifacts/app-tour');
const clipsRoot = path.join(tourRoot, 'clips');
const outputPath = path.join(tourRoot, 'turnolink-complete-tour.mp4');
const clips = await collectVideos(clipsRoot);

if (clips.length === 0) {
  throw new Error(`No tour clips found in ${clipsRoot}`);
}

const devices = new Map();
for (const clip of clips) {
  const device = path.relative(clipsRoot, clip).split(path.sep)[0];
  const deviceClips = devices.get(device) ?? [];
  deviceClips.push(clip);
  devices.set(device, deviceClips);
}
const normalizedSegments = [];

for (const [device, deviceClips] of devices) {
  const concatPath = path.join(tourRoot, `${device}-clips.txt`);
  const segmentPath = path.join(tourRoot, `${device}.mp4`);
  await fs.writeFile(concatPath, renderConcatList(deviceClips));
  await run('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-vf',
    'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30,format=yuv420p',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    segmentPath,
  ]);
  normalizedSegments.push(segmentPath);
}

const segmentsPath = path.join(tourRoot, 'segments.txt');
const videoWithoutChapters = path.join(tourRoot, 'tour-without-chapters.mp4');
await fs.writeFile(segmentsPath, renderConcatList(normalizedSegments));
await run('ffmpeg', [
  '-y',
  '-hide_banner',
  '-loglevel',
  'error',
  '-f',
  'concat',
  '-safe',
  '0',
  '-i',
  segmentsPath,
  '-c',
  'copy',
  videoWithoutChapters,
]);

const clipDurations = await mapInBatches(clips, 8, getDuration);
const chapters = buildChapters(clips, clipDurations);
const chaptersPath = path.join(tourRoot, 'chapters.ffmeta');
await fs.writeFile(chaptersPath, chapters.metadata);
await fs.writeFile(path.join(tourRoot, 'timeline.md'), chapters.timeline);
await run('ffmpeg', [
  '-y',
  '-hide_banner',
  '-loglevel',
  'error',
  '-i',
  videoWithoutChapters,
  '-i',
  chaptersPath,
  '-map_metadata',
  '1',
  '-codec',
  'copy',
  outputPath,
]);

await Promise.all([
  ...normalizedSegments.map((file) => fs.rm(file)),
  fs.rm(videoWithoutChapters),
  fs.rm(segmentsPath),
  ...[...devices.keys()].map((device) =>
    fs.rm(path.join(tourRoot, `${device}-clips.txt`)),
  ),
]);

const finalDuration = await getDuration(outputPath);
console.log(`App tour: ${clips.length} clips, ${formatTime(finalDuration)}`);
console.log(outputPath);

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

function renderConcatList(files) {
  return `${files.map((file) => `file '${escapeConcatPath(file)}'`).join('\n')}\n`;
}

function escapeConcatPath(file) {
  return file.replaceAll("'", "'\\''");
}

async function getDuration(file) {
  const output = await run('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  const duration = Number.parseFloat(output.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`Invalid video duration for ${file}: ${output}`);
  }
  return duration;
}

function buildChapters(files, durations) {
  const metadata = [';FFMETADATA1'];
  const timeline = [
    '# Recorrido visual completo de TurnoLink',
    '',
    `${files.length} clips de pantallas y modales.`,
    '',
  ];
  let elapsedSeconds = 0;

  for (const [index, file] of files.entries()) {
    const duration = durations[index];
    const title = titleFor(file);
    const start = Math.round(elapsedSeconds * 1000);
    const end = Math.round((elapsedSeconds + duration) * 1000);
    metadata.push(
      '',
      '[CHAPTER]',
      'TIMEBASE=1/1000',
      `START=${start}`,
      `END=${Math.max(start + 1, end)}`,
      `title=${escapeMetadata(title)}`,
    );
    timeline.push(`- ${formatTime(elapsedSeconds)} — ${title}`);
    elapsedSeconds += duration;
  }

  return {
    metadata: `${metadata.join('\n')}\n`,
    timeline: `${timeline.join('\n')}\n`,
  };
}

function titleFor(file) {
  const [device, category, journey, part] = path
    .relative(clipsRoot, file)
    .split(path.sep);
  return [device, category, journey, part.replace(/\.webm$/, '')]
    .map(humanize)
    .join(' · ');
}

function humanize(value) {
  return value
    .replace(/^\d+-/, '')
    .replace('--', ' — ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeMetadata(value) {
  return value.replaceAll('\\', '\\\\').replace(/([=;#])/g, '\\$1');
}

function formatTime(seconds) {
  const rounded = Math.floor(seconds);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;
  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

async function mapInBatches(items, batchSize, mapper) {
  const results = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    results.push(...(await Promise.all(batch.map(mapper))));
  }
  return results;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `${command} exited with ${code}\n${stderr.slice(-4000)}`,
          ),
        );
      }
    });
  });
}
