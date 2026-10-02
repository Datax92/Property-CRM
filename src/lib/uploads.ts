// Attachments are hosted on Cloudinary; a record stores only the links.
// Uploads go straight from the browser with an *unsigned* upload preset (this app is a
// static export, so there is no server to sign requests). Set in .env.local and in the
// hosting environment:
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME      the cloud name from the Cloudinary dashboard
//   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET   an upload preset whose signing mode is "Unsigned"

export interface Attachment {
  url: string;
  /** Small preview for images; empty for documents, which show a file tile instead. */
  thumb: string;
  name: string;
  size: number;
  kind: 'image' | 'file';
  publicId?: string;
  at: Date;
}

const CLOUD = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '').trim();
const PRESET = (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '').trim();
const MAX_BYTES = 10 * 1024 * 1024; // Cloudinary free-plan limit per file

export const ACCEPT = 'image/*,application/pdf';
export const uploadsReady = () => CLOUD.length > 0 && PRESET.length > 0;
export const NOT_READY = 'Uploads are not set up yet — the Cloudinary cloud name and upload preset are missing.';

/** Cloudinary delivers a resized copy when a transformation is put after /upload/. */
const preview = (url: string) => url.replace('/upload/', '/upload/c_fill,w_240,h_180,q_auto,f_auto/');

export async function uploadFile(file: File): Promise<Attachment> {
  if (!uploadsReady()) throw new Error(NOT_READY);
  const isImage = file.type.startsWith('image/');
  if (!isImage && file.type !== 'application/pdf') throw new Error(`“${file.name}” is not an image or a PDF.`);
  if (file.size > MAX_BYTES) throw new Error(`“${file.name}” is larger than 10 MB.`);

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', PRESET);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUD)}/auto/upload`, { method: 'POST', body });
  } catch {
    throw new Error('Could not reach the file host. Check the internet connection and try again.');
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.secure_url) {
    throw new Error((json && json.error && json.error.message) || `Upload failed (${res.status}).`);
  }
  return {
    url: json.secure_url,
    thumb: isImage ? preview(json.secure_url) : '',
    name: file.name,
    size: +json.bytes || file.size,
    kind: isImage ? 'image' : 'file',
    publicId: json.public_id,
    at: new Date(),
  };
}
