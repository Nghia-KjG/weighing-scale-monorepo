import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface UpdateManifest {
  latestVersion: string;
  fileName: string;
  releaseNotes?: string[];
  minSupportedVersion?: string;
  updatedAt?: string;
  checksum?: string;
}

const APK_DIR = path.resolve(__dirname, '../../../../apk');
const MANIFEST_PATH = path.join(APK_DIR, 'update-info.json');

const ensureApkDirExists = () => {
  if (!fs.existsSync(APK_DIR)) {
    fs.mkdirSync(APK_DIR, { recursive: true });
  }
};

const loadManifest = (): UpdateManifest | null => {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw) as UpdateManifest;
  } catch (error) {
    console.error('Failed to read update manifest:', error);
    return null;
  }
};

const compareVersions = (current: string, latest: string) => {
  const parse = (value: string) => value.split('.').map((part) => Number(part));
  const currentParts = parse(current);
  const latestParts = parse(latest);
  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let i = 0; i < maxLength; i += 1) {
    const a = currentParts[i] ?? 0;
    const b = latestParts[i] ?? 0;
    if (a !== b) {
      return a - b;
    }
  }

  return 0;
};

const buildDownloadUrl = (req: Request) => {
  const host = req.get('host');
  return host ? `${req.protocol}://${host}/api/app-update/download` : '/api/app-update/download';
};

export const checkAppVersion = (req: Request, res: Response) => {
  ensureApkDirExists();

  const manifest = loadManifest();
  if (!manifest?.latestVersion || !manifest?.fileName) {
    return res.status(404).send({ message: 'Update manifest not found. Please upload an APK and manifest.' });
  }

  const apkPath = path.join(APK_DIR, manifest.fileName);
  if (!fs.existsSync(apkPath)) {
    return res.status(404).send({ message: 'APK file is missing on the server.' });
  }

  const stats = fs.statSync(apkPath);
  const currentVersion = (req.query.version as string | undefined) || '';
  const needsUpdate = currentVersion ? compareVersions(currentVersion, manifest.latestVersion) < 0 : true;

  const payload = {
    latestVersion: manifest.latestVersion,
    hasUpdate: needsUpdate,
    downloadUrl: buildDownloadUrl(req),
    fileName: manifest.fileName,
    fileSize: stats.size,
    minSupportedVersion: manifest.minSupportedVersion || null,
    releaseNotes: manifest.releaseNotes || [],
    updatedAt: manifest.updatedAt || stats.mtime.toISOString(),
    checksum: manifest.checksum || null,
  };

  return res.status(200).send(payload);
};

export const downloadLatestApk = (req: Request, res: Response) => {
  ensureApkDirExists();

  const manifest = loadManifest();
  if (!manifest?.fileName) {
    return res.status(404).send({ message: 'Update manifest not found. Please upload an APK and manifest.' });
  }

  const apkPath = path.join(APK_DIR, manifest.fileName);
  if (!fs.existsSync(apkPath)) {
    return res.status(404).send({ message: 'APK file is missing on the server.' });
  }

  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.download(apkPath, manifest.fileName, (err) => {
    if (err) {
      console.error('Failed to send APK:', err);
      if (!res.headersSent) {
        res.status(500).send({ message: 'Failed to download APK.' });
      }
    }
  });
};
